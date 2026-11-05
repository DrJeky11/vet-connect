import Link from "next/link";
import { getDict } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getDict();
  return (
    <div className="grid gap-3">
      <h1 className="text-3xl font-bold">{t.notFound.title}</h1>
      <p className="flex flex-wrap gap-3">
        <Link href="/" className="btn btn-primary">{t.nav.home}</Link>
        <Link href="/resources" className="btn btn-secondary">{t.notFound.link}</Link>
      </p>
    </div>
  );
}
