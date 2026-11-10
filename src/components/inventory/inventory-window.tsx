import { useId, type ReactNode } from "react";
import { Sprite } from "./sprite";

/**
 * A game window: its art as the background, with children placed on top in
 * the art's own pixels. It's drawn at 2× from the `sm` breakpoint and 1× below
 * (2× is 350 px wide, too wide for a phone). Only whole-number scales, with
 * `pixelated`, so the pixel art stays crisp. `zoom` scales the children too,
 * so their coordinates stay in the art's pixels.
 */
export function InventoryWindow({
  title,
  art,
  children,
}: {
  /** The window's name, for screen readers (the art already shows it) */
  title: string;
  art: { src: string; width: number; height: number };
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="relative shrink-0 select-none [image-rendering:pixelated] sm:[zoom:2]"
      style={{ width: art.width, height: art.height }}
    >
      <h2 id={titleId} className="sr-only">
        {title}
      </h2>
      <Sprite src={art.src} x={0} y={0} />
      {children}
    </section>
  );
}
