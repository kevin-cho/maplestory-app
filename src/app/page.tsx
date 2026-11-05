import Link from "next/link";
import { tools } from "@/data/tools";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          MapleStory Classic Tools
        </h1>
        <p className="mt-2 text-muted-foreground">
          Calculators and simulators for MapleStory Classic World
        </p>
      </div>
      <nav aria-label="Tools" className="w-full max-w-2xl">
        {/* Same card style as the portal's app list */}
        <ul className="grid gap-3 sm:grid-cols-2">
          {tools.map((tool) => (
            <li key={tool.slug}>
              <Link
                href={`/${tool.slug}`}
                className="block h-full rounded-xl border border-border p-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                <span className="block font-medium">{tool.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {tool.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
