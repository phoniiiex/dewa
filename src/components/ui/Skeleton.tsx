import React from "react";

/* ─── Base shimmer box ─── */
export function SkeletonBox({
  width = "100%",
  height = 16,
  borderRadius = 6,
  style,
}: {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: "linear-gradient(90deg, #F1F3F5 25%, #E9ECEF 50%, #F1F3F5 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/* ─── Circle (avatar placeholder) ─── */
export function SkeletonCircle({ size = 38 }: { size?: number }) {
  return <SkeletonBox width={size} height={size} borderRadius="50%" />;
}

/* ─── A single table row with N columns ─── */
export function SkeletonRow({
  cols = 5,
  heights,
}: {
  cols?: number;
  heights?: (number | string)[];
}) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "14px 16px" }}>
          {i === 0 ? (
            /* First col: avatar + two lines */
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SkeletonCircle size={36} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <SkeletonBox width="70%" height={13} />
                <SkeletonBox width="45%" height={10} />
              </div>
            </div>
          ) : (
            <SkeletonBox width={heights?.[i] ?? `${60 + Math.sin(i * 7) * 25}%`} height={13} />
          )}
        </td>
      ))}
    </tr>
  );
}

/* ─── A KPI card skeleton ─── */
export function SkeletonKPI() {
  return (
    <div className="kpi-card">
      <SkeletonBox width="55%" height={11} borderRadius={4} style={{ marginBottom: 12 }} />
      <SkeletonBox width="40%" height={28} borderRadius={6} />
    </div>
  );
}

/* ─── Convenience: N table skeleton rows ─── */
export function SkeletonTableRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </>
  );
}
