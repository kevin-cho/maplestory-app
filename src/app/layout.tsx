import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { ThemeScript } from "@/components/theme-script";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

// Fonts, theme script and header mirror the kevincho.ca portal's root layout,
// so moving between the two zones feels like one site.

// Poppins isn't a variable font, so each weight used must be listed.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MapleStory Classic Tools · Kevin Cho",
  description: "Calculators and simulators for MapleStory Classic World",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: ThemeScript adds the `dark` class to <html>
    // before React loads, so React would otherwise warn about the mismatch.
    <html
      lang="en"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="flex justify-end p-4">
          <ThemeToggle />
        </header>
        {children}
      </body>
    </html>
  );
}
