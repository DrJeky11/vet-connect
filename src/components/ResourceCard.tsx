import Link from "next/link";
import { COST_LABELS, localityLabel, type Resource } from "@/lib/schema";
import { effectiveStatus, formatDate } from "@/lib/status";
import { directionsHref, telHref } from "@/lib/contact";
import { StatusBadge } from "./StatusBadge";
import { SaveButton } from "./SaveButton";
import { CategoryChip } from "./CategoryChip";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-sm font-bold uppercase tracking-wide text-muted">{label}</dt>
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
  const area = r.service_area.length ? r.service_area.map(localityLabel).join(" · ") : "Not stated by source";

  return (
    <article
      className="card print-break rounded-xl border-2 border-line bg-white p-5 shadow-sm sm:p-6"
      data-testid="resource-card"
      data-id={r.id}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
        {r.categories.map((c) => (
          <CategoryChip key={c} id={c} />
        ))}
      </div>

      <H className="mt-3 text-2xl font-bold leading-tight">
        {detail ? r.name : <Link href={`/resources/${r.id}`}>{r.name}</Link>}
      </H>
      {r.organization !== r.name && <p className="text-muted">{r.organization}</p>}
      <p className="mt-2 max-w-prose">{r.description}</p>

      <dl className="mt-4 grid gap-3 border-t-2 border-wash pt-4 sm:grid-cols-2">
        <Row label="Who it serves">
          <span>{r.eligibility_text}</span>
          <span className="block text-base text-muted">
            In the provider&apos;s words, where stated. You may be eligible — call to confirm.
          </span>
        </Row>
        <Row label="Cost">{COST_LABELS[r.cost_type]}</Row>
        <Row label="Phone">{r.phone ?? <NotListed />}</Row>
        <Row label="What to do next">
          <span className="whitespace-pre-line">{r.how_to_apply}</span>
        </Row>
        {detail && (
          <>
            <Row label="Address">{r.address ?? <NotListed />}</Row>
            <Row label="Hours">{r.hours ?? <NotListed />}</Row>
            <Row label="Website">
              {r.website ? (
                <a href={r.website} rel="noopener noreferrer" target="_blank">
                  {r.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              ) : (
                <NotListed />
              )}
            </Row>
            <Row label="Languages">{r.languages.length ? r.languages.join(", ") : <NotListed />}</Row>
            <Row label="Accessibility">{r.accessibility.length ? r.accessibility.join(", ") : <NotListed />}</Row>
          </>
        )}
        <Row label="Service area">{area}</Row>
        <Row label="Source">
          <a href={r.source_url} rel="noopener noreferrer" target="_blank" data-testid="source-link">
            {r.source_name}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          {detail &&
            r.additional_sources.map((s) => (
              <span key={s.url} className="block">
                Also:{" "}
                <a href={s.url} rel="noopener noreferrer" target="_blank">
                  {s.name}
                </a>
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
          <div className="sm:col-span-2">
            <Row label="Notes for verifiers">
              <span className="text-base text-muted">{r.source_notes}</span>
            </Row>
          </div>
        )}
      </dl>

      <div className="no-print mt-5 flex flex-wrap gap-2">
        {tel && (
          <a className="btn btn-call" href={tel}>
            <span aria-hidden="true">📞</span> Call {r.phone && r.phone.length <= 20 ? r.phone : ""}
            <span className="sr-only"> {r.name}</span>
          </a>
        )}
        {dir && (
          <a className="btn btn-secondary" href={dir} rel="noopener noreferrer" target="_blank">
            Directions<span className="sr-only"> to {r.name} (opens in a new tab)</span>
          </a>
        )}
        {!detail && r.website && (
          <a className="btn btn-secondary" href={r.website} rel="noopener noreferrer" target="_blank">
            Website<span className="sr-only"> for {r.name} (opens in a new tab)</span>
          </a>
        )}
        <SaveButton id={r.id} name={r.name} />
        {!detail && (
          <Link className="btn btn-secondary !border-transparent underline" href={`/resources/${r.id}`}>
            Details<span className="sr-only"> for {r.name}</span>
          </Link>
        )}
      </div>
    </article>
  );
}
