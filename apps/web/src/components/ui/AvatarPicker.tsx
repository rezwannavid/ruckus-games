"use client";

import Image from "next/image";

export const AVATAR_IDS = Array.from({ length: 14 }, (_, index) => index + 1);

type AvatarProps = {
  avatarId: number;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function Avatar({ avatarId, name = "", size = "md", className = "" }: AvatarProps) {
  const dimension = size === "sm" ? 32 : size === "lg" ? 72 : 40;

  return (
    <Image
      src={`/PlayerIcon${Math.min(14, Math.max(1, avatarId || 1))}.svg`}
      alt={name ? `${name}'s avatar` : ""}
      width={dimension}
      height={dimension}
      className={`shrink-0 object-contain brightness-0 ${className}`}
    />
  );
}

type AvatarPickerProps = {
  value: number;
  onChange: (avatarId: number) => void;
  label?: string;
};

export function AvatarPicker({ value, onChange, label = "Choose your avatar" }: AvatarPickerProps) {
  return (
    <fieldset>
      <legend className="text-footnote-semibold">{label}</legend>
      <div className="mt-3 grid grid-cols-7 gap-2">
        {AVATAR_IDS.map((avatarId) => (
          <button
            key={avatarId}
            type="button"
            onClick={() => onChange(avatarId)}
            aria-label={`Choose avatar ${avatarId}`}
            aria-pressed={value === avatarId}
            className="flex aspect-square items-center justify-center rounded-[var(--radius-md)] border-2 border-transparent bg-[var(--surface-inverted-light)] p-1 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--surface-primary)] aria-pressed:border-[var(--surface-primary)] aria-pressed:bg-[var(--surface-inverted)]"
          >
            <Avatar avatarId={avatarId} size="sm" />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
