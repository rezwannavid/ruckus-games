"use client";

import { NumberInput } from "@/components/ui/NumberInput";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { FormField } from "@/components/ui/FormField";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { NumericKeypad } from "@/features/lobby/components/NumericKeypad";

type JoinRoomViewState = "initial" | "typed" | "joining" | "joined" | "wrong-code";

type JoinRoomViewProps = {
  roomCode: string;
  playerName: string;
  avatarId: number;
  state: JoinRoomViewState;
  error?: string;
  pendingGameName?: string;
  onPlayerNameChange: (value: string) => void;
  onAvatarChange: (avatarId: number) => void;
  onBack: () => void;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onTryAgain: () => void;
};

export function JoinRoomView({
  roomCode,
  playerName,
  avatarId,
  state,
  error,
  pendingGameName,
  onPlayerNameChange,
  onAvatarChange,
  onBack,
  onDigit,
  onDelete,
  onTryAgain
}: JoinRoomViewProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--surface-inverted)] pt-8 text-[var(--text-inverted)]">
      <div className="mx-auto flex min-h-screen max-w-[25rem] flex-col">
        <BrandNav title="Enter Room Code" tone="light" onBack={onBack} />

        <section className="mt-8 space-y-5 px-4">
          {pendingGameName && (
            <p className="mb-4 rounded-[1rem] bg-[var(--surface-inverted-light)] px-4 py-3 text-footnote-semibold text-[var(--text-highlight)]">
              Joining for {pendingGameName}
            </p>
          )}

          <FormField name="playerName" label="Your name" value={playerName} onChange={(event) => onPlayerNameChange(event.target.value)} placeholder="Navid" autoComplete="nickname" maxLength={24} />
          <AvatarPicker value={avatarId} onChange={onAvatarChange} />
        </section>

        <section className="flex flex-1 items-center justify-center px-4 pb-60 pt-6">
          <NumberInput
            value={roomCode}
            state={state}
            message={state === "wrong-code" ? (error ?? "Wrong Code") : undefined}
            onTryAgain={onTryAgain}
          />
        </section>

        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[25rem]">
          <NumericKeypad
            onDigit={onDigit}
            onDelete={onDelete}
            disabled={state === "joining" || state === "joined"}
          />
        </div>
      </div>
    </main>
  );
}
