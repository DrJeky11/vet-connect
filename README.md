# Veteran Services Navigator

A mobile-first web app that helps a veteran in the Fredericksburg, Virginia region find local services, see where every listing came from, and leave with a printable list of who to call. Built for [Hack for Humanity use case 08, "Make services easier to navigate"](https://h4h.opsfloor.org/builder-guide.html#use-cases).

**Service area (v1):** City of Fredericksburg and the counties of Spotsylvania, Stafford, King George and Caroline.

## Run it

Requires Node.js 22.13 or newer. There is no database to set up.

```bash
npm install && npm run dev
```

Open http://localhost:3000. The verifier dashboard is at `/verify` (demo passcode `demo-verifier`).

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build && npm start` | Production build |
| `npm test` | Vitest: seed-data validation gate, filters, plan, verifier rules, importers, navigator |
| `npm run test:e2e` | Playwright on a phone viewport: Ray, Dana and Maria flows, verifier flow, crisis footer on every page. Run `npx playwright install chromium` once first. |
| `npm run validate:data` | Seed-data validation only |
| `npm run import:csv -- file.csv [--write]` | Bulk-load a spreadsheet (template: `data/templates/resources-template.csv`) |
| `npm run import:va [-- --write]` | Import VA health facilities near Fredericksburg from the VA Facilities API. Needs `VA_FACILITIES_API_KEY`; skipped without it. |

Optional settings are in `.env.example`.

## What is real and what is simulated

**Real**

- Every listing is a real organization or program, and each card links to the public page its details came from (`source_url`).
- The Veterans Crisis Line footer on every page: dial 988 then press 1, or text 838255.
- Verifier edits are stored in SQLite (Node's built-in `node:sqlite`), with a change log of who did what and when.

**Simulated or limited**

- **Verifier login is simulated.** It is a shared passcode plus initials in a signed cookie, not real accounts. The page says so.
- There is no integration with any VA system, and nothing books rides or appointments.
- The personas (Ray, Dana, Maria) are fictional. Saved plans stay in the browser (`localStorage`). Share links contain only listing IDs.
- On Vercel the SQLite file lives in `/tmp`, so verifier changes reset on cold start. Run it locally or point `VERIFIER_DB_PATH` at persistent storage to keep them.

**What the app will not do**

- Decide eligibility. Cards show the provider's own words and say "may be eligible" and "call to confirm."
- Fill a field the source does not state. Empty phone, address and hours fields stay empty and show "Not listed by source."
- Store names, service numbers, discharge status or accounts.

## Seed data status: read this before the demo

`data/resources.json` holds **48 listings, all `unverified`**, across all nine topics and all five localities.

They were researched on 2026-11-07 from pages that were actually loaded at the time: provider websites, county and state .gov pages, va.gov, 211 Virginia, and the Virginia Veterans and Senior Navigators. Each record's `source_url` is the page its contact details came from, extra pages are in `additional_sources`, and `source_checked_at` is the date the page was read. That is not a verification: a person still has to check each listing in `/verify`.

Where sources conflicted, the contact field was left empty and the conflict is written up in `source_notes`. The verifier dashboard flags those listings with "Sources disagree" (11 at the moment), including:

- **Phone and fax swapped on 211 Virginia** for several offices (Social Services, DVS, Healthy Generations, CVHS). Provider pages were preferred; the two DVS benefits offices have no phone until someone calls to confirm.
- **LSNV Fredericksburg**: walk-in day (Monday on the office page and 211, "Wednesdays ONLY" on the How to Apply page) and phone.
- **Guadalupe Free Clinic, Micah, VVFS North, Fredericksburg DSS**: address, hours, or phone differ between sources.

Things the research turned up that matter for the demo:

- The **Lloyd F. Moss Free Clinic closed on June 12, 2025**. It is not listed. Its replacements (CVHS, Fredericksburg Christian Health Center, Guadalupe) are.
- There is **no Vet Center in Fredericksburg yet**; VA tells the area to call the Richmond Vet Center, which is listed.
- `dvs.virginia.gov`, `legalaidworks.org` and a few city pages block automated requests, so their details come from 211 Virginia or the Navigator sites. Worth confirming first.

To add more: run `npm run import:csv` (every row needs a `source_url`, imported rows are always unverified) or `npm run import:va -- --write` with a VA Facilities API key. `scripts/build-seed.mjs` documents how the original 9 records were made; it is no longer the source of truth.

**Demo moment:** open `/verify` and LSNV is flagged "Sources disagree" about which day it takes walk-ins. The listing stays unverified until a person calls.

## Guardrails and how they are enforced

| Guardrail | Where |
| --- | --- |
| Source on every listing | Schema requires `source_name` and `source_url`. Every card shows the source link, status badge and last-verified date (or "Not yet verified"). |
| A person verifies | Seed records must be `unverified`; `tests/unit/seed-data.test.ts` fails the build otherwise. "Verified" is only set by `VerifierStore.verify` with initials. It turns Stale after 90 days. |
| Never promise access | The seed validator rejects phrases like "you qualify." Call scripts ask whether the caller "may be eligible." |
| No fabricated contact details | The validator fails if a contact field is filled without a source. Verifier edits that fill contact fields require a source note. The CSV and VA importers keep missing fields null. |
| Crisis access on every page | `CrisisFooter` sits in the root layout, is sticky on screen and appears on printouts. Playwright checks every route. |
| Minimal data | No accounts. Plans live in `localStorage`. Share links carry only IDs. |
| Label anything simulated | Verifier login banner, `/about` page, navigator disclaimer. |

## Stretch feature 6: conversational navigator

Off by default. Set `ENABLE_CHAT=true` to add an "Ask in your own words" page at `/ask`.

- It is retrieval only. A sentence becomes directory filters, and the reply lists directory cards with their IDs in brackets. When nothing matches it says "I don't have a listing for that."
- Without `ANTHROPIC_API_KEY` it matches keywords. With a key it asks Claude (`claude-opus-5-5`, low effort, JSON-schema output) to pick filters only. The model never writes the reply text, and filter values it returns that aren't in the fixed lists are dropped. Server-side refusal fallback (`fallbacks: "default"`) is on; any API error falls back to keywords.

Stretch feature 7 (Spanish UI and read-aloud) is not built.

## Accessibility

- 18px base text and 22px on print. Tap targets are at least 44px (most are 48px).
- Skip link, labeled controls, focus moves to each intake step's heading, and status badges include screen-reader text.
- High-contrast toggle in the header, remembered per browser.
- Lighthouse accessibility scored 100 on home, intake, results, card, plan and verifier pages in this build.

## 3-minute demo script

Use a phone-sized window. All people are fictional.

1. **Ray, 71, Spotsylvania, needs a ride to a VA clinic (about 60 seconds).** Home, then "Start." Tap Transportation. Type ZIP `22553` and tap "Use ZIP" (Spotsylvania is selected), then Next. Tap "For me," then "Skip." Healthy Generations Mobility Options appears with its source link, phone number and an "Unverified" badge. Save it, and save FXBGO! as well. Open My Plan: each item has a call script ("Hi, I'm a veteran in Spotsylvania County…"). Tap "Print large-type list."
2. **Dana, 34, Stafford, landlord dispute (about 45 seconds).** Pick "Legal help," then Stafford County. Legal Aid Works and LSNV both list Stafford. The cards say "You may be eligible — call to confirm" rather than deciding. Open Filters and switch the topic to Benefits and claims help: the DVS Quantico office covers Stafford, and the DVS Fredericksburg office shows under "Elsewhere in the region" because its source does not list Stafford.
3. **Maria, caregiver (about 30 seconds).** Pick "Public services," then Caroline County, then "For someone else," then check "Free only." Only listings whose source states they are free remain (211 Virginia, Virginia Veterans Navigator); Caroline Social Services drops out because its source does not state a cost. Save 211 Virginia, and open My Plan: the script now says "I'm calling for a veteran in Caroline County." Tap "Share link." The link carries only IDs.
4. **Verifier (about 45 seconds).** Footer link "Verifier sign-in," enter initials `QA` and passcode `demo-verifier`. LSNV is flagged "Sources disagree." Try to change its hours without a source note and the save is refused. Mark the listing verified with a note. The change log shows it, and the public card now reads "Verified … by QA."

## Project layout

```
app/                 Next.js App Router pages and API routes
  intake/            Guided 4-step intake
  resources/         Directory, filters, card detail pages
  plan/              My Plan, print view, share links
  verify/            Verifier dashboard (simulated login)
  ask/               Optional navigator (ENABLE_CHAT=true)
  api/               Verifier actions, public resources, navigator
src/lib/             Schema (zod), seed validation, filters, plan, status, verifier rules, SQLite store
src/components/      Resource card, status badge, crisis footer, header
data/resources.json  Seed listings (the source of truth for listings)
scripts/             VA Facilities and CSV importers; seed builder
tests/unit/          Vitest
tests/e2e/           Playwright
```

## Deploy

On Vercel or any Node 22.13+ host: `npm run build`, then `npm start`. See the note above about `/tmp` storage on Vercel.
