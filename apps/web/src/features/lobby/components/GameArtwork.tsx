import Image from "next/image";

type GameArtworkProps = {
  label?: string;
  gameSlug?: string;
  tone?: "default" | "light";
};

export function GameArtwork({ label = "?", gameSlug, tone = "default" }: GameArtworkProps) {
  const toneClass = tone === "light" ? "brightness-0 invert" : "";
  if (gameSlug === "imposter") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Image
          src="/Imposter Artwork.svg"
          alt=""
          width={204}
          height={189}
          className={`h-auto w-full max-w-[158px] ${toneClass}`}
          style={{ width: "100%", height: "auto" }}
          priority
        />
      </div>
    );
  }

  if (gameSlug === "imposter-code") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Image src="/impostercodeartwork.svg" alt="" width={220} height={200} className={`h-auto w-full max-w-[220px] ${toneClass}`} style={{ width: "100%", height: "auto" }} priority />
      </div>
    );
  }

  if (gameSlug === "wavelength") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Image src="/wavelengthartwork.svg" alt="" width={220} height={200} className={`h-auto w-full max-w-[220px] ${toneClass}`} style={{ width: "100%", height: "auto" }} priority />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center rounded-[2.5rem] bg-[var(--surface-inverted-light)] text-[5rem] font-bold text-[var(--text-inverted)]">
      <span aria-hidden="true">{label}</span>
    </div>
  );
}
