export type Theme = 'dark' | 'light'

// "button" is a single global category covering UI click feedback everywhere
// (Timer/Alarm/Session all route their button clicks through it) — only the
// alert-style sounds (complete/alarm/transition) are split per section, since
// those are what the app spec calls out as needing individual control.
export type SoundCategory = 'timer' | 'alarm' | 'session' | 'button'

export type SoundCategorySettings = {
  muted: boolean
  volume: number // 0–1
}

export type SoundSettings = Record<SoundCategory, SoundCategorySettings>

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  timer: { muted: false, volume: 1 },
  alarm: { muted: false, volume: 1 },
  session: { muted: false, volume: 1 },
  button: { muted: false, volume: 1 },
}

export const SOUND_CATEGORY_ORDER: SoundCategory[] = ['timer', 'alarm', 'session', 'button']

export const SOUND_CATEGORY_LABELS: Record<SoundCategory, string> = {
  timer: 'Timer',
  alarm: 'Alarm',
  session: 'Session',
  button: 'Button clicks',
}
