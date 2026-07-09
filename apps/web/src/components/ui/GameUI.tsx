"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { Check, ChevronRight, Clock3, Users } from "lucide-react";
import { Avatar } from "@/components/ui/AvatarPicker";

export function AppScreen({
  children,
  tone = "light",
  className = ""
}: {
  children: ReactNode;
  tone?: "dark" | "light" | "blue";
  className?: string;
}) {
  const tones = {
    dark: "bg-[var(--surface-primary)] text-[var(--text-primary)]",
    light: "bg-[var(--surface-inverted)] text-[var(--text-inverted)]",
    blue: "bg-[var(--surface-secondary)] text-[var(--text-inverted-plus)]"
  };

  return <main className={`min-screen-safe animate-page-in px-4 pb-safe pt-safe ${tones[tone]} ${className}`}>{children}</main>;
}

export function LoadingState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <AppScreen tone="blue" className="grid place-items-center">
      <div className="text-center">
        <div className="mx-auto size-12 animate-spin rounded-full border-4 border-black/15 border-t-[var(--surface-primary)]" />
        <h1 className="mt-7 text-title-md-extrabold">{title}</h1>
        {subtitle && <p className="mt-2 text-body-medium opacity-60">{subtitle}</p>}
      </div>
    </AppScreen>
  );
}

export function ErrorState({
  title,
  message,
  action
}: {
  title: string;
  message: string;
  action: ReactNode;
}) {
  return (
    <AppScreen tone="blue" className="grid place-items-center">
      <section className="w-full max-w-[25rem] text-center">
        <p className="text-display-lg-bold">!</p>
        <h1 className="mt-3 text-title-lg-bold">{title}</h1>
        <p className="mt-3 text-body-medium opacity-70">{message}</p>
        <div className="mt-8">{action}</div>
      </section>
    </AppScreen>
  );
}

export function ModeSelector({
  title,
  description,
  icon,
  selected,
  disabled,
  onClick
}: {
  title: string;
  description: string;
  icon: "single" | "multi";
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className="group flex min-h-36 w-full items-center gap-5 rounded-[28px] border-3 border-transparent bg-[var(--surface-inverted-light)] p-5 text-left transition hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-[var(--surface-secondary)] disabled:opacity-40 aria-pressed:border-[var(--surface-primary)]"
    >
      <Image src={icon === "single" ? "/single-phone.svg" : "/multi-phone.svg"} alt="" width={64} height={64} className="brightness-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-title-sm-bold">{title}</span>
        <span className="mt-1 block text-footnote-regular opacity-65">{description}</span>
      </span>
      <ChevronRight aria-hidden className="shrink-0" />
    </button>
  );
}

export function NumberSlider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
  disabled
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block rounded-[24px] bg-[var(--surface-inverted-light)] p-5">
      <span className="flex items-center justify-between gap-4">
        <span className="text-body-semibold">{label}</span>
        <output className="text-title-sm-bold">{value}{suffix}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-5 h-2 w-full cursor-pointer accent-[var(--surface-secondary)] disabled:opacity-40"
      />
    </label>
  );
}

export function VoteCard({
  player,
  selected,
  votes,
  onClick,
  disabled
}: {
  player: { id: string; name: string; avatarId?: number; isHost?: boolean };
  selected?: boolean;
  votes?: number;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className="relative flex aspect-square min-h-36 flex-col items-center justify-center rounded-[28px] border-3 border-transparent bg-[var(--surface-inverted-light)] p-4 transition focus-visible:outline-3 focus-visible:outline-[var(--surface-secondary)] disabled:cursor-default aria-pressed:border-[var(--surface-secondary)] aria-pressed:bg-[var(--surface-secondary)]"
    >
      {selected && <Check className="absolute right-4 top-4" size={20} aria-hidden />}
      <Avatar avatarId={player.avatarId ?? 1} name={player.name} size="lg" />
      <span className="mt-3 max-w-full truncate text-headline-md-semibold">{player.name}</span>
      {player.isHost && <span className="text-caption-semibold text-[var(--text-highlight)]">Room Owner</span>}
      {votes !== undefined && <span className="mt-1 text-footnote-semibold">{votes} Vote{votes === 1 ? "" : "s"}</span>}
    </button>
  );
}

export function GameStatus({
  time,
  players,
  label
}: {
  time?: string;
  players?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-footnote-semibold">
      {time && <span className="inline-flex items-center gap-1.5 rounded-full bg-black/8 px-4 py-2"><Clock3 size={16} />{time}</span>}
      {players && <span className="inline-flex items-center gap-1.5 rounded-full bg-black/8 px-4 py-2"><Users size={16} />{players}</span>}
      {label && <span className="rounded-full bg-black/8 px-4 py-2">{label}</span>}
    </div>
  );
}

export function PlayerStatusPill({
  players,
  completedIds,
  label
}: {
  players: Array<{ id: string; name: string; avatarId?: number }>;
  completedIds: string[];
  label: string;
}) {
  return (
    <div className="fixed bottom-[calc(var(--sticky-bottom)+6.5rem)] left-1/2 z-30 flex -translate-x-1/2 items-center rounded-full bg-[var(--surface-primary-light)] px-3 py-2 text-[var(--text-primary)] shadow-lg">
      <div className="flex -space-x-2">
        {players.slice(0, 7).map((player) => (
          <span key={player.id} className={`grid size-7 place-items-center rounded-full border border-[var(--surface-primary-light)] bg-[var(--surface-primary)] transition-opacity ${completedIds.includes(player.id) ? "opacity-100" : "opacity-20"}`}>
            <Avatar avatarId={player.avatarId ?? 1} name={player.name} size="sm" tone="white" />
          </span>
        ))}
      </div>
      <span className="ml-2 whitespace-nowrap text-caption-semibold">{label}</span>
    </div>
  );
}

export function WaitingOrbit({
  players,
  completedIds,
  title,
  subtitle
}: {
  players: Array<{ id: string; name: string; avatarId?: number }>;
  completedIds: string[];
  title: string;
  subtitle: string;
}) {
  const positions = [
    "left-[8%] top-[12%]",
    "right-[8%] top-[8%]",
    "left-[2%] top-[48%]",
    "right-[2%] top-[52%]",
    "left-[18%] bottom-[7%]",
    "right-[18%] bottom-[5%]"
  ];

  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[25rem]">
      {players.slice(0, 6).map((player, index) => (
        <div key={player.id} className={`absolute ${positions[index]} animate-float ${completedIds.includes(player.id) ? "opacity-100" : "opacity-20"}`} style={{ animationDelay: `${index * 180}ms` }}>
          <Avatar avatarId={player.avatarId ?? 1} name={player.name} size="lg" tone="blue" />
        </div>
      ))}
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><h2 className="text-title-md-extrabold">{title}</h2><p className="mt-2 text-body-medium opacity-60">{subtitle}</p></div>
      </div>
    </div>
  );
}
