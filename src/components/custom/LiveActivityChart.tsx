"use client";

/**
 * LiveActivityChart
 * -----------------
 * Real-time chaos chart using `liveline`.
 * 80 ms ticks · huge spikes · exaggerate + degen particles.
 * Always rendered on a dark card — no theme detection needed.
 */
import { useEffect, useRef, useState } from "react";
import { Liveline, type LivelinePoint } from "liveline";

const WINDOW_SECS = 30;
const INTERVAL_MS = 80;
const MAX_PTS = Math.ceil((WINDOW_SECS * 1000) / INTERVAL_MS) + 60;

/** Seed with 30 s of realistic-looking chaotic history */
function makeHistory(base = 55): LivelinePoint[] {
  const now = Date.now();
  const pts: LivelinePoint[] = [];
  let v = base + (Math.random() - 0.5) * 15;
  for (let age = WINDOW_SECS * 1000; age >= 0; age -= INTERVAL_MS) {
    const spike = Math.random() < 0.18;
    const delta = spike
      ? (Math.random() - 0.46) * 65   // huge spike (positive-biased)
      : (Math.random() - 0.5)  * 7;   // small noise
    v = Math.max(5, Math.min(95, v + delta));
    pts.push({ time: now - age, value: v });
  }
  return pts;
}

export function LiveActivityChart() {
  const [data,  setData]  = useState<LivelinePoint[]>(makeHistory);
  const [value, setValue] = useState(55);
  const vRef = useRef(55);

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
        return [...trimmed, { time: Date.now(), value: next }];
      });
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <Liveline
      data={data}
      value={value}
      theme="dark"
      color="#a78bfa"
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
