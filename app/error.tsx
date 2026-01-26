'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console in development
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-display text-[var(--text-primary)] mb-2">
            Something went wrong
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            An unexpected error occurred. Don&apos;t worry, your data is safe.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-[var(--bg-secondary)] border border-[var(--border)] text-left overflow-auto max-h-48">
            <p className="text-xs font-mono text-red-400 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-[var(--text-tertiary)] mt-2">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent)]/90 transition-colors"
          >
            <RefreshCw size={16} />
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] text-sm hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors"
          >
            <Home size={16} />
            Go home
          </a>
        </div>
      </div>
    </div>
  )
}
