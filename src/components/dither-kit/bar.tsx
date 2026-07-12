"use client"

import { useEffect } from "react"
import { useChartPart } from "./chart-context"

export type BarSeriesProps = {
  dataKey: string
  variant?: "gradient" | "dotted" | "hatched" | "solid"
}

/**
 * One bar series for use inside `<BarChart>`.
 * Registers itself with kind="bar" so the canvas paints vertical rectangles
 * instead of a continuous area fill.
 */
export function Bar({ dataKey, variant = "solid" }: BarSeriesProps) {
  const ctx = useChartPart("Bar", "bar")
  const { registerSeries, unregisterSeries } = ctx

  if (process.env.NODE_ENV !== "production" && !ctx.config[dataKey]) {
    console.warn(
      `<Bar dataKey="${dataKey}" />: "${dataKey}" is not in the chart \`config\`. Add it so the series has a colour and label.`
    )
  }

  useEffect(() => {
    registerSeries({ dataKey, kind: "bar", variant, strokeVariant: "solid" })
    return () => unregisterSeries(dataKey)
  }, [dataKey, variant, registerSeries, unregisterSeries])

  return null
}
