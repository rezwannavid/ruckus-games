"use client";

import Image from "next/image";
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
      <div className="flex min-w-0 items-center gap-4 px-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="flex size-8 shrink-0 items-center justify-center rounded-full transition active:scale-90"
          >
            <ArrowLeft aria-hidden className="size-6" />
          </button>
        )}

        <Image
          src={isLight ? "/logo-main.svg" : "/logo-main-light.svg"}
          alt="Ruckus Games"
          width={129}
          height={20}
          priority
          className="h-5 w-auto max-w-[9.5rem] shrink-0"
        />
      </div>

      {title && (
        <h1 className={`${onBack ? "pl-[4rem]" : "pl-4"} mt-1 w-full pr-4 text-title-sm-extrabold leading-tight`}>
          {title}
        </h1>
      )}
    </header>
  );
}
