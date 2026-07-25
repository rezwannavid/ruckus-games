"use client";

import { useId, useMemo, useRef } from "react";
import { Avatar } from "@/components/ui/AvatarPicker";

export type WavelengthMarker = {
  id: string;
  name: string;
  avatarId?: number;
  value: number;
  points?: number;
  delta?: number;
  highlighted?: boolean;
};

function pointOnArc(value: number, radius = 168, centerX = 196.5, baseY = 246) {
  const angle = Math.PI - (Math.max(0, Math.min(100, value)) / 100) * Math.PI;
  return {
    x: centerX + Math.cos(angle) * radius,
    y: baseY - Math.sin(angle) * radius
  };
}

const flowerPoints = Array.from({ length: 16 }, (_, index) => {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / 16;
  const radius = index % 2 === 0 ? 38 : 30;
  return { x: 40 + Math.cos(angle) * radius, y: 40 + Math.sin(angle) * radius };
});
const firstFlowerMidpoint = {
  x: (flowerPoints.at(-1)!.x + flowerPoints[0].x) / 2,
  y: (flowerPoints.at(-1)!.y + flowerPoints[0].y) / 2
};
const flowerPath = `M ${firstFlowerMidpoint.x} ${firstFlowerMidpoint.y} ${flowerPoints.map((point, index) => {
  const next = flowerPoints[(index + 1) % flowerPoints.length];
  return `Q ${point.x} ${point.y} ${(point.x + next.x) / 2} ${(point.y + next.y) / 2}`;
}).join(" ")} Z`;

function FlowerShape({ inset = false }: { inset?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 80 80" className="wavelength-flower-shape">
      <path d={flowerPath} className="wavelength-flower-outer" />
      {inset && <path d={flowerPath} className="wavelength-flower-inner" transform="translate(8 8) scale(.8)" />}
    </svg>
  );
}

export function WavelengthBoard({
  left = "Unlikable",
  right = "Likable",
  value,
  target,
  markers = [],
  onChange,
  disabled = false,
  hideValue = false,
  compact = false,
  label = "Wavelength guess"
}: {
  left?: string;
  right?: string;
  value: number;
  target?: number | null;
  markers?: WavelengthMarker[];
  onChange?: (value: number) => void;
  disabled?: boolean;
  hideValue?: boolean;
  compact?: boolean;
  label?: string;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const valuePoint = pointOnArc(hideValue ? 50 : value);
  const targetPoint = target === null || target === undefined ? null : pointOnArc(target);
  const sortedMarkers = useMemo(() => [...markers].sort((a, b) => a.value - b.value), [markers]);
  const lanes = new Map<string, number>();
  sortedMarkers.forEach((marker, index) => {
    const previous = sortedMarkers[index - 1];
    const close = previous && marker.value - previous.value < 8;
    lanes.set(marker.id, close ? (index % 2 ? -1 : 1) : 0);
  });

  const setFromPointer = (clientX: number) => {
    if (!onChange || disabled || !boardRef.current) return;
    const bounds = boardRef.current.getBoundingClientRect();
    onChange(Math.round(Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width)) * 100));
  };

  return (
    <div
      ref={boardRef}
      className={`wavelength-board relative mx-auto w-full touch-none select-none ${compact ? "h-[260px]" : "h-[360px]"} ${onChange ? "cursor-ew-resize" : ""}`}
      role={onChange ? "slider" : "img"}
      tabIndex={onChange && !disabled ? 0 : undefined}
      aria-labelledby={titleId}
      aria-valuemin={onChange ? 0 : undefined}
      aria-valuemax={onChange ? 100 : undefined}
      aria-valuenow={onChange ? value : undefined}
      aria-valuetext={onChange ? `${value}, from ${left} to ${right}` : undefined}
      aria-disabled={disabled || undefined}
      onPointerDown={(event) => {
        if (!onChange || disabled) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setFromPointer(event.clientX);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) setFromPointer(event.clientX);
      }}
      onKeyDown={(event) => {
        if (!onChange || disabled) return;
        const step = event.shiftKey ? 10 : 1;
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          onChange(Math.max(0, value - step));
        } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          onChange(Math.min(100, value + step));
        } else if (event.key === "Home") {
          event.preventDefault();
          onChange(0);
        } else if (event.key === "End") {
          event.preventDefault();
          onChange(100);
        }
      }}
    >
      <span id={titleId} className="sr-only">{label}</span>
      <svg aria-hidden viewBox="0 0 393 300" className="absolute inset-x-0 top-0 h-auto w-full overflow-visible">
        <path d="M 18 246 A 178 178 0 0 1 375 246" fill="none" stroke="var(--wave-arc-base)" strokeWidth="42" strokeLinecap="round" />
        <path d="M 28 246 A 168 168 0 0 1 365 246" fill="none" stroke="var(--wave-arc-highlight)" strokeWidth="25" strokeLinecap="round" />
        {targetPoint && value !== target && (
          <path
            d={`M ${pointOnArc(Math.min(value, target ?? value)).x} ${pointOnArc(Math.min(value, target ?? value)).y} A 168 168 0 0 1 ${pointOnArc(Math.max(value, target ?? value)).x} ${pointOnArc(Math.max(value, target ?? value)).y}`}
            fill="none"
            stroke="var(--surface-secondary)"
            strokeOpacity=".34"
            strokeWidth="12"
            strokeLinecap="round"
            className="wavelength-distance"
          />
        )}
      </svg>

      <span className="wavelength-endpoint wavelength-endpoint-left">{left}</span>
      <span className="wavelength-endpoint wavelength-endpoint-right">{right}</span>

      {targetPoint && (
        <span
          className="wavelength-flower wavelength-flower-target animate-pop"
          style={{ left: `${(targetPoint.x / 393) * 100}%`, top: `${targetPoint.y}px` }}
          aria-label={`Answer ${target}`}
        >
          <FlowerShape />
          <span>{target}</span>
        </span>
      )}

      {(onChange || markers.length === 0) && (
        <span
          className={`wavelength-flower wavelength-flower-guess ${hideValue ? "is-hidden" : ""} ${onChange ? "wavelength-flower-interactive" : ""}`}
          style={{ left: `${(valuePoint.x / 393) * 100}%`, top: `${valuePoint.y}px` }}
          aria-hidden
        >
          <FlowerShape inset={!hideValue} />
          <span>{hideValue ? "?" : value}</span>
        </span>
      )}

      {sortedMarkers.map((marker, index) => {
        const point = pointOnArc(marker.value, 196, 196.5, 284);
        const lane = lanes.get(marker.id) ?? 0;
        return (
          <span
            key={marker.id}
            className={`wavelength-player-marker animate-pop ${marker.highlighted ? "is-highlighted" : ""}`}
            style={{
              left: `${(point.x / 393) * 100}%`,
              top: `${point.y + lane * 28}px`,
              animationDelay: `${160 + index * 70}ms`
            }}
            aria-label={`${marker.name} guessed ${marker.value}${marker.points === undefined ? "" : ` and scored ${marker.points}`}`}
          >
            <Avatar avatarId={marker.avatarId ?? 1} name="" size="sm" />
            <span>{marker.name}</span>
          </span>
        );
      })}
    </div>
  );
}
