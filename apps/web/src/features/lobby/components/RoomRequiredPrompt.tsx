"use client";

import { Button } from "@/components/ui/Button";
import { ModeSelector } from "@/components/ui/GameUI";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { DoorEnterIcon } from "@/features/lobby/components/icons";
import type { Game } from "@/features/lobby/types/room";

type RoomRequiredPromptProps = {
  game: Game;
  onBack: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onSingleDevice?: () => void;
};

export function RoomRequiredPrompt({
  game,
  onBack,
  onCreateRoom,
  onJoinRoom,
  onSingleDevice
}: RoomRequiredPromptProps) {
  return (
    <main className="min-h-screen bg-[var(--surface-inverted)] px-4 py-8 text-[var(--text-inverted)]">
      <div className="mx-auto max-w-[25rem]">
        <BrandNav title="Select Game Mode" tone="light" onBack={onBack} />

        <section className="mt-12 text-center">
          <p className="text-footnote-semibold uppercase tracking-[0.18em] text-[var(--text-highlight)]">
            {game.name}
          </p>
          <h1 className="mt-3 text-title-md-extrabold">
            How do you want to play?
          </h1>
          <p className="mt-3 text-body-regular">
            {game.name} supports the following game modes.
          </p>
        </section>

        <div className="mt-8 grid gap-3">
          {game.supportsSingleDevice && onSingleDevice && (
            <ModeSelector title="Play with a single phone" description="Pass one device around. No room needed." icon="single" onClick={onSingleDevice} />
          )}
          <ModeSelector title="Play multiplayer" description="Create a room so everyone can join on their phone." icon="multi" onClick={onCreateRoom} />
          <Button
            onClick={onJoinRoom}
            variant="primary"
            size="md"
            showLeftIcon={false}
            rightIcon={<DoorEnterIcon className="size-5" />}
          >
            Join an Existing Room
          </Button>
        </div>
      </div>
    </main>
  );
}
