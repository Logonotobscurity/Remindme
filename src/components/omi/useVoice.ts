/**
 * Voice capture hook for the Omi shell.
 * Uses the Web Speech API when available.
 */
import { useCallback, useRef, useState } from "react";

type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getCtor(): SpeechCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { webkitSpeechRecognition?: SpeechCtor; SpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useVoice() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const ref = useRef<{ stop: () => void } | null>(null);

  const stop = useCallback(() => {
    ref.current?.stop();
    ref.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return false;
    if (listening) {
      stop();
      return true;
    }
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (event) => {
      const text = Array.from(event.results)
        .map((row) => row[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) setTranscript(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    ref.current = rec;
    setListening(true);
    try {
      rec.start();
      return true;
    } catch {
      setListening(false);
      return false;
    }
  }, [listening, stop]);

  return { listening, transcript, setTranscript, start, stop };
}
