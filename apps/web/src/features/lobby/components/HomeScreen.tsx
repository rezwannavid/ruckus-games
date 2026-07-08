"use client";

import { Button } from "@/components/ui/Button";
import { GameCard } from "@/features/lobby/components/GameCard";
import { DoorOpen, LogIn } from "lucide-react";
import Image from "next/image";
import { games } from "@/features/lobby/data/games";

type HomeScreenProps = {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onBrowseGames: () => void;
  onGameClick: (gameSlug: string) => void;
  error?: string;
};

export function HomeScreen({
  onCreateRoom,
  onJoinRoom,
  onBrowseGames,
  onGameClick,
  error
}: HomeScreenProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--surface-primary)] px-4 pb-8 pt-12 text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col">
        <section className="flex flex-col items-center gap-5 text-center">
          <Image src="/logo-full.svg" alt="Ruckus Games" width={132} height={24} priority className="h-auto w-[132px] brightness-0 invert" />
          <h1 className="max-w-[22.5rem] text-title-lg-semibold">
            Play party games with friends
          </h1>
        </section>

        <section aria-label="Room actions" className="mx-auto mt-8 grid w-full max-w-[22.5rem] grid-cols-2 gap-2">
          <Button onClick={onCreateRoom} variant="tertiary" size="md" showLeftIcon={false} rightIcon={<DoorOpen size={18} />}>Create Room</Button>
          <Button onClick={onJoinRoom} variant="inverted" size="md" showLeftIcon={false} rightIcon={<LogIn size={18} />}>Join Room</Button>
        </section>

        <section className="-mx-4 mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-[repeat(auto-fit,minmax(16.75rem,1fr))] md:overflow-visible md:px-0">
          {games.map((game) => (
            <GameCard
              key={game.slug}
              game={game}
              disabled={game.slug !== "imposter"}
              className="w-[269px] shrink-0 snap-start md:w-full"
              onClick={() => onGameClick(game.slug)}
            />
          ))}
        </section>

        <button
          type="button"
          onClick={onBrowseGames}
          className="mx-auto mt-4 text-body-semibold text-[var(--text-highlight)]"
        >
          Browse all games
        </button>

        {error && <p className="mt-4 text-center text-sm text-red-300">{error}</p>}

        <footer className="mt-auto pt-8 text-center text-caption-regular opacity-30">with love by rezwan navid</footer>
      </div>
    </main>
  );
}
