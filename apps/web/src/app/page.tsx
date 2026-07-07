"use client";

import { useRouter } from "next/navigation";
import { HomeScreen } from "@/features/lobby/components/HomeScreen";

export default function Home() {
  const router = useRouter();

  return (
    <HomeScreen
      onCreateRoom={() => router.push("/create")}
      onJoinRoom={() => router.push("/join")}
      onBrowseGames={() => router.push("/games")}
      onGameClick={(gameSlug) => router.push(`/games/${gameSlug}`)}
    />
  );
}
