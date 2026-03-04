"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, CheckCircle, Circle, RefreshCw, Trophy } from "lucide-react";

import { useAuth } from "@/app/hooks/useAuth";
import { fetchAchievements, checkAchievements, seedAchievements } from "@/app/lib/api";
import PersonalLayout from "@/app/components/PersonalLayout";
import PageHeader from "@/app/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const CATEGORY_LABELS = {
  commits: "Commits",
  streak: "Streaks",
  reviews: "AI Reviews",
  docs: "Documentation",
  social: "Social & Profile",
};

const CATEGORY_COLORS = {
  commits: "border-primary/30 bg-primary/5",
  streak: "border-orange-500/30 bg-orange-500/5",
  reviews: "border-violet-500/30 bg-violet-500/5",
  docs: "border-blue-500/30 bg-blue-500/5",
  social: "border-amber-500/30 bg-amber-500/5",
};

export default function AchievementsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [achievements, setAchievements] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [checking, setChecking] = useState(false);
  const [newlyEarned, setNewlyEarned] = useState([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const loadAchievements = async () => {
    try {
      const data = await fetchAchievements();
      if (!data.length) {
        await seedAchievements();
        const seeded = await fetchAchievements();
        setAchievements(seeded);
      } else {
        setAchievements(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadAchievements();
  }, [user]);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const result = await checkAchievements();
      setNewlyEarned(result.newlyEarned || []);
      await loadAchievements();
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  if (loading || !user) return null;

  const earned = achievements.filter((a) => a.earned);
  const grouped = achievements.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = [];
    acc[a.category].push(a);
    return acc;
  }, {});

  return (
    <PersonalLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
        <div className="flex items-start justify-between mb-6">
          <PageHeader title="Achievements" description="Track your coding milestones and earn badges." badge={`${earned.length}/${achievements.length}`} />
          <Button onClick={handleCheck} disabled={checking} variant="outline" size="sm" className="mt-2">
            <RefreshCw size={12} className={`mr-1.5 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking..." : "Check Progress"}
          </Button>
        </div>

        {/* Newly Earned */}
        {newlyEarned.length > 0 && (
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-primary mb-2">New Achievements Unlocked!</p>
              <div className="flex flex-wrap gap-3">
                {newlyEarned.map((a) => (
                  <div key={a.name} className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-2">
                    <span className="text-xl">{a.icon}</span>
                    <div>
                      <p className="text-xs font-medium text-foreground">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground">{a.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Summary */}
        <Card className="mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <CardContent className="p-6 flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Trophy size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-bold text-foreground">{earned.length} / {achievements.length}</p>
              <p className="text-sm text-muted-foreground">Achievements earned</p>
              <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700"
                  style={{ width: `${achievements.length ? (earned.length / achievements.length) * 100 : 0}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* By Category */}
        {fetching ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Award size={14} />
                  {CATEGORY_LABELS[category] || category}
                  <Badge variant="secondary" className="text-[10px]">
                    {items.filter((i) => i.earned).length}/{items.length}
                  </Badge>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((a) => (
                    <Card key={a.id} className={`transition-all ${a.earned ? CATEGORY_COLORS[category] : "opacity-60"}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className={`text-2xl ${a.earned ? "" : "grayscale"}`}>{a.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{a.name}</p>
                              {a.earned && <CheckCircle size={12} className="text-primary shrink-0" />}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{a.description}</p>
                            {!a.earned && (
                              <div className="mt-2">
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary/60 rounded-full transition-all"
                                    style={{ width: `${Math.min((a.progress / a.threshold) * 100, 100)}%` }} />
                                </div>
                                <p className="text-[9px] text-muted-foreground mt-1">{a.progress} / {a.threshold}</p>
                              </div>
                            )}
                            {a.earned && a.earnedAt && (
                              <p className="text-[9px] text-muted-foreground mt-1">
                                Earned {new Date(a.earnedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PersonalLayout>
  );
}
