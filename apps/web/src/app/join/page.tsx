"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { JoinRoomView } from "@/features/lobby/components/JoinRoomView";
import { getGameBySlug } from "@/features/lobby/data/games";
import { joinRoom } from "@/lib/rooms";
import { getFallbackPlayerName, saveRoomSession } from "@/lib/session";

type JoinState = "initial" | "typed" | "joining" | "joined" | "wrong-code";

export default function JoinPage() {
  return (
    <Suspense>
      <JoinContent />
    </Suspense>
  );
}

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingGameSlug = searchParams.get("game") ?? "";
  const pendingGame = pendingGameSlug ? getGameBySlug(pendingGameSlug) : undefined;

  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState(() => getFallbackPlayerName());
  const [state, setState] = useState<JoinState>("initial");
  const [error, setError] = useState("");
  const lastSubmittedJoinKeyRef = useRef("");

  const canSubmit = useMemo(
    () => roomCode.length === 4 && playerName.trim().length > 0,
    [playerName, roomCode]
  );

  useEffect(() => {
    if (!canSubmit) {
      return;
    }

    const joinKey = `${roomCode}:${playerName.trim()}:${pendingGame?.slug ?? ""}`;

    if (lastSubmittedJoinKeyRef.current === joinKey) {
      return;
    }

    lastSubmittedJoinKeyRef.current = joinKey;

    let isMounted = true;

    async function submitJoin() {
      setError("");
      setState("joining");

      try {
        const data = await joinRoom({
          roomCode,
          playerName
        });

        if (!isMounted) return;

        saveRoomSession({
          playerId: data.player.id,
          playerName: data.player.name,
          roomCode: data.room.code
        });

        setState("joined");
        window.setTimeout(() => {
          router.push(
            pendingGame ? `/room/${data.room.code}?game=${pendingGame.slug}` : `/room/${data.room.code}`
          );
        }, 450);
      } catch (err) {
        if (!isMounted) return;

        setError(err instanceof Error ? err.message : "Could not join room.");
        setState("wrong-code");
      }
    }

    submitJoin();

    return () => {
      isMounted = false;
    };
  }, [canSubmit, pendingGame, playerName, roomCode, router]);

  function addDigit(digit: string) {
    setError("");
    setRoomCode((currentCode) => {
      const nextCode = `${currentCode}${digit}`.slice(0, 4);
      setState(nextCode.length > 0 ? "typed" : "initial");
      return nextCode;
    });
  }

  function deleteDigit() {
    setError("");
    lastSubmittedJoinKeyRef.current = "";
    setRoomCode((currentCode) => {
      const nextCode = currentCode.slice(0, -1);
      setState(nextCode.length > 0 ? "typed" : "initial");
      return nextCode;
    });
  }

  function tryAgain() {
    setError("");
    setRoomCode("");
    setState("initial");
    lastSubmittedJoinKeyRef.current = "";
  }

  return (
    <JoinRoomView
      roomCode={roomCode}
      playerName={playerName}
      state={state}
      error={error}
      pendingGameName={pendingGame?.name}
      onPlayerNameChange={setPlayerName}
      onBack={() => router.push("/")}
      onDigit={addDigit}
      onDelete={deleteDigit}
      onTryAgain={tryAgain}
    />
  );
}
