"use client";

/**
 * LiveActivityChart
 * -----------------
 * Real-time chaos chart using `liveline`.
 * Settings: 80 ms ticks, chaotic huge spikes, exaggerate + degen particles.
 * Theme-aware: detects dark / light mode automatically via DOM class.
 */
import { useEffect, useRef, useState } from "react";
import { Liveline, type LivelinePoint } from "liveline";

const WINDOW_SECS = 30;
const INTERVAL_MS = 80;
const MAX_PTS = Math.ceil((WINDOW_SECS * 1000) / INTERVAL_MS) + 60;

/** Seed the chart with history so it's never empty on mount */
function makeHistory(base = 60): LivelinePoint[] {
  const now = Date.now();
  const pts: LivelinePoint[] = [];
  let v = base + (Math.random() - 0.5) * 20;
  for (let age = WINDOW_SECS * 1000; age >= 0; age -= INTERVAL_MS) {
    const spike = Math.random() < 0.18;
    const delta = spike
      ? (Math.random() - 0.46) * 72   // huge spike
      : (Math.random() - 0.5)  * 8;   // noise
    v = Math.max(3, Math.min(97, v + delta));
    pts.push({ time: now - age, value: v });
  }
  return pts;
}

/** Read dark-mode state from the document root class */
function isDarkMode() {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

export function LiveActivityChart() {
  const [data,  setData]  = useState<LivelinePoint[]>(() => makeHistory());
  const [value, setValue] = useState(60);
  const [dark,  setDark]  = useState(isDarkMode);
  const vRef = useRef(60);

  /* Theme observer — re-renders when user toggles dark/light */
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(isDarkMode()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  /* Data generator — 80 ms chaotic ticks */
  useEffect(() => {
    const id = setInterval(() => {
      const spike = Math.random() < 0.18;
      const delta = spike
        ? (Math.random() - 0.46) * 72
        : (Math.random() - 0.5)  * 8;
      const next = Math.max(3, Math.min(97, vRef.current + delta));
      vRef.current = next;
      setValue(next);
      setData(prev => {
        const trimmed = prev.length >= MAX_PTS ? prev.slice(1) : prev;
        return [...trimmed, { time: Date.now(), value: next }];
      });
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <Liveline
      data={data}
      value={value}
      color="hsl(263 70% 62%)"
      theme={dark ? "dark" : "light"}
      window={WINDOW_SECS}
      /* Visual drama */
      exaggerate
      momentum
      fill
      badge
      grid
      pulse
      scrub
      showValue
      valueMomentumColor
      degen={{ scale: 2, downMomentum: true }}
      /* Formatting */
      formatValue={(v) => v.toFixed(0)}
      lineWidth={2}
      /* Time window buttons */
      windows={[
        { label: "10s", secs: 10 },
        { label: "30s", secs: 30 },
        { label: "2m",  secs: 120 },
        { label: "5m",  secs: 300 },
      ]}
      className="w-full h-full"
    />
  );
}
