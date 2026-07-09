"use client";

import { Suspense, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui/GameUI";
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
  const storedAvatar = useSyncExternalStore(() => () => {}, () => getStoredSession().avatarId, () => 1);
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [avatarOverride, setAvatarOverride] = useState<number | null>(null);
  const [step, setStep] = useState<"name" | "avatar" | "creating">("name");
  const [error, setError] = useState("");
  const playerName = (nameOverride ?? storedName).slice(0, 16);
  const avatarId = avatarOverride ?? storedAvatar;

  async function create() {
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

  return (
    <CreateRoomView
      step={step}
      playerName={playerName}
      avatarId={avatarId}
      pendingGame={pendingGame}
      error={error}
      onPlayerNameChange={setNameOverride}
      onAvatarChange={setAvatarOverride}
      onBack={() => step === "avatar" ? setStep("name") : router.push("/")}
      onContinue={() => step === "name" ? setStep("avatar") : create()}
    />
  );
}
