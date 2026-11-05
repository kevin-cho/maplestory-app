import Link from "next/link";
import type { Tool } from "@/data/tools";

/** Placeholder page body for a tool that hasn't been built yet. */
export function ComingSoon({ tool }: { tool: Tool }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{tool.name}</h1>
      <p className="text-muted-foreground">{tool.description}</p>
      <p className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
        Coming soon
      </p>
      <Link
        href="/"
        className="rounded-md text-sm underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        All tools
      </Link>
    </main>
  );
}
