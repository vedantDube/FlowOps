'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { ArrowLeft, BarChart2, FileText, GitBranch, Users, Zap } from 'lucide-react'

import { useAuth } from '../hooks/useAuth'
import { DotPattern } from '@/components/magicui/dot-pattern'
import { ShimmerButton } from '@/components/magicui/shimmer-button'
import { Card, CardContent } from '@/components/ui/card'
import FlowOpsLogo from '@/app/components/FlowOpsLogo'

const FEATURES = [
  { icon: BarChart2, title: 'Engineering Analytics', desc: 'PR cycle time, review latency, commit heatmaps' },
  { icon: Zap, title: 'AI Code Review', desc: 'Gemini-powered security, performance & refactor analysis' },
  { icon: FileText, title: 'AutoDocs AI', desc: 'Living README, API docs, architecture diagrams' },
  { icon: Users, title: 'Team Insights', desc: 'Sprint health score, burnout risk, delivery predictability' },
]

function LoginContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const error = params.get('error')

  useEffect(() => {
    if (!loading && user) {
      const mode = localStorage.getItem('flowops_mode');
      if (!mode) {
        router.push('/mode-select');
      } else if (mode === 'personal') {
        router.push('/personal/dashboard');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router])

  // Auto-redirect to landing page after 5s of no movement
  useEffect(() => {
    if (loading || user) return

    let timer = setTimeout(() => router.push('/'), 5000)

    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(() => router.push('/'), 5000)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, reset))

    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [loading, user, router])

  const handleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/auth/github`
  }

  if (loading) return null

  return (
    <main className="min-h-screen bg-background text-foreground flex font-sans">
      {/* Left: Features */}
      <div className="hidden lg:flex flex-col justify-center relative px-16 bg-card border-r border-border w-[55%] overflow-hidden">
        <DotPattern className="absolute inset-0 opacity-30" />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 20% 60%, rgba(74,222,128,0.08) 0%, transparent 70%)' }}
        />
        <div className="relative z-10 max-w-lg">
          <div className="mb-10">
            <FlowOpsLogo size={40} />
          </div>
          <h2 className="font-display text-4xl italic text-foreground leading-tight mb-4">
            The AI Workspace for
            <br />
            <span className="text-primary">Engineering Teams</span>
          </h2>
          <p className="text-muted-foreground mb-10 text-base">
            Unify your GitHub data, AI code review, living documentation, and
            team intelligence in one powerful platform.
          </p>
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="bg-card/60 border-border/50">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-center text-primary shrink-0">
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{title}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10">
            <FlowOpsLogo size={32} />
          </div>

          <h1 className="font-display text-3xl italic text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground mb-8">Sign in with your GitHub account to continue.</p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-card p-4 mb-6 text-sm">
              Authentication failed. Please try again.
            </div>
          )}

          <ShimmerButton onClick={handleLogin} className="w-full py-3.5 text-base justify-center">
            <GitBranch size={18} className="mr-3" />
            Continue with GitHub
          </ShimmerButton>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
