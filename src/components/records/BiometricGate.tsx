"use client";

import { ReactNode, useEffect, useState } from "react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/Button";

type Stage =
  | "checking" // working out whether the gate applies at all
  | "open" // render children — either unlocked, unsupported, or not opted in
  | "locked" // registered credential exists, waiting for the user to unlock
  | "unlocking"; // assertion in progress

// SAFETY PROPERTY: every early-return / error path in this component must
// resolve to "open", never silently stay "locked" forever. This gate is a
// convenience layer in front of an already-working feature (Medical
// Records) — it must never be the reason a user can't reach their own
// records, so any ambiguity (unsupported browser, network error, no
// registered credential) defaults to showing children.
export function BiometricGate({ children }: { children: ReactNode }) {
  const [stage, setStage] = useState<Stage>("checking");
  const [supported, setSupported] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const canUseBiometrics =
        typeof window !== "undefined" &&
        !!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable &&
        (await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false));

      setSupported(!!canUseBiometrics);

      if (!canUseBiometrics) {
        setStage("open");
        return;
      }

      const { data } = await apiGet<{ success: boolean; registered?: boolean }>("/api/webauthn").catch(() => ({
        data: { success: false, registered: false } as { success: boolean; registered?: boolean },
      }));

      if (!data.success) {
        setStage("open");
        return;
      }

      setRegistered(!!data.registered);
      setStage(data.registered ? "locked" : "open");
    })();
  }, []);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const { data: optionsRes } = await apiPost<{ success: boolean; options?: any; message?: string }>(
        "/api/webauthn/register/options"
      );
      if (!optionsRes.success || !optionsRes.options) throw new Error(optionsRes.message ?? "Could not start setup");

      const attestation = await startRegistration({ optionsJSON: optionsRes.options });

      const { data: verifyRes } = await apiPost<{ success: boolean; message?: string }>(
        "/api/webauthn/register/verify",
        attestation
      );
      if (!verifyRes.success) throw new Error(verifyRes.message ?? "Could not verify device");

      setRegistered(true);
    } catch (err: any) {
      setError(err?.message ?? "Could not enable biometric lock on this device.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      await apiDelete("/api/webauthn");
      setRegistered(false);
    } catch {
      setError("Could not disable biometric lock.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock() {
    setStage("unlocking");
    setError(null);
    try {
      const { data: optionsRes } = await apiPost<{ success: boolean; options?: any; message?: string }>(
        "/api/webauthn/authenticate/options"
      );
      if (!optionsRes.success || !optionsRes.options) throw new Error(optionsRes.message ?? "Could not start unlock");

      const assertion = await startAuthentication({ optionsJSON: optionsRes.options });

      const { data: verifyRes } = await apiPost<{ success: boolean; message?: string }>(
        "/api/webauthn/authenticate/verify",
        assertion
      );
      if (!verifyRes.success) throw new Error(verifyRes.message ?? "Verification failed");

      setStage("open");
    } catch (err: any) {
      setError(err?.message ?? "Could not verify — you can continue without biometric verification below.");
      setStage("locked");
    }
  }

  if (stage === "checking") {
    return null;
  }

  if (stage === "locked" || stage === "unlocking") {
    return (
      <div className="mx-auto max-w-md rounded-card bg-card-bg p-8 text-center shadow-atmospheric">
        <h1 className="font-bold text-heading">Unlock Medical Records</h1>
        <p className="mt-2 text-sm text-muted">
          Verify with your device&apos;s biometric lock (fingerprint, face, or PIN) to view your records.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex flex-col items-center gap-3">
          <Button loading={stage === "unlocking"} onClick={handleUnlock}>
            Unlock with biometrics
          </Button>
          <button
            type="button"
            onClick={() => setStage("open")}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Continue without biometric verification
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {supported && (
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-input-bg px-4 py-3 text-xs">
          <span className="text-muted">
            {registered
              ? "Biometric lock is enabled for Medical Records on this device."
              : "Add a biometric lock for Medical Records on this device."}
          </span>
          <Button
            variant="outline"
            className="h-9! px-3! text-xs"
            loading={busy}
            onClick={registered ? handleDisable : handleEnable}
          >
            {registered ? "Disable" : "Enable"}
          </Button>
        </div>
      )}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {children}
    </div>
  );
}
