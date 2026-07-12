"use client";

import { Suspense, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/GameUI";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { CreateRoomView } from "@/features/lobby/components/CreateRoomView";
import { getGameBySlug } from "@/features/lobby/data/games";
import { createRoom, selectRoomGame } from "@/lib/rooms";
import { getStoredSession, saveRoomSession } from "@/lib/session";

export default function CreateRoomPage() {
  return <Suspense><CreateRoomContent /></Suspense>;
}

function CreateRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingGameSlug = searchParams.get("game") ?? "";
  const pendingGame = useMemo(() => pendingGameSlug ? getGameBySlug(pendingGameSlug) : undefined, [pendingGameSlug]);
  const storedName = useSyncExternalStore(() => () => {}, () => getStoredSession().playerName ?? "", () => "");
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [avatarOverride, setAvatarOverride] = useState<number | null>(null);
  const [step, setStep] = useState<"name" | "avatar" | "creating">("name");
  const [error, setError] = useState("");
  const playerName = (nameOverride ?? storedName).slice(0, 16);
  const avatarId = avatarOverride;

  async function create() {
    if (avatarId === null) return;
    setStep("creating");
    setError("");
    try {
      const data = await createRoom({ playerName, avatarId });
      saveRoomSession({
        playerId: data.player.id,
        playerName: data.player.name,
        roomCode: data.room.code,
        avatarId: data.player.avatarId
      });
      if (pendingGame) {
        await selectRoomGame({
          roomCode: data.room.code,
          playerId: data.player.id,
          gameSlug: pendingGame.slug
        });
      }
      router.replace(`/room/${data.room.code}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create room.");
      setStep("avatar");
    }
  }

  if (step === "creating") return <LoadingState title="Creating Room..." subtitle={`as ${playerName}`} />;

  if (step === "name") {
    const hasName = Boolean(playerName.trim());

    return (
      <main className="min-h-[100dvh] overflow-scroll bg-[var(--surface-secondary)] text-[var(--text-inverted)]">
        <div className="relative mx-auto min-h-[100dvh] w-full max-w-[393px] overflow-hidden bg-[var(--surface-secondary)] px-4">
          <div className="absolute left-0 right-0 top-[42px]">
            <BrandNav title="Enter your Name" tone="light" onBack={() => router.push("/")} />
          </div>

          <label className="group absolute left-1/2 top-[286px] flex h-[96px] w-[calc(100%-2rem)] max-w-[360px] -translate-x-1/2 cursor-text items-center justify-center rounded-[28px] bg-white/10 px-4 transition duration-200 focus-within:scale-[1.02] focus-within:bg-white/15">
            <span className="sr-only">Your name</span>
            <input
              autoFocus
              value={playerName}
              onChange={(event) => setNameOverride(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && playerName.trim()) setStep("avatar"); }}
              maxLength={16}
              placeholder="Your name"
              className="h-full w-full appearance-none border-0 bg-transparent px-2 text-center !text-[56px] !font-extrabold leading-none !text-white caret-white shadow-none outline-none ring-0 placeholder:text-[30px] placeholder:font-semibold placeholder:text-white/45 focus:border-0 focus:outline-none focus:ring-0"

            />
          </label>

          {error && <p role="alert" className="absolute bottom-[112px] left-4 right-4 rounded-[16px] bg-[var(--surface-primary)] px-4 py-3 text-footnote-semibold text-[var(--text-primary)]">{error}</p>}
          <Button
            onClick={() => setStep("avatar")}
            disabled={!hasName}
            variant="inverted"
            size="lg"
            showLeftIcon={false}
            className="absolute left-4 right-4 top-[502px] h-20 rounded-[28px] text-headline-md-extra-bold"
          >
            Enter
          </Button>
        </div>
      </main>
    );
  }

  return (
    <CreateRoomView
      step={step}
      playerName={playerName}
      avatarId={avatarId}
      pendingGame={pendingGame}
      error={error}
      onPlayerNameChange={setNameOverride}
      onAvatarChange={setAvatarOverride}
      onBack={() => setStep("name")}
      onContinue={create}
    />
  );
}
