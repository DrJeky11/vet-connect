import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { CATEGORY_IDS, LOCALITY_IDS, type CategoryId, type LocalityId } from "../schema";
import { blindIndex, decrypt, encrypt, type Keys } from "./crypto";
import { toE164 } from "./phone";
import { CHANNELS, CONSENT_VERSION, type Channel } from "./rules";

/**
 * Outreach database: people who asked to hear from us by text, phone call or
 * mail, the consent trail behind every channel, messages staff send, and a
 * delivery record for each person and channel.
 *
 * Kept in its own SQLite file, separate from listing data, because it holds
 * personal contact details. Phone, name and address are encrypted; only the
 * last four phone digits, locality, topics and language are stored in the clear
 * so staff can target messages without decrypting anything.
 */

export type ChannelState = "off" | "pending" | "on";
export type Language = "en" | "es";
export const LANGUAGES: Language[] = ["en", "es"];

export const SOURCES = ["web", "staff_phone", "staff_paper", "sms_keyword", "voice_keypress"] as const;
export type Source = (typeof SOURCES)[number];
export const SOURCE_LABELS: Record<Source, string> = {
  web: "Website form",
  staff_phone: "Staff, by phone",
  staff_paper: "Staff, paper form",
  sms_keyword: "Texted JOIN",
  voice_keypress: "Phone line keypress",
};

export type ConsentMethod =
  | "web_form"
  | "verbal_phone"
  | "paper_form"
  | "sms_keyword"
  | "sms_yes"
  | "sms_start"
  | "sms_stop"
  | "voice_keypress"
  | "web_stop"
  | "staff_removal";

export interface MailingAddress {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip: string;
}

export interface SubscriberInput {
  phone?: string | null;
  name?: string | null;
  address?: MailingAddress | null;
  locality?: LocalityId | null;
  language?: Language;
  topics?: CategoryId[];
  channels: Channel[];
  source: Source;
  method: ConsentMethod;
  /** "self" for the person themself, otherwise staff initials. */
  recordedBy: string;
}

export interface SubscriberSummary {
  id: number;
  phoneLast4: string | null;
  hasName: boolean;
  hasAddress: boolean;
  locality: LocalityId | null;
  language: Language;
  topics: CategoryId[];
  sms: ChannelState;
  voice: ChannelState;
  mail: ChannelState;
  source: Source;
  created_at: string;
  updated_at: string;
}

export interface Subscriber extends SubscriberSummary {
  phone: string | null;
  name: string | null;
  address: MailingAddress | null;
}

export interface Audience {
  topics: CategoryId[];
  localities: LocalityId[];
  language: Language | null;
}

export type CampaignStatus = "draft" | "sending" | "sent";
export interface Campaign {
  id: number;
  title: string;
  sms_body: string | null;
  voice_script: string | null;
  mail_body: string | null;
  channels: Channel[];
  audience: Audience;
  status: CampaignStatus;
  created_by: string;
  created_at: string;
  sent_at: string | null;
}

export type DeliveryStatus =
  | "queued"
  | "sent"
  | "simulated"
  | "delivered"
  | "failed"
  | "skipped_opted_out"
  | "to_print"
  | "mailed";

export interface Delivery {
  id: number;
  campaign_id: number;
  subscriber_id: number;
  channel: Channel;
  status: DeliveryStatus;
  provider_id: string | null;
  detail: string | null;
  at: string;
}

export interface InboundRecord {
  channel: "sms" | "voice";
  phone?: string | null;
  intent: string;
  topic?: CategoryId | null;
  locality?: LocalityId | null;
  results?: number | null;
}

export class OutreachError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function openOutreachDb(path: string): DatabaseSync {
  const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_enc TEXT,
      phone_index TEXT UNIQUE,
      phone_last4 TEXT,
      name_enc TEXT,
      address_enc TEXT,
      address_index TEXT,
      locality TEXT,
      language TEXT NOT NULL DEFAULT 'en',
      topics TEXT NOT NULL DEFAULT '[]',
      sms_state TEXT NOT NULL DEFAULT 'off',
      voice_state TEXT NOT NULL DEFAULT 'off',
      mail_state TEXT NOT NULL DEFAULT 'off',
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS subscribers_address_index ON subscribers(address_index);
    CREATE TABLE IF NOT EXISTS consents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
      channel TEXT NOT NULL,
      granted INTEGER NOT NULL,
      method TEXT NOT NULL,
      consent_version TEXT,
      recorded_by TEXT NOT NULL,
      at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      sms_body TEXT,
      voice_script TEXT,
      mail_body TEXT,
      channels TEXT NOT NULL,
      audience TEXT NOT NULL,
      status TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      sent_at TEXT
    );
    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_id TEXT,
      detail TEXT,
      at TEXT NOT NULL,
      UNIQUE (campaign_id, subscriber_id, channel)
    );
    CREATE INDEX IF NOT EXISTS deliveries_provider ON deliveries(provider_id);
    CREATE TABLE IF NOT EXISTS inbound (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      phone_index TEXT,
      intent TEXT NOT NULL,
      topic TEXT,
      locality TEXT,
      results INTEGER,
      at TEXT NOT NULL
    );
  `);
  return db;
}

interface SubscriberRow {
  id: number;
  phone_enc: string | null;
  phone_index: string | null;
  phone_last4: string | null;
  name_enc: string | null;
  address_enc: string | null;
  locality: string | null;
  language: string;
  topics: string;
  sms_state: string;
  voice_state: string;
  mail_state: string;
  source: string;
  created_at: string;
  updated_at: string;
}

const STATE_COL: Record<Channel, "sms_state" | "voice_state" | "mail_state"> = {
  sms: "sms_state",
  voice: "voice_state",
  mail: "mail_state",
};

function clean(s: string | null | undefined): string | null {
  const t = typeof s === "string" ? s.trim().replace(/\s+/g, " ") : "";
  return t ? t : null;
}

export function normalizeAddress(a: MailingAddress | null | undefined): MailingAddress | null {
  if (!a) return null;
  const line1 = clean(a.line1);
  const city = clean(a.city);
  const state = clean(a.state)?.toUpperCase() ?? null;
  const zip = clean(a.zip);
  if (!line1 && !city && !zip) return null;
  if (!line1 || !city || !state || !zip) throw new OutreachError("A mailing address needs a street, city, state and ZIP code.");
  if (!/^[A-Z]{2}$/.test(state)) throw new OutreachError("Use the two-letter state code, like VA.");
  if (!/^\d{5}(-\d{4})?$/.test(zip)) throw new OutreachError("ZIP code should be 5 digits.");
  return { line1, line2: clean(a.line2), city, state, zip };
}

function onlyValid<T extends string>(values: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((v): v is T => typeof v === "string" && (allowed as readonly string[]).includes(v)))];
}

export class OutreachStore {
  constructor(
    private db: DatabaseSync,
    private keys: Keys,
  ) {}

  private tx<T>(fn: () => T): T {
    this.db.exec("BEGIN");
    try {
      const out = fn();
      this.db.exec("COMMIT");
      return out;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  private phoneIndex(e164: string) {
    return blindIndex(this.keys, e164);
  }

  private addressIndex(a: MailingAddress) {
    return blindIndex(this.keys, `addr|${a.line1.toLowerCase()}|${a.zip.slice(0, 5)}`);
  }

  private summarize(row: SubscriberRow): SubscriberSummary {
    return {
      id: row.id,
      phoneLast4: row.phone_last4,
      hasName: Boolean(row.name_enc),
      hasAddress: Boolean(row.address_enc),
      locality: (row.locality as LocalityId) ?? null,
      language: row.language === "es" ? "es" : "en",
      topics: onlyValid(JSON.parse(row.topics), CATEGORY_IDS),
      sms: row.sms_state as ChannelState,
      voice: row.voice_state as ChannelState,
      mail: row.mail_state as ChannelState,
      source: row.source as Source,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private hydrate(row: SubscriberRow): Subscriber {
    const address = decrypt(this.keys, row.address_enc);
    return {
      ...this.summarize(row),
      phone: decrypt(this.keys, row.phone_enc),
      name: decrypt(this.keys, row.name_enc),
      address: address ? (JSON.parse(address) as MailingAddress) : null,
    };
  }

  private row(id: number): SubscriberRow | undefined {
    return this.db.prepare("SELECT * FROM subscribers WHERE id = ?").get(id) as SubscriberRow | undefined;
  }

  private rowByPhone(e164: string): SubscriberRow | undefined {
    return this.db.prepare("SELECT * FROM subscribers WHERE phone_index = ?").get(this.phoneIndex(e164)) as
      | SubscriberRow
      | undefined;
  }

  private recordConsent(
    subscriberId: number,
    channel: Channel,
    granted: boolean,
    method: ConsentMethod,
    recordedBy: string,
    at: string,
  ) {
    this.db
      .prepare(
        "INSERT INTO consents (subscriber_id, channel, granted, method, consent_version, recorded_by, at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(subscriberId, channel, granted ? 1 : 0, method, granted ? CONSENT_VERSION : null, recordedBy, at);
  }

  private setState(id: number, channel: Channel, state: ChannelState, at: string) {
    this.db.prepare(`UPDATE subscribers SET ${STATE_COL[channel]} = ?, updated_at = ? WHERE id = ?`).run(state, at, id);
  }

  /**
   * Add someone, or update them if their phone number (or mailing address) is
   * already on file. Texts signed up from the website stay "pending" until the
   * phone itself replies YES, so a mistyped or someone else's number never
   * gets updates.
   */
  upsert(input: SubscriberInput, now: Date = new Date()): { subscriber: SubscriberSummary; created: boolean; needsSmsConfirm: boolean } {
    const at = now.toISOString();
    const channels = onlyValid(input.channels, CHANNELS);
    if (channels.length === 0) throw new OutreachError("Pick at least one way to hear from us.");
    const phone = input.phone ? toE164(input.phone) : null;
    if (input.phone && !phone) throw new OutreachError("Enter a 10-digit US phone number.");
    if ((channels.includes("sms") || channels.includes("voice")) && !phone) {
      throw new OutreachError("Texts and calls need a phone number.");
    }
    const address = normalizeAddress(input.address);
    if (channels.includes("mail") && !address) throw new OutreachError("Letters need a mailing address.");
    const name = clean(input.name);
    if (channels.includes("mail") && !name) throw new OutreachError("Letters need a name to address them to.");
    // Undefined means "not asked" (e.g. someone texted JOIN), so existing choices are kept.
    const topics = input.topics === undefined ? null : onlyValid(input.topics, CATEGORY_IDS);
    const locality = input.locality && (LOCALITY_IDS as string[]).includes(input.locality) ? input.locality : null;
    const language: Language | null = input.language === undefined ? null : input.language === "es" ? "es" : "en";
    const recordedBy = clean(input.recordedBy) ?? "self";

    return this.tx(() => {
      let existing = phone ? this.rowByPhone(phone) : undefined;
      if (!existing && address) {
        existing = this.db
          .prepare("SELECT * FROM subscribers WHERE address_index = ? AND phone_index IS NULL")
          .get(this.addressIndex(address)) as SubscriberRow | undefined;
      }
      let id: number;
      if (existing) {
        id = existing.id;
        this.db
          .prepare(
            `UPDATE subscribers SET
               phone_enc = COALESCE(?, phone_enc), phone_index = COALESCE(?, phone_index), phone_last4 = COALESCE(?, phone_last4),
               name_enc = COALESCE(?, name_enc), address_enc = COALESCE(?, address_enc), address_index = COALESCE(?, address_index),
               locality = COALESCE(?, locality), language = COALESCE(?, language), topics = COALESCE(?, topics), updated_at = ?
             WHERE id = ?`,
          )
          .run(
            phone ? encrypt(this.keys, phone) : null,
            phone ? this.phoneIndex(phone) : null,
            phone ? phone.slice(-4) : null,
            name ? encrypt(this.keys, name) : null,
            address ? encrypt(this.keys, JSON.stringify(address)) : null,
            address ? this.addressIndex(address) : null,
            locality,
            language,
            topics ? JSON.stringify(topics) : null,
            at,
            id,
          );
      } else {
        const res = this.db
          .prepare(
            `INSERT INTO subscribers (phone_enc, phone_index, phone_last4, name_enc, address_enc, address_index, locality, language, topics, source, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            phone ? encrypt(this.keys, phone) : null,
            phone ? this.phoneIndex(phone) : null,
            phone ? phone.slice(-4) : null,
            name ? encrypt(this.keys, name) : null,
            address ? encrypt(this.keys, JSON.stringify(address)) : null,
            address ? this.addressIndex(address) : null,
            locality,
            language ?? "en",
            JSON.stringify(topics ?? []),
            input.source,
            at,
            at,
          );
        id = Number(res.lastInsertRowid);
      }

      const before = existing ? this.summarize(existing) : null;
      let needsSmsConfirm = false;
      for (const ch of channels) {
        const current = before?.[ch] ?? "off";
        if (current === "on") continue;
        const next: ChannelState = ch === "sms" && input.method === "web_form" ? "pending" : "on";
        if (next === "pending") needsSmsConfirm = true;
        this.setState(id, ch, next, at);
        this.recordConsent(id, ch, true, input.method, recordedBy, at);
      }
      return { subscriber: this.summarize(this.row(id)!), created: !existing, needsSmsConfirm };
    });
  }

  findByPhone(raw: string): Subscriber | null {
    const e164 = toE164(raw);
    if (!e164) return null;
    const row = this.rowByPhone(e164);
    return row ? this.hydrate(row) : null;
  }

  get(id: number): Subscriber | null {
    const row = this.row(id);
    return row ? this.hydrate(row) : null;
  }

  summary(id: number): SubscriberSummary | null {
    const row = this.row(id);
    return row ? this.summarize(row) : null;
  }

  /** Phone replied YES to a pending text sign-up. */
  confirmSms(raw: string, now: Date = new Date()): boolean {
    const e164 = toE164(raw);
    const row = e164 ? this.rowByPhone(e164) : undefined;
    if (!row || row.sms_state !== "pending") return false;
    const at = now.toISOString();
    this.tx(() => {
      this.setState(row.id, "sms", "on", at);
      this.recordConsent(row.id, "sms", true, "sms_yes", "self", at);
    });
    return true;
  }

  /** Turn channels off and record who asked. Returns the channels that changed. */
  optOut(id: number, channels: Channel[], method: ConsentMethod, recordedBy: string, now: Date = new Date()): Channel[] {
    const row = this.row(id);
    if (!row) throw new OutreachError("No such subscriber.", 404);
    const at = now.toISOString();
    const s = this.summarize(row);
    const changed = channels.filter((ch) => s[ch] !== "off");
    this.tx(() => {
      for (const ch of changed) {
        this.setState(id, ch, "off", at);
        this.recordConsent(id, ch, false, method, recordedBy, at);
      }
    });
    return changed;
  }

  optOutPhone(raw: string, channels: Channel[], method: ConsentMethod, recordedBy = "self", now = new Date()): Channel[] {
    const e164 = toE164(raw);
    const row = e164 ? this.rowByPhone(e164) : undefined;
    return row ? this.optOut(row.id, channels, method, recordedBy, now) : [];
  }

  /** Remove a person and everything tied to them (consents, deliveries). */
  erase(id: number): void {
    this.db.prepare("DELETE FROM subscribers WHERE id = ?").run(id);
  }

  consents(id: number) {
    return this.db.prepare("SELECT channel, granted, method, consent_version, recorded_by, at FROM consents WHERE subscriber_id = ? ORDER BY id").all(id) as {
      channel: Channel;
      granted: number;
      method: ConsentMethod;
      consent_version: string | null;
      recorded_by: string;
      at: string;
    }[];
  }

  list(): SubscriberSummary[] {
    return (this.db.prepare("SELECT * FROM subscribers ORDER BY id DESC").all() as unknown as SubscriberRow[]).map((r) =>
      this.summarize(r),
    );
  }

  counts() {
    const out: Record<Channel, Record<ChannelState, number>> = {
      sms: { on: 0, pending: 0, off: 0 },
      voice: { on: 0, pending: 0, off: 0 },
      mail: { on: 0, pending: 0, off: 0 },
    };
    let total = 0;
    for (const s of this.list()) {
      total++;
      for (const ch of CHANNELS) out[ch][s[ch]]++;
    }
    return { total, ...out };
  }

  /** Who a message reaches on one channel: opted in, and matching the audience. */
  audience(a: Audience, channel: Channel): SubscriberSummary[] {
    return this.list().filter((s) => {
      if (s[channel] !== "on") return false;
      if (a.language && s.language !== a.language) return false;
      if (a.localities.length && (!s.locality || !a.localities.includes(s.locality))) return false;
      if (a.topics.length && s.topics.length && !s.topics.some((t) => a.topics.includes(t))) return false;
      return true;
    });
  }

  // ---- Campaigns ----------------------------------------------------------

  createCampaign(
    input: { title: string; sms_body?: string | null; voice_script?: string | null; mail_body?: string | null; channels: Channel[]; audience: Partial<Audience> },
    createdBy: string,
    now: Date = new Date(),
  ): Campaign {
    const title = clean(input.title);
    if (!title) throw new OutreachError("Give the message a short title (staff only see it).");
    const channels = onlyValid(input.channels, CHANNELS);
    if (!channels.length) throw new OutreachError("Pick at least one channel.");
    const sms = input.sms_body?.trim() || null;
    const voice = input.voice_script?.trim() || null;
    const mail = input.mail_body?.trim() || null;
    if (channels.includes("sms") && !sms) throw new OutreachError("Write the text message.");
    if (channels.includes("voice") && !voice) throw new OutreachError("Write what the phone call will say.");
    if (channels.includes("mail") && !mail) throw new OutreachError("Write the letter.");
    if (sms && sms.length > 480) throw new OutreachError("Keep the text message under 480 characters.");
    const audience: Audience = {
      topics: onlyValid(input.audience.topics ?? [], CATEGORY_IDS),
      localities: onlyValid(input.audience.localities ?? [], LOCALITY_IDS),
      language: input.audience.language === "en" || input.audience.language === "es" ? input.audience.language : null,
    };
    const res = this.db
      .prepare(
        "INSERT INTO campaigns (title, sms_body, voice_script, mail_body, channels, audience, status, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)",
      )
      .run(
        title,
        channels.includes("sms") ? sms : null,
        channels.includes("voice") ? voice : null,
        channels.includes("mail") ? mail : null,
        JSON.stringify(channels),
        JSON.stringify(audience),
        createdBy,
        now.toISOString(),
      );
    return this.campaign(Number(res.lastInsertRowid))!;
  }

  campaign(id: number): Campaign | null {
    const row = this.db.prepare("SELECT * FROM campaigns WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      ...(row as unknown as Campaign),
      channels: JSON.parse(row.channels as string),
      audience: JSON.parse(row.audience as string),
    };
  }

  campaigns(): Campaign[] {
    const ids = this.db.prepare("SELECT id FROM campaigns ORDER BY id DESC").all() as { id: number }[];
    return ids.map((r) => this.campaign(r.id)!);
  }

  /** Create one delivery per person and channel. Texts and calls queue; letters wait to be printed. */
  enqueue(campaignId: number, now: Date = new Date()): Record<Channel, number> {
    const c = this.campaign(campaignId);
    if (!c) throw new OutreachError("No such message.", 404);
    if (c.status !== "draft") throw new OutreachError("This message was already sent.");
    const at = now.toISOString();
    const counts: Record<Channel, number> = { sms: 0, voice: 0, mail: 0 };
    this.tx(() => {
      const insert = this.db.prepare(
        "INSERT OR IGNORE INTO deliveries (campaign_id, subscriber_id, channel, status, at) VALUES (?, ?, ?, ?, ?)",
      );
      for (const ch of c.channels) {
        for (const s of this.audience(c.audience, ch)) {
          insert.run(c.id, s.id, ch, ch === "mail" ? "to_print" : "queued", at);
          counts[ch]++;
        }
      }
      this.db.prepare("UPDATE campaigns SET status = 'sending', sent_at = ? WHERE id = ?").run(at, c.id);
    });
    this.finishIfDone(c.id);
    return counts;
  }

  queued(campaignId: number, limit: number): Delivery[] {
    return this.db
      .prepare("SELECT * FROM deliveries WHERE campaign_id = ? AND status = 'queued' ORDER BY id LIMIT ?")
      .all(campaignId, limit) as unknown as Delivery[];
  }

  queuedCount(campaignId: number): number {
    const row = this.db.prepare("SELECT COUNT(*) AS n FROM deliveries WHERE campaign_id = ? AND status = 'queued'").get(campaignId) as { n: number };
    return Number(row.n);
  }

  markDelivery(id: number, status: DeliveryStatus, providerId: string | null, detail: string | null, now: Date = new Date()) {
    this.db
      .prepare("UPDATE deliveries SET status = ?, provider_id = COALESCE(?, provider_id), detail = ?, at = ? WHERE id = ?")
      .run(status, providerId, detail, now.toISOString(), id);
  }

  /** Provider status callback (e.g. Twilio says a text was delivered or failed). */
  updateByProviderId(providerId: string, status: DeliveryStatus, detail: string | null, now: Date = new Date()): boolean {
    const res = this.db
      .prepare("UPDATE deliveries SET status = ?, detail = COALESCE(?, detail), at = ? WHERE provider_id = ?")
      .run(status, detail, now.toISOString(), providerId);
    return Number(res.changes) > 0;
  }

  finishIfDone(campaignId: number) {
    if (this.queuedCount(campaignId) === 0) this.db.prepare("UPDATE campaigns SET status = 'sent' WHERE id = ? AND status = 'sending'").run(campaignId);
  }

  deliveryStats(campaignId: number): Record<Channel, Partial<Record<DeliveryStatus, number>>> {
    const rows = this.db
      .prepare("SELECT channel, status, COUNT(*) AS n FROM deliveries WHERE campaign_id = ? GROUP BY channel, status")
      .all(campaignId) as { channel: Channel; status: DeliveryStatus; n: number }[];
    const out: Record<Channel, Partial<Record<DeliveryStatus, number>>> = { sms: {}, voice: {}, mail: {} };
    for (const r of rows) out[r.channel][r.status] = Number(r.n);
    return out;
  }

  /** Letters to print for a campaign, with decrypted names and addresses. */
  letters(campaignId: number): { delivery: Delivery; name: string; address: MailingAddress; language: Language }[] {
    const rows = this.db
      .prepare("SELECT * FROM deliveries WHERE campaign_id = ? AND channel = 'mail' AND status IN ('to_print', 'mailed') ORDER BY id")
      .all(campaignId) as unknown as Delivery[];
    return rows.flatMap((d) => {
      const s = this.get(d.subscriber_id);
      // Someone who stopped letters after the message was queued is left out.
      if (!s || !s.address || !s.name || s.mail !== "on") return [];
      return [{ delivery: d, name: s.name, address: s.address, language: s.language }];
    });
  }

  markMailed(campaignId: number, now: Date = new Date()): number {
    const res = this.db
      .prepare("UPDATE deliveries SET status = 'mailed', at = ? WHERE campaign_id = ? AND channel = 'mail' AND status = 'to_print'")
      .run(now.toISOString(), campaignId);
    return Number(res.changes);
  }

  // ---- Inbound demand -----------------------------------------------------

  /** Record what someone asked the text or phone line for. The message text itself is not kept. */
  logInbound(r: InboundRecord, now: Date = new Date()) {
    const e164 = r.phone ? toE164(r.phone) : null;
    this.db
      .prepare("INSERT INTO inbound (channel, phone_index, intent, topic, locality, results, at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(r.channel, e164 ? this.phoneIndex(e164) : null, r.intent, r.topic ?? null, r.locality ?? null, r.results ?? null, now.toISOString());
  }

  /** Requests by topic over the last N days, and how many found nothing. */
  demand(days = 30, now: Date = new Date()) {
    const since = new Date(now.getTime() - days * 86_400_000).toISOString();
    const rows = this.db
      .prepare(
        "SELECT channel, topic, locality, COUNT(*) AS n, SUM(CASE WHEN results = 0 THEN 1 ELSE 0 END) AS empty FROM inbound WHERE at >= ? AND topic IS NOT NULL GROUP BY channel, topic, locality ORDER BY n DESC",
      )
      .all(since) as { channel: string; topic: CategoryId; locality: LocalityId | null; n: number; empty: number }[];
    const total = this.db.prepare("SELECT COUNT(*) AS n FROM inbound WHERE at >= ?").get(since) as { n: number };
    return { total: Number(total.n), rows: rows.map((r) => ({ ...r, n: Number(r.n), empty: Number(r.empty) })) };
  }
}
