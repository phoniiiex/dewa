"use client";

/**
 * LiveActivityChart
 * -----------------
 * Real-time chaos chart using `liveline`.
 * 80 ms ticks · huge spikes · exaggerate + degen particles.
 *
 * ⚠️ TIMESTAMPS: Liveline expects SECONDS (Date.now() / 1000).
 * Passing milliseconds causes all data to be silently filtered out.
 *
 * Theme: auto-detects dark/light via MutationObserver on <html class>.
 * The chart card background adapts accordingly in dashboard/page.tsx.
 */
import { useEffect, useRef, useState } from "react";
import { Liveline, type LivelinePoint } from "liveline";

const WINDOW_SECS = 30;
const INTERVAL_MS = 80;
const MAX_PTS = Math.ceil((WINDOW_SECS * 1000) / INTERVAL_MS) + 60;

function isDark() {
  return document.documentElement.classList.contains("dark");
}

/** Seed with 30 s of chaotic history — timestamps in SECONDS */
function makeHistory(base = 55): LivelinePoint[] {
  const nowSec = Date.now() / 1000;
  const pts: LivelinePoint[] = [];
  let v = base + (Math.random() - 0.5) * 15;
  for (let age = WINDOW_SECS; age >= 0; age -= INTERVAL_MS / 1000) {
    const spike = Math.random() < 0.18;
    const delta = spike
      ? (Math.random() - 0.46) * 65
      : (Math.random() - 0.5)  * 7;
    v = Math.max(5, Math.min(95, v + delta));
    pts.push({ time: nowSec - age, value: v });
  }
  return pts;
}

export function LiveActivityChart() {
  const [data,  setData]  = useState<LivelinePoint[]>(makeHistory);
  const [value, setValue] = useState(55);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const vRef = useRef(55);

  /* Sync theme from <html class="dark"> */
  useEffect(() => {
    setTheme(isDark() ? "dark" : "light");
    const obs = new MutationObserver(() =>
      setTheme(isDark() ? "dark" : "light")
    );
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  /* 80 ms chaotic data generator */
  useEffect(() => {
    const id = setInterval(() => {
      const spike = Math.random() < 0.18;
      const delta = spike
        ? (Math.random() - 0.46) * 65
        : (Math.random() - 0.5)  * 7;
      const next = Math.max(5, Math.min(95, vRef.current + delta));
      vRef.current = next;
      setValue(next);
      setData(prev => {
        const trimmed = prev.length >= MAX_PTS ? prev.slice(1) : prev;
        return [...trimmed, { time: Date.now() / 1000, value: next }];
      });
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <Liveline
      data={data}
      value={value}
      theme={theme}
      color="#a78bfa"          /* violet-400 */
      window={WINDOW_SECS}
      exaggerate
      momentum
      fill
      badge
      grid
      pulse
      scrub
      degen={{ scale: 1.5, downMomentum: true }}
      formatValue={(v) => v.toFixed(0)}
      lineWidth={2}
      windows={[
        { label: "10s", secs: 10  },
        { label: "30s", secs: 30  },
        { label: "2m",  secs: 120 },
        { label: "5m",  secs: 300 },
      ]}
      className="w-full h-full"
    />
  );
}
