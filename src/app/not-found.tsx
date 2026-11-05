import Link from "next/link";

// Shown for unknown paths under /maplestory. Paths outside it belong to the
// portal, which has its own 404.
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        There&apos;s no tool at this address.
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
