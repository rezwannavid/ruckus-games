"use client";

import { NumberInput } from "@/components/ui/NumberInput";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { NumericKeypad } from "@/features/lobby/components/NumericKeypad";

type JoinRoomViewState = "initial" | "typed" | "joining" | "joined" | "wrong-code";

type JoinRoomViewProps = {
  roomCode: string;
  playerName: string;
  state: JoinRoomViewState;
  error?: string;
  pendingGameName?: string;
  onPlayerNameChange: (value: string) => void;
  onBack: () => void;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onTryAgain: () => void;
};

export function JoinRoomView({
  roomCode,
  playerName,
  state,
  error,
  pendingGameName,
  onPlayerNameChange,
  onBack,
  onDigit,
  onDelete,
  onTryAgain
}: JoinRoomViewProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--surface-inverted)] pt-8 text-[var(--text-inverted)]">
      <div className="mx-auto flex min-h-screen max-w-[25rem] flex-col">
        <BrandNav title="Enter Room Code" tone="light" onBack={onBack} />

        <section className="mt-10 px-4">
          {pendingGameName && (
            <p className="mb-4 rounded-[1rem] bg-[var(--surface-inverted-light)] px-4 py-3 text-footnote-semibold text-[var(--text-highlight)]">
              Joining for {pendingGameName}
            </p>
          )}

          <label className="block">
            <span className="text-footnote-semibold">Your Name</span>
            <input
              value={playerName}
              onChange={(event) => onPlayerNameChange(event.target.value)}
              placeholder="Navid"
              className="mt-2 w-full rounded-[1rem] border-0 bg-[var(--surface-inverted-light)] px-4 py-4 text-title-sm-semibold outline-none"
            />
          </label>
        </section>

        <section className="flex flex-1 items-center justify-center px-4 pb-60">
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
