'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle, Check, CheckCircle2, ChevronDown, Clock, FolderGit2,
  GitBranch, History, Link2, Loader2, Plug, Search, Trash2, XCircle,
} from 'lucide-react'

import { useAuth } from '../hooks/useAuth'
import {
  connectRepo,
  deleteIntegration,
  disconnectRepo,
  fetchGithubRepos,
  fetchIntegrations,
  fetchOrgRepos,
  saveIntegration,
} from '../lib/api'
import { cn } from '../lib/utils'
import Layout from '../components/Layout'
import PageHeader from '../components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const INTEGRATIONS = [
  {
    type: 'slack',
    label: 'Slack',
    icon: '🔔',
    color: 'bg-[#4A154B]/10 border-[#4A154B]/20',
    description: 'Get notified when AI reviews complete and new docs are generated.',
    fields: [{ key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/…', type: 'url' }],
  },
  {
    type: 'jira',
    label: 'Jira',
    icon: '📋',
    color: 'bg-blue-500/10 border-blue-500/20',
    description: 'Connect Jira to view issues and sprint data alongside your engineering metrics.',
    fields: [
      { key: 'baseUrl', label: 'Jira Base URL', placeholder: 'https://your-org.atlassian.net', type: 'url' },
      { key: 'email', label: 'Email', placeholder: 'you@company.com', type: 'email' },
      { key: 'apiToken', label: 'API Token', placeholder: 'Your Jira API token', type: 'password' },
    ],
  },
]

const STATUS_MAP = {
  active: { icon: CheckCircle2, label: 'Connected', variant: 'success', dotClass: 'bg-emerald-500' },
  inactive: { icon: XCircle, label: 'Inactive', variant: 'secondary', dotClass: 'bg-zinc-400' },
  error: { icon: AlertCircle, label: 'Error', variant: 'destructive', dotClass: 'bg-red-500' },
}

export default function IntegrationsPage() {
  const { user, orgId, loading } = useAuth()
  const router = useRouter()
  const [integrations, setIntegrations] = useState([])
  const [isFetching, setIsFetching] = useState(true)
  const [saving, setSaving] = useState({})
  const [forms, setForms] = useState({})
  const [expanded, setExpanded] = useState(null)

  // ── GitHub Repos state ──
  const [connectedRepos, setConnectedRepos] = useState([])
  const [githubRepos, setGithubRepos] = useState([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [loadingConnected, setLoadingConnected] = useState(true)
  const [showRepoSelector, setShowRepoSelector] = useState(false)
  const [repoSearch, setRepoSearch] = useState('')
  const [connectingRepo, setConnectingRepo] = useState(null)
  const [disconnectingRepo, setDisconnectingRepo] = useState(null)
  const [historyPromptRepo, setHistoryPromptRepo] = useState(null) // repo awaiting history choice

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!orgId) return
    setIsFetching(true)
    fetchIntegrations(orgId)
      .then(setIntegrations)
      .finally(() => setIsFetching(false))

    setLoadingConnected(true)
    fetchOrgRepos(orgId)
      .then(setConnectedRepos)
      .finally(() => setLoadingConnected(false))
  }, [orgId])

  const getIntegration = (type) => integrations.find((i) => i.type === type)

  const handleSave = async (type) => {
    setSaving((s) => ({ ...s, [type]: true }))
    try {
      const saved = await saveIntegration(orgId, { type, config: forms[type] || {} })
      setIntegrations((prev) => {
        const exists = prev.find((i) => i.type === type)
        return exists ? prev.map((i) => (i.type === type ? saved : i)) : [...prev, saved]
      })
      setExpanded(null)
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.error || e.message))
    } finally {
      setSaving((s) => ({ ...s, [type]: false }))
    }
  }

  const handleDelete = async (type) => {
    if (!confirm(`Remove ${type} integration?`)) return
    await deleteIntegration(orgId, type)
    setIntegrations((prev) => prev.filter((i) => i.type !== type))
  }

  // ── GitHub repo helpers ──
  const loadGithubRepos = async () => {
    if (githubRepos.length > 0) return
    setLoadingRepos(true)
    try {
      const repos = await fetchGithubRepos()
      setGithubRepos(repos)
    } catch (e) {
      alert('Failed to load repos: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoadingRepos(false)
    }
  }

  const handleConnectRepo = async (repo, syncHistory = false) => {
    setHistoryPromptRepo(null)
    setConnectingRepo(repo.id)
    try {
      const connected = await connectRepo(orgId, {
        name: repo.name,
        fullName: repo.fullName,
        githubRepoId: repo.id.toString(),
        defaultBranch: repo.defaultBranch,
        isPrivate: repo.private,
        syncHistory,
      })
      setConnectedRepos((prev) => [...prev, connected])
    } catch (e) {
      alert('Failed to connect: ' + (e.response?.data?.error || e.message))
    } finally {
      setConnectingRepo(null)
    }
  }

  const isRepoConnected = (githubId) =>
    connectedRepos.some((r) => r.githubRepoId === githubId?.toString())

  const filteredGithubRepos = githubRepos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(repoSearch.toLowerCase()) ||
      r.language?.toLowerCase().includes(repoSearch.toLowerCase()),
  )

  if (loading || !user) return null

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader
          title="Integrations"
          description="Connect your tools to unlock the full FlowOps experience."
        />

        {/* ── GitHub Repositories ── */}
        <Card className="mb-8 overflow-hidden max-w-2xl">
          <div className="h-0.5 bg-gradient-to-r from-zinc-600 to-zinc-400" />
          <CardHeader className="p-5 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl border bg-zinc-500/10 border-zinc-500/20 flex items-center justify-center text-xl shrink-0">
                  <FolderGit2 size={20} className="text-zinc-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-semibold text-foreground">GitHub Repositories</h3>
                    <Badge variant="secondary" className="text-[10px]">
                      {connectedRepos.length} connected
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 max-w-md">
                    Connect repos to monitor commits, PRs, and review metrics on the dashboard.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setShowRepoSelector(!showRepoSelector)
                  loadGithubRepos()
                }}
                className="gap-2 shrink-0"
              >
                <GitBranch size={14} /> Add Repo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {/* Connected repos list */}
            {loadingConnected ? (
              <div className="space-y-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : connectedRepos.length === 0 && !showRepoSelector ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
                  <FolderGit2 size={20} className="opacity-40" />
                </div>
                <p className="text-sm font-medium">No repositories connected</p>
                <p className="text-xs mt-1">Click &quot;Add Repo&quot; to connect a GitHub repository for monitoring.</p>
              </div>
            ) : (
              connectedRepos.length > 0 && (
                <div className="space-y-1 mb-4">
                  {connectedRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FolderGit2 size={13} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{repo.fullName || repo.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {repo.defaultBranch || 'main'}
                            {repo._count && ` · ${repo._count.commits || 0} commits · ${repo._count.pullRequests || 0} PRs`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <Badge variant="success" className="text-[10px]">Connected</Badge>
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
                          disabled={disconnectingRepo === repo.id}
                          onClick={async () => {
                            if (!confirm(`Disconnect ${repo.fullName || repo.name}? This will stop monitoring.`)) return
                            setDisconnectingRepo(repo.id)
                            try {
                              await disconnectRepo(orgId, repo.id)
                              setConnectedRepos((prev) => prev.filter((r) => r.id !== repo.id))
                            } catch (e) {
                              console.error(e)
                            } finally {
                              setDisconnectingRepo(null)
                            }
                          }}
                        >
                          {disconnectingRepo === repo.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Repo selector */}
            {showRepoSelector && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="p-3 border-b border-border bg-muted/30 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      placeholder="Search your GitHub repositories…"
                      className="pl-9 h-9"
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowRepoSelector(false)}>
                    Close
                  </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {loadingRepos && (
                    <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-sm">Loading repositories…</span>
                    </div>
                  )}
                  {!loadingRepos && filteredGithubRepos.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No repositories found
                    </p>
                  )}
                  {!loadingRepos &&
                    filteredGithubRepos.map((repo) => {
                      const alreadyConnected = isRepoConnected(repo.id)
                      return (
                        <div
                          key={repo.id}
                          className="flex items-center justify-between px-4 py-3 border-b border-border/40 last:border-b-0 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FolderGit2 size={14} className="text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{repo.fullName}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {repo.language || 'Unknown'} · {repo.defaultBranch}
                                {repo.private && ' · Private'}
                              </p>
                            </div>
                          </div>
                          {alreadyConnected ? (
                            <span className="flex items-center gap-1.5 text-xs text-emerald-500 shrink-0">
                              <Check size={12} /> Connected
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 shrink-0"
                              disabled={connectingRepo === repo.id}
                              onClick={() => setHistoryPromptRepo(repo)}
                            >
                              {connectingRepo === repo.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                'Connect'
                              )}
                            </Button>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* History sync choice dialog */}
            {historyPromptRepo && (
              <div className="border border-border rounded-xl overflow-hidden bg-card mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <FolderGit2 size={15} className="text-primary" />
                    <p className="text-sm font-semibold text-foreground">{historyPromptRepo.fullName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">How would you like to initialize the dashboard data?</p>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleConnectRepo(historyPromptRepo, true)}
                    disabled={connectingRepo === historyPromptRepo.id}
                    className="group flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-center cursor-pointer disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <History size={18} className="text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Fetch Full History</span>
                    <span className="text-[11px] text-muted-foreground leading-snug">
                      Import all existing commits &amp; PRs so the dashboard shows your complete repo history.
                    </span>
                  </button>
                  <button
                    onClick={() => handleConnectRepo(historyPromptRepo, false)}
                    disabled={connectingRepo === historyPromptRepo.id}
                    className="group flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-center cursor-pointer disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                      <Clock size={18} className="text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">Start From Now</span>
                    <span className="text-[11px] text-muted-foreground leading-snug">
                      Only track new commits &amp; PRs going forward. The dashboard starts fresh.
                    </span>
                  </button>
                </div>
                <div className="px-4 pb-3 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setHistoryPromptRepo(null)} className="text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Integrations: Connected Summary ── */}
        <div className="flex items-center gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link2 size={14} />
            <span>
              <span className="font-semibold text-foreground">{integrations.filter((i) => i.status === 'active').length}</span>{' '}
              of {INTEGRATIONS.length} connected
            </span>
          </div>
        </div>

        {isFetching ? (
          <div className="space-y-4 max-w-2xl">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                    <Skeleton className="h-9 w-24 rounded-md" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {INTEGRATIONS.map(({ type, label, icon, color, description, fields }) => {
              const connected = getIntegration(type)
              const statusInfo = connected ? STATUS_MAP[connected.status] : null
              const isExpanded = expanded === type

              return (
                <Card
                  key={type}
                  className={cn(
                    'overflow-hidden transition-all duration-200',
                    connected?.status === 'active' && 'ring-1 ring-primary/20',
                  )}
                >
                  {/* Top accent when connected */}
                  {connected?.status === 'active' && (
                    <div className="h-0.5 bg-gradient-to-r from-primary to-teal-500" />
                  )}
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'w-12 h-12 rounded-xl border flex items-center justify-center text-xl shrink-0',
                            color,
                          )}
                        >
                          {icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h3 className="font-semibold text-foreground">{label}</h3>
                            {connected && statusInfo && (
                              <span className="flex items-center gap-1.5">
                                <span className={cn('w-1.5 h-1.5 rounded-full', statusInfo.dotClass)} />
                                <Badge variant={statusInfo.variant} className="text-[10px]">
                                  {statusInfo.label}
                                </Badge>
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed max-w-md">
                            {description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {connected && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(type)}
                            className="text-muted-foreground hover:text-destructive h-9 w-9"
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                        <Button
                          variant={connected ? 'outline' : 'default'}
                          onClick={() => setExpanded(isExpanded ? null : type)}
                          className="gap-2"
                        >
                          {connected ? (
                            'Reconfigure'
                          ) : (
                            <>
                              <Plug size={14} /> Connect
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* ── Config Form ── */}
                    {isExpanded && (
                      <div className="border-t border-border mt-5 pt-5">
                        <div className="space-y-4 mb-5">
                          {fields.map(({ key, label: fieldLabel, placeholder, type: inputType }) => (
                            <div key={key}>
                              <label className="text-xs font-medium text-foreground mb-1.5 block">
                                {fieldLabel}
                              </label>
                              <Input
                                type={inputType}
                                value={forms[type]?.[key] || ''}
                                onChange={(e) =>
                                  setForms((f) => ({ ...f, [type]: { ...f[type], [key]: e.target.value } }))
                                }
                                placeholder={placeholder}
                                className="h-10"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-3">
                          <Button onClick={() => handleSave(type)} disabled={saving[type]}>
                            {saving[type] ? 'Saving…' : 'Save Configuration'}
                          </Button>
                          <Button variant="ghost" onClick={() => setExpanded(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
