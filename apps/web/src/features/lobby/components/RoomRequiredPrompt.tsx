"use client";

import { Button } from "@/components/ui/Button";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { DoorEnterIcon, DoorOpenIcon } from "@/features/lobby/components/icons";
import type { Game } from "@/features/lobby/types/room";

type RoomRequiredPromptProps = {
  game: Game;
  onBack: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
};

export function RoomRequiredPrompt({
  game,
  onBack,
  onCreateRoom,
  onJoinRoom
}: RoomRequiredPromptProps) {
  return (
    <main className="min-h-screen bg-[var(--surface-inverted)] px-4 py-8 text-[var(--text-inverted)]">
      <div className="mx-auto max-w-[25rem]">
        <BrandNav title="Room Required" tone="light" onBack={onBack} />

        <section className="mt-16 rounded-[2rem] bg-[var(--surface-inverted-light)] p-6 text-center">
          <p className="text-footnote-semibold uppercase tracking-[0.18em] text-[var(--text-highlight)]">
            {game.name}
          </p>
          <h1 className="mt-3 text-title-md-extrabold">
            Start from a room to play
          </h1>
          <p className="mt-3 text-body-regular">
            Create a room as host or join an existing room. Once you are in the
            lobby, this game will be ready to set up.
          </p>
        </section>

        <div className="mt-8 grid gap-3">
          <Button
            onClick={onCreateRoom}
            variant="tertiary"
            size="lg"
            showLeftIcon={false}
            rightIcon={<DoorOpenIcon className="size-[1.875rem]" />}
          >
            Create Room
          </Button>
          <Button
            onClick={onJoinRoom}
            variant="primary"
            size="md"
            showLeftIcon={false}
            rightIcon={<DoorEnterIcon className="size-5" />}
          >
            Join Room
          </Button>
        </div>
      </div>
    </main>
  );
}
