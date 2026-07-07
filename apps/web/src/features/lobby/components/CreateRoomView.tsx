"use client";

import { Button } from "@/components/ui/Button";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { DoorOpenIcon } from "@/features/lobby/components/icons";
import type { Game } from "@/features/lobby/types/room";

type CreateRoomViewProps = {
  roomName: string;
  playerName: string;
  pendingGame?: Game;
  error?: string;
  isCreating?: boolean;
  onRoomNameChange: (value: string) => void;
  onPlayerNameChange: (value: string) => void;
  onBack: () => void;
  onCreateRoom: () => void;
};

export function CreateRoomView({
  roomName,
  playerName,
  pendingGame,
  error,
  isCreating = false,
  onRoomNameChange,
  onPlayerNameChange,
  onBack,
  onCreateRoom
}: CreateRoomViewProps) {
  return (
    <main className="min-h-screen bg-[var(--surface-inverted)] px-4 py-8 text-[var(--text-inverted)]">
      <div className="mx-auto max-w-[25rem]">
        <BrandNav title="Create Room" tone="light" onBack={onBack} />

        <section className="mt-12 rounded-[2rem] bg-[var(--surface-inverted-light)] p-6">
          <h1 className="text-title-md-extrabold">Name the room</h1>
          <p className="mt-2 text-body-regular">
            This room becomes the lobby for choosing games and bringing people in.
          </p>

          {pendingGame && (
            <p className="mt-4 rounded-[1.25rem] bg-[var(--surface-inverted)] px-4 py-3 text-footnote-semibold text-[var(--text-highlight)]">
              Starting with {pendingGame.name}
            </p>
          )}

          <label className="mt-6 block">
            <span className="text-footnote-semibold">Room Name</span>
            <input
              value={roomName}
              onChange={(event) => onRoomNameChange(event.target.value)}
              placeholder="Friday game night"
              className="mt-2 w-full rounded-[1rem] border-0 bg-[var(--surface-inverted)] px-4 py-4 text-title-sm-semibold outline-none"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-footnote-semibold">Your Name</span>
            <input
              value={playerName}
              onChange={(event) => onPlayerNameChange(event.target.value)}
              placeholder="Navid"
              className="mt-2 w-full rounded-[1rem] border-0 bg-[var(--surface-inverted)] px-4 py-4 text-title-sm-semibold outline-none"
            />
          </label>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </section>

        <Button
          onClick={onCreateRoom}
          disabled={isCreating || !playerName.trim()}
          variant="tertiary"
          size="lg"
          showLeftIcon={false}
          rightIcon={<DoorOpenIcon className="size-[1.875rem]" />}
          className="mt-8 w-full"
        >
          {isCreating ? "Creating" : "Create Room"}
        </Button>
      </div>
    </main>
  );
}
