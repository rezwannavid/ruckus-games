"use client";

import { Button } from "@/components/ui/Button";
import { GameCard } from "@/features/lobby/components/GameCard";
import { DoorOpen, Github, Instagram, LogIn } from "lucide-react";
import { games, playableGameSlugs } from "@/features/lobby/data/games";

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
    <main className="ruckus-screen min-screen-safe overflow-x-hidden px-4 pb-safe pt-safe">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem-var(--safe-bottom)-var(--safe-top))] max-w-6xl flex-col">
        <section className="flex flex-col items-center text-center">
          <div className="ruckus-display text-[34px] font-bold leading-[.62] tracking-[-.12em]" aria-label="Ruckus Games">
            <span className="block translate-x-1">r<span className="relative -top-2">u</span>k<span className="relative top-1">u</span></span>
            <span className="block">r<span className="relative -top-1">c</span>ks</span>
            <span className="mt-2 block text-[16px] font-light tracking-[-.08em]">games</span>
          </div>
        </section>

        <section aria-label="Room actions" className="mx-auto mt-7 grid w-full max-w-[278px] grid-cols-2 gap-2">
          <Button onClick={onCreateRoom} variant="inverted" size="md" showLeftIcon={false} rightIcon={<DoorOpen size={16} />}>Create Room</Button>
          <Button onClick={onJoinRoom} variant="primary-plus" size="md" showLeftIcon={false} rightIcon={<LogIn size={16} />}>Join Room</Button>
        </section>

        <p className="mt-10 text-center text-footnote-regular opacity-70">Swipe to see more games</p>

        <section className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[calc(50%-123px)] pb-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] md:px-0">
          {games.map((game) => (
            <GameCard
              key={game.slug}
              game={game}
              disabled={!playableGameSlugs.has(game.slug)}
              comingSoon={!playableGameSlugs.has(game.slug)}
              className="w-[246px] shrink-0 snap-center md:w-full"
              onClick={() => onGameClick(game.slug)}
            />
          ))}
        </section>

        <Button onClick={onBrowseGames} variant="tertiary" size="lg" showLeftIcon={false} showRightIcon={false} className="mx-auto mt-6 w-[238px]">select game</Button>

        {error && <p className="mt-4 text-center text-sm text-red-300">{error}</p>}

        <footer className="mt-auto pt-8 text-center text-caption-regular">
          <p>made with love by <strong>Rezwan Navid</strong></p>
          <div className="mt-2 flex justify-center gap-3"><Instagram size={18} /><span className="text-[18px] leading-none">@</span><Github size={18} /></div>
          <a className="mt-1 inline-block underline" href="https://rezwannavid.me">rezwannavid.me</a>
        </footer>
      </div>
    </main>
  );
}
