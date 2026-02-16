"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function Dashboard() {
  const params = useSearchParams();
  const user = params.get("user");

  useEffect(() => {
    if (!user) {
      window.location.href = "/login";
    }
  }, [user]);

  if (!user) return null;

  export default function Dashboard() {
  const [cycleTime, setCycleTime] = useState(0);
  const [reviewLatency, setReviewLatency] = useState(0);
  const [commits, setCommits] = useState(0);
  const [chartData, setChartData] = useState<
    { day: string, commits: number }[]
  >([]);

  useEffect(() => {
    async function fetchMetrics() {
      const base = "http://localhost:4000/metrics";

      const pr = await axios.get(`${base}/pr-cycle-time`);
      const review = await axios.get(`${base}/review-latency`);
      const commits = await axios.get(`${base}/commit-activity`);
      setChartData(commits.data);
      setCommits(
        commits.data.reduce(
          (sum: number, d: { day: string, commits: number }) => sum + d.commits,
          0
        )
      );

      setCycleTime(pr.data.averageHours);
      setReviewLatency(review.data.averageHours);
    }

    fetchMetrics();
  }, []);

  return (
    <Layout>
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-3 gap-6 mt-8">
        <Card title="Avg PR Cycle Time" value={`${cycleTime} hrs`} />
        <Card title="Avg Review Latency" value={`${reviewLatency} hrs`} />
        <Card title="Commits (7 days)" value={commits} />
      </div>

      {/* Chart */}
      <div className="mt-10 bg-slate-950 p-6 rounded-xl border border-slate-800">
        <h2 className="text-lg mb-4">📈 Commits (Last 7 Days)</h2>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <XAxis dataKey="day" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="commits"
                stroke="#22d3ee"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  );
}
}

