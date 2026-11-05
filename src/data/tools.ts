export type Tool = {
  /** URL segment under /maplestory, e.g. "damage" → /maplestory/damage */
  slug: string;
  name: string;
  /** One short line shown on the home page card */
  description: string;
};

// The tools in this app. The home page lists them in this order. To add a
// tool, add an entry here and a page at src/app/<slug>/page.tsx.
export const tools: Tool[] = [
  {
    slug: "damage",
    name: "Damage Calculator",
    description: "Damage range, accuracy needed and hits to kill a monster",
  },
  {
    slug: "scroll",
    name: "Scroll Simulator",
    description: "Odds and expected cost of scrolling an item",
  },
];

/** Looks up a tool by slug; throws so a typo in a page fails the build. */
export function getTool(slug: string): Tool {
  const tool = tools.find((t) => t.slug === slug);
  if (!tool) {
    throw new Error(`Unknown tool: ${slug}`);
  }
  return tool;
}
