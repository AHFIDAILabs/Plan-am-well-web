"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function ContinueAsGuestLink() {
  const { continueAsGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const result = await continueAsGuest();
    setLoading(false);
    if (!result.success) {
      setError(result.message ?? "Could not continue as a guest. Please try again.");
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="mt-4 inline-block text-xs font-bold text-muted hover:text-heading disabled:opacity-50"
      >
        {loading ? "Starting..." : "Continue as Guest →"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
