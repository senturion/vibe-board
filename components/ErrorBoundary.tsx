'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Fallback UI to render when an error occurs */
  fallback?: ReactNode
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Custom reset handler - if not provided, will attempt to re-render children */
  onReset?: () => void
  /** Section name for error messages */
  section?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Reusable error boundary component for wrapping specific sections of the app.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary section="Dashboard">
 *   <DashboardContent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.section || 'component'}:`, error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[200px] bg-[var(--bg-secondary)] border border-[var(--border)]">
          <div className="flex items-center gap-2 text-red-500 mb-3">
            <AlertTriangle size={20} />
            <span className="text-sm font-medium">
              {this.props.section ? `${this.props.section} failed to load` : 'Something went wrong'}
            </span>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <p className="text-xs font-mono text-[var(--text-tertiary)] mb-4 max-w-md text-center break-all">
              {this.state.error.message}
            </p>
          )}

          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)] transition-colors"
          >
            <RefreshCw size={12} />
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook-friendly wrapper for ErrorBoundary with reset key support.
 * Useful when you need to reset the boundary from outside.
 */
interface ErrorBoundaryWithResetProps extends Omit<ErrorBoundaryProps, 'onReset'> {
  resetKey?: string | number
}

export function ErrorBoundaryWithReset({ resetKey, ...props }: ErrorBoundaryWithResetProps) {
  return <ErrorBoundary key={resetKey} {...props} />
}
