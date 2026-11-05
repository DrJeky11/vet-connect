import Link from "next/link";
import { categoryLabel, COST_LABELS, localityLabel, type Resource } from "@/lib/schema";
import { effectiveStatus, formatDate } from "@/lib/status";
import { directionsHref, telHref } from "@/lib/contact";
import { StatusBadge } from "./StatusBadge";
import { SaveButton } from "./SaveButton";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="font-bold">{label}</dt>
      <dd className="m-0">{children}</dd>
    </div>
  );
}

const NotListed = () => <span className="text-muted">Not listed by source</span>;

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
  const status = effectiveStatus(r, now);
  const tel = telHref(r.phone);
  const dir = directionsHref(r.address);
  const H = headingLevel === 2 ? "h2" : "h3";
  const area = r.service_area.length ? r.service_area.map(localityLabel).join(", ") : "Not stated by source";

  return (
    <article className="card print-break rounded-xl border border-line bg-white p-4 shadow-sm" data-testid="resource-card" data-id={r.id}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <H className="text-2xl font-bold leading-tight">
            {detail ? r.name : <Link href={`/resources/${r.id}`}>{r.name}</Link>}
          </H>
          {r.organization !== r.name && <p className="text-muted">{r.organization}</p>}
        </div>
        <StatusBadge status={status} />
      </div>

      <p className="mt-2 text-sm font-bold uppercase tracking-wide text-muted">
        {r.categories.map(categoryLabel).join(" · ")}
      </p>
      <p className="mt-2">{r.description}</p>

      <dl className="mt-3 grid gap-2">
        <Row label="Who it serves">
          <span>{r.eligibility_text}</span>
          <span className="block text-base text-muted">
            In the provider&apos;s words, where stated. You may be eligible — call to confirm.
          </span>
        </Row>
        <Row label="Cost">{COST_LABELS[r.cost_type]}</Row>
        <Row label="Phone">{r.phone ?? <NotListed />}</Row>
        {detail && (
          <>
            <Row label="Address">{r.address ?? <NotListed />}</Row>
            <Row label="Hours">{r.hours ?? <NotListed />}</Row>
            <Row label="Website">
              {r.website ? <a href={r.website}>{r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a> : <NotListed />}
            </Row>
            <Row label="How to apply">{r.how_to_apply}</Row>
            <Row label="Service area">{area}</Row>
            <Row label="Languages">{r.languages.length ? r.languages.join(", ") : <NotListed />}</Row>
            <Row label="Accessibility">{r.accessibility.length ? r.accessibility.join(", ") : <NotListed />}</Row>
          </>
        )}
        {!detail && <Row label="Service area">{area}</Row>}
        <Row label="Source">
          <a href={r.source_url} rel="noopener noreferrer" target="_blank" data-testid="source-link">
            {r.source_name}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          {detail &&
            r.additional_sources.map((s) => (
              <span key={s.url} className="block">
                Also: <a href={s.url} rel="noopener noreferrer" target="_blank">{s.name}</a>
              </span>
            ))}
        </Row>
        <Row label="Last verified">
          <span data-testid="last-verified">
            {formatDate(r.last_verified_at)}
            {r.verified_by ? ` by ${r.verified_by}` : ""}
          </span>
        </Row>
        {detail && r.source_notes && (
          <Row label="Notes for verifiers">
            <span className="text-base text-muted">{r.source_notes}</span>
          </Row>
        )}
      </dl>

      <div className="no-print mt-4 flex flex-wrap gap-2">
        {tel && (
          <a className="btn btn-primary" href={tel}>
            Call
            <span className="sr-only"> {r.name}</span>
          </a>
        )}
        {dir && (
          <a className="btn btn-secondary" href={dir} rel="noopener noreferrer" target="_blank">
            Directions<span className="sr-only"> to {r.name} (opens in a new tab)</span>
          </a>
        )}
        <SaveButton id={r.id} name={r.name} />
        {!detail && (
          <Link className="btn btn-secondary" href={`/resources/${r.id}`}>
            Details<span className="sr-only"> for {r.name}</span>
          </Link>
        )}
      </div>
    </article>
  );
}
