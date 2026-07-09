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

        <Image
          src={isLight ? "/logo-main.svg" : "/logo-main-light.svg"}
          alt="Ruckus Games"
          width={129}
          height={20}
          priority
          className="h-5 w-auto"
        />
      </div>

      {title && (
        <h1 className="mt-px w-full pl-[4rem] pr-4 text-title-sm-extrabold">
          {title}
        </h1>
      )}
    </header>
  );
}
