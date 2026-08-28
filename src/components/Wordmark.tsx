import { useEffect, useState } from "react";

const ACCENTS = ["accent-blue", "accent-red", "accent-yellow", "accent-green"] as const;

/**
 * Giant wordmark. Each letter picks up an accent color on hover; the very last
 * character auto-cycles through the accents as a branding flourish.
 */
export function Wordmark({ word }: { word: string }) {
  const chars = Array.from(word);
  const lastIndex = chars.length - 1;
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setCycle((c) => (c + 1) % ACCENTS.length), 1100);
    return () => window.clearInterval(id);
  }, []);

  return (
    <h1 className="wordmark" aria-label={word}>
      {chars.map((char, index) => {
        const isLast = index === lastIndex;
        const accent = isLast ? ACCENTS[cycle] : ACCENTS[index % ACCENTS.length];
        return (
          <span
            key={`${char}-${index}`}
            aria-hidden="true"
            className={`wordmark-letter ${isLast ? "is-cycling" : ""}`}
            style={
              {
                "--letter-accent": `var(--${accent})`,
                ...(isLast ? { color: `var(--${accent})` } : {}),
              } as React.CSSProperties
            }
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </h1>
  );
}
