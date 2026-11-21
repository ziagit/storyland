// A spoken back-and-forth on top of useSpeech: tap to ask, hear the reply, and
// interrupt it. Once the owner has used the mic, it stays on while replies play:
// "stop" stops, "pause" and "continue" pause and resume, and anything else cuts the
// reply off and is passed to `onAsk` as a new request.

const STOP = /\b(stop|quiet|shush|shh+|enough|silence)\b/
const PAUSE = /\b(pause|wait|hold on)\b/
const RESUME = /\b(continue|resume|go on|keep going|carry on)\b/

function wordsOf(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean)
}

function pairsOf(words: string[]): string[] {
  return words.slice(1).map((word, i) => `${words[i]} ${word}`)
}

/**
 * `onAsk` gets each spoken request. `enabled` says when interrupting is allowed
 * (e.g. only while voice is on).
 */
export function useVoiceConversation(onAsk: (text: string) => void, enabled: () => boolean = () => true) {
  const speech = useSpeech()
  // Interrupting needs the mic, so it waits until the owner has tapped it once
  // and never asks for microphone permission unprompted.
  const micUsed = ref(false)
  // What the owner is saying over a reply, shown as they speak.
  const heard = ref('')
  // Whether the reply is paused because the owner started talking (not because they said pause).
  let held = false
  // Word pairs in what's being said aloud. The mic hears the reply too, and what it
  // hears of it is mostly the same pairs.
  let spokenPairs = new Set<string>()

  function isEcho(words: string[]): boolean {
    const pairs = pairsOf(words)
    return pairs.length > 0 && pairs.filter((pair) => spokenPairs.has(pair)).length / pairs.length >= 0.5
  }

  // A short command, unless it's the reply's own words ("didn't stop" read from a story).
  function command(words: string[]): 'stop' | 'pause' | 'resume' | null {
    if (!words.length || words.length > 4 || (words.length > 1 && isEcho(words))) return null
    const said = words.join(' ')
    if (STOP.test(said)) return 'stop'
    if (PAUSE.test(said)) return 'pause'
    if (RESUME.test(said)) return 'resume'
    return null
  }

  function hold() {
    if (speech.paused.value) return
    speech.togglePause()
    held = true
  }

  function onHeard(text: string, isFinal: boolean) {
    if (!speech.speaking.value) return
    const words = wordsOf(text)
    const cmd = command(words)
    const fromOwner = cmd !== null || (words.length >= 3 && !isEcho(words))
    if (!isFinal) {
      // Go quiet the moment the owner starts talking; decide what they meant once they pause.
      if (fromOwner && cmd !== 'resume') hold()
      if (fromOwner && !cmd) heard.value = text.trim()
      return
    }
    heard.value = ''
    const heldForOwner = held
    held = false
    if (cmd === 'stop') return speech.stopSpeaking()
    if (cmd === 'pause') return hold()
    if (cmd === 'resume' || !fromOwner) {
      // "Continue", or a false alarm (the mic hearing the reply): carry on.
      if (speech.paused.value && (cmd === 'resume' || heldForOwner)) speech.togglePause()
      return
    }
    speech.stopSpeaking()
    onAsk(text.trim())
  }

  /** Reads `parts` aloud in order (a reply, then a story paragraph by paragraph). */
  function say(parts: string[]) {
    spokenPairs = new Set(pairsOf(wordsOf(parts.join(' '))))
    speech.speak(parts)
  }

  /** Listens for one request (tap to talk) and passes it to `onAsk`. */
  function listen() {
    micUsed.value = true
    speech.listen(onAsk)
  }

  watch(
    () => enabled() && micUsed.value && speech.speaking.value,
    (on) => {
      if (on) return speech.hear(onHeard)
      speech.stopHearing()
      heard.value = ''
      held = false
    }
  )

  return { speech, micUsed, heard, say, listen }
}
