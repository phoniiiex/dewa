"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon paths broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TEN_MINS = 10 * 60 * 1000;

function makeIcon(color: string, pulse = false) {
  const pulse_ring = pulse
    ? `<div style="position:absolute;top:-4px;right:-4px;width:36px;height:36px;border-radius:50%;border:3px solid ${color};animation:pulse-ring 2s ease-out infinite;opacity:0.6"></div>`
    : "";
  return L.divIcon({
    html: `<div style="position:relative;width:28px;height:28px">
      ${pulse_ring}
      <div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -32],
    className: "",
  });
}

const onlineIcon   = makeIcon("#2F9E44", true);   // green + pulse
const offlineIcon  = makeIcon("#ADB5BD", false);   // grey
const selectedIcon = makeIcon("#E03131", false);   // red

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)} ثانیە پێش`;
  if (diff < 3600)  return `${Math.floor(diff / 60)} خولەک پێش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} کاتژمێر پێش`;
  return `${Math.floor(diff / 86400)} ڕۆژ پێش`;
}

function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], 15, { duration: 1.2 }); }, [lat, lng, map]);
  return null;
}

interface RepLocation {
  chat_id: string;
  rep_name: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  is_live: boolean;
  updated_at: string;
}

interface Props {
  locations: RepLocation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function RepMap({ locations, selectedId, onSelect }: Props) {
  const center: [number, number] = locations.length > 0
    ? [locations[0].latitude, locations[0].longitude]
    : [36.19, 44.01]; // Erbil default

  const selected = locations.find(l => l.chat_id === selectedId);

  return (
    <div style={{ flex: 1, borderRadius: 16, overflow: "hidden", border: "1px solid #E9ECEF", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(0.8); opacity: 0.8; }
          80%  { transform: scale(2);   opacity: 0; }
          100% { transform: scale(2);   opacity: 0; }
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={locations.length > 0 ? 11 : 8}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {selected && <MapFlyTo lat={selected.latitude} lng={selected.longitude} />}

        {locations.map(l => {
          const isOnline   = Date.now() - new Date(l.updated_at).getTime() < TEN_MINS;
          const isSelected = l.chat_id === selectedId;
          const icon = isSelected ? selectedIcon : isOnline ? onlineIcon : offlineIcon;

          return (
            <Marker
              key={l.chat_id}
              position={[l.latitude, l.longitude]}
              icon={icon}
              eventHandlers={{ click: () => onSelect(l.chat_id === selectedId ? null : l.chat_id) }}
            >
              <Popup>
                <div style={{ direction: "rtl", fontFamily: "Noto Sans Arabic, sans-serif", minWidth: 160 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{l.rep_name}</div>
                  <div style={{ fontSize: 12, marginBottom: 3, color: isOnline ? "#2F9E44" : "#6C757D", fontWeight: 600 }}>
                    {isOnline ? "● ئۆنلاین" : "○ ئۆفلاین"}
                  </div>
                  <div style={{ fontSize: 11, color: "#6C757D" }}>⏱ {timeAgo(l.updated_at)}</div>
                  {l.accuracy && <div style={{ fontSize: 11, color: "#ADB5BD" }}>🎯 دووری: {Math.round(l.accuracy)}m</div>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
