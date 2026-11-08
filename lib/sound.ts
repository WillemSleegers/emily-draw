/**
 * Relaxing, synthesised sound for drawing - Web Audio only, no audio files.
 *
 * - Solid brush: music-box plucks on a slow, steady beat while the brush moves.
 * - Soft brush: a warm pad that swells while drawing and glides between notes.
 * - Eraser: a soft, low "whoosh" of brown noise that follows the movement.
 *
 * Every note comes from one pentatonic scale, so any sequence a child scribbles
 * sounds consonant. Each colour has a "home" note (red is C, orange D, ...) and
 * the stroke's height on the canvas moves up or down the scale from there - one
 * step at a time, so the melody walks rather than leaps. Once it arrives it
 * wanders gently around that note, in short phrases with a breath between
 * them, so slow colouring in one spot doesn't become one repeated note.
 *
 * Gain automation is never cancelled mid-ramp: `cancelScheduledValues` snaps
 * the value back to the last event before the cancel point, and that jump is an
 * audible click. Envelopes are only ever extended with new `setTargetAtTime`
 * events, which continue smoothly from wherever the value currently is.
 *
 * The ring/silent switch is deliberately respected: on iPad, Web Audio is quiet
 * when the device is set to silent, and that is left alone.
 */

import { hexToHsl } from "@/lib/color"

// --- Tuning ------------------------------------------------------------------

const MASTER_VOLUME = 0.5
const MUTED_STORAGE_KEY = "emily-draw:muted"

/** Semitone offsets of the major pentatonic scale (C D E G A). */
const PENTATONIC = [0, 2, 4, 7, 9]
/** Scale index 0 is C3; index 5 is C4, index 10 is C5. */
const BASE_FREQUENCY = 130.81

/** How far the stroke's height shifts the note from the colour's home note. */
const HEIGHT_STEPS_BELOW = 3
const HEIGHT_STEPS_ABOVE = 3

/** The beat: at most one note this often, however fast the brush moves. */
const NOTE_INTERVAL_MS = 380
/** The brush must travel this far (fraction of canvas width) between notes. */
const MIN_TRAVEL_PER_NOTE = 0.03
/** How far (in scale steps) the melody wanders around the brush's note. */
const WANDER_RANGE = 2
/** Notes per phrase, before a breath of about twice the beat. */
const PHRASE_LENGTH_MIN = 4
const PHRASE_LENGTH_MAX = 6
const BREATH_INTERVAL_MS = NOTE_INTERVAL_MS * 2
/** Ringing notes are capped; past it, the oldest is faded out to make room. */
const MAX_VOICES = 6

// --- Notes -------------------------------------------------------------------

function noteFrequency(index: number): number {
  const octave = Math.floor(index / PENTATONIC.length)
  const degree = index - octave * PENTATONIC.length
  return BASE_FREQUENCY * 2 ** ((octave * 12 + PENTATONIC[degree]) / 12)
}

/** Hue bands in degrees, each mapped to the next note up the scale. */
const HUE_BANDS: { maxHue: number; degree: number }[] = [
  { maxHue: 15, degree: 0 }, // red
  { maxHue: 45, degree: 1 }, // orange
  { maxHue: 75, degree: 2 }, // yellow
  { maxHue: 170, degree: 3 }, // green
  { maxHue: 255, degree: 4 }, // blue
  { maxHue: 330, degree: 5 }, // purple
  { maxHue: 360, degree: 0 }, // pink wraps back to red
]

/** The scale index a colour "lives" on: C4 (red) up to C5 (purple). */
function colorHomeNote(hex: string): number {
  const { h, s, l } = hexToHsl(hex)
  // Greys, black and white have no meaningful hue: darker sits lower.
  if (s < 0.15) return 5 + Math.round(l * 5)
  const band = HUE_BANDS.find((b) => h < b.maxHue) ?? HUE_BANDS[0]
  return 5 + band.degree
}

/** `height` is 0 at the bottom of the canvas and 1 at the top. */
function noteAtHeight(home: number, height: number): number {
  const span = HEIGHT_STEPS_BELOW + HEIGHT_STEPS_ABOVE
  return home - HEIGHT_STEPS_BELOW + Math.round(Math.min(1, Math.max(0, height)) * span)
}

const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))

/**
 * The next melody note: step towards `target` while out of range, then wander
 * one step at a time around it - never the same note three times running.
 */
function nextMelodyNote(current: number, target: number, repeats: number): number {
  if (Math.abs(target - current) > WANDER_RANGE) return current + Math.sign(target - current)
  const candidates = [current - 1, current, current + 1].filter(
    (note) =>
      Math.abs(note - target) <= WANDER_RANGE && (note !== current || repeats < 1)
  )
  return candidates[randomInt(0, candidates.length - 1)]
}

// --- Mute state (persisted, observable from React) ---------------------------

let muted: boolean | null = null
const muteListeners = new Set<() => void>()

export function isMuted(): boolean {
  if (muted === null) {
    try {
      muted = window.localStorage.getItem(MUTED_STORAGE_KEY) === "1"
    } catch {
      muted = false // private mode / blocked storage: just start with sound on
    }
  }
  return muted
}

function persistMuted(value: boolean) {
  try {
    window.localStorage.setItem(MUTED_STORAGE_KEY, value ? "1" : "0")
  } catch {
    // Not persisting is fine; the toggle still works for this session.
  }
}

export function setMuted(value: boolean) {
  muted = value
  persistMuted(value)
  if (value) endStrokeSound()
  if (ctx && master) {
    master.gain.setTargetAtTime(value ? 0 : MASTER_VOLUME, ctx.currentTime, 0.02)
  }
  muteListeners.forEach((listener) => listener())
}

export function subscribeMuted(listener: () => void): () => void {
  muteListeners.add(listener)
  return () => muteListeners.delete(listener)
}

// --- Audio graph -------------------------------------------------------------

let ctx: AudioContext | null = null
let master: GainNode | null = null
/** Voices connect here: it feeds the master directly and a soft echo. */
let bus: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null
interface Voice {
  /** Unautomated (gain 1) until stolen, so it can be faded without a jump. */
  release: GainNode
  oscillators: OscillatorNode[]
}
/** Plucks still ringing, oldest first. */
const ringing: Voice[] = []

function buildGraph(context: AudioContext) {
  master = context.createGain()
  master.gain.value = isMuted() ? 0 : MASTER_VOLUME

  // Gentle limiter so many overlapping notes never clip.
  const limiter = context.createDynamicsCompressor()
  limiter.threshold.value = -18
  limiter.ratio.value = 4
  master.connect(limiter).connect(context.destination)

  // A single filtered feedback echo gives the notes a soft, roomy tail.
  bus = context.createGain()
  const echoSend = context.createGain()
  echoSend.gain.value = 0.22
  const delay = context.createDelay(1)
  delay.delayTime.value = 0.32
  const echoTone = context.createBiquadFilter()
  echoTone.type = "lowpass"
  echoTone.frequency.value = 1800
  const feedback = context.createGain()
  feedback.gain.value = 0.3

  // Take the edge off every voice, so nothing sounds sharp or tinny.
  const warmth = context.createBiquadFilter()
  warmth.type = "lowpass"
  warmth.frequency.value = 2600
  warmth.connect(master)

  bus.connect(warmth)
  bus.connect(echoSend).connect(delay).connect(echoTone)
  echoTone.connect(feedback).connect(delay)
  echoTone.connect(master)
}

function ensureContext(): AudioContext | null {
  if (ctx) return ctx
  if (typeof window === "undefined") return null
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  buildGraph(ctx)
  return ctx
}

/**
 * Browsers only let audio start inside a user gesture. Call this from gesture
 * handlers; it is cheap once the context is running.
 */
function unlockAudio() {
  const context = ensureContext()
  if (context && context.state !== "running") {
    context.resume().catch(() => {
      // Not a gesture the browser accepts yet - the next one will be.
    })
  }
}

/**
 * Unlock on whichever gesture the browser counts (iOS Safari accepts
 * `touchend`/`click` but not `touchstart`), so the very first tap - usually
 * choosing a picture - already enables sound for the drawing screen.
 */
export function installAudioUnlock(): () => void {
  const events = ["pointerdown", "touchend", "click", "keydown"] as const
  events.forEach((type) =>
    window.addEventListener(type, unlockAudio, { capture: true, passive: true })
  )
  return () =>
    events.forEach((type) => window.removeEventListener(type, unlockAudio, { capture: true }))
}

/**
 * The context to schedule into, or null if sound shouldn't play right now. A
 * suspended context is skipped rather than scheduled into: its clock is frozen,
 * so queued notes would all fire at once when it resumes.
 */
function playableContext(): AudioContext | null {
  if (isMuted()) return null
  const context = ensureContext()
  if (!context || !bus) return null
  if (context.state !== "running") {
    unlockAudio()
    return null
  }
  return context
}

// --- Voices ------------------------------------------------------------------

/** One music-box note: a sine fundamental plus a soft, short "tine" partial. */
function pluck(context: AudioContext, frequency: number, delay = 0, velocity = 1) {
  if (!bus) return
  if (ringing.length >= MAX_VOICES) silenceOldestPluck(context)
  const t = context.currentTime + delay
  const end = t + 2.1

  // A 15 ms attack: fast enough to sound plucked, slow enough not to tick.
  const body = context.createGain()
  body.gain.setValueAtTime(0, t)
  body.gain.linearRampToValueAtTime(0.22 * velocity, t + 0.015)
  body.gain.exponentialRampToValueAtTime(0.0001, t + 2)

  const tine = context.createGain()
  tine.gain.setValueAtTime(0, t)
  tine.gain.linearRampToValueAtTime(0.03 * velocity, t + 0.012)
  tine.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)

  const release = context.createGain()
  release.connect(bus)

  const fundamental = context.createOscillator()
  fundamental.frequency.value = frequency
  const overtone = context.createOscillator()
  overtone.frequency.value = frequency * 3

  fundamental.connect(body).connect(release)
  overtone.connect(tine).connect(release)
  fundamental.start(t)
  overtone.start(t)
  fundamental.stop(end)
  overtone.stop(end)

  const voice: Voice = { release, oscillators: [fundamental, overtone] }
  ringing.push(voice)
  fundamental.onended = () => {
    const index = ringing.indexOf(voice)
    if (index !== -1) ringing.splice(index, 1)
    release.disconnect()
  }
}

/** Fade the oldest note out over ~50 ms to make room; a hard stop would click. */
function silenceOldestPluck(context: AudioContext) {
  const voice = ringing.shift()
  if (!voice) return
  const t = context.currentTime
  voice.release.gain.setTargetAtTime(0, t, 0.02)
  voice.oscillators.forEach((osc) => osc.stop(t + 0.25))
}

interface Pad {
  oscillators: OscillatorNode[]
  gain: GainNode
}

/** A warm, slightly detuned drone an octave below the note. */
function startPad(context: AudioContext, frequency: number): Pad | null {
  if (!bus) return null
  const t = context.currentTime
  const tone = context.createBiquadFilter()
  tone.type = "lowpass"
  tone.frequency.value = 900
  const gain = context.createGain()
  gain.gain.setValueAtTime(0, t)
  gain.gain.setTargetAtTime(0.16, t, 0.25)
  tone.connect(gain).connect(bus)

  const oscillators = [
    { type: "triangle", ratio: 0.5, detune: -7 },
    { type: "triangle", ratio: 0.5, detune: 7 },
    { type: "sine", ratio: 1, detune: 0 },
  ].map(({ type, ratio, detune }) => {
    const osc = context.createOscillator()
    osc.type = type as OscillatorType
    osc.frequency.value = frequency * ratio
    osc.detune.value = detune
    osc.connect(tone)
    osc.start(t)
    return osc
  })
  return { oscillators, gain }
}

function glidePad(context: AudioContext, pad: Pad, frequency: number) {
  const t = context.currentTime
  pad.oscillators.forEach((osc, i) => {
    osc.frequency.setTargetAtTime(frequency * (i < 2 ? 0.5 : 1), t, 0.25)
  })
}

function stopPad(context: AudioContext, pad: Pad) {
  const t = context.currentTime
  // No cancel and no read of `gain.value` (WebKit reports the static value,
  // not the automated one): a later target event just continues the curve.
  pad.gain.gain.setTargetAtTime(0, t, 0.3)
  pad.oscillators.forEach((osc) => osc.stop(t + 2))
  pad.oscillators[0].onended = () => pad.gain.disconnect()
}

interface Swish {
  source: AudioBufferSourceNode
  gain: GainNode
  /** Whether the swish is (fading) up because the eraser is moving. */
  moving: boolean
  /** Fires shortly after the last movement, to fade the swish back down. */
  idleTimer: ReturnType<typeof setTimeout> | null
}

/** How long without movement before the eraser swish fades out. */
const SWISH_IDLE_MS = 150
const SWISH_VOLUME = 0.035

/**
 * Brown noise: integrated white noise, so its energy sits in the low end - a
 * soft wind/wave rather than the hiss of white noise.
 */
function getNoiseBuffer(context: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      data[i] = last * 3.5 // roughly back to unit level
    }
  }
  return noiseBuffer
}

/** Looping band-passed noise, silent until the eraser actually moves. */
function startSwish(context: AudioContext): Swish | null {
  if (!master) return null
  const source = context.createBufferSource()
  source.buffer = getNoiseBuffer(context)
  source.loop = true
  const soften = context.createBiquadFilter()
  soften.type = "lowpass"
  soften.frequency.value = 700
  soften.Q.value = 0.3
  const gain = context.createGain()
  gain.gain.value = 0
  // Straight to the master: an echo on noise just sounds like more noise.
  source.connect(soften).connect(gain).connect(master)
  source.start()
  return { source, gain, moving: false, idleTimer: null }
}

/**
 * Keep the swish up while the eraser moves. Automation is only touched when
 * movement starts or stops - not per move event, which used to rattle.
 */
function keepSwishing(context: AudioContext, swish: Swish) {
  if (!swish.moving) {
    swish.moving = true
    swish.gain.gain.setTargetAtTime(SWISH_VOLUME, context.currentTime, 0.12)
  }
  if (swish.idleTimer) clearTimeout(swish.idleTimer)
  swish.idleTimer = setTimeout(() => {
    swish.idleTimer = null
    swish.moving = false
    swish.gain.gain.setTargetAtTime(0, context.currentTime, 0.18)
  }, SWISH_IDLE_MS)
}

function stopSwish(context: AudioContext, swish: Swish) {
  if (swish.idleTimer) clearTimeout(swish.idleTimer)
  const t = context.currentTime
  swish.gain.gain.setTargetAtTime(0, t, 0.15)
  swish.source.stop(t + 1.2)
  swish.source.onended = () => swish.gain.disconnect()
}

// --- Strokes -----------------------------------------------------------------

export type StrokeSoundKind = "pluck" | "pad" | "swish"

interface StrokeState {
  kind: StrokeSoundKind
  home: number
  /** The last note played (or glided to). */
  note: number
  travelSinceNote: number
  lastNoteAt: number
  /** How many times in a row `note` has been repeated. */
  repeats: number
  /** Notes played in the current phrase, and how long this phrase will be. */
  phraseNotes: number
  phraseLength: number
  pad: Pad | null
  swish: Swish | null
}

let stroke: StrokeState | null = null

/** `height` is the stroke's position: 0 at the bottom of the canvas, 1 at the top. */
export function startStrokeSound(kind: StrokeSoundKind, color: string, height: number) {
  endStrokeSound()
  const context = playableContext()
  if (!context) return

  const home = colorHomeNote(color)
  const note = noteAtHeight(home, height)
  stroke = {
    kind,
    home,
    note,
    travelSinceNote: 0,
    lastNoteAt: performance.now(),
    repeats: 0,
    phraseNotes: 1,
    phraseLength: randomInt(PHRASE_LENGTH_MIN, PHRASE_LENGTH_MAX),
    pad: kind === "pad" ? startPad(context, noteFrequency(note)) : null,
    swish: kind === "swish" ? startSwish(context) : null,
  }
  if (kind === "pluck") pluck(context, noteFrequency(note))
  if (stroke.swish) keepSwishing(context, stroke.swish)
}

/** `distance` is how far the stroke just moved, as a fraction of the canvas width. */
export function moveStrokeSound(height: number, distance: number) {
  if (!stroke || !ctx || distance <= 0) return
  const target = noteAtHeight(stroke.home, height)

  if (stroke.swish) {
    keepSwishing(ctx, stroke.swish)
  } else if (stroke.pad) {
    stroke.note = target
    glidePad(ctx, stroke.pad, noteFrequency(target))
  } else {
    pluckOnBeat(ctx, stroke, target, distance)
  }
}

/**
 * Pluck on the next beat if the brush has moved enough since the last note.
 * After each phrase the beat takes a breath, and the next phrase starts with a
 * slightly stronger note.
 */
function pluckOnBeat(context: AudioContext, state: StrokeState, target: number, distance: number) {
  state.travelSinceNote += distance
  const now = performance.now()
  const phraseEnded = state.phraseNotes >= state.phraseLength
  const interval = phraseEnded ? BREATH_INTERVAL_MS : NOTE_INTERVAL_MS
  if (now - state.lastNoteAt < interval) return
  if (state.travelSinceNote < MIN_TRAVEL_PER_NOTE) return

  pluck(context, noteFrequency(advanceMelody(state, target)), 0, advancePhrase(state))
  state.travelSinceNote = 0
  state.lastNoteAt = now
}

/** Move the melody on by one note and return it. */
function advanceMelody(state: StrokeState, target: number): number {
  const note = nextMelodyNote(state.note, target, state.repeats)
  state.repeats = note === state.note ? state.repeats + 1 : 0
  state.note = note
  return note
}

/** Count the note into its phrase and return its velocity: phrases open a little stronger. */
function advancePhrase(state: StrokeState): number {
  if (state.phraseNotes >= state.phraseLength) {
    state.phraseNotes = 0
    state.phraseLength = randomInt(PHRASE_LENGTH_MIN, PHRASE_LENGTH_MAX)
  }
  state.phraseNotes++
  return state.phraseNotes === 1 ? 0.9 : 0.65 + Math.random() * 0.15
}

/** Idempotent: safe to call when no stroke sound is playing. */
export function endStrokeSound() {
  if (!stroke || !ctx) return
  if (stroke.pad) stopPad(ctx, stroke.pad)
  if (stroke.swish) stopSwish(ctx, stroke.swish)
  stroke = null
}

// --- One-shot sounds -------------------------------------------------------

export function playColorNote(color: string) {
  const context = playableContext()
  if (context) pluck(context, noteFrequency(colorHomeNote(color)))
}

export type UiSound = "undo" | "redo" | "clear" | "save" | "unmute"

/** Short phrases of scale indices (10 = C5), played as quick arpeggios. */
const UI_PHRASES: Record<UiSound, { notes: number[]; gap: number }> = {
  undo: { notes: [12, 10], gap: 0.13 }, // E5 -> C5, stepping back
  redo: { notes: [10, 12], gap: 0.13 }, // C5 -> E5, stepping forward
  clear: { notes: [13, 12, 10, 8], gap: 0.12 }, // a falling sweep
  save: { notes: [10, 12, 13, 15], gap: 0.15 }, // a rising "ta-da"
  unmute: { notes: [8, 10], gap: 0.14 },
}

export function playUiSound(name: UiSound) {
  const context = playableContext()
  if (!context) return
  const { notes, gap } = UI_PHRASES[name]
  notes.forEach((note, i) => pluck(context, noteFrequency(note), i * gap, 0.7))
}
