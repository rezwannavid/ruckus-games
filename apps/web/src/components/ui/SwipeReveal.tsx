"use client";

import { type ReactNode, useRef, useState } from "react";

export function SwipeReveal({
  children,
  cover,
  revealed,
  disabled = false,
  onReveal,
  className = "",
  label = "Swipe up or press Enter to reveal"
}: {
  children: ReactNode;
  cover: ReactNode;
  revealed: boolean;
  disabled?: boolean;
  onReveal: () => void;
  className?: string;
  label?: string;
}) {
  const startY = useRef<number | null>(null);
  const dragRef = useRef(0);
  const [drag, setDrag] = useState(0);

  const finish = () => {
    if (Math.abs(dragRef.current) >= 120) onReveal();
    dragRef.current = 0;
    setDrag(0);
    startY.current = null;
  };

  return (
    <div className={`swipe-reveal relative overflow-hidden ${className}`}>
      <div className="absolute inset-0">{children}</div>
      <div
        role="button"
        tabIndex={disabled || revealed ? -1 : 0}
        aria-label={label}
        aria-expanded={revealed}
        className="swipe-reveal-cover absolute inset-0 z-10 touch-none"
        style={{ transform: revealed ? "translate3d(0, -84%, 0)" : `translate3d(0, ${Math.min(0, drag)}px, 0)` }}
        onPointerDown={(event) => {
          if (disabled || revealed) return;
          startY.current = event.clientY;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (startY.current === null) return;
          const delta = event.clientY - startY.current;
          dragRef.current = Math.max(-260, Math.min(0, delta));
          setDrag(dragRef.current);
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowUp") {
            event.preventDefault();
            onReveal();
          }
        }}
      >
        {cover}
      </div>
    </div>
  );
}
