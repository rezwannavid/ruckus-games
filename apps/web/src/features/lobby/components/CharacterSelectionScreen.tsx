"use client";

import type { ReactNode } from "react";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { Button } from "@/components/ui/Button";
import { BrandNav } from "@/features/lobby/components/BrandNav";

export function CharacterSelectionScreen({
  value,
  onChange,
  onBack,
  onContinue,
  actionLabel,
  actionIcon,
  error,
  eyebrow
}: {
  value: number | null;
  onChange: (avatarId: number) => void;
  onBack: () => void;
  onContinue: () => void;
  actionLabel: string;
  actionIcon: ReactNode;
  error?: string;
  eyebrow?: string;
}) {
  return (
    <main className="min-screen-safe overflow-x-hidden bg-[var(--surface-secondary)] text-[var(--text-inverted-plus)] [--page-background:var(--surface-secondary)]">
      <div className="mx-auto flex min-screen-safe w-full max-w-[393px] flex-col px-4 pb-safe pt-safe">
        <BrandNav title="Choose your Character" tone="light" onBack={onBack} />
        {eyebrow && <p className="mt-3 text-center text-footnote-semibold opacity-55">{eyebrow}</p>}

        <section className="flex min-h-0 flex-1 items-center py-3">
          <AvatarPicker value={value} onChange={onChange} label="Choose your character" />
        </section>

        {error && (
          <p role="alert" className="mb-3 rounded-[18px] bg-[var(--surface-primary)] px-4 py-3 text-footnote-semibold text-[var(--text-primary)]">
            {error}
          </p>
        )}
        <Button
          onClick={onContinue}
          disabled={value === null}
          variant="inverted"
          size="lg"
          showLeftIcon={false}
          rightIcon={actionIcon}
          className="w-full shrink-0"
        >
          {actionLabel}
        </Button>
      </div>
    </main>
  );
}
