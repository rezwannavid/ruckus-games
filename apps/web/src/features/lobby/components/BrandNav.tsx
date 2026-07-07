"use client";

import { LogoMark } from "@/features/lobby/components/icons";

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
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-6">
              <path
                d="M19 12H5m7 7-7-7 7-7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-1">
          <LogoMark className="size-5" />
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
