/**
 * Waitlist — the single abstraction point for persisting a signup.
 *
 * The whole rest of the site talks to `submitWaitlist()` and nothing else. The
 * current backend is **Firestore** (the app is mid-migration to Supabase; do NOT
 * build against Supabase yet). To switch backends later, replace ONLY the
 * `firestoreBackend` implementation below with a Supabase one — the public API,
 * validation, and the form component stay untouched.
 *
 * Data hygiene:
 *  - Writes to a dedicated `waitlist_signups` collection ONLY. It never reads,
 *    writes, or references any existing app collection (users, bookings, …).
 *  - The honeypot never reaches the backend; a filled honeypot is treated as a
 *    silent success so bots get no signal.
 *  - Security is enforced server-side by create-only rules (see firestore.rules);
 *    this client validation is a first line, not the last.
 */

export type WaitlistRole = 'hirer' | 'pro';
export type WaitlistCity = 'Lahore' | 'Islamabad' | 'Other' | '';

/** What the form collects. `website` is the honeypot — real users leave it empty. */
export interface WaitlistInput {
  phone: string;
  role: WaitlistRole;
  city?: WaitlistCity;
  /** Which form instance submitted, e.g. 'hero' | 'sticky' — for basic analytics. */
  source?: string;
  /** Honeypot. Must be empty. Never persisted. */
  website?: string;
  /** Client-measured ms from form-render to submit; sub-second = likely bot. */
  elapsedMs?: number;
}

export type WaitlistResult =
  | { ok: true; deduped: boolean }
  | { ok: false; reason: WaitlistErrorReason; message: string };

export type WaitlistErrorReason =
  | 'invalid-phone'
  | 'invalid-role'
  | 'not-configured'
  | 'rate-limited'
  | 'network'
  | 'unknown';

/** The exact document shape written to Firestore. Keep in sync with firestore.rules. */
interface WaitlistDoc {
  phone: string;
  role: WaitlistRole;
  city: string;
  source: string;
  userAgent: string;
  locale: string;
}

// ── Validation ──────────────────────────────────────────────────────────────

/** Pakistani mobile: +92 followed by a 10-digit number starting with 3. */
const PK_MOBILE = /^\+923\d{9}$/;

/**
 * Normalizes common Pakistani phone inputs to canonical +923XXXXXXXXX.
 * Accepts: 03XXXXXXXXX, 3XXXXXXXXX, 923…, +92 3…, with spaces/dashes.
 * Returns null if it cannot be coerced into a valid PK mobile number.
 */
export function normalizePkPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  let d = digits.replace(/^\+/, '');
  if (d.startsWith('0092')) d = d.slice(4);
  else if (d.startsWith('92')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  // now expect 3XXXXXXXXX (10 digits, leading 3)
  const candidate = `+92${d}`;
  return PK_MOBILE.test(candidate) ? candidate : null;
}

const VALID_ROLES: readonly WaitlistRole[] = ['hirer', 'pro'];
const VALID_CITIES: readonly WaitlistCity[] = ['Lahore', 'Islamabad', 'Other', ''];

// ── Backend interface (swap point) ───────────────────────────────────────────

interface WaitlistBackend {
  create(doc: WaitlistDoc): Promise<{ deduped: boolean }>;
}

/**
 * Firestore backend. Uses a deterministic document id derived from the phone
 * number so a repeat signup overwrites rather than duplicates (idempotent).
 */
const firestoreBackend: WaitlistBackend = {
  async create(doc) {
    const [{ getDb }, { doc: fsDoc, setDoc, serverTimestamp }] = await Promise.all([
      import('./firebase'),
      import('firebase/firestore'),
    ]);
    const db = getDb();
    const id = await hashPhone(doc.phone);
    const ref = fsDoc(db, 'waitlist_signups', id);
    // createdAt uses serverTimestamp() → resolves to request.time, which the
    // security rules pin, so clients cannot forge timestamps.
    await setDoc(ref, { ...doc, createdAt: serverTimestamp() });
    return { deduped: false };
  },
};

/** SHA-256 of the phone → stable doc id (avoids storing phone in the id path). */
async function hashPhone(phone: string): Promise<string> {
  const data = new TextEncoder().encode(phone);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Lightweight client rate-limit: one successful submit per 20s per browser.
const RATE_KEY = 'fauran_wl_last';
const RATE_WINDOW_MS = 20_000;

function withinRateLimit(): boolean {
  try {
    const last = Number(localStorage.getItem(RATE_KEY) ?? 0);
    return Date.now() - last > RATE_WINDOW_MS;
  } catch {
    return true; // storage blocked → don't hard-fail the user
  }
}
function markSubmitted(): void {
  try {
    localStorage.setItem(RATE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate + persist a waitlist signup. Never throws; always returns a typed
 * result the UI can render.
 */
export async function submitWaitlist(input: WaitlistInput): Promise<WaitlistResult> {
  // Honeypot: pretend success, write nothing. Bots get no error to learn from.
  if (input.website && input.website.trim() !== '') {
    return { ok: true, deduped: false };
  }
  // Absurdly fast submit → almost certainly a bot. Same silent success.
  if (typeof input.elapsedMs === 'number' && input.elapsedMs < 600) {
    return { ok: true, deduped: false };
  }

  const phone = normalizePkPhone(input.phone ?? '');
  if (!phone) {
    return {
      ok: false,
      reason: 'invalid-phone',
      message: 'Enter a valid Pakistani mobile number, like 0301 2345678.',
    };
  }
  if (!VALID_ROLES.includes(input.role)) {
    return { ok: false, reason: 'invalid-role', message: 'Choose whether you want to hire or work.' };
  }

  const city: WaitlistCity = VALID_CITIES.includes(input.city ?? '') ? (input.city ?? '') : '';

  if (!withinRateLimit()) {
    return {
      ok: false,
      reason: 'rate-limited',
      message: "You're already on the list — we've got your number.",
    };
  }

  const doc: WaitlistDoc = {
    phone,
    role: input.role,
    city,
    source: (input.source ?? 'site').slice(0, 60),
    userAgent: (navigator.userAgent ?? '').slice(0, 300),
    // Slice to the rules' ≤20 bound so every input satisfies firestore.rules,
    // matching how source/userAgent are capped above.
    locale: (navigator.language ?? '').slice(0, 20),
  };

  try {
    const { deduped } = await firestoreBackend.create(doc);
    markSubmitted();
    return { ok: true, deduped };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('not configured')) {
      return {
        ok: false,
        reason: 'not-configured',
        message: 'The waitlist is not connected yet. Please try again shortly.',
      };
    }
    if (import.meta.env.PUBLIC_WAITLIST_DEBUG === '1') {
      // eslint-disable-next-line no-console
      console.error('[waitlist] write failed:', err);
    }
    return {
      ok: false,
      reason: 'network',
      message: "Something went wrong on our side. Please try again in a moment.",
    };
  }
}
