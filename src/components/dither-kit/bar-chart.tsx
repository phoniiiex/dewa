"use client"

import { CartesianCanvas } from "./cartesian-canvas"
import { type CartesianChartProps, CartesianRoot } from "./cartesian-root"

type Row = Record<string, unknown>

/** Composable dither **bar** chart. Compose `<Area dataKey="..." />` (bar kind) inside. */
export function BarChart<TData extends Row>(props: CartesianChartProps<TData>) {
  return <CartesianRoot chartType="bar" Canvas={CartesianCanvas} {...props} />
}
