"use client";

import { LogoMark } from "@/features/lobby/components/icons";
import { ArrowLeft } from "lucide-react";

type BrandNavProps = {
  title?: string;
  tone?: "dark" | "light";
  onBack?: () => void;
};

export function BrandNav({ title, tone = "dark", onBack }: BrandNavProps) {
  const isLight = tone === "light";

  return (
    <header
      className={
        isLight
          ? "text-[var(--text-inverted)]"
          : "text-[var(--text-primary)]"
      }
    >
      <div className="flex items-center gap-5 px-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="flex size-6 items-center justify-center"
          >
            <ArrowLeft aria-hidden className="size-6" />
          </button>
        )}

        <div className="flex items-center gap-1">
          <LogoMark className={`size-5 ${isLight ? "" : "brightness-0 invert"}`} />
          <span className="text-body-semibold">ruckus games</span>
        </div>
      </div>

      {title && (
        <h1 className="mt-px w-full pl-[4rem] pr-4 text-title-sm-extrabold">
          {title}
        </h1>
      )}
    </header>
  );
}
