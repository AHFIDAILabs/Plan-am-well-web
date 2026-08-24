"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { apiGet } from "@/lib/api";
import { Clinic } from "@/lib/types";

// Default Leaflet marker images resolve relative to the bundler's output and
// break under Next.js/Turbopack — a custom inline-SVG pin sidesteps that
// entirely and lets the marker match the brand instead of Leaflet's stock blue.
function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<svg width="30" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 4px rgba(0,0,0,0.35))">
      <path d="M12 2C7.58 2 4 5.58 4 10c0 5.5 7 12 8 12s8-6.5 8-12c0-4.42-3.58-8-8-8z" fill="${color}"/>
      <circle cx="12" cy="10" r="3.2" fill="white"/>
    </svg>`,
    iconSize: [30, 38],
    iconAnchor: [15, 38],
    popupAnchor: [0, -34],
  });
}

const LAGOS_CENTER: [number, number] = [6.5244, 3.3792];

export function ClinicsMapPreview() {
  const [clinics, setClinics] = useState<Clinic[]>([]);

  useEffect(() => {
    apiGet<{ success: boolean; data?: Clinic[] }>("/api/clinics/by-city?city=Lagos").then(({ data }) => {
      if (data.success && data.data) {
        setClinics(data.data.filter((c) => c.coordinates).slice(0, 12));
      }
    });
  }, []);

  return (
    <MapContainer
      center={LAGOS_CENTER}
      zoom={12}
      scrollWheelZoom={false}
      className="h-full w-full"
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {clinics.map((clinic, i) => (
        <Marker
          key={clinic._id}
          position={[clinic.coordinates!.latitude, clinic.coordinates!.longitude]}
          icon={pinIcon(i === 0 ? "#b10045" : "#0058a4")}
        >
          <Popup>
            <p className="font-semibold">{clinic.name}</p>
            {clinic.type && <p className="text-xs capitalize text-muted">{clinic.type}</p>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
