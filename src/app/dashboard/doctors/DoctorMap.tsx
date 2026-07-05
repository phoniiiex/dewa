"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Fix Leaflet default marker icons (broken in webpack) ──────────────────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Custom colored marker ─────────────────────────────────────────────────────
function makeIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25)"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
    className: "",
  });
}
const defaultIcon = makeIcon("#4263EB");
const selectedIcon = makeIcon("#E03131");

// ── Auto-pan to selected doctor ───────────────────────────────────────────────
function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], 15, { duration: 1.2 }); }, [lat, lng, map]);
  return null;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface DoctorPin {
  id: string;
  name: string;
  specialty: string;
  clinic_name: string;
  city: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
}

interface Props {
  doctors: DoctorPin[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

// ── Map Component ─────────────────────────────────────────────────────────────
export default function DoctorMap({ doctors, selectedId, onSelect }: Props) {
  // Center on Iraq if no doctors, else center on first doctor
  const center: [number, number] = doctors.length > 0
    ? [doctors[0].latitude, doctors[0].longitude]
    : [36.19, 44.01]; // Erbil

  const selected = doctors.find(d => d.id === selectedId);

  return (
    <div style={{ flex: 1, borderRadius: 16, overflow: "hidden", border: "1px solid #E9ECEF", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <MapContainer
        center={center}
        zoom={doctors.length > 0 ? 12 : 8}
        style={{ width: "100%", height: "100%" }}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-pan when a doctor is selected */}
        {selected && <MapFlyTo lat={selected.latitude} lng={selected.longitude} />}

        {doctors.map(d => (
          <Marker
            key={d.id}
            position={[d.latitude, d.longitude]}
            icon={d.id === selectedId ? selectedIcon : defaultIcon}
            eventHandlers={{ click: () => onSelect(d.id === selectedId ? null : d.id) }}
          >
            <Popup>
              <div style={{ direction: "rtl", fontFamily: "Noto Sans Arabic, sans-serif", minWidth: 180 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4, color: "#1A1A2E" }}>{d.name}</div>
                {d.specialty && <div style={{ fontSize: 11, background: "#EDF2FF", color: "#4263EB", padding: "2px 7px", borderRadius: 5, display: "inline-block", marginBottom: 6, fontWeight: 600 }}>{d.specialty}</div>}
                {d.clinic_name && <div style={{ fontSize: 12, marginBottom: 3 }}>🏥 {d.clinic_name}</div>}
                {d.city && <div style={{ fontSize: 12, marginBottom: 3 }}>📍 {d.city}{d.address ? ` — ${d.address}` : ""}</div>}
                {d.phone && <div style={{ fontSize: 12 }}>📞 {d.phone}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
