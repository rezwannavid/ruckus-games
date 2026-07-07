"use client";

import { Button } from "@/components/ui/Button";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { GameCard } from "@/features/lobby/components/GameCard";
import { DoorEnterIcon, DoorOpenIcon } from "@/features/lobby/components/icons";
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
    <main className="min-h-screen bg-[var(--surface-primary)] px-4 pb-28 pt-10 text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-5xl flex-col">
        <section className="flex flex-col items-center gap-5 text-center">
          <BrandNav />
          <h1 className="max-w-[22.5rem] text-title-lg-semibold">
            Play party games with friends
          </h1>
        </section>

        <section className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(16.75rem,1fr))] gap-4 pb-3">
          {games.slice(0, 3).map((game) => (
            <GameCard
              key={game.slug}
              game={game}
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

        <div className="fixed inset-x-0 bottom-8 z-10 mx-auto grid max-w-[25rem] grid-cols-2 gap-2 px-4">
          <Button
            onClick={onCreateRoom}
            variant="secondary"
            size="md"
            showLeftIcon={false}
            rightIcon={<DoorOpenIcon className="size-5" />}
          >
            Create Room
          </Button>

          <Button
            onClick={onJoinRoom}
            variant="primary"
            size="md"
            showLeftIcon={false}
            rightIcon={<DoorEnterIcon className="size-5" />}
          >
            Join Room
          </Button>
        </div>
      </div>
    </main>
  );
}
