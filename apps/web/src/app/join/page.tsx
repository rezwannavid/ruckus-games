"use client";

import { Suspense, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, MoveLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/GameUI";
import { NumberInput } from "@/components/ui/NumberInput";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { NumericKeypad } from "@/features/lobby/components/NumericKeypad";
import { CharacterSelectionScreen } from "@/features/lobby/components/CharacterSelectionScreen";
import { serverUrl } from "@/lib/config";
import { joinRoom } from "@/lib/rooms";
import { getStoredSession, saveRoomSession } from "@/lib/session";

type Step = "code" | "name" | "avatar" | "joining";
type CodeState = "initial" | "typed" | "joining" | "joined" | "wrong-code";

export default function JoinPage() {
  return <Suspense><JoinContent /></Suspense>;
}

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingGame = searchParams.get("game");
  const storedName = useSyncExternalStore(() => () => {}, () => getStoredSession().playerName ?? "", () => "");
  const [step, setStep] = useState<Step>("code");
  const [roomCode, setRoomCode] = useState("");
  const [codeState, setCodeState] = useState<CodeState>("initial");
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [avatarOverride, setAvatarOverride] = useState<number | null>(null);
  const [error, setError] = useState("");
  const playerName = (nameOverride ?? storedName).slice(0, 16);
  const avatarId = avatarOverride;

  async function validateCode(code: string) {
    setCodeState("joining");
    try {
      const response = await fetch(`${serverUrl}/rooms/${code}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Wrong Code");
      setCodeState("joined");
      window.setTimeout(() => setStep("name"), 450);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Wrong Code");
      setCodeState("wrong-code");
    }
  }

  function addDigit(digit: string) {
    if (codeState === "joining" || codeState === "joined") return;
    setError("");
    const nextCode = `${roomCode}${digit}`.slice(0, 4);
    setRoomCode(nextCode);
    setCodeState("typed");
    if (nextCode.length === 4) void validateCode(nextCode);
  }

  function resetCode() {
    setRoomCode("");
    setCodeState("initial");
    setError("");
  }

  async function join() {
    if (avatarId === null) return;
    setStep("joining");
    setError("");
    try {
      const data = await joinRoom({ roomCode, playerName, avatarId });
      saveRoomSession({
        playerId: data.player.id,
        playerName: data.player.name,
        roomCode: data.room.code,
        avatarId: data.player.avatarId
      });
      router.replace(pendingGame ? `/room/${data.room.code}?game=${pendingGame}` : `/room/${data.room.code}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not join room.");
      setStep("avatar");
    }
  }

  if (step === "joining") return <LoadingState title="Joining Room..." subtitle={`as ${playerName}`} />;

  if (step === "code") {
    return (
      <main className="page-light min-h-screen overflow-hidden bg-[var(--surface-inverted)] pt-8 text-[var(--text-inverted)]">
        <div className="mx-auto flex min-h-screen max-w-[25rem] flex-col">
          <BrandNav title="Enter Room Code" tone="light" onBack={() => router.push("/")} />
          <section className="flex flex-1 items-center justify-center px-4 pb-[22rem]">
            <NumberInput value={roomCode} state={codeState} message={codeState === "wrong-code" ? error : undefined} onTryAgain={resetCode} />
          </section>
          <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[25rem]">
            <NumericKeypad
              onDigit={addDigit}
              onDelete={() => {
                setRoomCode((value) => value.slice(0, -1));
                setCodeState(roomCode.length > 1 ? "typed" : "initial");
              }}
              disabled={codeState === "joining" || codeState === "joined"}
            />
          </div>
        </div>
      </main>
    );
  }

  const isName = step === "name";

  if (isName) {
    const hasName = Boolean(playerName.trim());

    return (
      <main className="min-h-[100dvh] overflow-hidden bg-[var(--surface-secondary)] text-[var(--text-inverted)]">
        <div className="relative mx-auto min-h-[100dvh] w-full max-w-[393px] overflow-hidden bg-[var(--surface-secondary)] px-4">
          <div className="absolute left-4 right-4 top-[74px] flex items-start gap-2">
            <button
              type="button"
              aria-label="Back to room code"
              onClick={() => setStep("code")}
              className="mt-1 flex size-6 shrink-0 items-center justify-center text-[var(--text-inverted)]"
            >
              <MoveLeft className="size-6" strokeWidth={2} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-body-semibold text-[var(--text-inverted)]">
                <span aria-hidden="true" className="size-5 rounded-full bg-[var(--text-inverted)]/15" />
                <span>ruckus games</span>
              </div>
              <h1 className="text-title-sm-extrabold text-[var(--text-inverted)]">Enter your Name</h1>
            </div>
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
            className="absolute left-4 right-4 top-[502px] h-20 rounded-[28px] text-headline-md-bold"
          >
            Enter
          </Button>
        </div>
      </main>
    );
  }

  return <CharacterSelectionScreen value={avatarId} onChange={setAvatarOverride} onBack={() => setStep("name")} onContinue={join} actionLabel="Join Room" actionIcon={<LogIn />} error={error} eyebrow={playerName} />;
}
