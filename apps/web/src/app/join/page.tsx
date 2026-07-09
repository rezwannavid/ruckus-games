"use client";

import { Suspense, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LogIn } from "lucide-react";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/GameUI";
import { NumberInput } from "@/components/ui/NumberInput";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { NumericKeypad } from "@/features/lobby/components/NumericKeypad";
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
  const storedAvatar = useSyncExternalStore(() => () => {}, () => getStoredSession().avatarId, () => 1);
  const [step, setStep] = useState<Step>("code");
  const [roomCode, setRoomCode] = useState("");
  const [codeState, setCodeState] = useState<CodeState>("initial");
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [avatarOverride, setAvatarOverride] = useState<number | null>(null);
  const [error, setError] = useState("");
  const playerName = (nameOverride ?? storedName).slice(0, 16);
  const avatarId = avatarOverride ?? storedAvatar;

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
      <main className="min-h-screen overflow-hidden bg-[var(--surface-inverted)] pt-8 text-[var(--text-inverted)]">
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
  return (
    <main className="min-h-screen bg-[var(--surface-secondary)] px-4 py-8 text-[var(--text-inverted-plus)]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[25rem] flex-col">
        <BrandNav title={isName ? "Enter your Name" : "Choose your Character"} tone="light" onBack={() => setStep(isName ? "code" : "name")} />
        {isName ? (
          <section className="flex flex-1 items-center justify-center">
            <label className="w-full">
              <span className="sr-only">Your name</span>
              <input
                autoFocus
                value={playerName}
                onChange={(event) => setNameOverride(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter" && playerName.trim()) setStep("avatar"); }}
                maxLength={16}
                placeholder="Your name"
                className="h-24 w-full border-0 border-b-4 border-black/20 bg-transparent text-center text-title-lg-bold outline-none placeholder:text-black/20 focus:border-[var(--surface-inverted-light)]"
              />
            </label>
          </section>
        ) : (
          <section className="flex flex-1 flex-col justify-center">
            <div className="rounded-[28px] bg-black/8 p-5"><AvatarPicker value={avatarId} onChange={setAvatarOverride} label="Choose a player icon" /></div>
            <p className="mt-5 text-center text-title-sm-bold">{playerName}</p>
          </section>
        )}
        {error && <p role="alert" className="mb-4 rounded-[16px] bg-[var(--surface-primary)] px-4 py-3 text-footnote-semibold text-[var(--text-primary)]">{error}</p>}
        <Button onClick={() => isName ? setStep("avatar") : join()} disabled={isName && !playerName.trim()} variant="inverted" size="lg" showLeftIcon={false} rightIcon={isName ? <ArrowRight /> : <LogIn />} className="w-full">
          {isName ? "Enter" : "Join Room"}
        </Button>
      </div>
    </main>
  );
}
