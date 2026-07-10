"use client";

import Image from "next/image";
import { ArrowLeft } from "lucide-react";

type BrandNavProps = {
  title?: string;
  tone?: "dark" | "light";
  onBack?: () => void;
  centerTitle?: boolean;
};

export function BrandNav({ title, tone = "dark", onBack, centerTitle = false }: BrandNavProps) {
  const isLight = tone === "light";

  return (
    <header
      className={
        isLight
          ? "text-[var(--text-inverted)]"
          : "text-[var(--text-primary)]"
      }
    >
      <div className={`${centerTitle ? "relative flex justify-center" : "flex gap-4"} min-w-0 items-center px-4`}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className={`${centerTitle ? "absolute left-4" : ""} flex size-8 shrink-0 items-center justify-center rounded-full transition active:scale-90`}
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
        <h1 className={`${centerTitle ? "px-14 text-center" : onBack ? "pl-[4rem] pr-4" : "px-4"} mt-1 w-full truncate text-title-sm-extrabold leading-tight`}>
          {title}
        </h1>
      )}
    </header>
  );
}
