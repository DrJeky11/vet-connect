import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicResources } from "@/lib/data";
import { chatEnabled } from "@/lib/navigator-llm";
import { Ask } from "./Ask";

export const metadata: Metadata = { title: "Ask the navigator" };
export const dynamic = "force-dynamic";

export default function AskPage() {
  if (!chatEnabled()) notFound();
  return <Ask resources={getPublicResources()} usesClaude={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}
