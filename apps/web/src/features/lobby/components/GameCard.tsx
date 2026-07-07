"use client";

import { Card } from "@/components/ui/Card";
import { GameArtwork } from "@/features/lobby/components/GameArtwork";
import type { Game } from "@/features/lobby/types/room";

type GameCardProps = {
  game: Game;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

export function GameCard({ game, selected = false, disabled = false, onClick }: GameCardProps) {
  const playerText =
    game.supportsSingleDevice && !game.supportsMultiplayer
      ? "Single Phone"
      : game.supportsSingleDevice
        ? `${game.minPlayers}-${game.maxPlayers} Players or Single Phone`
        : `${game.minPlayers}-${game.maxPlayers} Players`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-left disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Card
        size="xl"
        variant={selected ? "selected" : "default"}
        gameName={game.name.toUpperCase()}
        gameDescription={game.description}
        playerCount={playerText}
        className="max-w-none"
      >
        <GameArtwork label={game.name[0]} />
      </Card>
    </button>
  );
}
