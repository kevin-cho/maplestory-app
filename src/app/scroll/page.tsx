import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { getTool } from "@/data/tools";

const tool = getTool("scroll");

export const metadata: Metadata = {
  title: tool.name,
  description: tool.description,
};

export default function Page() {
  return <ComingSoon tool={tool} />;
}
