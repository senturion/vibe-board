'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        color: '#fafafa',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center', padding: '1rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              marginBottom: '1rem',
            }}>
              <AlertTriangle style={{ width: '2rem', height: '2rem', color: '#ef4444' }} />
            </div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
              Critical Error
            </h1>
            <p style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>
              The application encountered a critical error. Please try refreshing the page.
            </p>
          </div>

          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <RefreshCw style={{ width: '1rem', height: '1rem' }} />
            Refresh page
          </button>
        </div>
      </body>
    </html>
  )
}
