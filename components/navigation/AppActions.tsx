'use client'

import { useState } from 'react'
import { Database, LogOut, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Modal, ModalActions } from '@/components/ui'
import { cn } from '@/lib/utils'

interface AppActionsProps {
  onOpenSettings: () => void
  onOpenDataManager: () => void
  className?: string
}

const ICON_BUTTON =
  'tap-target p-2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] transition-colors'

/**
 * App-wide actions (settings, backup, sign out) for the top header, so they
 * are reachable from every view rather than only from the board.
 */
export function AppActions({ onOpenSettings, onOpenDataManager, className }: AppActionsProps) {
  const { user, signOut } = useAuth()
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  return (
    <>
      <div className={cn('items-center gap-2', className)}>
        <button type="button" onClick={onOpenDataManager} className={ICON_BUTTON} title="Backup" aria-label="Backup">
          <Database size={14} />
        </button>
        <button type="button" onClick={onOpenSettings} className={ICON_BUTTON} title="Settings" aria-label="Settings">
          <Settings size={14} />
        </button>
        {user && (
          <button
            type="button"
            onClick={() => setConfirmSignOut(true)}
            className="tap-target p-2 text-[var(--text-tertiary)] hover:text-red-400 border border-[var(--border)] hover:border-red-400/50 transition-colors"
            title={`Sign out (${user.email})`}
            aria-label="Sign out"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
      <Modal
        isOpen={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        title="Sign out"
        description="Are you sure you want to sign out?"
        size="sm"
      >
        <p className="text-[13px] sm:text-[12px] text-[var(--text-secondary)]">
          You can sign back in any time.
        </p>
        <ModalActions>
          <button
            onClick={() => setConfirmSignOut(false)}
            className="px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setConfirmSignOut(false)
              signOut()
            }}
            className="px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] bg-red-500/10 text-red-400 border border-red-400/30 hover:border-red-400/60 transition-colors"
          >
            Sign out
          </button>
        </ModalActions>
      </Modal>
    </>
  )
}
