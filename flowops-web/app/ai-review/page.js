'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle, Check, CheckCircle2, ChevronDown, Code2, FileSearch, FileText,
  FolderGit2, Gauge, Loader2, RefreshCw, Search, Shield, Sparkles, Zap,
} from 'lucide-react'

import { useAuth } from '../hooks/useAuth'
import {
  fetchAIReviews,
  fetchGithubRepos,
  fetchOrgRepos,
  fetchRepoTree,
  reviewCodeFromGithub,
  triggerAIReview,
} from '../lib/api'
import { cn } from '../lib/utils'
import Layout from '../components/Layout'
import PageHeader from '../components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const scoreColor = (s) =>
  s >= 80
    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
    : s >= 60
      ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
      : 'text-red-500 bg-red-500/10 border-red-500/30'

export default function AIReviewPage() {
  const { user, orgId, loading } = useAuth()
  const router = useRouter()
  const [reviews, setReviews] = useState([])
  const [selectedReview, setSelectedReview] = useState(null)
  const [isFetching, setIsFetching] = useState(true)
  const [isTriggering, setIsTriggering] = useState(false)
  const [prInput, setPrInput] = useState('')

  // ── GitHub code review state ──
  const [reviewMode, setReviewMode] = useState('pr') // 'pr' | 'github'
  const [githubRepos, setGithubRepos] = useState([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [repoTree, setRepoTree] = useState([])
  const [loadingTree, setLoadingTree] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState(new Set())
  const [repoSearch, setRepoSearch] = useState('')
  const [fileSearch, setFileSearch] = useState('')
  const [isReviewingCode, setIsReviewingCode] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!orgId) return
    setIsFetching(true)
    Promise.allSettled([fetchAIReviews({ orgId }), fetchOrgRepos(orgId)])
      .then(([r]) => {
        if (r.status === 'fulfilled') setReviews(r.value.reviews || [])
      })
      .finally(() => setIsFetching(false))
  }, [orgId])

  const handleTrigger = async () => {
    if (!prInput.trim()) return
    setIsTriggering(true)
    try {
      const result = await triggerAIReview(prInput.trim())
      setSelectedReview(result)
      setReviews((prev) => [result, ...prev.filter((r) => r.id !== result.id)])
      setPrInput('')
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.error || e.message))
    } finally {
      setIsTriggering(false)
    }
  }

  // ── GitHub code review helpers ──
  const loadGithubRepos = async () => {
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

  const handleSelectRepo = async (repo) => {
    setSelectedRepo(repo)
    setSelectedFiles(new Set())
    setRepoTree([])
    setLoadingTree(true)
    try {
      const data = await fetchRepoTree({
        owner: repo.owner,
        repo: repo.name,
        branch: repo.defaultBranch,
      })
      setRepoTree(data.files || [])
    } catch (e) {
      alert('Failed to load file tree: ' + (e.response?.data?.error || e.message))
    } finally {
      setLoadingTree(false)
    }
  }

  const toggleFile = (path) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const selectAllFiles = () => {
    const filtered = filteredFiles
    if (selectedFiles.size === filtered.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(filtered.map((f) => f.path)))
    }
  }

  const handleReviewFromGithub = async () => {
    if (!selectedRepo || selectedFiles.size === 0) return
    setIsReviewingCode(true)
    try {
      const result = await reviewCodeFromGithub({
        owner: selectedRepo.owner,
        repo: selectedRepo.name,
        branch: selectedRepo.defaultBranch,
        filePaths: Array.from(selectedFiles),
        organizationId: orgId,
      })
      setSelectedReview(result)
      setReviews((prev) => [result, ...prev])
    } catch (e) {
      alert('Review failed: ' + (e.response?.data?.error || e.message))
    } finally {
      setIsReviewingCode(false)
    }
  }

  const filteredRepos = githubRepos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(repoSearch.toLowerCase()) ||
      r.language?.toLowerCase().includes(repoSearch.toLowerCase()),
  )

  const filteredFiles = repoTree.filter((f) =>
    f.path.toLowerCase().includes(fileSearch.toLowerCase()),
  )

  if (loading || !user) return null

  const issueCount = (r) =>
    (r.securityIssues?.length || 0) +
    (r.performanceHints?.length || 0) +
    (r.antiPatterns?.length || 0) +
    (r.refactorSuggestions?.length || 0)

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-[1440px] mx-auto">
        <PageHeader
          title="AI Code Review"
          description="Gemini-powered security, performance, and quality analysis for your pull requests."
          badge="AI"
        />

        {/* ── Trigger Bar ── */}
        <Card className="mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-teal-500 to-violet-500" />
          <CardContent className="p-5 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-primary" />
              <p className="text-sm font-semibold text-foreground">Trigger AI Review</p>
            </div>

            {/* Mode toggle */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setReviewMode('pr')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                  reviewMode === 'pr'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30',
                )}
              >
                <Zap size={14} />
                Review PR
              </button>
              <button
                onClick={() => {
                  setReviewMode('github')
                  if (githubRepos.length === 0) loadGithubRepos()
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                  reviewMode === 'github'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30',
                )}
              >
                <FolderGit2 size={14} />
                Review from GitHub
              </button>
            </div>

            {/* PR mode */}
            {reviewMode === 'pr' && (
              <div className="flex gap-3">
                <Input
                  value={prInput}
                  onChange={(e) => setPrInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTrigger()}
                  placeholder="Enter Pull Request ID (UUID from database)"
                  className="flex-1 h-10"
                />
                <Button onClick={handleTrigger} disabled={isTriggering || !prInput.trim()} className="h-10 px-5">
                  {isTriggering ? (
                    <>
                      <RefreshCw size={14} className="mr-2 animate-spin" /> Analyzing…
                    </>
                  ) : (
                    <>
                      <Zap size={14} className="mr-2" /> Analyze
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* GitHub mode */}
            {reviewMode === 'github' && (
              <div className="space-y-4">
                {/* Repo selector */}
                {!selectedRepo ? (
                  <div className="border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FolderGit2 size={14} className="text-muted-foreground" />
                      <p className="text-sm font-semibold text-foreground">Select a Repository</p>
                      {loadingRepos && (
                        <Loader2 size={14} className="animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <div className="relative mb-3">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={repoSearch}
                        onChange={(e) => setRepoSearch(e.target.value)}
                        placeholder="Search repositories…"
                        className="pl-9 h-9"
                      />
                    </div>
                    <div className="max-h-[240px] overflow-y-auto space-y-1">
                      {filteredRepos.map((repo) => (
                        <button
                          key={repo.id}
                          onClick={() => handleSelectRepo(repo)}
                          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FolderGit2 size={14} className="text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {repo.fullName}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {repo.language || 'Unknown'} · {repo.defaultBranch}
                                {repo.private && ' · Private'}
                              </p>
                            </div>
                          </div>
                          <ChevronDown size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 -rotate-90 transition-all" />
                        </button>
                      ))}
                      {!loadingRepos && filteredRepos.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          No repositories found
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Selected repo header */}
                    <div className="flex items-center justify-between border border-border rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FolderGit2 size={14} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{selectedRepo.fullName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {selectedRepo.language || 'Unknown'} · {selectedRepo.defaultBranch}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRepo(null)
                          setRepoTree([])
                          setSelectedFiles(new Set())
                        }}
                      >
                        Change
                      </Button>
                    </div>

                    {/* File tree browser */}
                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={fileSearch}
                            onChange={(e) => setFileSearch(e.target.value)}
                            placeholder="Filter files…"
                            className="pl-9 h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={selectAllFiles}
                            className="text-xs text-primary hover:underline whitespace-nowrap"
                          >
                            {selectedFiles.size === filteredFiles.length && filteredFiles.length > 0
                              ? 'Deselect All'
                              : 'Select All'}
                          </button>
                          <Badge variant="secondary" className="text-[10px]">
                            {selectedFiles.size} / {repoTree.length}
                          </Badge>
                        </div>
                      </div>
                      <div className="max-h-[280px] overflow-y-auto">
                        {loadingTree && (
                          <div className="p-6 flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 size={14} className="animate-spin" />
                            <span className="text-sm">Loading file tree…</span>
                          </div>
                        )}
                        {!loadingTree && filteredFiles.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-6">
                            No files found
                          </p>
                        )}
                        {!loadingTree &&
                          filteredFiles.map((file) => (
                            <button
                              key={file.path}
                              onClick={() => toggleFile(file.path)}
                              className={cn(
                                'w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted/40 transition-colors border-b border-border/40 last:border-b-0',
                                selectedFiles.has(file.path) && 'bg-primary/5',
                              )}
                            >
                              <div
                                className={cn(
                                  'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                                  selectedFiles.has(file.path)
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-muted-foreground/30',
                                )}
                              >
                                {selectedFiles.has(file.path) && <Check size={10} />}
                              </div>
                              <FileText size={12} className="text-muted-foreground shrink-0" />
                              <span className="text-sm text-foreground truncate">{file.path}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                                {(file.size / 1024).toFixed(1)}KB
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Review button */}
                    <Button
                      onClick={handleReviewFromGithub}
                      disabled={isReviewingCode || selectedFiles.size === 0}
                      className="h-10"
                    >
                      {isReviewingCode ? (
                        <>
                          <Loader2 size={14} className="mr-2 animate-spin" /> Reviewing…
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} className="mr-2" /> Review {selectedFiles.size} file
                          {selectedFiles.size !== 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Split Panel ── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Review List */}
          <Card className="xl:col-span-2 overflow-hidden flex flex-col">
            <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between shrink-0">
              <p className="text-sm font-semibold text-foreground">Recent Reviews</p>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                {reviews.length}
              </span>
            </CardHeader>
            <div className="overflow-y-auto max-h-[60vh] flex-1">
              {isFetching && (
                <div className="p-4 space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              )}
              {!isFetching && reviews.length === 0 && (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mb-3">
                    <FileSearch size={20} className="opacity-40" />
                  </div>
                  <p className="text-sm font-medium">No reviews yet</p>
                  <p className="text-xs mt-1">Trigger your first AI review above.</p>
                </div>
              )}
              {reviews.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReview(r)}
                  className={cn(
                    'w-full text-left p-4 border-b border-border/60 hover:bg-muted/40 transition-all duration-150',
                    selectedReview?.id === r.id && 'bg-primary/5 border-l-2 border-l-primary',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {r.pullRequest?.title || r.repoName || 'Code Review'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.source === 'github'
                          ? `${r.repoName} · ${r.fileName}`
                          : `${r.repository?.name || ''} · #${r.pullRequest?.number || ''}`}
                      </p>
                    </div>
                    {r.overallScore !== null && (
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl border flex items-center justify-center text-sm font-bold shrink-0',
                          scoreColor(r.overallScore),
                        )}
                      >
                        {r.overallScore}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2.5">
                    {r.securityIssues?.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-500">
                        <Shield size={10} />
                        {r.securityIssues.length}
                      </span>
                    )}
                    {r.performanceHints?.length > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-500">
                        <Gauge size={10} />
                        {r.performanceHints.length}
                      </span>
                    )}
                    {issueCount(r) === 0 && (
                      <span className="flex items-center gap-1 text-xs text-emerald-500">
                        <CheckCircle2 size={10} /> Clean
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Detail Panel */}
          <div className="xl:col-span-3">
            {!selectedReview ? (
              <Card className="flex flex-col items-center justify-center min-h-[400px] text-center text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
                  <Zap size={24} className="opacity-30" />
                </div>
                <p className="font-semibold text-foreground mb-1">Select a review</p>
                <p className="text-sm">Choose a review from the list to see detailed analysis.</p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                {/* Score Header */}
                <CardHeader className="p-6 border-b border-border bg-muted/30">
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold shrink-0',
                        scoreColor(selectedReview.overallScore),
                      )}
                    >
                      {selectedReview.overallScore ?? '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-base">
                        {selectedReview.pullRequest?.title || selectedReview.repoName || 'Code Review'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {selectedReview.summary}
                      </p>
                      {selectedReview.source === 'github' && selectedReview.filesReviewed && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedReview.filesReviewed.length} file{selectedReview.filesReviewed.length !== 1 ? 's' : ''} reviewed from {selectedReview.repoName}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {selectedReview.securityIssues?.length > 0 && (
                          <Badge variant="destructive" className="text-[10px]">
                            {selectedReview.securityIssues.length} Security
                          </Badge>
                        )}
                        {selectedReview.performanceHints?.length > 0 && (
                          <Badge variant="warning" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                            {selectedReview.performanceHints.length} Performance
                          </Badge>
                        )}
                        {selectedReview.antiPatterns?.length > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {selectedReview.antiPatterns.length} Anti-Patterns
                          </Badge>
                        )}
                        {selectedReview.refactorSuggestions?.length > 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            {selectedReview.refactorSuggestions.length} Refactors
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6 overflow-y-auto max-h-[50vh]">
                  {selectedReview.securityIssues?.length > 0 && (
                    <ReviewSection
                      icon={<Shield size={14} />}
                      iconColor="text-red-500"
                      bgColor="bg-red-500/5"
                      title="Security Issues"
                      count={selectedReview.securityIssues.length}
                    >
                      {selectedReview.securityIssues.map((s, i) => (
                        <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                          <Badge variant="destructive" className="mb-2 text-[10px] uppercase">
                            {s.severity}
                          </Badge>
                          <p className="text-sm text-foreground">{s.description}</p>
                        </div>
                      ))}
                    </ReviewSection>
                  )}
                  {selectedReview.performanceHints?.length > 0 && (
                    <ReviewSection
                      icon={<Gauge size={14} />}
                      iconColor="text-amber-500"
                      bgColor="bg-amber-500/5"
                      title="Performance Hints"
                      count={selectedReview.performanceHints.length}
                    >
                      {selectedReview.performanceHints.map((p, i) => (
                        <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 text-sm text-foreground">
                          {p.description}
                        </div>
                      ))}
                    </ReviewSection>
                  )}
                  {selectedReview.antiPatterns?.length > 0 && (
                    <ReviewSection
                      icon={<AlertTriangle size={14} />}
                      iconColor="text-orange-500"
                      bgColor="bg-orange-500/5"
                      title="Anti-Patterns"
                      count={selectedReview.antiPatterns.length}
                    >
                      {selectedReview.antiPatterns.map((a, i) => (
                        <div key={i} className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-4">
                          <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                            {a.pattern}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1.5">{a.suggestion}</p>
                        </div>
                      ))}
                    </ReviewSection>
                  )}
                  {selectedReview.refactorSuggestions?.length > 0 && (
                    <ReviewSection
                      icon={<Code2 size={14} />}
                      iconColor="text-teal-500"
                      bgColor="bg-teal-500/5"
                      title="Refactor Suggestions"
                      count={selectedReview.refactorSuggestions.length}
                    >
                      {selectedReview.refactorSuggestions.map((r, i) => (
                        <div key={i} className="bg-teal-500/5 border border-teal-500/10 rounded-xl p-4">
                          <p className="text-sm text-foreground">{r.description}</p>
                          {r.code && (
                            <pre className="mt-3 text-xs text-primary bg-background/80 rounded-lg p-3 overflow-x-auto border border-border/50 font-mono">
                              {r.code}
                            </pre>
                          )}
                        </div>
                      ))}
                    </ReviewSection>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

function ReviewSection({ icon, iconColor, bgColor, title, count, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('w-6 h-6 rounded-lg flex items-center justify-center', bgColor, iconColor)}>
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md ml-1">
          {count}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
