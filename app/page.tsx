'use client'

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { installAudioUnlock, playSound } from '@/lib/audio'
import { loadState, saveState } from '@/lib/storage'
import { DEFAULT_SOUND_SETTINGS, SOUND_CATEGORY_LABELS, SOUND_CATEGORY_ORDER, type SoundCategory, type SoundSettings, type Theme } from '@/lib/settings'

type Tool = 'Timer' | 'Stopwatch' | 'Alarm' | 'Session'

const cities = [
  { city: 'Mumbai', country: 'India', zone: 'Asia/Kolkata' },
  { city: 'Paris', country: 'France', zone: 'Europe/Paris' },
  { city: 'Tokyo', country: 'Japan', zone: 'Asia/Tokyo' },
]

function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

function WorldClocks() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <section className="world-clocks" aria-labelledby="world-clock-heading">
      <div className="section-label" id="world-clock-heading">World Clock</div>
      <div className="clock-list">
        {cities.map((place) => (
          <div className="clock-row" key={place.city}>
            <div>
              <div className="city-name">{place.city}</div>
              <div className="country-name">{place.country}</div>
            </div>
            <time className="city-time">
              {new Intl.DateTimeFormat('en-GB', { timeZone: place.zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now)}
            </time>
          </div>
        ))}
      </div>
    </section>
  )
}

function splitSeconds(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { hours, minutes, seconds }
}

function clampUnit(value: string, max: number) {
  const parsed = Number.parseInt(value.replace(/\D/g, ''), 10)
  if (Number.isNaN(parsed)) return 0
  return Math.min(Math.max(parsed, 0), max)
}

/**
 * A 2-digit time input (hours/minutes/seconds) used everywhere the app lets
 * you type a duration or clock time. Two things make this safe to type into:
 *  - it keeps its own local text while you're typing, and only clamps/pads
 *    to 2 digits on blur — padding on every keystroke is what causes the
 *    cursor to jump to the wrong spot in a controlled input.
 *  - it selects its full contents on focus, so clicking in (or tabbing in)
 *    lets you immediately type over the old value, like a native time picker.
 */
function TimeField({ value, max, onCommit, ariaLabel, size = 'lg' }: {
  value: number
  max: number
  onCommit: (value: number) => void
  ariaLabel: string
  size?: 'lg' | 'md'
}) {
  const [text, setText] = useState(() => String(value).padStart(2, '0'))

  useEffect(() => {
    setText(String(value).padStart(2, '0'))
  }, [value])

  function commit(raw: string) {
    const clamped = clampUnit(raw, max)
    setText(String(clamped).padStart(2, '0'))
    onCommit(clamped)
  }

  return (
    <input
      className={`time-field time-field-${size}`}
      type="text"
      inputMode="numeric"
      maxLength={2}
      value={text}
      onFocus={(event) => event.target.select()}
      onChange={(event) => setText(event.target.value.replace(/\D/g, '').slice(0, 2))}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur()
        } else if (event.key === 'Escape') {
          setText(String(value).padStart(2, '0'))
          event.currentTarget.blur()
        }
      }}
      aria-label={ariaLabel}
    />
  )
}

/**
 * Owns the Timer's live countdown (duration, seconds remaining, running
 * state) at the Page level — same reason as useAlarms: state that only
 * lived inside TimerPanel would reset the instant you switched tabs, since
 * TimerPanel unmounts when it's not the active tool.
 */
function useTimer() {
  const DEFAULT_SECONDS = 25 * 60
  const [initialSeconds, setInitialSeconds] = useState(DEFAULT_SECONDS)
  const [seconds, setSeconds] = useState(DEFAULT_SECONDS)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const saved = loadState<number>('timer-duration', DEFAULT_SECONDS)
    setInitialSeconds(saved)
    setSeconds(saved)
  }, [])

  useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          setRunning(false)
          playSound('complete', 'timer')
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [running])

  function setDuration(next: number) {
    const value = next > 0 ? next : DEFAULT_SECONDS
    setInitialSeconds(value)
    setSeconds(value)
    saveState('timer-duration', value)
    playSound('button', 'button')
  }

  function toggleRunning() {
    if (seconds === 0) return
    setRunning((value) => !value)
    playSound('button', 'button')
  }

  function reset() {
    setRunning(false)
    setSeconds(initialSeconds)
    playSound('button', 'button')
  }

  return { initialSeconds, seconds, running, setDuration, toggleRunning, reset }
}

function TimerPanel({ initialSeconds, seconds, running, setDuration, toggleRunning, reset }: ReturnType<typeof useTimer>) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => splitSeconds(initialSeconds))

  function openEdit() {
    if (running) return
    setDraft(splitSeconds(initialSeconds || seconds))
    setEditing(true)
  }

  function confirmEdit() {
    setDuration(draft.hours * 3600 + draft.minutes * 60 + draft.seconds)
    setEditing(false)
  }

  function cancelEdit() {
    setEditing(false)
  }

  return (
    <div className="main-panel">
      {editing ? (
        <div className="timer-edit" role="group" aria-label="Edit timer duration" onKeyDown={(event) => { if (event.key === 'Escape') cancelEdit() }}>
          <TimeField value={draft.hours} max={23} onCommit={(next) => setDraft((value) => ({ ...value, hours: next }))} ariaLabel="Hours" size="lg" />
          <span className="time-sep time-sep-lg">:</span>
          <TimeField value={draft.minutes} max={59} onCommit={(next) => setDraft((value) => ({ ...value, minutes: next }))} ariaLabel="Minutes" size="lg" />
          <span className="time-sep time-sep-lg">:</span>
          <TimeField value={draft.seconds} max={59} onCommit={(next) => setDraft((value) => ({ ...value, seconds: next }))} ariaLabel="Seconds" size="lg" />
        </div>
      ) : (
        <button
          type="button"
          className="timer-display-button"
          aria-live="polite"
          onClick={openEdit}
          disabled={running}
          title={running ? undefined : 'Click to edit duration'}
        >
          <span className="timer-display">{formatTime(seconds)}</span>
        </button>
      )}
      <div className="progress-track"><div className="progress-fill" style={{ width: `${(seconds / (initialSeconds || 1)) * 100}%` }} /></div>
      <div className="panel-actions">
        {editing ? (
          <>
            <button className="button button-green" onClick={confirmEdit}>Set</button>
            <button className="button button-quiet" onClick={cancelEdit}>Cancel</button>
          </>
        ) : (
          <>
            <button className="button button-red" onClick={toggleRunning}>{running ? 'Pause' : 'Start'}</button>
            <button className="button button-quiet" onClick={reset}>Reset</button>
            <button className="button button-quiet" onClick={openEdit} disabled={running}>Edit</button>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Same reasoning as useTimer — owns the Stopwatch's live elapsed time at the
 * Page level so it keeps running when you switch to another tab.
 */
function useStopwatch() {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [running, setRunning] = useState(false)
  const startRef = useRef<number>(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    startRef.current = Date.now() - elapsedMs

    function tick() {
      setElapsedMs(Date.now() - startRef.current)
      frameRef.current = window.requestAnimationFrame(tick)
    }
    frameRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  function toggleRunning() {
    setRunning((value) => !value)
  }

  function reset() {
    setRunning(false)
    setElapsedMs(0)
  }

  return { elapsedMs, running, toggleRunning, reset }
}

function StopwatchPanel({ elapsedMs, running, toggleRunning, reset }: ReturnType<typeof useStopwatch>) {
  const wholeSeconds = Math.floor(elapsedMs / 1000)
  const centiseconds = Math.floor((elapsedMs % 1000) / 10)

  return (
    <div className="main-panel">
      <div className="stopwatch-display">
        <span className="timer-display">{formatTime(wholeSeconds)}</span>
        <span className="timer-display-ms">.{String(centiseconds).padStart(2, '0')}</span>
      </div>
      <div className="panel-actions">
        <button className="button button-blue" onClick={toggleRunning}>{running ? 'Stop' : 'Start'}</button>
        <button className="button button-quiet" onClick={reset}>Reset</button>
      </div>
    </div>
  )
}

type Alarm = {
  id: string
  hour: number
  minute: number
  label: string
  days: number[] // 0 = Sunday … 6 = Saturday. Empty = one-time (fires once, then turns off).
  enabled: boolean
  lastFiredStamp: string
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const WEEKDAYS = [1, 2, 3, 4, 5]
const WEEKENDS = [0, 6]

function sameDaySet(a: number[], b: number[]) {
  return a.length === b.length && [...a].sort().every((value, index) => value === [...b].sort()[index])
}

function daysSummary(days: number[]) {
  if (days.length === 0) return 'One-time'
  if (days.length === 7) return 'Every day'
  if (sameDaySet(days, WEEKDAYS)) return 'Weekdays'
  if (sameDaySet(days, WEEKENDS)) return 'Weekends'
  return [...days].sort().map((d) => DAY_LABELS[d]).join(' ')
}

function formatAlarmTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const SEED_ALARMS: Alarm[] = [
  { id: 'seed-1', hour: 8, minute: 30, label: 'Morning', days: WEEKDAYS, enabled: true, lastFiredStamp: '' },
]

/**
 * Owns alarm data, persistence, and the every-second check for whether an
 * alarm should fire. Used once at the top of the app (in Page), NOT inside
 * AlarmPanel — alarms must keep firing no matter which tab is active, and a
 * hook/state that only lived inside AlarmPanel would stop running the moment
 * you switched to Timer/Stopwatch/Session/Settings, since that tab's content
 * unmounts. This is exactly what caused alarms to silently not ring unless
 * you happened to be sitting on the Alarm tab when the time hit.
 */
function useAlarms() {
  const [alarms, setAlarms] = useState<Alarm[]>(SEED_ALARMS)
  const [loaded, setLoaded] = useState(false)
  const [ringingId, setRingingId] = useState<string | null>(null)
  const ringingAudioRef = useRef<HTMLAudioElement | null>(null)
  const snoozeTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setAlarms(loadState<Alarm[]>('alarms', SEED_ALARMS))
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    saveState('alarms', alarms)
  }, [alarms, loaded])

  function triggerRing(alarm: Alarm) {
    setRingingId(alarm.id)
    ringingAudioRef.current = playSound('alarm', 'alarm', { loop: true })
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = new Date()
      const hh = now.getHours()
      const mm = now.getMinutes()
      const dow = now.getDay()
      const stamp = `${now.toDateString()} ${hh}:${mm}`

      // Read the current alarm state first. React state updates are queued, so
      // trying to assign `fired` from inside setAlarms() and reading it
      // immediately afterwards can leave it null. That was the reason alarms
      // were being marked as fired without ever starting the sound.
      const dueAlarms = alarms.filter((alarm) => {
        if (!alarm.enabled || alarm.lastFiredStamp === stamp) return false
        if (alarm.hour !== hh || alarm.minute !== mm) return false
        if (alarm.days.length > 0 && !alarm.days.includes(dow)) return false
        return true
      })

      if (dueAlarms.length === 0) return

      setAlarms((current) => current.map((alarm) => {
        if (!dueAlarms.some((due) => due.id === alarm.id)) return alarm
        return { ...alarm, lastFiredStamp: stamp, enabled: alarm.days.length > 0 }
      }))

      // Trigger the side effect outside the state updater.
      dueAlarms.forEach(triggerRing)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [alarms])

  function stopRinging() {
    ringingAudioRef.current?.pause()
    ringingAudioRef.current = null
    setRingingId(null)
  }

  function dismiss() {
    stopRinging()
    playSound('button', 'button')
  }

  function snooze() {
    const ringing = alarms.find((alarm) => alarm.id === ringingId)
    stopRinging()
    playSound('button', 'button')
    if (!ringing) return
    if (snoozeTimeoutRef.current) window.clearTimeout(snoozeTimeoutRef.current)
    snoozeTimeoutRef.current = window.setTimeout(() => triggerRing(ringing), 5 * 60 * 1000)
  }

  const ringingAlarm = alarms.find((alarm) => alarm.id === ringingId) ?? null

  return { alarms, setAlarms, ringingAlarm, dismiss, snooze }
}

function AlarmPanel({ alarms, setAlarms }: { alarms: Alarm[]; setAlarms: Dispatch<SetStateAction<Alarm[]>> }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ hour: 8, minute: 0, label: '', days: [] as number[] })

  function openAdd() {
    setEditingId(null)
    setForm({ hour: 8, minute: 0, label: '', days: [] })
    setFormOpen(true)
  }

  function openEditAlarm(alarm: Alarm) {
    setEditingId(alarm.id)
    setForm({ hour: alarm.hour, minute: alarm.minute, label: alarm.label, days: alarm.days })
    setFormOpen(true)
  }

  function toggleFormDay(day: number) {
    setForm((value) => ({
      ...value,
      days: value.days.includes(day) ? value.days.filter((d) => d !== day) : [...value.days, day],
    }))
  }

  function saveForm() {
    if (editingId) {
      setAlarms((current) => current.map((alarm) => (
        alarm.id === editingId
          ? { ...alarm, hour: form.hour, minute: form.minute, label: form.label, days: form.days }
          : alarm
      )))
    } else {
      setAlarms((current) => [
        ...current,
        { id: crypto.randomUUID(), hour: form.hour, minute: form.minute, label: form.label, days: form.days, enabled: true, lastFiredStamp: '' },
      ])
    }
    setFormOpen(false)
    playSound('button', 'button')
  }

  function deleteAlarm(id: string) {
    setAlarms((current) => current.filter((alarm) => alarm.id !== id))
    setFormOpen(false)
    playSound('button', 'button')
  }

  function toggleEnabled(id: string) {
    setAlarms((current) => current.map((alarm) => (alarm.id === id ? { ...alarm, enabled: !alarm.enabled } : alarm)))
    playSound('button', 'button')
  }

  return (
    <div className="main-panel simple-panel alarm-panel">
      {formOpen ? (
        <div className="alarm-form" onKeyDown={(event) => { if (event.key === 'Escape') setFormOpen(false) }}>
          <div className="alarm-form-time">
            <TimeField value={form.hour} max={23} onCommit={(next) => setForm((value) => ({ ...value, hour: next }))} ariaLabel="Hour" size="md" />
            <span className="time-sep time-sep-md">:</span>
            <TimeField value={form.minute} max={59} onCommit={(next) => setForm((value) => ({ ...value, minute: next }))} ariaLabel="Minute" size="md" />
          </div>
          <input
            className="form-input"
            type="text"
            placeholder="Label (optional)"
            value={form.label}
            onChange={(event) => setForm((value) => ({ ...value, label: event.target.value }))}
          />
          <div className="day-picker">
            {DAY_LABELS.map((label, index) => (
              <button
                key={index}
                type="button"
                className={`day-chip ${form.days.includes(index) ? 'active' : ''}`}
                onClick={() => toggleFormDay(index)}
                aria-pressed={form.days.includes(index)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="panel-actions">
            <button className="button button-green" onClick={saveForm}>{editingId ? 'Save' : 'Add alarm'}</button>
            <button className="button button-quiet" onClick={() => setFormOpen(false)}>Cancel</button>
            {editingId && <button className="button button-quiet" onClick={() => deleteAlarm(editingId)}>Delete</button>}
          </div>
        </div>
      ) : (
        <>
          <div className="alarm-list">
            {alarms.length === 0 && <div className="alarm-empty">No alarms yet.</div>}
            {alarms.map((alarm) => (
              <div key={alarm.id} className={`alarm-row ${alarm.enabled ? '' : 'alarm-row-off'}`}>
                <button className="alarm-row-main" onClick={() => openEditAlarm(alarm)}>
                  <div className="alarm-time">{formatAlarmTime(alarm.hour, alarm.minute)}</div>
                  <div className="alarm-meta">{alarm.label || 'Alarm'} · {daysSummary(alarm.days)}</div>
                </button>
                <div className="alarm-row-controls">
                  <label className="switch">
                    <input type="checkbox" checked={alarm.enabled} onChange={() => toggleEnabled(alarm.id)} />
                    <span className="slider" />
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Delete ${alarm.label || 'alarm'} at ${formatAlarmTime(alarm.hour, alarm.minute)}`}
                    onClick={() => deleteAlarm(alarm.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="button button-green" onClick={openAdd}>Add alarm</button>
        </>
      )}
    </div>
  )
}

type SessionPhase = 'idle' | 'work' | 'break' | 'complete'

type SessionConfig = {
  workHours: number
  workMinutes: number
  breakHours: number
  breakMinutes: number
  rounds: number
}

const DEFAULT_SESSION_CONFIG: SessionConfig = { workHours: 0, workMinutes: 50, breakHours: 0, breakMinutes: 10, rounds: 4 }

function sessionSeconds(config: SessionConfig) {
  return {
    work: config.workHours * 3600 + config.workMinutes * 60,
    break: config.breakHours * 3600 + config.breakMinutes * 60,
  }
}

function formatDurationLabel(hours: number, minutes: number) {
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

function sanitizeSessionConfig(input: SessionConfig): SessionConfig {
  const work = input.workHours * 3600 + input.workMinutes * 60
  const brk = input.breakHours * 3600 + input.breakMinutes * 60
  return {
    workHours: work > 0 ? input.workHours : 0,
    workMinutes: work > 0 ? input.workMinutes : 1,
    breakHours: brk > 0 ? input.breakHours : 0,
    breakMinutes: brk > 0 ? input.breakMinutes : 1,
    rounds: Math.min(Math.max(Math.round(input.rounds) || 1, 1), 12),
  }
}

/**
 * Same reasoning as useTimer/useAlarms — owns Session's live phase/round/
 * remaining/running state at the Page level so an in-progress session keeps
 * running when you switch to another tab, instead of resetting.
 */
function useSession() {
  const [config, setConfig] = useState<SessionConfig>(DEFAULT_SESSION_CONFIG)
  const [phase, setPhase] = useState<SessionPhase>('idle')
  const [round, setRound] = useState(1)
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    setConfig(loadState('session-config', DEFAULT_SESSION_CONFIG))
  }, [])

  function advancePhase(currentPhase: SessionPhase, currentRound: number) {
    if (currentPhase === 'work') {
      if (currentRound < config.rounds) {
        playSound('sessionTransition', 'session')
        setPhase('break')
        setRemaining(sessionSeconds(config).break)
      } else {
        playSound('complete', 'session')
        setPhase('complete')
        setRunning(false)
      }
    } else if (currentPhase === 'break') {
      playSound('sessionTransition', 'session')
      setRound(currentRound + 1)
      setPhase('work')
      setRemaining(sessionSeconds(config).work)
    }
  }

  useEffect(() => {
    if (!running || phase === 'idle' || phase === 'complete') return
    const timeout = window.setTimeout(() => {
      if (remaining > 1) {
        setRemaining(remaining - 1)
      } else {
        advancePhase(phase, round)
      }
    }, 1000)
    return () => window.clearTimeout(timeout)
  }, [running, remaining, phase, round, config])

  function beginSession() {
    setPhase('work')
    setRound(1)
    setRemaining(sessionSeconds(config).work)
    setRunning(true)
    playSound('button', 'button')
  }

  function pauseResume() {
    setRunning((value) => !value)
    playSound('button', 'button')
  }

  function skip() {
    if (phase !== 'work' && phase !== 'break') return
    advancePhase(phase, round)
    playSound('button', 'button')
  }

  function reset() {
    setPhase('idle')
    setRound(1)
    setRemaining(0)
    setRunning(false)
    playSound('button', 'button')
  }

  function saveConfig(next: SessionConfig) {
    const sanitized = sanitizeSessionConfig(next)
    setConfig(sanitized)
    saveState('session-config', sanitized)
    playSound('button', 'button')
  }

  return { config, phase, round, remaining, running, beginSession, pauseResume, skip, reset, saveConfig }
}

function SessionPanel({ config, phase, round, remaining, running, beginSession, pauseResume, skip, reset, saveConfig }: ReturnType<typeof useSession>) {
  const [formOpen, setFormOpen] = useState(false)
  const [formDraft, setFormDraft] = useState<SessionConfig>(config)

  function openEdit() {
    if (phase === 'work' || phase === 'break') return
    setFormDraft(config)
    setFormOpen(true)
  }

  function saveEdit() {
    saveConfig(formDraft)
    setFormOpen(false)
  }

  function adjustRounds(delta: number) {
    setFormDraft((value) => ({ ...value, rounds: Math.min(Math.max(value.rounds + delta, 1), 12) }))
  }

  const active = phase === 'work' || phase === 'break'
  const phaseTotal = phase === 'break' ? sessionSeconds(config).break : sessionSeconds(config).work
  const displaySeconds = active ? remaining : sessionSeconds(config).work

  return (
    <div className="main-panel simple-panel session-panel">
      {formOpen ? (
        <div className="session-form" onKeyDown={(event) => { if (event.key === 'Escape') setFormOpen(false) }}>
          <div className="session-config-row">
            <div className="session-config-label">Work</div>
            <div className="alarm-form-time">
              <TimeField value={formDraft.workHours} max={23} onCommit={(next) => setFormDraft((value) => ({ ...value, workHours: next }))} ariaLabel="Work hours" size="md" />
              <span className="time-sep time-sep-md">h</span>
              <TimeField value={formDraft.workMinutes} max={59} onCommit={(next) => setFormDraft((value) => ({ ...value, workMinutes: next }))} ariaLabel="Work minutes" size="md" />
              <span className="time-sep time-sep-md">m</span>
            </div>
          </div>
          <div className="session-config-row">
            <div className="session-config-label">Break</div>
            <div className="alarm-form-time">
              <TimeField value={formDraft.breakHours} max={23} onCommit={(next) => setFormDraft((value) => ({ ...value, breakHours: next }))} ariaLabel="Break hours" size="md" />
              <span className="time-sep time-sep-md">h</span>
              <TimeField value={formDraft.breakMinutes} max={59} onCommit={(next) => setFormDraft((value) => ({ ...value, breakMinutes: next }))} ariaLabel="Break minutes" size="md" />
              <span className="time-sep time-sep-md">m</span>
            </div>
          </div>
          <div className="session-config-row">
            <div className="session-config-label">Rounds</div>
            <div className="rounds-stepper">
              <button type="button" className="icon-button icon-button-neutral" onClick={() => adjustRounds(-1)} disabled={formDraft.rounds <= 1} aria-label="Fewer rounds">−</button>
              <span className="rounds-value">{formDraft.rounds}</span>
              <button type="button" className="icon-button icon-button-neutral" onClick={() => adjustRounds(1)} disabled={formDraft.rounds >= 12} aria-label="More rounds">+</button>
            </div>
          </div>
          <div className="panel-actions">
            <button className="button button-green" onClick={saveEdit}>Save</button>
            <button className="button button-quiet" onClick={() => setFormOpen(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="simple-time">{formatTime(displaySeconds)}</div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${active ? (remaining / (phaseTotal || 1)) * 100 : 0}%` }} /></div>
          <div className="simple-copy">
            {phase === 'idle' && `Work ${formatDurationLabel(config.workHours, config.workMinutes)} · Break ${formatDurationLabel(config.breakHours, config.breakMinutes)} · ${config.rounds} rounds`}
            {phase === 'work' && `Focus block · Round ${round} of ${config.rounds}`}
            {phase === 'break' && `Break · Round ${round} of ${config.rounds}`}
            {phase === 'complete' && `Session complete · ${config.rounds} rounds done`}
          </div>
          <div className="panel-actions">
            {active ? (
              <>
                <button className="button button-red" onClick={pauseResume}>{running ? 'Pause' : 'Resume'}</button>
                <button className="button button-quiet" onClick={skip}>Skip</button>
              </>
            ) : (
              <button className="button button-blue" onClick={beginSession}>Begin session</button>
            )}
            <button className="button button-quiet" onClick={reset} disabled={phase === 'idle'}>Reset</button>
            <button className="button button-quiet" onClick={openEdit} disabled={active}>Edit</button>
          </div>
        </>
      )}
    </div>
  )
}

const THEME_OPTIONS: { value: Theme; name: string; description: string }[] = [
  { value: 'dark', name: 'Dark', description: 'Low-light, high-contrast display' },
  { value: 'light', name: 'Light', description: 'Bright, daylight-friendly display' },
]

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

function SettingsPanel() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [soundSettings, setSoundSettings] = useState<SoundSettings>(DEFAULT_SOUND_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setTheme(loadState<Theme>('theme', 'dark'))
    setSoundSettings(loadState<SoundSettings>('sound-settings', DEFAULT_SOUND_SETTINGS))
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    applyTheme(theme)
    saveState('theme', theme)
  }, [theme, loaded])

  useEffect(() => {
    if (!loaded) return
    saveState('sound-settings', soundSettings)
  }, [soundSettings, loaded])

  function selectTheme(next: Theme) {
    setTheme(next)
    playSound('button', 'button')
  }

  function toggleMuted(category: SoundCategory) {
    setSoundSettings((value) => ({ ...value, [category]: { ...value[category], muted: !value[category].muted } }))
    playSound('button', 'button')
  }

  function setVolume(category: SoundCategory, volume: number) {
    setSoundSettings((value) => ({ ...value, [category]: { ...value[category], volume } }))
  }

  return (
    <div className="main-panel settings-panel">
      <div className="settings-section">
        <div className="settings-section-title">Theme</div>
        <div className="theme-options">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`theme-option ${theme === option.value ? 'active' : ''}`}
              onClick={() => selectTheme(option.value)}
              aria-pressed={theme === option.value}
            >
              <div className="theme-option-name">{option.name}</div>
              <div className="theme-option-desc">{option.description}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-section-title">Sound</div>
        {SOUND_CATEGORY_ORDER.map((category) => {
          const setting = soundSettings[category]
          return (
            <div key={category} className="sound-row">
              <div className="sound-row-label">{SOUND_CATEGORY_LABELS[category]}</div>
              <div className="sound-row-controls">
                <input
                  className="volume-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(setting.volume * 100)}
                  disabled={setting.muted}
                  onChange={(event) => setVolume(category, Number(event.target.value) / 100)}
                  aria-label={`${SOUND_CATEGORY_LABELS[category]} volume`}
                />
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={!setting.muted}
                    onChange={() => toggleMuted(category)}
                    aria-label={`${SOUND_CATEGORY_LABELS[category]} sound ${setting.muted ? 'disabled' : 'enabled'}`}
                  />
                  <span className="slider" />
                </label>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Page() {
  useEffect(() => {
    installAudioUnlock()
  }, [])
  const [activeTool, setActiveTool] = useState<Tool>('Timer')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const tools = useMemo(() => ['Timer', 'Stopwatch', 'Alarm', 'Session'] as Tool[], [])
  const { alarms, setAlarms, ringingAlarm, dismiss, snooze } = useAlarms()
  const timer = useTimer()
  const stopwatch = useStopwatch()
  const session = useSession()

  return (
    <main className="timer-app">
      <aside className="sidebar">
        <div className="brand">CHRONO<span>.</span></div>
        <WorldClocks />
        <nav className="tool-nav" aria-label="Timer tools">
          {tools.map((tool) => (
            <button
              key={tool}
              className={`nav-item ${!settingsOpen && activeTool === tool ? 'active' : ''}`}
              onClick={() => { setActiveTool(tool); setSettingsOpen(false) }}
            >
              <span className="nav-dot" />{tool}
            </button>
          ))}
        </nav>
        <button className={`settings-button ${settingsOpen ? 'active' : ''}`} onClick={() => setSettingsOpen(true)} aria-pressed={settingsOpen}>
          <span className="settings-mark">+</span> Settings
        </button>
      </aside>
      <section className="workspace">
        <header className="workspace-header" aria-hidden="true" />
        <h1 className="sr-only">{settingsOpen ? 'Settings' : activeTool}</h1>
        {ringingAlarm && (
          <div className="ringing-banner-wrap">
            <div className="ringing-banner">
              <div>
                <div className="ringing-time">{formatAlarmTime(ringingAlarm.hour, ringingAlarm.minute)}</div>
                <div className="ringing-label">{ringingAlarm.label || 'Alarm'}</div>
              </div>
              <div className="panel-actions">
                <button className="button button-quiet" onClick={snooze}>Snooze 5m</button>
                <button className="button button-red" onClick={dismiss}>Dismiss</button>
              </div>
            </div>
          </div>
        )}
        {settingsOpen ? (
          <SettingsPanel />
        ) : (
          <>
            {activeTool === 'Timer' && <TimerPanel {...timer} />}
            {activeTool === 'Stopwatch' && <StopwatchPanel {...stopwatch} />}
            {activeTool === 'Alarm' && <AlarmPanel alarms={alarms} setAlarms={setAlarms} />}
            {activeTool === 'Session' && <SessionPanel {...session} />}
          </>
        )}
        <footer className="workspace-footer"><span>LOCAL TIME</span><span>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}</span></footer>
      </section>
    </main>
  )
}
