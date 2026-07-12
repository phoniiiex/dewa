"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TEN_MINS = 10 * 60 * 1000;

// ── Avatar marker: circular photo or initials ─────────────────────────────────
function makeAvatarIcon(name: string, profilePicUrl: string, isOnline: boolean, isSelected: boolean) {
  const borderColor = isSelected ? "#E03131" : isOnline ? "#2F9E44" : "#ADB5BD";
  const size = isSelected ? 48 : isOnline ? 44 : 36;
  const pulse = isOnline && !isSelected
    ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${borderColor};animation:pulse-ring 2s ease-out infinite;opacity:0.5;pointer-events:none"></div>`
    : "";

  const inner = profilePicUrl
    ? `<img src="${profilePicUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.style.display='none';this.nextSibling.style.display='flex'" /><div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-weight:800;font-size:${size * 0.4}px;color:white">${name.charAt(0)}</div>`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${size * 0.4}px;color:white">${name.charAt(0)}</div>`;

  const bgColor = isOnline ? "linear-gradient(135deg,#4263EB,#7C5CFC)" : "linear-gradient(135deg,#ADB5BD,#CED4DA)";

  return L.divIcon({
    html: `
      <div style="position:relative;width:${size}px;height:${size}px">
        ${pulse}
        <div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;border:3px solid ${borderColor};box-shadow:0 3px 12px rgba(0,0,0,0.25);background:${bgColor};cursor:pointer">
          ${inner}
        </div>
      </div>
    `,
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 8)],
    className: "",
  });
}

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
  chat_id:      string;
  rep_name:     string;
  latitude:     number;
  longitude:    number;
  accuracy:     number | null;
  is_live:      boolean;
  profile_pic_url: string;
  updated_at:   string;
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
    <div style={{ flex: 1, borderRadius: 16, overflow: "hidden", border: "1px solid hsl(var(--border))", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(0.85); opacity: 0.7; }
          80%  { transform: scale(2.2);  opacity: 0; }
          100% { transform: scale(2.2);  opacity: 0; }
        }
        .leaflet-popup-content-wrapper { border-radius: 14px !important; box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important; }
        .leaflet-popup-tip { display: none !important; }
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
          const icon = makeAvatarIcon(l.rep_name, l.profile_pic_url || "", isOnline, isSelected);

          return (
            <Marker
              key={l.chat_id}
              position={[l.latitude, l.longitude]}
              icon={icon}
              eventHandlers={{ click: () => onSelect(l.chat_id === selectedId ? null : l.chat_id) }}
            >
              <Popup>
                <div style={{ direction: "rtl", fontFamily: "Noto Sans Arabic, sans-serif", minWidth: 180, padding: "4px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    {l.profile_pic_url ? (
                      <img src={l.profile_pic_url} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid #E9ECEF" }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#4263EB,#7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 16 }}>
                        {l.rep_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{l.rep_name}</div>
                      <div style={{ fontSize: 11, color: isOnline ? "#2F9E44" : "#6C757D", fontWeight: 600 }}>
                        {isOnline ? "● ئۆنلاین" : "○ ئۆفلاین"}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", borderTop: "1px solid #F1F3F5", paddingTop: 6 }}>
                    ⏱ {timeAgo(l.updated_at)}
                    {l.accuracy && <span style={{ marginRight: 8 }}>🎯 {Math.round(l.accuracy)}m</span>}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
