import { useEffect, useRef, useState } from "react";

/**
 * Custom hook that simulates a typewriter effect on a string.
 * Supports gated start (enabled) — typing won't begin until enabled is true.
 *
 * @param text     - The full string to type out.
 * @param speed    - Delay in ms between each character.
 * @param options  - { enabled: start typing? }
 */
export function useTypewriter(
  text: string,
  speed: number = 35,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options ?? {};

  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Reset when the source text changes (new step) ──── */
  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Defer state updates to avoid synchronous setState calls inside effect
    resetTimer = setTimeout(() => {
      setDisplayedText("");
      setIsTyping(false);
      indexRef.current = 0;
    }, 0);

    return () => {
      if (resetTimer) {
        clearTimeout(resetTimer);
      }
    };
  }, [text]);

  /* ── Start typing when enabled becomes true ─────────── */
  useEffect(() => {
    let typingStartTimer: ReturnType<typeof setTimeout> | null = null;

    if (!enabled || !text) return;
    if (indexRef.current >= text.length) return;
    if (intervalRef.current) return;

    typingStartTimer = setTimeout(() => {
      setIsTyping(true);
    }, 0);

    intervalRef.current = setInterval(() => {
      indexRef.current += 1;
      setDisplayedText(text.slice(0, indexRef.current));

      if (indexRef.current >= text.length) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsTyping(false);
      }
    }, speed);

    return () => {
      if (typingStartTimer) {
        clearTimeout(typingStartTimer);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, text, speed]);

  return { displayedText, isTyping };
}
