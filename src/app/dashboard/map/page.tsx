"use client";
import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { MapPin, RefreshCw, Wifi, WifiOff, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RepMap = dynamic(() => import("./RepMap"), { ssr: false, loading: () => (
  <div className="flex-1 bg-muted/40 flex items-center justify-center">
    <div className="flex flex-col items-center text-muted-foreground">
      <MapPin className="size-9 mb-2 opacity-40" />
      <p className="text-sm">نەخشەکە بارئەکرێت...</p>
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
  profile_pic_url: string;
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

function RepAvatar({ loc, isOnline, selected }: { loc: RepLocation; isOnline: boolean; selected: boolean }) {
  return (
    <div className={cn("relative size-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-white text-sm font-black",
      isOnline ? "bg-gradient-to-br from-primary to-violet-500" : "bg-muted-foreground/40",
      selected && "ring-2 ring-primary ring-offset-1")}>
      {loc.profile_pic_url && (
        <img src={loc.profile_pic_url} alt={loc.rep_name} className="absolute inset-0 w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      )}
      {loc.rep_name.charAt(0)}
      <div className={cn("absolute bottom-0 end-0 size-2 rounded-full border-2 border-background",
        isOnline ? "bg-emerald-500" : "bg-muted-foreground/60")} />
    </div>
  );
}

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
    <div className="flex flex-col gap-3 p-4" style={{ height: "calc(100vh - 64px)" }} dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <MapPin className="size-5 text-primary" /> نەخشەی زیندوو
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            شوێنی نوێنەران لە ئێستادا · دواین نوێکردنەوە: {lastRefresh.toLocaleTimeString("ckb")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {online.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <Wifi className="size-3" /> {online.length} ئۆنلاین
            </span>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={fetchLocations}>
            <RefreshCw className="size-3.5" /> نوێکردنەوە
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Side panel */}
        <div className="w-64 flex flex-col gap-1.5 overflow-y-auto shrink-0">
          {loading ? (
            <p className="text-center py-6 text-sm text-muted-foreground">چاوەڕوان بکە...</p>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 bg-background rounded-2xl border border-border">
              <MapPin className="size-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm text-muted-foreground mb-2">هیچ نوێنەرێک شوێنی نەنێردووە</p>
              <Link href="/dashboard/telegram" className="text-xs text-primary font-semibold hover:underline">
                بڕۆ بۆ ڕێکخستنی تێلێگرام
              </Link>
            </div>
          ) : (
            <>
              {online.length > 0 && (
                <>
                  <p className="text-[10px] font-black text-emerald-600 px-2 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-500 inline-block" /> ئۆنلاین ({online.length})
                  </p>
                  {online.map(l => (
                    <div key={l.chat_id} onClick={() => setSelectedId(l.chat_id === selectedId ? null : l.chat_id)}
                      className={cn("bg-background rounded-xl border px-3 py-2.5 cursor-pointer transition-all hover:shadow-sm",
                        selectedId === l.chat_id ? "border-primary border-2" : "border-border")}>
                      <div className="flex items-center gap-2">
                        <RepAvatar loc={l} isOnline selected={selectedId === l.chat_id} />
                        <div>
                          <p className="text-xs font-bold">{l.rep_name}</p>
                          <p className="text-[10px] text-emerald-600 font-semibold">● {timeAgo(l.updated_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {offline.length > 0 && (
                <>
                  {online.length > 0 && <div className="h-px bg-border my-1" />}
                  <p className="text-[10px] font-black text-muted-foreground px-2 flex items-center gap-1.5">
                    <WifiOff className="size-2.5" /> ئۆفلاین ({offline.length})
                  </p>
                  {offline.map(l => (
                    <div key={l.chat_id} className="bg-muted/40 rounded-xl border border-border px-3 py-2.5 opacity-65">
                      <div className="flex items-center gap-2">
                        <RepAvatar loc={l} isOnline={false} selected={false} />
                        <div>
                          <p className="text-xs font-bold text-muted-foreground">{l.rep_name}</p>
                          <p className="text-[10px] text-muted-foreground/70">{timeAgo(l.updated_at)}</p>
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
        <RepMap locations={locations} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {/* Bottom hint */}
      {!loading && locations.length === 0 && (
        <div className="shrink-0 px-4 py-2.5 bg-primary/10 rounded-xl text-xs text-primary flex items-center gap-2">
          <Users className="size-3.5 shrink-0" />
          <span>بۆ بینینی شوێن، پێویستە نوێنەران ڕۆڵیان دیاری بکەن لە{" "}
            <Link href="/dashboard/telegram" className="font-bold underline">ڕێکخستنی تێلێگرام</Link>
            {" "}و شوێنی زیندووی هاوبەش بکەن.
          </span>
        </div>
      )}
    </div>
  );
}
