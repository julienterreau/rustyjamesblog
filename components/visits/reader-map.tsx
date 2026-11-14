"use client";

import { MAP_CENTER, MAP_CLIP, MAP_RADIUS, MAP_SIZE } from "@/lib/visits/map-metrics";
import type { MapPoint } from "@/lib/visits/types";
import { useEffect, useRef, useState, type MouseEvent } from "react";

const TICKS = ["0°", "90°E", "180°", "90°O"] as const;

export function ReaderMap({ points }: { points: MapPoint[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [wideHit, setWideHit] = useState(false);
  const open = points.find((point) => pointKey(point) === selected) ?? null;

  function selectAt(event: MouseEvent<SVGElement>) {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const nearest = closestPoint(points, local.x, local.y, wideHit ? 36 : 18);
    if (!nearest) {
      setSelected(null);
      return;
    }
    const key = pointKey(nearest);
    setSelected(key === selected ? null : key);
  }

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1000px)");
    const apply = () => setWideHit(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    const onPointer = (event: PointerEvent) => {
      const stage = stageRef.current;
      if (!stage || stage.contains(event.target as Node)) return;
      setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [selected]);

  const lands = countryPoints(points);
  const ordered = [...points].sort((a, b) => {
    const aOn = pointKey(a) === selected;
    const bOn = pointKey(b) === selected;
    if (aOn !== bOn) return aOn ? 1 : -1;
    return b.count - a.count;
  });

  return (
    <div ref={stageRef}>
    <div className="readers-stage">
      <svg ref={svgRef} className="readers-svg" viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`} onClick={selectAt}>
        <title>Terre plate, pôle Nord au centre</title>
        <defs>
          <radialGradient id="readers-ice" cx="50%" cy="50%" r="50%">
            <stop offset="86%" stopColor="var(--ice-edge)" />
            <stop offset="93%" stopColor="var(--ice)" />
            <stop offset="100%" stopColor="var(--paper)" />
          </radialGradient>
          <radialGradient id="readers-ocean" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--ocean-mid)" />
            <stop offset="100%" stopColor="var(--ocean-deep)" />
          </radialGradient>
          <clipPath id="readers-disc">
            <circle cx={MAP_CENTER} cy={MAP_CENTER} r={MAP_CLIP} />
          </clipPath>
        </defs>
        <circle cx={MAP_CENTER} cy={MAP_CENTER} r={MAP_RADIUS + 44} fill="none" stroke="var(--line)" vectorEffect="non-scaling-stroke" />
        <circle cx={MAP_CENTER} cy={MAP_CENTER} r={MAP_RADIUS + 30} fill="none" stroke="var(--high)" vectorEffect="non-scaling-stroke" />
        {Array.from({ length: 72 }, (_, index) => {
          const angle = index * 5 * (Math.PI / 180);
          const major = index % 6 === 0;
          const inner = MAP_RADIUS + 30;
          const outer = MAP_RADIUS + (major ? 40 : 35);
          return (
            <line
              key={index}
              x1={round(MAP_CENTER + inner * Math.sin(angle))}
              y1={round(MAP_CENTER + inner * Math.cos(angle))}
              x2={round(MAP_CENTER + outer * Math.sin(angle))}
              y2={round(MAP_CENTER + outer * Math.cos(angle))}
              stroke={major ? "var(--muted)" : "var(--high)"}
              strokeWidth={major ? 1.2 : 1}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {TICKS.map((label, index) => {
          const angle = index * (Math.PI / 2);
          const radius = MAP_RADIUS + 56;
          return (
            <text
              key={label}
              x={round(MAP_CENTER + radius * Math.sin(angle))}
              y={round(MAP_CENTER + radius * Math.cos(angle) + 4)}
              textAnchor="middle"
              fill="var(--muted)"
              fontSize="10"
              fontWeight="700"
              letterSpacing="1.2"
            >
              {label}
            </text>
          );
        })}
        <circle cx={MAP_CENTER} cy={MAP_CENTER} r={MAP_RADIUS + 22} fill="url(#readers-ice)" />
        <circle cx={MAP_CENTER} cy={MAP_CENTER} r={MAP_RADIUS + 22} fill="none" stroke="var(--red)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        <circle cx={MAP_CENTER} cy={MAP_CENTER} r={MAP_CLIP} fill="url(#readers-ocean)" />
        <image
          href="/earth-disk.webp"
          x="0"
          y="0"
          width={MAP_SIZE}
          height={MAP_SIZE}
          clipPath="url(#readers-disc)"
          preserveAspectRatio="xMidYMid meet"
        />
        <g fill="none" stroke="rgba(255,255,255,.28)" clipPath="url(#readers-disc)" strokeWidth="1" vectorEffect="non-scaling-stroke">
          {[60, 30, 0, -30, -60].map((latitude) => (
            <circle key={latitude} cx={MAP_CENTER} cy={MAP_CENTER} r={round((MAP_RADIUS * (90 - latitude)) / 180)} vectorEffect="non-scaling-stroke" />
          ))}
          <circle
            cx={MAP_CENTER}
            cy={MAP_CENTER}
            r={MAP_RADIUS / 2}
            stroke="var(--red)"
            strokeDasharray="3 4"
            strokeOpacity="0.85"
            vectorEffect="non-scaling-stroke"
          />
          {Array.from({ length: 12 }, (_, index) => {
            const angle = index * 30 * (Math.PI / 180);
            return (
              <line
                key={index}
                x1={MAP_CENTER}
                y1={MAP_CENTER}
                x2={round(MAP_CENTER + MAP_CLIP * Math.sin(angle))}
                y2={round(MAP_CENTER + MAP_CLIP * Math.cos(angle))}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </g>
        <text
          x={MAP_CENTER + MAP_RADIUS / 2 + 6}
          y={MAP_CENTER - 6}
          fill="var(--red-bright)"
          fontSize="9"
          fontWeight="700"
          letterSpacing="1.5"
        >
          ÉQUATEUR
        </text>
        {ordered.map((point) => {
          const key = pointKey(point);
          const radius = pinRadius(point.count);
          const active = key === selected;
          const hit = hitRadius(point.count, wideHit);
          return (
            <g
              key={key}
              className="readers-hit"
              transform={`translate(${round(point.x)} ${round(point.y)})`}
              opacity={selected && !active ? 0.38 : 1}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={pointLabel(point)}
              onClick={(event) => {
                event.stopPropagation();
                selectAt(event);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                setSelected(active ? null : key);
              }}
            >
              {radius >= 8 ? <circle className="readers-pulse" r={radius} fill="var(--red)" /> : null}
              <circle className={point.approximate ? "readers-pin is-approx" : "readers-pin"} r={active ? radius + 2 : radius} />
              <circle className={active ? "readers-focus is-on" : "readers-focus"} r={radius + 6} />
              <circle r={hit} fill="transparent" />
            </g>
          );
        })}
      </svg>
      {open ? <VisitCard point={open} onClose={() => setSelected(null)} /> : null}
    </div>
    {lands.length > 0 ? (
      <ul className="readers-lands">
        {lands.map((point) => {
          const key = pointKey(point);
          const active = key === selected;
          return (
            <li key={point.code || key}>
              <button type="button" aria-pressed={active} onClick={() => setSelected(active ? null : key)}>
                <span className="readers-lands-dot" aria-hidden="true" />
                {point.country}
              </button>
            </li>
          );
        })}
      </ul>
    ) : null}
    </div>
  );
}

function countryPoints(points: MapPoint[]) {
  const byCode = new Map<string, MapPoint>();
  for (const point of [...points].sort((a, b) => b.count - a.count)) {
    const code = point.code || point.country;
    if (!byCode.has(code)) byCode.set(code, point);
  }
  return [...byCode.values()];
}

function VisitCard({ point, onClose }: { point: MapPoint; onClose: () => void }) {
  const left = (point.x / MAP_SIZE) * 100;
  const top = (point.y / MAP_SIZE) * 100;
  const above = top > 34;
  const align = left < 24 ? "start" : left > 76 ? "end" : "center";
  const shiftX = align === "start" ? "0" : align === "end" ? "-100%" : "-50%";
  const shiftY = above ? "calc(-100% - 14px)" : "16px";
  const countryOnly = point.approximate || !point.city;
  return (
    <div
      className={`readers-tip${above ? " is-above" : " is-below"} is-${align}`}
      role="dialog"
      aria-label={pointLabel(point)}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: `translate(${shiftX}, ${shiftY})`,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" className="readers-tip-x" aria-label="Fermer" onClick={onClose}>
        ×
      </button>
      <p className="t1">
        {flagOf(point.code)} {countryOnly ? point.country : point.city}
      </p>
      {countryOnly ? null : <p className="t2">{point.country}</p>}
      <p className="t3">
        {point.count.toLocaleString("fr-FR")}
        <small>{point.count > 1 ? "visites" : "visite"}</small>
      </p>
    </div>
  );
}

function pointLabel(point: MapPoint) {
  const visits = visitLabel(point.count);
  if (point.approximate || !point.city) return `${point.country} : ${visits}`;
  return `${point.city}, ${point.country} : ${visits}`;
}

function visitLabel(count: number) {
  return `${count.toLocaleString("fr-FR")} ${count > 1 ? "visites" : "visite"}`;
}

function pinRadius(count: number) {
  return Math.min(12, 3.2 + Math.sqrt(count) * 1.55);
}

function hitRadius(count: number, wide: boolean) {
  const radius = pinRadius(count);
  return wide ? Math.max(28, radius + 14) : Math.max(16, radius + 6);
}

function closestPoint(points: MapPoint[], x: number, y: number, limit: number) {
  let best: MapPoint | null = null;
  let bestDistance = limit * limit;
  for (const point of points) {
    const dx = point.x - x;
    const dy = point.y - y;
    const distance = dx * dx + dy * dy;
    if (distance <= bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}

function pointKey(point: MapPoint) {
  return `${point.code}|${point.city}|${point.x}|${point.y}`;
}

function flagOf(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return [...code].map((char) => String.fromCodePoint(127397 + char.charCodeAt(0))).join("");
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
