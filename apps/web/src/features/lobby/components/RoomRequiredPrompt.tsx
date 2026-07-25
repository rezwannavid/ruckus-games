"use client";

import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { BrandNav } from "@/features/lobby/components/BrandNav";
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
    <main className="ruckus-screen min-screen-safe px-4 pb-safe pt-safe">
      <div className="mx-auto max-w-[393px]">
        <BrandNav tone="light" onBack={onBack} />

        <div className="stagger-children mx-auto mt-20 grid w-[223px] gap-[18px]">
          <section className="ruckus-paper flex min-h-[318px] flex-col items-center rounded-[46px] px-5 py-5 text-center">
              <div className="grid h-[115px] w-full place-items-center"><Image src="/multiphone.svg" alt="" width={150} height={110} className="max-h-[110px] w-auto" style={{ width: "auto", height: "auto" }} priority /></div>
            <h2 className="mt-2 text-title-sm-bold">Multiple phone</h2>
            <p className="mx-auto mt-1 max-w-[8rem] text-caption-regular opacity-60">Every person plays on their own phone</p>
            <div className="mt-4 grid w-[143px] gap-2">
              <Button onClick={onCreateRoom} variant="inverted" size="md" showLeftIcon={false} showRightIcon={false} className="w-full">Create Room</Button>
              <button onClick={onJoinRoom} className="text-footnote-regular">Join room</button>
            </div>
          </section>

          {game.supportsSingleDevice && onSingleDevice && (
            <button type="button" onClick={onSingleDevice} className="ruckus-paper interactive-pop flex min-h-[227px] w-full flex-col items-center justify-center rounded-[46px] px-6 text-center focus-visible:outline-3 focus-visible:outline-[var(--color-game-accent)]">
              <div className="grid h-[100px] w-full place-items-center"><Image src="/singlephone.svg" alt="" width={130} height={95} className="max-h-[95px] w-auto" style={{ width: "auto", height: "auto" }} priority /></div>
              <span className="mt-1 text-title-sm-bold">Single Phone</span>
              <span className="mt-1 max-w-[8rem] text-caption-regular opacity-60">One phone is passed around</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
