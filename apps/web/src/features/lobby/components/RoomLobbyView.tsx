"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PlayerCard } from "@/components/ui/PlayerCard";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { GameCard } from "@/features/lobby/components/GameCard";
import { CopyIcon, DiceIcon, SkullIcon } from "@/features/lobby/components/icons";
import type { Game, Player } from "@/features/lobby/types/room";

type RoomLobbyViewProps = {
  roomName?: string;
  roomCode: string;
  players: Player[];
  currentPlayerId: string | null;
  isHost: boolean;
  games: Game[];
  selectedGame?: Game;
  copyMessage?: string;
  onBack: () => void;
  onCopyLink: () => void;
  onEndRoom: () => void;
  onSelectGame: (gameSlug: string) => void;
  onContinueSetup: () => void;
};

export function RoomLobbyView({
  roomName,
  roomCode,
  players,
  currentPlayerId,
  isHost,
  games,
  selectedGame,
  copyMessage,
  onBack,
  onCopyLink,
  onEndRoom,
  onSelectGame,
  onContinueSetup
}: RoomLobbyViewProps) {
  const canContinue = Boolean(selectedGame);
  const [showGames, setShowGames] = useState(Boolean(selectedGame));

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--surface-inverted)] px-4 pb-28 pt-8 text-[var(--text-inverted)]">
      <div className="mx-auto max-w-5xl">
        <BrandNav title={isHost ? "Your Room" : "Room"} tone="light" onBack={onBack} />

        <section className="mx-auto mt-11 max-w-[25rem] text-center">
          <p className="text-title-sm-semibold text-[var(--text-highlight)]">
            {roomName}
          </p>
          <p className="mt-1 text-display-lg-bold">{roomCode}</p>

          <div className="mt-8 grid grid-cols-2 gap-2">
            <Button
              onClick={onCopyLink}
              variant="primary"
              size="md"
              showLeftIcon={false}
              rightIcon={<CopyIcon className="size-5" />}
            >
              Copy Link
            </Button>

            <Button
              onClick={onEndRoom}
              variant="inverted"
              size="md"
              showLeftIcon={false}
              rightIcon={<SkullIcon className="size-5" />}
            >
              {isHost ? "End Room" : "Leave Room"}
            </Button>
          </div>

          {copyMessage && (
            <p className="mt-3 text-footnote-semibold text-[var(--text-highlight)]">
              {copyMessage}
            </p>
          )}
        </section>

        <section className="mx-auto mt-7 max-w-[25rem]">
          <h2 className="text-center text-title-sm-extrabold">
            {players.length} Player{players.length === 1 ? "" : "s"}
          </h2>

          <div className="mt-4 flex flex-col gap-1">
            {players.map((player) => (
              <PlayerCard key={player.id} player={player} isCurrentPlayer={player.id === currentPlayerId} />
            ))}
          </div>
        </section>

        {showGames && <section className="mt-8">
          <div className="mx-auto max-w-[25rem] text-center">
            <h2 className="text-title-sm-extrabold">Choose Game</h2>
            <p className="mt-1 text-footnote-regular">
              {isHost
                ? "Pick a game that works for this room."
                : "Waiting for the room owner to pick a game."}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(16.75rem,1fr))] gap-4">
            {games.map((game) => {
              const tooManyPlayers = players.length > game.maxPlayers;
              const isImplemented = game.slug === "imposter";
                  const disabled = !isHost || tooManyPlayers || !isImplemented;

              return (
                <div key={game.slug} className="relative">
                  <GameCard
                    game={game}
                    selected={selectedGame?.slug === game.slug}
                    disabled={disabled}
                    onClick={() => onSelectGame(game.slug)}
                  />
                  {!isImplemented && (
                    <p className="mt-2 text-center text-footnote-semibold opacity-70">
                      Coming soon
                    </p>
                  )}
                  {tooManyPlayers && (
                    <p className="mt-2 text-center text-footnote-semibold text-red-700">
                      Too many players
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>}

        <Button
          onClick={() => {
            if (!showGames) {
              setShowGames(true);
              return;
            }
            onContinueSetup();
          }}
          disabled={showGames && (!isHost || !canContinue)}
          variant="tertiary"
          size="lg"
          showLeftIcon={false}
          rightIcon={<DiceIcon className="size-[1.875rem]" />}
          className="fixed inset-x-4 bottom-8 mx-auto max-w-[22.5625rem]"
        >
          {!showGames
            ? isHost ? "Select a Game" : "Show Games"
            : selectedGame
              ? isHost ? `Set Up ${selectedGame.name}` : `${selectedGame.name} Selected`
              : isHost ? "Choose Game" : "Waiting for Room Owner"}
        </Button>
      </div>
    </main>
  );
}
