/**
 * A tiny channel for telling the user that something failed, usable from any
 * hook without threading a context through it. The toast UI subscribes once.
 */
type Listener = (message: string) => void

const listeners = new Set<Listener>()

export function notifyError(message: string) {
  for (const listener of listeners) listener(message)
}

export function onNotifyError(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
