"use client";

/**
 * Formats a number as Iraqi Dinar with "د.ع" symbol
 */
export function formatIQD(amount: number): string {
  return `${amount.toLocaleString("en-US")} د.ع`;
}

/**
 * Formats a compact number (e.g., 1.2K, 3.5M)
 */
export function formatCompact(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Formats a percentage change with trend arrow
 */
export function formatTrend(value: number): { text: string; isUp: boolean } {
  return {
    text: `${value > 0 ? "+" : ""}${value}%`,
    isUp: value >= 0,
  };
}
