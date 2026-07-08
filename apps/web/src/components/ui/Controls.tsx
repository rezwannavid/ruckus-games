"use client";

import { Minus, Plus } from "lucide-react";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
};

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className="flex min-h-16 items-center justify-between gap-4 rounded-[24px] bg-[var(--surface-inverted-light)] px-5">
      <span className="text-body-semibold">{label}</span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="relative h-8 w-14 rounded-full bg-[var(--surface-inverted)] transition peer-checked:bg-[var(--surface-secondary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--surface-primary)] peer-disabled:opacity-40 after:absolute after:left-1 after:top-1 after:size-6 after:rounded-full after:bg-[var(--surface-primary)] after:transition-transform peer-checked:after:translate-x-6" />
    </label>
  );
}

type NumberStepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

export function NumberStepper({ label, value, min, max, onChange }: NumberStepperProps) {
  return (
    <div className="flex min-h-20 items-center justify-between gap-4 rounded-[24px] bg-[var(--surface-inverted-light)] px-5">
      <span className="text-body-semibold">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)} className="grid size-10 place-items-center rounded-full bg-[var(--surface-inverted)] disabled:opacity-30">
          <Minus size={20} aria-hidden />
        </button>
        <output className="w-8 text-center text-title-sm-bold">{value}</output>
        <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)} className="grid size-10 place-items-center rounded-full bg-[var(--surface-secondary)] disabled:opacity-30">
          <Plus size={20} aria-hidden />
        </button>
      </div>
    </div>
  );
}

type TagProps = {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
};

export function Tag({ children, selected = false, onClick }: TagProps) {
  const Component = onClick ? "button" : "span";
  return (
    <Component
      type={onClick ? "button" : undefined}
      aria-pressed={onClick ? selected : undefined}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center rounded-full px-4 text-footnote-semibold ${selected ? "bg-[var(--surface-secondary)] text-[var(--text-inverted-plus)]" : "bg-[var(--surface-inverted-light)] text-[var(--text-inverted)]"}`}
    >
      {children}
    </Component>
  );
}
