"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Calendar, Github, Globe, Linkedin, MapPin, Star, Trophy, Twitter } from "lucide-react";

import { fetchPublicProfile } from "@/app/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    fetchPublicProfile(username)
      .then(setProfile)
      .catch((e) => setError(e.response?.data?.error || "Profile not found"))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <Globe size={24} className="text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Profile Not Found</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const { user, developerProfile: dp, achievements = [], stats = {} } = profile;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative">
        <div className="h-40 bg-gradient-to-r from-primary/20 via-teal-500/20 to-violet-500/20" />
        <div className="max-w-2xl mx-auto px-6 -mt-16">
          <div className="flex items-end gap-4 mb-6">
            <img
              src={user.avatarUrl || `https://github.com/${user.username}.png`}
              alt={user.username}
              className="w-24 h-24 rounded-2xl border-4 border-background shadow-lg"
            />
            <div className="pb-1">
              <h1 className="text-xl font-bold text-foreground">{user.displayName || user.username}</h1>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
          </div>

          {/* Bio */}
          {dp?.bio && (
            <p className="text-sm text-foreground mb-4 leading-relaxed">{dp.bio}</p>
          )}

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            {dp?.location && (
              <span className="flex items-center gap-1"><MapPin size={14} /> {dp.location}</span>
            )}
            {dp?.website && (
              <a href={dp.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                <Globe size={14} /> Website
              </a>
            )}
            {dp?.twitter && (
              <a href={`https://twitter.com/${dp.twitter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                <Twitter size={14} /> @{dp.twitter}
              </a>
            )}
            {dp?.linkedin && (
              <a href={`https://linkedin.com/in/${dp.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                <Linkedin size={14} /> LinkedIn
              </a>
            )}
            <a href={`https://github.com/${user.username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
              <Github size={14} /> GitHub
            </a>
            <span className="flex items-center gap-1">
              <Calendar size={14} /> Joined {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
          </div>

          {/* Skills */}
          {dp?.skills?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {dp.skills.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Repos", value: stats.publicRepos ?? "—" },
              { label: "Followers", value: stats.followers ?? "—" },
              { label: "Stars", value: stats.totalStars ?? "—" },
              { label: "Achievements", value: achievements.length },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Trophy size={14} className="text-amber-500" /> Achievements
              </h2>
              <div className="flex flex-wrap gap-3">
                {achievements.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border">
                    <span className="text-lg">{a.achievement?.icon || "🏆"}</span>
                    <div>
                      <p className="text-xs font-medium text-foreground">{a.achievement?.name || "Achievement"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Earned {new Date(a.earnedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center pb-8">
            Powered by <span className="font-semibold text-primary">FlowOps</span>
          </p>
        </div>
      </div>
    </div>
  );
}
