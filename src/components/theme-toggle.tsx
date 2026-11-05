"use client";

// Mirrored from the kevincho.ca portal (src/components/theme-toggle.tsx). Keep them
// in sync: both zones share localStorage["theme"] on kevincho.ca.

import { FaMoon, FaSun } from "react-icons/fa";

declare global {
  interface Window {
    // Defined by ThemeScript in the root layout
    __setPreferredTheme: (theme: "light" | "dark") => void;
  }
}

const buttonClass =
  "size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-current";

/**
 * Light/dark toggle, like react.dev's: both buttons are always rendered and
 * CSS shows the right one, so it's correct on the very first paint.
 */
export function ThemeToggle() {
  return (
    <>
      {/* Shown in light mode */}
      <button
        type="button"
        aria-label="Use dark mode"
        title="Use dark mode"
        onClick={() => window.__setPreferredTheme("dark")}
        className={`flex dark:hidden ${buttonClass}`}
      >
        <FaMoon aria-hidden className="size-4" />
      </button>
      {/* Shown in dark mode */}
      <button
        type="button"
        aria-label="Use light mode"
        title="Use light mode"
        onClick={() => window.__setPreferredTheme("light")}
        className={`hidden dark:flex ${buttonClass}`}
      >
        <FaSun aria-hidden className="size-4" />
      </button>
    </>
  );
}
