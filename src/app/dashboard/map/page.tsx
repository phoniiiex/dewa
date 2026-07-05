"use client";
import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { MapPin, RefreshCw, Wifi, WifiOff, Users } from "lucide-react";
import Link from "next/link";

const RepMap = dynamic(() => import("./RepMap"), { ssr: false, loading: () => (
  <div style={{ flex: 1, background: "#F0F4F8", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ textAlign: "center", color: "#ADB5BD" }}>
      <MapPin size={36} style={{ marginBottom: 8, opacity: 0.4 }} />
      <div style={{ fontSize: 13 }}>نەخشەکە بارئەکرێت...</div>
    </div>
  </div>
)});

interface RepLocation {
  chat_id: string;
  rep_name: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  live_period: number | null;
  is_live: boolean;
  updated_at: string;
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)} ثانیە پێش`;
  if (diff < 3600)  return `${Math.floor(diff / 60)} خولەک پێش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} کاتژمێر پێش`;
  return `${Math.floor(diff / 86400)} ڕۆژ پێش`;
}

const TEN_MINS = 10 * 60 * 1000;

export default function MapPage() {
  const [locations, setLocations] = useState<RepLocation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchLocations = useCallback(async () => {
    const res  = await fetch("/api/rep-locations");
    const data = await res.json();
    setLocations((data.locations || []) as RepLocation[]);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 30_000);
    return () => clearInterval(interval);
  }, [fetchLocations]);

  const online  = locations.filter(l => Date.now() - new Date(l.updated_at).getTime() < TEN_MINS);
  const offline = locations.filter(l => Date.now() - new Date(l.updated_at).getTime() >= TEN_MINS);

  return (
    <div style={{ height: "calc(100vh - 64px)", display: "flex", flexDirection: "column", padding: 16, gap: 12, direction: "rtl" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1A1A2E", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={20} color="#4263EB" /> نەخشەی زیندوو
          </h1>
          <p style={{ color: "#6C757D", fontSize: 12, margin: "3px 0 0" }}>
            شوێنی نوێنەران لە ئێستادا · دواین نوێکردنەوە: {lastRefresh.toLocaleTimeString("ckb")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {online.length > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#EBFBEE", borderRadius: 20, fontSize: 12, fontWeight: 700, color: "#2F9E44" }}>
              <Wifi size={12} /> {online.length} ئۆنلاین
            </span>
          )}
          <button onClick={fetchLocations} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: "1px solid #E9ECEF", background: "white", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#6C757D", fontFamily: "inherit" }}>
            <RefreshCw size={13} /> نوێکردنەوە
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", gap: 12, minHeight: 0 }}>
        {/* Side panel */}
        <div style={{ width: 260, display: "flex", flexDirection: "column", gap: 6, overflow: "auto", flexShrink: 0 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 24, color: "#ADB5BD", fontSize: 12 }}>چاوەڕوان بکە...</div>
          ) : locations.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, background: "white", borderRadius: 14, border: "1px solid #E9ECEF" }}>
              <MapPin size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: "#ADB5BD", marginBottom: 8 }}>هیچ نوێنەرێک شوێنی نەنێردووە</div>
              <Link href="/dashboard/telegram" style={{ fontSize: 12, color: "#4263EB", fontWeight: 600 }}>بڕۆ بۆ ڕێکخستنی تێلێگرام</Link>
            </div>
          ) : (
            <>
              {online.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#2F9E44", padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#2F9E44" }} /> ئۆنلاین ({online.length})
                  </div>
                  {online.map(l => (
                    <div key={l.chat_id} onClick={() => setSelectedId(l.chat_id === selectedId ? null : l.chat_id)}
                      style={{ background: "white", borderRadius: 12, border: selectedId === l.chat_id ? "2px solid #4263EB" : "1px solid #E9ECEF", padding: "10px 12px", cursor: "pointer", transition: "all .15s" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ position: "relative", width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#4263EB,#7C5CFC)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {l.rep_name.charAt(0)}
                          <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: "#2F9E44", border: "2px solid white" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1A2E" }}>{l.rep_name}</div>
                          <div style={{ fontSize: 10, color: "#2F9E44", fontWeight: 600 }}>● {timeAgo(l.updated_at)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {offline.length > 0 && (
                <>
                  {online.length > 0 && <div style={{ height: 1, background: "#F1F3F5", margin: "4px 0" }} />}
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#ADB5BD", padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}>
                    <WifiOff size={9} /> ئۆفلاین ({offline.length})
                  </div>
                  {offline.map(l => (
                    <div key={l.chat_id} style={{ background: "#F8F9FA", borderRadius: 12, border: "1px solid #E9ECEF", padding: "10px 12px", opacity: 0.7 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ position: "relative", width: 32, height: 32, borderRadius: "50%", background: "#CED4DA", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {l.rep_name.charAt(0)}
                          <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: "#CED4DA", border: "2px solid white" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#6C757D" }}>{l.rep_name}</div>
                          <div style={{ fontSize: 10, color: "#ADB5BD" }}>{timeAgo(l.updated_at)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Map */}
        <RepMap
          locations={locations}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Bottom hint if no locations */}
      {!loading && locations.length === 0 && (
        <div style={{ flexShrink: 0, padding: "10px 16px", background: "#EDF2FF", borderRadius: 10, fontSize: 12, color: "#4263EB", display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={14} />
          <span>بۆ بینینی شوێن، پێویستە نوێنەران ڕۆڵیان دیاری بکەن لە <Link href="/dashboard/telegram" style={{ color: "#4263EB", fontWeight: 700 }}>ڕێکخستنی تێلێگرام</Link> و شوێنی زیندووی هاوبەش بکەن.</span>
        </div>
      )}
    </div>
  );
}
