"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Edit, ExternalLink, Globe, Linkedin, MapPin, Save, Twitter, X } from "lucide-react";

import { useAuth } from "@/app/hooks/useAuth";
import { fetchProfile, updateProfile } from "@/app/lib/api";
import PersonalLayout from "@/app/components/PersonalLayout";
import PageHeader from "@/app/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetchProfile()
      .then((p) => {
        setProfile(p);
        setForm({
          bio: p.bio || "",
          website: p.website || "",
          twitter: p.twitter || "",
          linkedin: p.linkedin || "",
          location: p.location || "",
          skills: p.skills || [],
          isPublic: p.isPublic ?? true,
        });
      })
      .finally(() => setFetching(false));
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile(form);
      setProfile({ ...profile, ...updated });
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills?.includes(s)) {
      setForm({ ...form, skills: [...(form.skills || []), s] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill) => {
    setForm({ ...form, skills: form.skills.filter((s) => s !== skill) });
  };

  if (loading || !user) return null;

  return (
    <PersonalLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <PageHeader title="My Profile" description="Manage your developer profile and public portfolio." badge="Profile" />

        {fetching ? (
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : (
          <>
            {/* Profile Card */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.username} className="w-16 h-16 rounded-2xl ring-2 ring-border/50" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-neutral-950"
                        style={{ background: "linear-gradient(135deg, #4ADE80 0%, #0D9488 100%)" }}>
                        {user.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{user.username}</h2>
                      <p className="text-sm text-muted-foreground">{user.email || "GitHub User"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={form.isPublic ? "default" : "secondary"} className="text-[10px]">
                          {form.isPublic ? "Public" : "Private"}
                        </Badge>
                        {profile?.user?.createdAt && (
                          <span className="text-[10px] text-muted-foreground">
                            Joined {new Date(profile.user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!editing ? (
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      <Edit size={12} className="mr-1.5" /> Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X size={12} /></Button>
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        <Save size={12} className="mr-1.5" /> {saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
                      <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        placeholder="Tell us about yourself..." rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                        <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                          placeholder="San Francisco, CA" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Website</label>
                        <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                          placeholder="https://yoursite.com" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Twitter</label>
                        <Input value={form.twitter} onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                          placeholder="@username" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">LinkedIn</label>
                        <Input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                          placeholder="linkedin.com/in/username" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Skills</label>
                      <div className="flex gap-2">
                        <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                          placeholder="Add a skill..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} />
                        <Button size="sm" variant="outline" onClick={addSkill}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {form.skills?.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs cursor-pointer" onClick={() => removeSkill(s)}>
                            {s} <X size={10} className="ml-1" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                        className="rounded" id="public-toggle" />
                      <label htmlFor="public-toggle" className="text-xs text-muted-foreground">Make profile public</label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profile?.bio && <p className="text-sm text-foreground">{profile.bio}</p>}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {profile?.location && (
                        <span className="flex items-center gap-1.5"><MapPin size={14} /> {profile.location}</span>
                      )}
                      {profile?.website && (
                        <a href={profile.website} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 hover:text-primary transition-colors">
                          <Globe size={14} /> {profile.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                      {profile?.twitter && (
                        <a href={`https://twitter.com/${profile.twitter.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 hover:text-primary transition-colors">
                          <Twitter size={14} /> {profile.twitter}
                        </a>
                      )}
                      {profile?.linkedin && (
                        <a href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://${profile.linkedin}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 hover:text-primary transition-colors">
                          <Linkedin size={14} /> LinkedIn
                        </a>
                      )}
                    </div>
                    {profile?.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.skills.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    )}
                    {!profile?.bio && !profile?.skills?.length && (
                      <p className="text-sm text-muted-foreground italic">
                        Your profile is empty. Click &ldquo;Edit Profile&rdquo; to add your bio, skills, and social links.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Public Profile Link */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Public Profile</p>
                  <p className="text-xs text-muted-foreground">
                    {form.isPublic
                      ? `Share your profile: /profile/${user.username}`
                      : "Your profile is private. Enable public visibility to share it."}
                  </p>
                </div>
                {form.isPublic && (
                  <Button size="sm" variant="outline" onClick={() => router.push(`/profile/${user.username}`)}>
                    <ExternalLink size={12} className="mr-1.5" /> View
                  </Button>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PersonalLayout>
  );
}
