"use client";

import { type ReactNode, useEffect, useMemo, useRef } from "react";

export type PhysicsToken = {
  id: string;
  radius?: number;
  render: ReactNode;
};

type Body = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

function seedFrom(value: string) {
  let seed = 2166136261;
  for (const character of value) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }
  return Math.abs(seed);
}

export function PhysicsStage({
  tokens,
  className = "",
  centerPull = 0.000018,
  speed = 0.16,
  ariaLabel = "Players"
}: {
  tokens: PhysicsToken[];
  className?: string;
  centerPull?: number;
  speed?: number;
  ariaLabel?: string;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const tokenRefs = useRef(new Map<string, HTMLDivElement>());
  const bodiesRef = useRef(new Map<string, Body>());
  const tokensRef = useRef(tokens);
  const tokenKey = useMemo(() => tokens.map((token) => token.id).join("|"), [tokens]);

  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = performance.now();
    let width = stage.clientWidth;
    let height = stage.clientHeight;

    const syncBodies = () => {
      const activeTokens = tokensRef.current;
      width = stage.clientWidth;
      height = stage.clientHeight;
      const active = new Set(activeTokens.map((token) => token.id));
      for (const id of bodiesRef.current.keys()) {
        if (!active.has(id)) bodiesRef.current.delete(id);
      }
      activeTokens.forEach((token, index) => {
        if (bodiesRef.current.has(token.id)) return;
        const seed = seedFrom(token.id);
        const angle = ((seed % 360) * Math.PI) / 180;
        const spread = 0.2 + ((seed >> 4) % 55) / 100;
        const radius = token.radius ?? 48;
        bodiesRef.current.set(token.id, {
          x: width / 2 + Math.cos(angle) * width * spread,
          y: height / 2 + Math.sin(angle) * height * spread,
          vx: Math.cos(angle + Math.PI / 2) * speed * (index % 2 ? 1 : -1),
          vy: Math.sin(angle + Math.PI / 2) * speed,
          radius
        });
      });
    };

    const placeReduced = () => {
      const activeTokens = tokensRef.current;
      activeTokens.forEach((token, index) => {
        const element = tokenRefs.current.get(token.id);
        if (!element) return;
        const columns = Math.min(3, Math.max(1, activeTokens.length));
        const row = Math.floor(index / columns);
        const column = index % columns;
        const x = ((column + 1) * width) / (columns + 1);
        const rows = Math.ceil(activeTokens.length / columns);
        const y = ((row + 1) * height) / (rows + 1);
        element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      });
    };

    const tick = (now: number) => {
      const dt = Math.min(32, now - previous);
      previous = now;
      if (document.visibilityState === "hidden") {
        frame = requestAnimationFrame(tick);
        return;
      }
      if (reducedMotion.matches) {
        placeReduced();
        frame = requestAnimationFrame(tick);
        return;
      }

      const bodies = [...bodiesRef.current.entries()];
      for (const [, body] of bodies) {
        body.vx += (width / 2 - body.x) * centerPull * dt;
        body.vy += (height / 2 - body.y) * centerPull * dt;
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        body.vx *= 0.998;
        body.vy *= 0.998;

        if (body.x < body.radius) { body.x = body.radius; body.vx = Math.abs(body.vx) * 0.82; }
        if (body.x > width - body.radius) { body.x = width - body.radius; body.vx = -Math.abs(body.vx) * 0.82; }
        if (body.y < body.radius) { body.y = body.radius; body.vy = Math.abs(body.vy) * 0.82; }
        if (body.y > height - body.radius) { body.y = height - body.radius; body.vy = -Math.abs(body.vy) * 0.82; }
      }

      for (let i = 0; i < bodies.length; i += 1) {
        for (let j = i + 1; j < bodies.length; j += 1) {
          const first = bodies[i][1];
          const second = bodies[j][1];
          const dx = second.x - first.x;
          const dy = second.y - first.y;
          const distance = Math.max(0.01, Math.hypot(dx, dy));
          const minimum = first.radius + second.radius + 5;
          if (distance >= minimum) continue;
          const nx = dx / distance;
          const ny = dy / distance;
          const correction = (minimum - distance) / 2;
          first.x -= nx * correction;
          first.y -= ny * correction;
          second.x += nx * correction;
          second.y += ny * correction;
          const relativeVelocity = (second.vx - first.vx) * nx + (second.vy - first.vy) * ny;
          if (relativeVelocity < 0) {
            const impulse = -relativeVelocity * 0.72;
            first.vx -= impulse * nx;
            first.vy -= impulse * ny;
            second.vx += impulse * nx;
            second.vy += impulse * ny;
          }
        }
      }

      for (const [id, body] of bodies) {
        const element = tokenRefs.current.get(id);
        if (element) element.style.transform = `translate3d(${body.x}px, ${body.y}px, 0) translate(-50%, -50%)`;
      }
      frame = requestAnimationFrame(tick);
    };

    syncBodies();
    const resizeObserver = new ResizeObserver(() => {
      syncBodies();
      if (reducedMotion.matches) placeReduced();
    });
    resizeObserver.observe(stage);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [centerPull, speed, tokenKey]);

  return (
    <div ref={stageRef} className={`physics-stage relative overflow-hidden ${className}`} aria-label={ariaLabel}>
      {tokens.map((token) => (
        <div
          key={token.id}
          ref={(element) => {
            if (element) tokenRefs.current.set(token.id, element);
            else tokenRefs.current.delete(token.id);
          }}
          className="physics-token absolute left-0 top-0 will-change-transform"
        >
          {token.render}
        </div>
      ))}
    </div>
  );
}
