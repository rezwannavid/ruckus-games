"use client";

import { Button } from "@/components/ui/Button";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { CopyIcon, DiceIcon } from "@/features/lobby/components/icons";
import type { Game, Room } from "@/features/lobby/types/room";

type RoomCreatedViewProps = {
  room: Room;
  pendingGame?: Game;
  copyMessage?: string;
  onCopyLink: () => void;
  onContinue: () => void;
};

export function RoomCreatedView({
  room,
  pendingGame,
  copyMessage,
  onCopyLink,
  onContinue
}: RoomCreatedViewProps) {
  return (
    <main className="min-h-screen bg-[var(--surface-inverted)] px-4 py-8 text-[var(--text-inverted)]">
      <div className="mx-auto max-w-[25rem]">
        <BrandNav title="Room Created" tone="light" />

        <section className="mt-16 rounded-[2rem] bg-[var(--surface-inverted-light)] p-6 text-center">
          <p className="text-footnote-semibold text-[var(--text-highlight)]">
            {room.name}
          </p>
          <h1 className="mt-2 text-display-lg-bold">{room.code}</h1>
          <p className="mt-4 text-body-regular">
            Share this code or copy the invite link. Players who join will show
            up in the lobby.
          </p>
          {pendingGame && (
            <p className="mt-4 rounded-[1rem] bg-[var(--surface-inverted)] px-4 py-3 text-footnote-semibold text-[var(--text-highlight)]">
              {pendingGame.name} is selected for setup.
            </p>
          )}
        </section>

        <div className="mt-8 grid gap-3">
          <Button
            onClick={onCopyLink}
            variant="primary"
            size="md"
            showLeftIcon={false}
            rightIcon={<CopyIcon className="size-5" />}
          >
            Copy Invite Link
          </Button>
          <Button
            onClick={onContinue}
            variant="tertiary"
            size="lg"
            showLeftIcon={false}
            rightIcon={<DiceIcon className="size-[1.875rem]" />}
          >
            Go to Lobby
          </Button>
        </div>

        {copyMessage && (
          <p className="mt-4 text-center text-footnote-semibold text-[var(--text-highlight)]">
            {copyMessage}
          </p>
        )}
      </div>
    </main>
  );
}
