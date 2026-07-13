"use client";

/**
 * LiveActivityChart
 * -----------------
 * Real-time "chaos" line chart using `liveline`.
 * Configured for: chaotic, huge spikes, 80 ms tick rate.
 * Drops into the dashboard below the 4 KPI stat cards.
 */
import { useEffect, useRef, useState } from "react";
import { Liveline, type LivelinePoint } from "liveline";

const WINDOW_SECS  = 30;   // visible time window
const INTERVAL_MS  = 80;   // tick speed — 80 ms
const MAX_POINTS   = Math.ceil((WINDOW_SECS * 1000) / INTERVAL_MS) + 50;

/** Seed the chart with plausible history so it isn't empty on mount */
function makeHistory(): LivelinePoint[] {
  const now = Date.now();
  const pts: LivelinePoint[] = [];
  let v = 50 + Math.random() * 20;
  for (let age = WINDOW_SECS * 1000; age >= 0; age -= INTERVAL_MS) {
    const isSpike = Math.random() < 0.18;
    const delta = isSpike
      ? (Math.random() - 0.48) * 75   // huge spike
      : (Math.random() - 0.5)  * 9;   // small noise
    v = Math.max(4, Math.min(98, v + delta));
    pts.push({ time: now - age, value: v });
  }
  return pts;
}

interface LiveActivityChartProps {
  /** Optional. If true uses the dark Liveline theme palette */
  dark?: boolean;
}

export function LiveActivityChart({ dark = false }: LiveActivityChartProps) {
  const [data,  setData]  = useState<LivelinePoint[]>(makeHistory);
  const [value, setValue] = useState(50);
  const vRef = useRef(50);

  useEffect(() => {
    const id = setInterval(() => {
      const isSpike = Math.random() < 0.18;
      const delta = isSpike
        ? (Math.random() - 0.48) * 75
        : (Math.random() - 0.5)  * 9;
      const next = Math.max(4, Math.min(98, vRef.current + delta));
      vRef.current = next;
      setValue(next);
      setData(prev => {
        const trimmed = prev.length >= MAX_POINTS ? prev.slice(1) : prev;
        return [...trimmed, { time: Date.now(), value: next }];
      });
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <Liveline
      data={data}
      value={value}
      color="hsl(263 70% 62%)"   /* matches --primary purple */
      window={WINDOW_SECS}
      theme={dark ? "dark" : "light"}
      exaggerate
      momentum
      fill
      badge
      grid
      pulse
      degen={{ scale: 1.8, downMomentum: false }}
      formatValue={(v) => v.toFixed(0)}
      lineWidth={2.2}
      className="w-full h-full"
    />
  );
}
