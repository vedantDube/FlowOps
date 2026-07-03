const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const {
  percentile,
  hoursBetween,
  avgOf,
  computePRFlow,
  computeWorkPatterns,
} = require("../src/utils/metrics-math");

// Helper: an ISO timestamp offset from a fixed base by N hours
const BASE = new Date("2026-06-01T10:00:00Z");
const at = (hours) => new Date(BASE.getTime() + hours * 3_600_000);

describe("percentile", () => {
  test("returns 0 for an empty array", () => {
    assert.equal(percentile([], 75), 0);
  });
  test("returns the single element regardless of p", () => {
    assert.equal(percentile([42], 5), 42);
    assert.equal(percentile([42], 95), 42);
  });
  test("p75 of 1..4 is 3", () => {
    assert.equal(percentile([4, 1, 3, 2], 75), 3);
  });
  test("p100 is the max", () => {
    assert.equal(percentile([9, 1, 5], 100), 9);
  });
});

describe("hoursBetween / avgOf", () => {
  test("hoursBetween handles Date and ISO string inputs", () => {
    assert.equal(hoursBetween(BASE, at(5)), 5);
    assert.equal(hoursBetween(BASE.toISOString(), at(2.5).toISOString()), 2.5);
  });
  test("avgOf returns null for empty input (renders as em dash, not 0h)", () => {
    assert.equal(avgOf([]), null);
  });
  test("avgOf rounds to 2 decimals", () => {
    assert.equal(avgOf([1, 2]), 1.5);
    assert.equal(avgOf([1, 1, 1.005]), 1.0);
  });
});

describe("computePRFlow", () => {
  test("empty input produces zeroed totals and null stage averages", () => {
    const flow = computePRFlow([]);
    assert.deepEqual(flow.totals, {
      opened: 0, reviewed: 0, approved: 0, merged: 0, closedWithoutMerge: 0, open: 0,
    });
    for (const stage of flow.stages) {
      assert.equal(stage.avgHours, null);
      assert.equal(stage.count, 0);
    }
  });

  test("full lifecycle: open -> first review -> approval -> merge", () => {
    const flow = computePRFlow([
      {
        state: "merged",
        openedAt: at(0),
        closedAt: at(30),
        mergedAt: at(30),
        reviews: [
          { state: "commented", reviewedAt: at(10) },
          { state: "approved", reviewedAt: at(24) },
        ],
      },
    ]);
    assert.equal(flow.totals.opened, 1);
    assert.equal(flow.totals.reviewed, 1);
    assert.equal(flow.totals.approved, 1);
    assert.equal(flow.totals.merged, 1);
    assert.equal(flow.stages[0].avgHours, 10); // open -> first review
    assert.equal(flow.stages[1].avgHours, 14); // first review -> approval
    assert.equal(flow.stages[2].avgHours, 6); // approval -> merge
  });

  test("classifies open vs closed-without-merge vs merged", () => {
    const { totals } = computePRFlow([
      { state: "open", openedAt: at(0), closedAt: null, mergedAt: null, reviews: [] },
      { state: "closed", openedAt: at(0), closedAt: at(5), mergedAt: null, reviews: [] },
      {
        state: "merged", openedAt: at(0), closedAt: at(8), mergedAt: at(8),
        reviews: [{ state: "approved", reviewedAt: at(4) }],
      },
    ]);
    assert.equal(totals.open, 1);
    assert.equal(totals.closedWithoutMerge, 1);
    assert.equal(totals.merged, 1);
    assert.equal(totals.reviewed, 1);
  });

  test("merge before approval timestamp clamps stage to 0, never negative", () => {
    const flow = computePRFlow([
      {
        state: "merged", openedAt: at(0), closedAt: at(2), mergedAt: at(2),
        // approval recorded after the merge (out-of-order webhook delivery)
        reviews: [{ state: "approved", reviewedAt: at(3) }],
      },
    ]);
    assert.equal(flow.stages[2].avgHours, 0);
  });

  test("PR with approval but no earlier distinct first review skips the in-review stage", () => {
    const flow = computePRFlow([
      {
        state: "merged", openedAt: at(0), closedAt: at(10), mergedAt: at(10),
        reviews: [{ state: "approved", reviewedAt: at(6) }],
      },
    ]);
    // first review IS the approval — no measurable review->approval window
    assert.equal(flow.stages[1].count, 0);
    assert.equal(flow.stages[0].avgHours, 6);
  });
});

describe("computeWorkPatterns", () => {
  // 2026-06-01 is a Monday; hours below are UTC
  const monday = (hour) => new Date(`2026-06-01T${String(hour).padStart(2, "0")}:00:00Z`);
  const saturday = (hour) => new Date(`2026-06-06T${String(hour).padStart(2, "0")}:00:00Z`);

  test("empty input", () => {
    const wp = computeWorkPatterns([]);
    assert.equal(wp.totalCommits, 0);
    assert.equal(wp.org.contributors, 0);
    assert.deepEqual(wp.authors, []);
  });

  test("daytime weekday committer is low risk with zeroed signals", () => {
    const wp = computeWorkPatterns([
      { author: "alice", committedAt: monday(10) },
      { author: "alice", committedAt: monday(14) },
      { author: "alice", committedAt: monday(17) },
    ]);
    const a = wp.authors[0];
    assert.equal(a.afterHoursPct, 0);
    assert.equal(a.lateNightPct, 0);
    assert.equal(a.weekendPct, 0);
    assert.equal(a.riskLevel, "low");
  });

  test("late-night + weekend committer is flagged high risk", () => {
    const wp = computeWorkPatterns([
      { author: "bob", committedAt: monday(2) }, // late night + after hours
      { author: "bob", committedAt: monday(23) }, // after hours
      { author: "bob", committedAt: saturday(3) }, // late night + weekend
      { author: "bob", committedAt: saturday(22) }, // weekend + after hours
    ]);
    const b = wp.authors[0];
    assert.equal(b.afterHoursPct, 100);
    assert.equal(b.lateNightPct, 50);
    assert.equal(b.weekendPct, 50);
    assert.equal(b.riskLevel, "high");
  });

  test("boundary hours: 8:00 is working time, 20:00 is after hours, 6:00 ends late night", () => {
    const wp = computeWorkPatterns([
      { author: "c", committedAt: monday(8) },
      { author: "c", committedAt: monday(20) },
      { author: "c", committedAt: monday(6) },
    ]);
    const c = wp.authors[0];
    // 20:00 counts after-hours; 06:00 counts after-hours but NOT late-night; 08:00 neither
    assert.equal(c.afterHoursPct, 66.7);
    assert.equal(c.lateNightPct, 0);
  });

  test("load concentration reflects the busiest author's share", () => {
    const wp = computeWorkPatterns([
      { author: "alice", committedAt: monday(10) },
      { author: "alice", committedAt: monday(11) },
      { author: "alice", committedAt: monday(12) },
      { author: "bob", committedAt: monday(13) },
    ]);
    assert.equal(wp.org.loadConcentrationPct, 75);
    assert.equal(wp.org.contributors, 2);
    assert.equal(wp.authors[0].author, "alice"); // sorted by volume
  });
});
