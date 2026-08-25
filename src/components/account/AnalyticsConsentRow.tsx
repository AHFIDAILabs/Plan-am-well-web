"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { Icon, ICONS } from "@/components/ui/Icon";
import { getAnalyticsConsent, setAnalyticsConsent } from "@/lib/analytics";

// Opt-in, off by default — mirrors mobile's PrivacySettingsScreen consent
// toggle so both apps report into the same analytics project only once
// someone explicitly agrees. See src/lib/analytics.ts. Shared between the
// patient and doctor profile pages since both roles get analytics events on
// mobile too (login, sign_up, call_started/ended, etc).
export function AnalyticsConsentRow() {
  const [enabled, setEnabled] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAnalyticsConsent().then((v) => {
      setEnabled(v);
      setChecked(true);
    });
  }, []);

  async function handleToggle(next: boolean) {
    setBusy(true);
    setEnabled(next);
    await setAnalyticsConsent(next);
    setBusy(false);
  }

  if (!checked) return null;

  return (
    <div className="flex items-center justify-between rounded-lg p-4 hover:bg-input-bg">
      <div className="flex items-center gap-3">
        <Icon path={ICONS.chart} className="h-5 w-5 text-muted" />
        <div>
          <p className="text-sm font-medium text-heading">Usage Analytics</p>
          <p className="text-xs text-muted">
            Help us improve PlanAmWell by sharing anonymous usage data — never chat content or appointment details.
          </p>
        </div>
      </div>
      <Toggle checked={enabled} onChange={handleToggle} disabled={busy} aria-label="Usage analytics" />
    </div>
  );
}
