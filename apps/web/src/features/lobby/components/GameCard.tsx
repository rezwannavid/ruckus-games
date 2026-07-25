"use client";

import { Card } from "@/components/ui/Card";
import { GameArtwork } from "@/features/lobby/components/GameArtwork";
import type { Game } from "@/features/lobby/types/room";

type GameCardProps = {
  game: Game;
  selected?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  onClick?: () => void;
  className?: string;
};

export function GameCard({ game, selected = false, disabled = false, comingSoon = false, onClick, className = "" }: GameCardProps) {
  const playerText = `${game.minPlayers}-${game.maxPlayers}\nPlayers`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative text-left disabled:cursor-not-allowed ${className}`}
    >
      <Card
        size="xl"
        variant={selected ? "selected" : "default"}
        gameName={game.name}
        gameDescription={game.description}
        playerCount={playerText}
        className="max-w-none hover:-translate-y-1 active:translate-y-0"
      >
        <GameArtwork label={game.name[0]} gameSlug={game.slug} />
      </Card>
      {comingSoon && (
        <span className="absolute right-4 top-4 rounded-full bg-[var(--surface-primary)] px-3 py-1 text-caption-semibold text-[var(--text-primary)]">
          Coming Soon
        </span>
      )}
    </button>
  );
}
