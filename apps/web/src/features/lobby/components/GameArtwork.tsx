import Image from "next/image";

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

  return (
    <div className="flex h-full w-full items-center justify-center rounded-[2.5rem] bg-[var(--surface-inverted-light)] text-[5rem] font-bold text-[var(--text-inverted)]">
      <span aria-hidden="true">{label}</span>
    </div>
  );
}
