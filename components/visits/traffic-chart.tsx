"use client";

import type { ChartBar } from "@/lib/visits/types";
import { useEffect, useRef, useState } from "react";

export function TrafficChart({ series }: { series: ChartBar[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const apply = () => setWidth(Math.max(280, node.clientWidth));
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const height = 220;
  const margin = { top: 16, right: 0, bottom: 26, left: 36 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const peak = Math.max(1, ...series.map((bar) => bar.value));
  const ceiling = nice(peak);
  const band = series.length ? innerWidth / series.length : innerWidth;
  const ticks = [0, ceiling / 2, ceiling];
  const step = Math.max(1, Math.ceil(series.length / 8));

  return (
    <div ref={ref}>
      <svg className="obs-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Fréquentation">
        {ticks.map((tick) => {
          const y = margin.top + innerHeight - (tick / ceiling) * innerHeight;
          return (
            <g key={tick}>
              <line x1={margin.left} x2={width} y1={y} y2={y} stroke="var(--line)" />
              <text x="0" y={y + 4} className="ax">
                {tick}
              </text>
            </g>
          );
        })}
        {series.map((bar, index) => {
          const barHeight = (bar.value / ceiling) * innerHeight;
          const x = margin.left + index * band + band * 0.14;
          const barWidth = band * 0.72;
          const y = margin.top + innerHeight - barHeight;
          const hot = bar.value === peak && bar.value > 0;
          return (
            <g key={`${bar.title}-${index}`}>
              <rect x={x} y={y} width={barWidth} height={Math.max(bar.value ? 1 : 0, barHeight)} fill={hot ? "var(--red)" : "var(--highest)"}>
                <title>{`${bar.title} — ${bar.value.toLocaleString("fr-FR")} visites`}</title>
              </rect>
              {hot ? (
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fill="var(--red-bright)" fontSize="11" fontWeight="700">
                  {bar.value}
                </text>
              ) : null}
              {index % step === 0 || index === series.length - 1 ? (
                <text x={x + barWidth / 2} y={height - 6} textAnchor="middle" className="ax">
                  {bar.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function nice(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = value / magnitude > 5 ? magnitude * 2 : magnitude;
  return Math.max(step, Math.ceil(value / step) * step);
}
