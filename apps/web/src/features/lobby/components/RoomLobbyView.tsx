"use client";

import { Button } from "@/components/ui/Button";
import { PlayerCard } from "@/components/ui/PlayerCard";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { CopyIcon, DiceIcon, SkullIcon } from "@/features/lobby/components/icons";
import type { Player } from "@/features/lobby/types/room";

type RoomLobbyViewProps = {
  roomName?: string;
  roomCode: string;
  players: Player[];
  currentPlayerId: string | null;
  isHost: boolean;
  copyMessage?: string;
  onBack: () => void;
  onCopyLink: () => void;
  onEndRoom: () => void;
  onContinueSetup: () => void;
  onRemovePlayer: (playerId: string) => void;
};

export function RoomLobbyView({
  roomName,
  roomCode,
  players,
  currentPlayerId,
  isHost,
  copyMessage,
  onBack,
  onCopyLink,
  onEndRoom,
  onContinueSetup,
  onRemovePlayer
}: RoomLobbyViewProps) {
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
              variant="primary-plus"
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
            {players.length} PLAYER{players.length === 1 ? "" : "S"}
          </h2>

          <div className="mt-4 flex flex-col gap-1">
            {players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                isCurrentPlayer={player.id === currentPlayerId}
                onRemove={isHost && !player.isHost ? () => onRemovePlayer(player.id) : undefined}
              />
            ))}
          </div>
        </section>

        <Button
          onClick={onContinueSetup}
          variant="tertiary"
          size="lg"
          showLeftIcon={false}
          rightIcon={<DiceIcon className="size-[1.875rem]" />}
          className="fixed inset-x-4 bottom-8 mx-auto max-w-[22.5625rem]"
        >
          {isHost ? "Select a Game" : "Show Games"}
        </Button>
      </div>
    </main>
  );
}
