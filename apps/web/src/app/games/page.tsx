"use client";

import { useRouter } from "next/navigation";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { GameCard } from "@/features/lobby/components/GameCard";
import { games, playableGameSlugs } from "@/features/lobby/data/games";

export default function GamesListPage() {
  const router = useRouter();

  return (
    <main className="min-screen-safe bg-[var(--surface-primary)] px-4 pb-safe pt-safe text-[var(--text-primary)]">
      <div className="mx-auto max-w-5xl">
        <BrandNav title="Games" onBack={() => router.push("/")} />

        <section className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(16.75rem,1fr))] gap-4">
          {games.map((game) => (
            <GameCard
              key={game.slug}
              game={game}
              disabled={!playableGameSlugs.has(game.slug)}
              comingSoon={!playableGameSlugs.has(game.slug)}
              onClick={() => router.push(`/games/${game.slug}`)}
            />
          ))}
        </section>
      </div>
    </main>
  );
}
