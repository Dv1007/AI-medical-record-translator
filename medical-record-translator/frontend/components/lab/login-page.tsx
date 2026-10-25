'use client'

import { useState } from 'react'
import { FileText, Loader2, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandMark } from './brand-mark'

export type MockUser = { name: string; email: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage({ onLogin }: { onLogin: (user: MockUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function signIn(emailValue: string, passwordValue: string) {
    if (!EMAIL_PATTERN.test(emailValue)) {
      setError('Enter a valid email address.')
      return
    }
    if (passwordValue.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setError(null)
    setSubmitting(true)
    setTimeout(() => {
      const localPart = emailValue.split('@')[0]
      const name = localPart.charAt(0).toUpperCase() + localPart.slice(1).replace(/[._-]/g, ' ')
      onLogin({ name, email: emailValue })
    }, 900)
  }

  function signInWithDemo() {
    setEmail('alex@demo.health')
    setPassword('demo1234')
    signIn('alex@demo.health', 'demo1234')
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <BrandMark />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-balance text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-pretty text-muted-foreground">
            Sign in to review your lab reports and prepare for your next appointment.
          </p>

          <form
            className="mt-8 flex flex-col gap-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              signIn(email.trim(), password)
            }}
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                aria-invalid={error?.includes('email') || undefined}
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <span className="text-xs text-muted-foreground">Any 6+ characters</span>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-lg border border-input bg-card px-3.5 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                aria-invalid={error?.includes('Password') || undefined}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="h-11" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Lock aria-hidden="true" />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
            <Button type="button" variant="outline" size="lg" className="h-11" onClick={signInWithDemo} disabled={submitting}>
              Continue with demo account
            </Button>
          </form>

          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            This is a demo with mock authentication. No account data is stored.
          </p>
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="max-w-md">
          <p className="text-sm font-medium uppercase tracking-widest text-primary-foreground/70">
            Lab reports, explained
          </p>
          <h2 className="mt-4 text-balance text-4xl font-semibold leading-tight tracking-tight">
            Turn confusing numbers into confident conversations.
          </h2>
          <ul className="mt-10 flex flex-col gap-6">
            {[
              { Icon: FileText, title: 'Organized results', text: 'Values, units, and reference ranges in one clear table.' },
              { Icon: Sparkles, title: 'Plain-language explanations', text: 'Understand what each test measures, without jargon.' },
              { Icon: ShieldCheck, title: 'Trusted sources', text: 'Every explanation links back to recognized health authorities.' },
            ].map(({ Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-primary-foreground/75">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  )
}
