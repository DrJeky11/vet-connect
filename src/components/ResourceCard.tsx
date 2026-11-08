"use client";
import Link from "next/link";
import type { Resource } from "@/lib/schema";
import { effectiveStatus } from "@/lib/status";
import { directionsHref, telHref } from "@/lib/contact";
import { formatDateIn, type Dict } from "@/lib/i18n";
import { useDict } from "@/lib/i18n/client";
import { speakPhone } from "@/lib/outreach/phone";
import { StatusBadge } from "./StatusBadge";
import { SaveButton } from "./SaveButton";
import { ReadAloud } from "./ReadAloud";
import { CategoryChip } from "./CategoryChip";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-0.5">
      <dt className="text-sm font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="m-0">{children}</dd>
    </div>
  );
}

/** What the Listen button reads. Only fields the source states. */
export function spokenListing(r: Resource, t: Dict): string {
  const parts = [r.name + (r.organization !== r.name ? `, ${r.organization}` : "") + ".", r.description];
  parts.push(`${t.card.whoItServes}: ${r.eligibility_text}`);
  parts.push(`${t.card.cost}: ${t.cost[r.cost_type]}.`);
  parts.push(`${t.card.phone}: ${r.phone ? speakPhone(r.phone) : t.card.notListed}.`);
  if (r.address) parts.push(`${t.card.address}: ${r.address}.`);
  if (r.hours) parts.push(`${t.card.hours}: ${r.hours}.`);
  parts.push(`${t.card.howToApply}: ${r.how_to_apply}`);
  parts.push(t.card.whoNote);
  return parts.join(" ");
}

export function ResourceCard({
  r,
  detail = false,
  headingLevel = 2,
  now,
}: {
  r: Resource;
  detail?: boolean;
  headingLevel?: 2 | 3;
  now?: Date;
}) {
  const t = useDict();
  const NotListed = () => <span className="text-muted">{t.card.notListed}</span>;
  const status = effectiveStatus(r, now);
  const tel = telHref(r.phone);
  const dir = directionsHref(r.address);
  const H = headingLevel === 2 ? "h2" : "h3";
  const area = r.service_area.length ? r.service_area.map((a) => t.localities[a]).join(", ") : t.card.areaNotStated;

  return (
    <article
      className="card print-break rounded-xl border-2 border-line bg-white p-5 shadow-sm sm:p-6"
      data-testid="resource-card"
      data-id={r.id}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
        {r.categories.map((c) => (
          <CategoryChip key={c} id={c} label={t.categories[c].label} />
        ))}
      </div>
      <H className="mt-3 text-2xl font-bold leading-tight" lang="en">
        {detail ? r.name : <Link href={`/resources/${r.id}`}>{r.name}</Link>}
      </H>
      {r.organization !== r.name && <p className="text-muted" lang="en">{r.organization}</p>}
      <p className="mt-2" lang="en">{r.description}</p>

      <dl className="mt-4 grid gap-3 border-t-2 border-wash pt-4 sm:grid-cols-2">
        <Row label={t.card.whoItServes}>
          <span lang="en">{r.eligibility_text}</span>
          <span className="block text-base text-muted">{t.card.whoNote}</span>
        </Row>
        <Row label={t.card.cost}>{t.cost[r.cost_type]}</Row>
        <Row label={t.card.phone}>{r.phone ?? <NotListed />}</Row>
        <Row label={t.card.howToApply}><span lang="en">{r.how_to_apply}</span></Row>
        {detail && (
          <>
            <Row label={t.card.address}>{r.address ?? <NotListed />}</Row>
            <Row label={t.card.hours}>{r.hours ?? <NotListed />}</Row>
            <Row label={t.card.website}>
              {r.website ? <a href={r.website}>{r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a> : <NotListed />}
            </Row>
            <Row label={t.card.serviceArea}>{area}</Row>
            <Row label={t.card.languages}>{r.languages.length ? r.languages.join(", ") : <NotListed />}</Row>
            <Row label={t.card.accessibility}>{r.accessibility.length ? r.accessibility.join(", ") : <NotListed />}</Row>
          </>
        )}
        {!detail && <Row label={t.card.serviceArea}>{area}</Row>}
        <Row label={t.card.source}>
          <a href={r.source_url} rel="noopener noreferrer" target="_blank" data-testid="source-link">
            {r.source_name}
            <span className="sr-only"> {t.card.newTab}</span>
          </a>
          {detail &&
            r.additional_sources.map((s) => (
              <span key={s.url} className="block">
                {t.card.also} <a href={s.url} rel="noopener noreferrer" target="_blank">{s.name}</a>
              </span>
            ))}
        </Row>
        <Row label={t.card.lastVerified}>
          <span data-testid="last-verified">
            {formatDateIn(t, r.last_verified_at)}
            {r.verified_by ? ` ${t.card.by} ${r.verified_by}` : ""}
          </span>
        </Row>
        {detail && r.source_notes && (
          <div className="sm:col-span-2">
            <Row label={t.card.notes}>
              <span className="text-base text-muted" lang="en">{r.source_notes}</span>
            </Row>
          </div>
        )}
      </dl>

      <div className="no-print mt-5 flex flex-wrap gap-2">
        {tel && (
          <a className="btn btn-call" href={tel}>
            <span aria-hidden="true">📞</span> {t.card.call}
            {r.phone && r.phone.length <= 20 ? ` ${r.phone}` : ""}
            <span className="sr-only"> {r.name}</span>
          </a>
        )}
        {dir && (
          <a className="btn btn-secondary" href={dir} rel="noopener noreferrer" target="_blank">
            {t.card.directions}<span className="sr-only"> {r.name} {t.card.newTab}</span>
          </a>
        )}
        {!detail && r.website && (
          <a className="btn btn-secondary" href={r.website} rel="noopener noreferrer" target="_blank">
            {t.card.website}<span className="sr-only"> {r.name} {t.card.newTab}</span>
          </a>
        )}
        <SaveButton id={r.id} name={r.name} />
        {detail && <ReadAloud text={spokenListing(r, t)} label={r.name} />}
        {!detail && (
          <Link className="btn btn-secondary" href={`/resources/${r.id}`}>
            {t.card.details}<span className="sr-only"> {r.name}</span>
          </Link>
        )}
      </div>
      {detail && (
        <p className="no-print mt-3">
          <Link href={`/suggest?listing=${r.id}`}>{t.card.report}</Link>
        </p>
      )}
    </article>
  );
}
