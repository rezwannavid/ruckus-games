"use client";

import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";
import { Copy, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { ModeSelector, NumberSlider, VoteCard } from "@/components/ui/GameUI";
import { NumberInput } from "@/components/ui/NumberInput";
import { NumberStepper, Tag } from "@/components/ui/Controls";
import { PlayerCard } from "@/components/ui/PlayerCard";
import { BrandNav } from "@/features/lobby/components/BrandNav";

export function CardSmall({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex min-h-[68px] items-center gap-3 rounded-[24px] bg-[var(--surface-inverted-light)] px-5 py-3 ${className}`}>{children}</div>;
}

export function CardXSM({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return <div className="flex min-h-14 items-center gap-3 rounded-[20px] bg-[var(--surface-inverted-light)] px-4">{icon}<span className="min-w-0 flex-1 text-footnote-semibold opacity-65">{label}</span><strong className="text-body-bold">{value}</strong></div>;
}

export const CardSquare = VoteCard;
export const XLSelector = ModeSelector;
export const NumberInputSlider = NumberSlider;
export const NumberInputSingle = NumberStepper;
export const RoomCodeInput = NumberInput;
export const RoomInput = FormField;
export const TopNav = BrandNav;
export const Tags = Tag;
export const PlayerCards = PlayerCard;

export function SmallButton(props: ComponentProps<typeof Button>) {
  return <Button size="md" {...props} />;
}

export function LogoFull({ tone = "light" }: { tone?: "light" | "dark" }) {
  return <Image src="/logo-full.svg" alt="Ruckus Games" width={129} height={22} className={tone === "dark" ? "brightness-0 invert" : ""} />;
}

export function RoomCard({
  name,
  code,
  playerCount,
  onCopy
}: {
  name: string;
  code: string;
  playerCount: number;
  onCopy?: () => void;
}) {
  return (
    <article className="rounded-[28px] bg-[var(--surface-inverted-light)] p-5">
      <p className="truncate text-title-sm-bold">{name}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div><p className="text-caption-semibold opacity-55">Room Code</p><p className="text-title-md-extrabold">{code}</p></div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-footnote-semibold"><Users size={16} />{playerCount}</span>
          {onCopy && <button type="button" onClick={onCopy} aria-label="Copy room code" className="grid size-11 place-items-center rounded-full bg-[var(--surface-inverted)]"><Copy size={18} /></button>}
        </div>
      </div>
    </article>
  );
}
