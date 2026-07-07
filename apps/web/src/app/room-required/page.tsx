"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RoomRequiredPrompt } from "@/features/lobby/components/RoomRequiredPrompt";
import { getGameBySlug } from "@/features/lobby/data/games";

export default function RoomRequiredPage() {
  return (
    <Suspense>
      <RoomRequiredContent />
    </Suspense>
  );
}

function RoomRequiredContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameSlug = searchParams.get("game") ?? "imposter";
  const game = useMemo(() => getGameBySlug(gameSlug), [gameSlug]);

  if (!game) {
    router.push("/games");
    return null;
  }

  return (
    <RoomRequiredPrompt
      game={game}
      onBack={() => router.push(`/games/${game.slug}`)}
      onCreateRoom={() => router.push(`/create?game=${game.slug}`)}
      onJoinRoom={() => router.push(`/join?game=${game.slug}`)}
    />
  );
}
