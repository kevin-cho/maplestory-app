"use client";

import { useEffect } from "react";

/**
 * Shows MapleStory's "pressing" cursor while the mouse button is held down.
 * CSS has no page-wide "mouse is down" selector (`:active` only matches the
 * pressed element and its ancestors), so this sets `data-mouse-down` on
 * <html> and src/app/cursor.css does the rest. Renders nothing.
 */
export function CursorPress() {
  useEffect(() => {
    const root = document.documentElement;
    const press = (e: PointerEvent) => {
      // Touch and pen have no cursor; only the main (left) button presses
      if (e.pointerType === "mouse" && e.button === 0) {
        root.dataset.mouseDown = "";
      }
    };
    const release = () => {
      delete root.dataset.mouseDown;
    };

    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    // Releasing outside the window (e.g. after a drag) fires no pointerup here
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
      release();
    };
  }, []);

  return null;
}
