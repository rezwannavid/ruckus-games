"use client";

import { ArrowLeft } from "lucide-react";

type BrandNavProps = {
  title?: string;
  tone?: "dark" | "light";
  onBack?: () => void;
  centerTitle?: boolean;
};

export function BrandNav({ title, tone = "dark", onBack, centerTitle = false }: BrandNavProps) {
  return (
    <header className="text-[var(--text-inverted)]" data-tone={tone}>
      <div className={`${centerTitle ? "relative flex justify-center" : "flex gap-2"} min-w-0 items-center`}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className={`${centerTitle ? "absolute left-0" : ""} flex size-7 shrink-0 items-center justify-center rounded-full transition active:scale-90`}
          >
            <ArrowLeft aria-hidden className="size-6" />
          </button>
        )}

        <span className="ruckus-display shrink-0 text-[14px] font-bold tracking-[-.08em]">Ruckus Games</span>
      </div>

      {title && (
        <h1 className={`${centerTitle ? "px-14 text-center" : onBack ? "pl-7" : ""} mt-0 w-full truncate text-title-sm-extrabold leading-tight`}>
          {title}
        </h1>
      )}
    </header>
  );
}
