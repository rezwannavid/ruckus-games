"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { GameArtwork } from "@/features/lobby/components/GameArtwork";
import { DiceIcon } from "@/features/lobby/components/icons";
import { getGameBySlug } from "@/features/lobby/data/games";

export default function GameDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const { slug } = use(params);
  const game = getGameBySlug(slug);

  if (!game) {
    return (
      <main className="min-h-screen bg-[var(--surface-inverted)] px-4 py-8 text-[var(--text-inverted)]">
        <div className="mx-auto max-w-[25rem]">
          <BrandNav title="Game Not Found" tone="light" onBack={() => router.push("/games")} />
          <p className="mt-12 text-body-regular">This game is not available yet.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--surface-primary)] px-4 py-8 text-[var(--text-primary)]">
      <div className="mx-auto max-w-[25rem]">
        <BrandNav title={game.name} tone="dark" onBack={() => router.push("/games")} />

        <section className="mt-10">
          <div className="h-[18rem]">
            <GameArtwork label={game.name[0]} gameSlug={game.slug} tone="light" />
          </div>

          <p className="mt-8 text-footnote-semibold uppercase tracking-[0.18em] text-[var(--text-highlight)]">
            {game.description}
          </p>
          <h1 className="mt-2 text-title-md-extrabold">{game.name}</h1>
          <p className="mt-3 text-body-regular">
            {game.summary ?? game.description}
          </p>

          <div className="mt-6 rounded-[1.5rem] bg-[var(--surface-primary-light)] p-5">
            <p className="text-title-sm-semibold">Ways to play</p>
            <div className="mt-3 grid gap-2 text-body-regular">
              {game.supportsMultiplayer && (
                <p>{game.minPlayers}-{game.maxPlayers} players can join from their own phones.</p>
              )}
              {game.supportsSingleDevice && (
                <p>Single-phone mode is available for passing one device around.</p>
              )}
            </div>
          </div>
        </section>

        <Button
          onClick={() => router.push(`/room-required?game=${game.slug}`)}
          variant="tertiary"
          size="lg"
          showLeftIcon={false}
          rightIcon={<DiceIcon className="size-[1.875rem]" />}
          className="mt-8 w-full"
        >
          Play
        </Button>
      </div>
    </main>
  );
}
