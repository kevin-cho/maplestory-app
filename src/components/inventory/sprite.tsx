import type { CSSProperties } from "react";

/**
 * A piece of game art, drawn at its own size and placed in the art's pixels
 * (inside an InventoryWindow, which scales everything together).
 *
 * A plain <img> rather than next/image: the art should be shown exactly as is,
 * and next/image's optimizer would resample it. Icons also vary in size, and
 * next/image needs each one's width and height up front.
 */
export function Sprite({
  src,
  alt = "",
  x,
  y,
  style,
}: {
  src: string;
  /** Empty (the default) for decoration, which screen readers skip */
  alt?: string;
  x?: number;
  y?: number;
  style?: CSSProperties;
}) {
  const placed = x !== undefined || y !== undefined;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- see above
    <img
      src={src}
      alt={alt}
      draggable={false}
      className={placed ? "absolute max-w-none" : "block max-w-none"}
      style={{ left: x, top: y, ...style }}
    />
  );
}
