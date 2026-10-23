import { useEffect, useState } from "react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";

export function MindOrb({
  listening,
  recording,
  busy,
  catching,
  ready,
  night,
}: {
  listening: boolean;
  recording: boolean;
  busy: boolean;
  catching: boolean;
  ready: boolean;
  night: boolean;
}) {
  const reduced = useReducedMotion();
  const state: OrbState = listening || recording
    ? "listening"
    : busy
      ? "composing"
      : catching
        ? "shaping"
        : ready
          ? "weaving"
          : "breathing";
  const label = state === "breathing"
    ? "Quiet. Waiting for a reminder."
    : state === "listening"
      ? "Listening."
      : state === "composing"
        ? "Saving the reminder."
        : state === "shaping"
          ? "Taking that in."
          : "Ready to keep this.";

  return (
    <div className="mx-auto mb-4 grid place-items-center">
      <ThinkingOrb
        state={state}
        size={64}
        theme={night ? "dark" : "light"}
        paused={reduced}
        aria-label={label}
      />
    </div>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return reduced;
}
