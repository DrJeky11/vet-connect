import type { Metadata } from "next";
import { getDict } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDict()).about.title };
}

export default async function About() {
  const a = (await getDict()).about;
  const Section = ({ title, items }: { title: string; items: string[] }) => (
    <section>
      <h2 className="text-2xl font-bold">{title}</h2>
      <ul className="ml-5 mt-2 list-disc">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </section>
  );
  return (
    <div className="grid gap-4">
      <h1 className="text-3xl font-bold">{a.title}</h1>
      <Section title={a.realTitle} items={a.real} />
      <Section title={a.simTitle} items={a.sim} />
      <Section title={a.notTitle} items={a.not} />
    </div>
  );
}
