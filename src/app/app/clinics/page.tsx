"use client";

import { useState } from "react";
import { apiGet } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Clinic } from "@/lib/types";

const TYPE_STYLES: Record<string, string> = {
  public: "bg-accent-blue-bg text-accent-blue-fg",
  private: "bg-accent-amber-bg text-accent-amber-fg",
  NGO: "bg-green-100 text-green-700",
};

function osmMapUrl(clinic: Clinic): string | null {
  if (!clinic.coordinates) return null;
  const { latitude, longitude } = clinic.coordinates;
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
}

export default function ClinicsPage() {
  const [mode, setMode] = useState<"near-me" | "by-city">("near-me");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[] | null>(null);
  const [searchedOnce, setSearchedOnce] = useState(false);

  async function searchNearby() {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Your browser doesn't support location search. Try searching by city instead.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const { data } = await apiGet<{ success: boolean; data?: Clinic[]; message?: string }>(
          `/api/clinics/nearby?lat=${latitude}&lng=${longitude}&radius=10000`
        );
        setLoading(false);
        setSearchedOnce(true);
        if (data.success) {
          setClinics(data.data ?? []);
        } else {
          setError(data.message ?? "Could not find clinics near you.");
        }
      },
      () => {
        setLoading(false);
        setError("Location access was denied. Try searching by city instead.");
      }
    );
  }

  async function searchByCity() {
    if (!city.trim()) return;
    setLoading(true);
    setError(null);
    const { data } = await apiGet<{ success: boolean; data?: Clinic[]; message?: string }>(
      `/api/clinics/by-city?city=${encodeURIComponent(city.trim())}`
    );
    setLoading(false);
    setSearchedOnce(true);
    if (data.success) {
      setClinics(data.data ?? []);
    } else {
      setError(data.message ?? "Could not find clinics in that city.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-heading">Find Services</h1>
      <p className="mt-1 text-sm text-muted">Search for hospitals and clinics near you.</p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setMode("near-me")}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
            mode === "near-me"
              ? "border-primary bg-primary text-white"
              : "border-border bg-input-bg text-body hover:border-primary"
          }`}
        >
          Near me
        </button>
        <button
          onClick={() => setMode("by-city")}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
            mode === "by-city"
              ? "border-primary bg-primary text-white"
              : "border-border bg-input-bg text-body hover:border-primary"
          }`}
        >
          By city
        </button>
      </div>

      <div className="mt-4 flex max-w-md gap-2">
        {mode === "near-me" ? (
          <Button loading={loading} onClick={searchNearby}>
            Use my location
          </Button>
        ) : (
          <>
            <Input
              placeholder="e.g. Lagos, Abuja, Ibadan"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchByCity()}
            />
            <Button loading={loading} disabled={!city.trim()} onClick={searchByCity}>
              Search
            </Button>
          </>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {searchedOnce && !loading && clinics?.length === 0 && !error && (
        <p className="mt-6 text-sm text-muted">No clinics found. Try a different city or search radius.</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {clinics?.map((clinic) => {
          const mapUrl = osmMapUrl(clinic);
          return (
            <div key={clinic._id} className="rounded-card bg-card-bg shadow-atmospheric p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-heading">{clinic.name}</p>
                {clinic.type && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_STYLES[clinic.type]}`}>
                    {clinic.type}
                  </span>
                )}
              </div>
              {(clinic.address || clinic.city || clinic.state) && (
                <p className="mt-1 text-sm text-muted">
                  {[clinic.address, clinic.city, clinic.state].filter(Boolean).join(", ")}
                </p>
              )}
              {clinic.openingHours && <p className="mt-1 text-xs text-muted">Hours: {clinic.openingHours}</p>}

              {clinic.specialties && clinic.specialties.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {clinic.specialties.slice(0, 4).map((s) => (
                    <span key={s} className="rounded-full bg-accent-gray-bg px-2 py-0.5 text-xs text-accent-gray-fg">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-primary">
                {clinic.phone && <a href={`tel:${clinic.phone}`}>Call</a>}
                {clinic.website && (
                  <a
                    href={clinic.website.startsWith("http") ? clinic.website : `https://${clinic.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Website
                  </a>
                )}
                {mapUrl && (
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                    View on map
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
