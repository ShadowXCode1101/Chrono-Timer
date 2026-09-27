'use client'

import { loadState } from './storage'
import { DEFAULT_SOUND_SETTINGS, type SoundCategory } from './settings'

// Central place for every sound effect the app plays.
// Drop the audio files into /public/sounds using these exact filenames.
export const SOUND_FILES = {
  complete: '/sounds/complete.mp3',
  alarm: '/sounds/alarm.mp3',
  sessionTransition: '/sounds/session-transition.mp3',
  button: '/sounds/button.mp3',
} as const

export type SoundKey = keyof typeof SOUND_FILES

type PlayOptions = {
  volume?: number
  loop?: boolean
}

let audioUnlocked = false
let unlockListenersInstalled = false

/**
 * Browsers can block audio started by a timer because the timer is not a
 * user gesture. The first click/key press in Chrono is used to unlock the
 * audio elements, after which scheduled alarms can play normally.
 */
export function installAudioUnlock() {
  if (typeof window === 'undefined' || unlockListenersInstalled) return
  unlockListenersInstalled = true

  const unlock = () => {
    if (audioUnlocked) return

    const probes = Object.values(SOUND_FILES).map((src) => {
      const audio = new Audio(src)
      audio.preload = 'auto'
      audio.volume = 0
      return audio.play()
        .then(() => {
          audio.pause()
          audio.currentTime = 0
        })
        .catch(() => undefined)
    })

    Promise.all(probes).finally(() => {
      audioUnlocked = true
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('touchstart', unlock)
    })
  }

  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
  window.addEventListener('touchstart', unlock, { once: true })
}

/**
 * Plays a sound effect while honoring the category's mute/volume setting.
 * Errors are logged instead of swallowed so a bad/missing asset is visible
 * during development.
 */
export function playSound(key: SoundKey, category: SoundCategory, options: PlayOptions = {}): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null

  const allSettings = loadState('sound-settings', DEFAULT_SOUND_SETTINGS)
  const settings = allSettings[category] ?? DEFAULT_SOUND_SETTINGS[category]
  if (settings.muted) return null

  const audio = new Audio(SOUND_FILES[key])
  audio.preload = 'auto'
  audio.volume = Math.min(Math.max((options.volume ?? 1) * settings.volume, 0), 1)
  audio.loop = options.loop ?? false

  audio.addEventListener('error', () => {
    console.error(`[Chrono] Failed to load sound: ${SOUND_FILES[key]}`)
  }, { once: true })

  audio.play().catch((error) => {
    console.warn(`[Chrono] Could not play ${key} sound. The browser may still require a user interaction to unlock audio.`, error)
  })

  return audio
}
