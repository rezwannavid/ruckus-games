import Image from "next/image";
import { Braces, RadioTower } from "lucide-react";

type GameArtworkProps = {
  label?: string;
  gameSlug?: string;
};

export function GameArtwork({ label = "?", gameSlug }: GameArtworkProps) {
  if (gameSlug === "imposter") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Image
          src="/Imposter Artwork.svg"
          alt=""
          width={204}
          height={189}
          className="h-auto w-full max-w-[204px]"
          priority
        />
      </div>
    );
  }

  if (gameSlug === "imposter-code") {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[2.5rem] bg-[var(--surface-inverted-light)] text-[var(--surface-secondary)]">
        <Braces size={104} strokeWidth={2.4} aria-hidden />
      </div>
    );
  }

  if (gameSlug === "wavelength") {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[2.5rem] bg-[var(--surface-inverted-light)] text-[var(--surface-secondary)]">
        <RadioTower size={104} strokeWidth={2.4} aria-hidden />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center rounded-[2.5rem] bg-[var(--surface-inverted-light)] text-[5rem] font-bold text-[var(--text-inverted)]">
      <span aria-hidden="true">{label}</span>
    </div>
  );
}
