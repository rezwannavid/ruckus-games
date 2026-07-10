"use client";

import { ArrowRight, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { CharacterSelectionScreen } from "@/features/lobby/components/CharacterSelectionScreen";
import type { Game } from "@/features/lobby/types/room";

type CreateRoomViewProps = {
  step: "name" | "avatar";
  playerName: string;
  avatarId: number | null;
  pendingGame?: Game;
  error?: string;
  onPlayerNameChange: (value: string) => void;
  onAvatarChange: (avatarId: number) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function CreateRoomView({
  step,
  playerName,
  avatarId,
  pendingGame,
  error,
  onPlayerNameChange,
  onAvatarChange,
  onBack,
  onContinue
}: CreateRoomViewProps) {
  const isName = step === "name";

  if (!isName) {
    return (
      <CharacterSelectionScreen
        value={avatarId}
        onChange={onAvatarChange}
        onBack={onBack}
        onContinue={onContinue}
        actionLabel="Create Room"
        actionIcon={<DoorOpen />}
        error={error}
        eyebrow={pendingGame ? `Setting up ${pendingGame.name}` : undefined}
      />
    );
  }

  return (
    <main className="min-screen-safe overflow-hidden bg-[var(--surface-secondary)] px-4 pb-safe pt-safe text-[var(--text-inverted-plus)] [--page-background:var(--surface-secondary)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[25rem] flex-col">
        <BrandNav title={isName ? "Enter your Name" : "Choose your Character"} tone="light" onBack={onBack} />

        {pendingGame && (
          <p className="mt-8 text-center text-footnote-semibold opacity-60">
            Setting up {pendingGame.name}
          </p>
        )}

          <section className="flex flex-1 items-center justify-center">
            <label className="w-full">
              <span className="sr-only">Your name</span>
              <input
                autoFocus
                value={playerName}
                onChange={(event) => onPlayerNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && playerName.trim()) onContinue();
                }}
                maxLength={16}
                autoComplete="nickname"
                placeholder="Your name"
                className="h-24 w-full border-0 border-b-4 border-black/20 bg-transparent text-center text-title-lg-bold outline-none placeholder:text-black/20 focus:border-[var(--surface-inverted-light)]"
              />
            </label>
          </section>

        {error && <p role="alert" className="mb-4 rounded-[16px] bg-[var(--surface-primary)] px-4 py-3 text-footnote-semibold text-[var(--text-primary)]">{error}</p>}

        <Button
          onClick={onContinue}
          disabled={!playerName.trim()}
          variant="inverted"
          size="lg"
          showLeftIcon={false}
          rightIcon={<ArrowRight />}
          className="w-full"
        >
          Enter
        </Button>
      </div>
    </main>
  );
}
