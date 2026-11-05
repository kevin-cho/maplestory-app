import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";
import { ThemeToggle } from "@/components/theme-toggle";

// Same size and hover style as the portal's theme toggle and back arrow
const iconButtonClass =
  "flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-current";

export function SiteHeader() {
  return (
    <header className="flex items-center gap-2 p-4">
      {/* The portal is a different zone, so this is a plain <a> (a full page
          load). next/link would add the /maplestory basePath and try a
          client-side navigation, which can't cross zones. The lint rule
          assumes "/" is a page in this app, so it's off for this line. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        aria-label="Back to kevincho.ca"
        title="Back to kevincho.ca"
        className={iconButtonClass}
      >
        <FaArrowLeft aria-hidden className="size-4" />
      </a>
      {/* Inside this zone, next/link adds the basePath: "/" → /maplestory */}
      <Link
        href="/"
        className="truncate rounded-md font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        MapleStory Classic Tools
      </Link>
      <div className="ml-auto flex">
        <ThemeToggle />
      </div>
    </header>
  );
}
