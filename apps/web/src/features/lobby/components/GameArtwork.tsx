type GameArtworkProps = {
  label?: string;
};

export function GameArtwork({ label = "?" }: GameArtworkProps) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-[2.5rem] bg-[var(--surface-inverted-light)] text-[5rem] font-bold text-[var(--text-inverted)]">
      <span aria-hidden="true">{label}</span>
    </div>
  );
}
