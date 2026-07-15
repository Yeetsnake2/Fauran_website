/**
 * Firestore security-rules test for the marketing waitlist.
 *
 * Verifies that `waitlist_signups` is CREATE-ONLY with strict field validation,
 * and that read/update/delete and any other collection are denied.
 *
 * REQUIRES the Firestore emulator (needs Java + firebase-tools). Run with:
 *
 *   npx firebase emulators:exec --only firestore "npm run test:rules"
 *
 * (or start `firebase emulators:start --only firestore` in another terminal, then
 * `npm run test:rules`). This could NOT be executed in the build environment
 * because Java/firebase-tools were unavailable there — run it before launch.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

const validDoc = () => ({
  phone: '+923012345678',
  role: 'hirer',
  city: 'Lahore',
  source: 'waitlist',
  userAgent: 'test-agent',
  locale: 'en-PK',
  createdAt: serverTimestamp(),
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'fauran-waitlist-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('waitlist_signups — create-only', () => {
  it('allows a valid create', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, 'waitlist_signups', 'a1'), validDoc()));
  });

  it('rejects an invalid phone number', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'waitlist_signups', 'a2'), { ...validDoc(), phone: '12345' }));
  });

  it('rejects a bad role', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'waitlist_signups', 'a3'), { ...validDoc(), role: 'admin' }));
  });

  it('rejects an extra/unknown field', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(db, 'waitlist_signups', 'a4'), { ...validDoc(), isAdmin: true }),
    );
  });

  it('rejects a forged (non-server) timestamp', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(db, 'waitlist_signups', 'a5'), {
        ...validDoc(),
        createdAt: Timestamp.fromDate(new Date(2000, 0, 1)),
      }),
    );
  });

  it('denies reads', async () => {
    // Seed a doc bypassing rules, then attempt to read it as a client.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'waitlist_signups', 'seed'), {
        ...validDoc(),
        createdAt: Timestamp.now(),
      });
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'waitlist_signups', 'seed')));
  });

  it('denies updates', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'waitlist_signups', 'upd'), {
        ...validDoc(),
        createdAt: Timestamp.now(),
      });
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'waitlist_signups', 'upd'), validDoc()));
  });

  it('denies deletes', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'waitlist_signups', 'del'), {
        ...validDoc(),
        createdAt: Timestamp.now(),
      });
    });
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(deleteDoc(doc(db, 'waitlist_signups', 'del')));
  });
});

describe('app collections are untouchable from the site', () => {
  it('denies reads/writes to any other collection', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users', 'someone')));
    await assertFails(setDoc(doc(db, 'bookings', 'b1'), { anything: true }));
  });
});
