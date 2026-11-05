# Veteran Services Navigator

A website, text line and phone line that help veterans in the Fredericksburg, Virginia region find local services, see where every listing came from, and get updates the way they prefer: on the web, by text, by recorded phone call or by mail. Built for [Hack for Humanity use case 08, "Make services easier to navigate"](https://h4h.opsfloor.org/builder-guide.html#use-cases).

**Service area:** City of Fredericksburg and the counties of Spotsylvania, Stafford, King George and Caroline.

## Ways a veteran can use it

| If they… | They can… |
| --- | --- |
| Use a phone or computer | Search, answer 4 quick questions, or pick a topic. Save listings to My Plan and print a large-type call list with what to say. English or Spanish. |
| Prefer texting | Text a topic and ZIP (`RIDE 22553`) to get listings back. Text `JOIN` for updates, `STOP` to stop. |
| Prefer a phone call | Call the line and use the keypad to hear listings read aloud, have them texted, or sign up for recorded update calls. |
| Have no computer | Get letters with listings for their topics and place. Sign up on a printed paper form or by phone with staff. Libraries and VSO offices can print the whole directory. |
| Help someone else | Do all of the above on their behalf, with their permission. |

The text and phone line run only after a Twilio number is connected (see [Going live](#going-live-with-texts-and-calls)). Until then everything works in a clearly labeled simulated mode, and staff can try both lines on the dashboard.

## Run it

Requires Node.js 22.13 or newer. There is no database server to set up (SQLite files are created in `.data/`).

```bash
npm install && npm run dev
```

Open http://localhost:3000.

| Page | Who | Demo sign-in |
| --- | --- | --- |
| `/` and everything linked from it | Veterans and families | none |
| `/verify` | Verifiers who check listings | initials + `demo-verifier` |
| `/staff` | Outreach staff | initials + `demo-outreach` |

| Command | What it does |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build && npm start` | Production build |
| `npm test` | Vitest: seed-data gate, filters, plan, verifier rules, importers, navigator, outreach store, consent, text and phone line |
| `npm run test:e2e` | Playwright on a phone viewport: veteran flows, Spanish, menu, sign-up → YES → send → STOP, phone keypad, letters, reports, no sideways scrolling, crisis footer on every page |
| `npm run lint` | TypeScript check |
| `npm run validate:data` | Seed-data validation only |
| `npm run import:csv -- file.csv [--write]` | Bulk-load listings from a spreadsheet (template: `data/templates/resources-template.csv`) |
| `npm run import:va [-- --write]` | Import VA health facilities near Fredericksburg. Needs `VA_FACILITIES_API_KEY`. |

All settings are optional and listed in `.env.example`.

## Where this stands against the spec

| Spec item | Status |
| --- | --- |
| Guided intake, directory and filters, sourced listing cards | Done |
| My Plan with call scripts, large-type print, share link | Done |
| Verifier dashboard, change log, Stale after 90 days | Done; now also shows public reports |
| Crisis line on every page | Done, in both languages and on every printout and letter |
| Accessibility | Done. Lighthouse accessibility 100 on home, intake, topic, listing, plan, updates, help, print, suggest and staff pages in this build. |
| Stretch 6: conversational navigator | Done (behind `ENABLE_CHAT`) |
| Stretch 7: Spanish and read-aloud | **Done in this round** |
| Seed data: 25 to 40 verified listings | **Not done: 20 listings, all unverified. 14 were read from their sources; 6 still have empty contact fields.** See below. |

New in this round, from the conversation with the VA: a full website structure (topic pages, help, printable directory, footer navigation), and outreach by text, phone call and mail with its own database, consent tracking and staff tools.

## Seed data: the biggest remaining gap

`data/resources.json` holds **20 listings, all `unverified`**. `scripts/build-seed.mjs` builds the file and records where each listing came from. The project rule is never to fill a contact field the source does not state.

**14 listings were read from their source on 2026-11-05.** Twelve come from va.gov: the Fredericksburg VA Health Care Center and its mental health care, VA ride, homeless, caregiver and crisis line pages for the area, and national VA health care, dental, benefits and job programs. Two come from Virginia Veterans Navigator: the DVS Fredericksburg office and FXBGO!. Every filled phone, address, hours and website field is stated on the cited page, and `source_notes` names the page each field came from.

**6 listings were not read.** Their contact fields are empty on purpose, and each record's `source_notes` says why:

- **211 Virginia** (Mobility Options, Legal Aid Works, LSNV Fredericksburg, Family Assistance Center, and 211 itself) turns away automated clients. It asks that programmatic access go through Connect211 (connect211.com). A person can still open each listing in a browser.
- **Virginia Veterans Navigator's** robots.txt asks AI agents not to crawl it. The build loaded only the two Navigator pages the spec cites and no others, so the Navigator listing itself was not read.
- valegalaid.org now redirects to virginialawhelp.org. That site, veteranscrisisline.net and provider websites (county offices, food bank, free clinic and so on) were not reachable from the build environment. The crisis line numbers were confirmed on va.gov instead.

There are no food listings and no county social services listings yet. This matters more now that the text and phone line read only what the directory holds: they say "no phone number on file yet" for the unread listings. To fix it:

1. A verifier opens each listing's source in `/verify`, fills only what the source states (a source note is required), and marks it verified.
2. Add listings through `npm run import:csv`. A person can copy listings from 211 Virginia or Veterans Navigator in a browser. Every row needs a `source_url`. Imported rows are unverified.
3. Run `npm run import:va -- --write` with a VA Facilities API key.
4. For 211 Virginia data in bulk, request access through Connect211.
5. Rerun the research step from an environment that can reach provider websites.
6. Use public reports: the "Report a problem" and "Suggest a listing" forms feed the verifier dashboard.
7. Watch the staff overview's "found nothing" column. It shows which topics and places people ask the text and phone line for that the directory cannot answer.

**Demo moment:** 211 Virginia and valegalaid.org list different street addresses for Legal Services of Northern Virginia, Fredericksburg. The verifier dashboard flags it "Sources disagree," and its address stays empty until a person confirms it.

## What is real and what is simulated

**Real**

- Every listing is a real organization, and each card links to the page it came from.
- The Veterans Crisis Line on every page: dial 988 then press 1, or text 838255.
- Verifier edits, public reports, subscribers, consent records, messages and delivery records are stored in SQLite (Node's built-in `node:sqlite`).
- The text-line and phone-line logic, the consent rules and the Twilio integration are complete code paths with tests. Twilio itself could not be reached from the build environment.

**Simulated until configured**

- **Texts and calls.** With no Twilio account, or until every go-live item is done, each send is recorded as "simulated" and nothing leaves the server. The staff dashboard shows which mode it is in.
- **Sign-in.** Verifiers and staff use shared passcodes plus initials in a signed cookie, not personal accounts. With the demo staff passcode, every name, phone number and address is hidden on staff screens and letters, so a public demo cannot leak anything someone typed in.
- There is no connection to any VA system. Nothing books rides or appointments.
- Ray, Dana and Maria, and the 555-01xx phone numbers in tests, are fictional.

**What the site will not do**

- Decide eligibility. Cards show the provider's own words and say "may be eligible" and "call to confirm."
- Fill a contact field the source does not state.
- Ask for service numbers, discharge status or health information.

## Outreach: how it works

**Data kept, and why.** Browsing still needs no account and stores nothing. Only people who ask for updates are stored, in a separate database (`OUTREACH_DB_PATH`), with only what is needed to reach them: phone number, or name and mailing address. Phone, name and address are encrypted with AES-256-GCM (`OUTREACH_ENCRYPTION_KEY`). Lookups use a keyed hash, so the plain number never sits in a searchable column. Locality, topics and language stay readable so staff can target messages without decrypting anything. What people text or say to the line is never stored; only the topic, place and number of results are counted.

**Consent rules (in code, with tests)**

- Each channel has its own consent wording (English and Spanish). Every opt-in and opt-out is recorded with the method, the wording version and language, who recorded it and when.
- Text sign-ups from the website stay *pending* until the phone replies YES, so a mistyped or someone else's number never gets updates.
- Staff can sign people up who ask by phone, in person or on a paper form. Staff confirm they read the consent wording, and their initials are recorded.
- `STOP` (anywhere in a text), `press 9` on a call, the Stop updates page or staff all turn off **every** automated text and call for that number. Letters stop separately.
- Texts and calls go out only between 8 a.m. and 9 p.m. Eastern. Outside those hours sending pauses and can be resumed.
- Every broadcast text starts with the sender name and ends with "Reply STOP to opt out." Every update call offers press 1 to repeat and press 9 to stop.
- A crisis message (for example "I want to end my life") always gets the Veterans Crisis Line first.

**Staff workflow** (`/staff`)

1. **Overview:** go-live checklist, sign-ups by channel, and what people asked the text and phone line for.
2. **Subscribers:** list (last four digits only), add someone who called or sent a paper form, consent history, stop, or erase completely.
3. **Messages:** write one message with text, call and letter versions, target by topic, place and language, review who it reaches, then send. Texts and calls go in batches with progress shown. Letters print one per page, sized for a #10 window envelope, and can list each person's matching services.
4. **Try the text & phone line:** a simulator that runs the real code. In simulated mode its sign-ups, YES and STOP are saved, so the whole flow can be demonstrated.

## Going live with texts and calls

Real messages go out only when `OUTREACH_LIVE=true` **and** every item below is done. The staff overview shows each one.

1. `OUTREACH_PASSCODE`: a private staff passcode, 12 or more characters.
2. `OUTREACH_ENCRYPTION_KEY`: run `openssl rand -hex 32`. **Back it up.** Without it, stored contact details cannot be read.
3. Persistent storage: set `OUTREACH_DB_PATH` (and `VERIFIER_DB_PATH`) to a disk or volume. Serverless hosts such as Vercel wipe local files, so do not run outreach there without one.
4. Twilio: set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM_NUMBER` (or `TWILIO_MESSAGING_SERVICE_SID`). Register the number for A2P 10DLC texting before sending.
5. `PUBLIC_SITE_URL`: the site's `https://` address.
6. In Twilio, set the number's webhooks (HTTP POST): messages to `/api/sms` and calls to `/api/voice`. Both reject any request without a valid Twilio signature, and both return 404 while Twilio is not configured.

Also set `OUTREACH_SENDER_NAME` and `OUTREACH_RETURN_ADDRESS` so texts, calls, letters and the paper form name the right organization. Have someone familiar with TCPA and CTIA rules review the consent wording in `src/lib/outreach/rules.ts` before launch.

## Guardrails and how they are enforced

| Guardrail | Where |
| --- | --- |
| Source on every listing | Schema requires `source_name` and `source_url`. Every card, printout and letter shows the source and status. |
| A person verifies | Seed records must be `unverified` (`tests/unit/seed-data.test.ts`). Only `VerifierStore.verify` sets "verified." Public reports never change a listing. |
| Never promise access | Seed validator rejects "you qualify." Call scripts, texts and calls say "may be eligible" and "call to confirm." |
| No fabricated contact details | Validator, verifier source notes, importers keep missing fields null. The phone line says "no phone number on file yet." |
| Crisis access everywhere | Footer on every page (tested), every printout, every letter, the phone line greeting, and the first reply to any crisis text. |
| Minimal data | No accounts for browsing. Outreach keeps only reachable contact details, encrypted, for people who opted in. Message text is not stored. Erase removes everything. |
| Consent and opt-out | Per-channel consent records; YES confirmation for web text sign-ups; STOP / press 9 / web / staff opt-out; contact hours. |
| No sends by accident | Live only when the full checklist passes; webhooks need a valid signature; the simulator is a dry run once live. |
| Label anything simulated | Staff mode banner, demo note on the sign-up page, `/about`, verifier login banner. |

## Accessibility and ease of use

- 18px base text, 22px with "Larger text" and on print. Tap targets at least 44px. High contrast.
- Labeled Menu button on phones; every page also linked from the footer, so the site works if JavaScript does not load. Breadcrumbs on inner pages.
- English and Spanish in one tap. The language switch, search, sign-up and stop forms work without JavaScript.
- "Listen" reads a listing aloud using the browser's voice.
- Skip link, focus moves to each intake step's heading, status badges include screen-reader text, and button names start with their visible words for voice control.
- Tested that no page scrolls sideways on a phone, in either language, and that the sticky crisis bar stays compact. Scroll padding keeps focused elements from hiding under it.

## Demo script (about 5 minutes)

Use a phone-sized window. All people and numbers are fictional.

1. **Ray, 71, Spotsylvania (60 s).** "Start: answer 4 quick questions." Transportation, ZIP `22553`, "For me," Skip. Save Mobility Options and FXBGO! (its card shows phone, hours, "Free" and wheelchair lifts, all stated by its source). Open My Plan, see the call script, "Print large-type list."
2. **Dana, Stafford (30 s).** Topics → Legal help → Stafford County. The listings appear under "Elsewhere in the region" because their sources only list Fredericksburg.
3. **Maria, Spanish-speaking caregiver (30 s).** Tap "Español." Everything switches. In My Plan the script stays in English (what to say to the provider) with the Spanish meaning below.
4. **A veteran without a computer (90 s).** Home → "No computer?" → Get updates. Check Food, Stafford, phone `540-555-0134`, "Text messages," permission, "Sign me up." The page says to reply YES. Sign in at `/staff` (`demo-outreach`). In "Try the text & phone line," text `YES` from that number, then `RIDE 22553`. Call the line and press 1, then enter 22553.
5. **Staff send an update (60 s).** Messages: write a food update with text and letter versions, target Food and Stafford, review the count, Send now. Deliveries show as simulated. Text `STOP` in the simulator; the subscriber's consent history shows it.
6. **Verifier (45 s).** On a listing, "Report a problem." Sign in at `/verify` (`demo-verifier`). The report appears at the top, LSNV is flagged "Sources disagree," and verifying a listing shows "Verified … by QA" on the public card.

## Project layout

```
app/                    Next.js App Router
  page.tsx, topics/, resources/, intake/, plan/, help/, print/, suggest/, about/
  updates/              Sign-up, stop, paper form (public)
  staff/                Outreach dashboard: subscribers, messages, letters, simulator
  verify/               Verifier dashboard
  api/sms, api/voice    Twilio webhooks (text line, phone line)
  api/twilio/status     Delivery status callbacks
  lang/                 No-JavaScript language switch
src/lib/                Schema, seed validation, filters, plan, verifier rules, SQLite stores
src/lib/outreach/       Subscriber store and encryption, consent rules, text/phone line,
                        sending engine, Twilio provider and signatures, config and go-live checks
src/lib/i18n/           English and Spanish interface text
src/components/         Header, menu, footer, crisis bar, listing card, display settings
data/resources.json     Seed listings (the source of truth for listings)
scripts/                VA Facilities and CSV importers; seed builder
tests/unit/, tests/e2e/ Vitest and Playwright
```

## Deploy

Outreach needs storage that survives restarts, so use a host with a disk or volume. A `Dockerfile` is included:

```bash
docker build -t vet-connect .
```

```bash
docker run -p 3000:3000 -v vetdata:/data --env-file .env vet-connect
```

The image stores both databases in `/data`. The image's runtime stage was tested by running the production build with production-only dependencies; the Docker build itself was not run here because no Docker daemon was available.

On Vercel the listings site works, but verifier edits and subscriber data live in `/tmp` and reset on cold start, and the go-live checklist will not pass. Use it for demos only.

## Next steps

1. Fill the directory: verify the 20 listings, fill the 6 unread ones, and add food, county social services and other local listings (see "Seed data").
2. Connect Twilio, register for A2P 10DLC, and finish the go-live checklist.
3. Replace shared passcodes with personal staff accounts (single sign-on) before many staff use the dashboard.
4. Phone line in Spanish (press 2 for Spanish), and Spanish replies on the text line for Spanish-language subscribers.
5. Email as a fourth channel, and a mail vendor integration if letter volume grows beyond printing in-house.
