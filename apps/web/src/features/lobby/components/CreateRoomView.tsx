"use client";

import { Button } from "@/components/ui/Button";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { FormField } from "@/components/ui/FormField";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { DoorOpenIcon } from "@/features/lobby/components/icons";
import type { Game } from "@/features/lobby/types/room";

type CreateRoomViewProps = {
  roomName: string;
  playerName: string;
  avatarId: number;
  pendingGame?: Game;
  error?: string;
  isCreating?: boolean;
  onRoomNameChange: (value: string) => void;
  onPlayerNameChange: (value: string) => void;
  onAvatarChange: (avatarId: number) => void;
  onBack: () => void;
  onCreateRoom: () => void;
};

export function CreateRoomView({
  roomName,
  playerName,
  avatarId,
  pendingGame,
  error,
  isCreating = false,
  onRoomNameChange,
  onPlayerNameChange,
  onAvatarChange,
  onBack,
  onCreateRoom
}: CreateRoomViewProps) {
  return (
    <main className="min-h-screen bg-[var(--surface-secondary)] px-4 py-8 text-[var(--text-inverted-plus)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[25rem] flex-col">
        <BrandNav title="Create Room" tone="light" onBack={onBack} />

        <section className="mt-10 flex-1 space-y-6">
          <div>
            <h1 className="text-title-lg-bold">Set up your room</h1>
            <p className="mt-2 max-w-[22rem] text-body-medium opacity-70">
              Choose your identity, then name the lobby your friends will join.
            </p>
          </div>

          {pendingGame && (
            <p className="rounded-[1.25rem] bg-[var(--surface-primary)] px-4 py-3 text-footnote-semibold text-[var(--text-primary)]">
              Starting with {pendingGame.name}
            </p>
          )}

          <FormField name="playerName" label="Your name" value={playerName} onChange={(event) => onPlayerNameChange(event.target.value)} placeholder="Navid" autoComplete="nickname" maxLength={24} />
          <AvatarPicker value={avatarId} onChange={onAvatarChange} />
          <FormField name="roomName" label="Room name" value={roomName} onChange={(event) => onRoomNameChange(event.target.value)} placeholder={`${playerName || "Player"}'s Room`} maxLength={36} />

          {error && <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--surface-primary)] px-4 py-3 text-footnote-semibold text-[var(--text-primary)]">{error}</p>}
        </section>

        <Button
          onClick={onCreateRoom}
          disabled={isCreating || !playerName.trim()}
          variant="inverted"
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
