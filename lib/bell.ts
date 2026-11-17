/**
 * Plays a short two-tone chime with the Web Audio API. The timer used to
 * load /sounds/bell.mp3, which was never added to the project, so it was
 * silent. Generating the sound needs no file.
 */
let context: AudioContext | null = null

export function playBell(volumePercent: number) {
  if (typeof window === 'undefined') return
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return

  try {
    context ??= new Ctx()
    // Browsers suspend audio until the page has had a user gesture; the
    // timer is always started by one, so resuming here succeeds.
    void context.resume()
    const volume = Math.max(0, Math.min(1, volumePercent / 100)) * 0.4
    const start = context.currentTime

    for (const [index, frequency] of [880, 1318.5].entries()) {
      const at = start + index * 0.22
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.2)
      osc.connect(gain).connect(context.destination)
      osc.start(at)
      osc.stop(at + 1.25)
    }
  } catch {
    // Audio is a nicety; never let it break the timer.
  }
}
