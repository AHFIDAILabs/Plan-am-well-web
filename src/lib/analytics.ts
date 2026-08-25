"use client";

// Thin wrapper around Firebase Analytics (web) — mirrors
// frontend/PlanAmWell/src/services/analyticsService.ts so both apps report
// into the same Firebase project (planamwell-2897d) with the same event
// names, letting mobile and web usage be compared directly.
//
// Defaults to OFF (opt-in, not opt-out): same rationale as mobile — this is
// a sexual/reproductive health app whose brand promise is confidentiality,
// so collection only starts once someone explicitly turns it on in their
// profile. Event names stay structural (screen names, "call_started") and
// params stay non-content (ids, counts, booleans, enums) — never chat text,
// appointment reason, or anything that reveals what someone looked at or
// discussed.

import { initializeApp, FirebaseApp, getApps } from "firebase/app";
import {
  getAnalytics,
  isSupported,
  logEvent as fbLogEvent,
  setAnalyticsCollectionEnabled,
  setUserId as fbSetUserId,
  setUserProperties,
  Analytics,
} from "firebase/analytics";

const CONSENT_KEY = "analytics_consent";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let initPromise: Promise<Analytics | null> | null = null;
let consentGranted = false;
let consentLoaded = false;

// Every exported function below goes through this — a missing/misconfigured
// Firebase config (e.g. env vars not set yet) or an unsupported browser
// (isSupported() is false in some privacy browsers/older Safari) should
// never crash or interrupt the page someone is actually using. Analytics is
// best-effort by design, exactly like the mobile wrapper.
async function safe(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.warn("[analytics] non-fatal error:", err);
  }
}

async function getAnalyticsInstance(): Promise<Analytics | null> {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.apiKey || !firebaseConfig.appId) return null;
  if (analytics) return analytics;

  if (!initPromise) {
    initPromise = (async () => {
      const supported = await isSupported();
      if (!supported) return null;
      app = getApps()[0] ?? initializeApp(firebaseConfig);
      analytics = getAnalytics(app);
      return analytics;
    })();
  }
  return initPromise;
}

function loadStoredConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

async function ensureConsentLoaded() {
  if (consentLoaded) return;
  consentGranted = loadStoredConsent();
  const instance = await getAnalyticsInstance();
  if (instance) setAnalyticsCollectionEnabled(instance, consentGranted);
  consentLoaded = true;
}

export async function getAnalyticsConsent(): Promise<boolean> {
  await safe(ensureConsentLoaded);
  return consentGranted;
}

export async function setAnalyticsConsent(enabled: boolean): Promise<void> {
  consentGranted = enabled;
  consentLoaded = true;
  await safe(async () => {
    try {
      window.localStorage.setItem(CONSENT_KEY, enabled ? "true" : "false");
    } catch {
      // ignore — private browsing / storage blocked
    }
    const instance = await getAnalyticsInstance();
    if (instance) setAnalyticsCollectionEnabled(instance, enabled);
  });
}

export async function logScreenView(screenName: string | undefined | null): Promise<void> {
  if (!screenName) return;
  await safe(async () => {
    await ensureConsentLoaded();
    if (!consentGranted) return;
    const instance = await getAnalyticsInstance();
    if (!instance) return;
    fbLogEvent(instance, "screen_view", { firebase_screen: screenName, firebase_screen_class: screenName });
  });
}

export async function logEvent(
  name: string,
  params?: Record<string, string | number | boolean>
): Promise<void> {
  await safe(async () => {
    await ensureConsentLoaded();
    if (!consentGranted) return;
    const instance = await getAnalyticsInstance();
    if (!instance) return;
    fbLogEvent(instance, name, params);
  });
}

export async function setAnalyticsUser(userId: string, role: "User" | "Doctor"): Promise<void> {
  await safe(async () => {
    await ensureConsentLoaded();
    if (!consentGranted) return;
    const instance = await getAnalyticsInstance();
    if (!instance) return;
    fbSetUserId(instance, userId);
    setUserProperties(instance, { role });
  });
}

export async function clearAnalyticsUser(): Promise<void> {
  await safe(async () => {
    await ensureConsentLoaded();
    if (!consentGranted) return;
    const instance = await getAnalyticsInstance();
    if (!instance) return;
    fbSetUserId(instance, null);
  });
}
