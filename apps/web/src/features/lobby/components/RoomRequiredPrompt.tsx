"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { DoorEnterIcon, DoorOpenIcon } from "@/features/lobby/components/icons";
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
    <main className="min-screen-safe bg-[var(--surface-primary)] px-4 pb-safe pt-safe text-[var(--text-primary)]">
      <div className="mx-auto max-w-[393px]">
        <BrandNav title="Select Game Mode" tone="dark" onBack={onBack} />

        <div className="stagger-children mt-7 grid gap-4">
          {game.supportsSingleDevice && onSingleDevice && (
            <button type="button" onClick={onSingleDevice} className="interactive-pop flex min-h-[294px] w-full flex-col items-center justify-center rounded-[54px] bg-[var(--surface-primary-light)] px-6 text-center focus-visible:outline-3 focus-visible:outline-[var(--color-game-accent)]">
              <div className="grid h-[180px] w-full place-items-center"><Image src="/singlephone.svg" alt="" width={171} height={171} className="max-h-[171px] w-auto" priority /></div>
              <span className="mt-1 text-headline-md-bold">Play with a single phone</span>
            </button>
          )}

          <section className="rounded-[54px] bg-[var(--surface-primary-light)] px-5 py-6 text-center">
            <p className="mx-auto max-w-[13rem] text-footnote-semibold">Create a room to play with multiple phones</p>
            <div className="mx-auto mt-4 grid h-[112px] w-[239px] place-items-center"><Image src="/multiphone.svg" alt="" width={239} height={107} className="max-h-[107px] w-auto" priority /></div>
            <h2 className="mt-2 text-headline-md-bold">Play multiplayer</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button onClick={onCreateRoom} variant="tertiary" size="md" showLeftIcon={false} rightIcon={<DoorOpenIcon className="size-5" />} className="w-full px-3">Create Room</Button>
              <Button onClick={onJoinRoom} variant="primary" size="md" showLeftIcon={false} rightIcon={<DoorEnterIcon className="size-5" />} className="w-full px-3">Join Room</Button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
