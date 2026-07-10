import type { Game } from "@/features/lobby/types/room";

export const games: Game[] = [
  {
    slug: "imposter",
    name: "Imposter",
    description: "Social Deduction",
    summary: "Find the hidden player before they blend in.",
    minPlayers: 3,
    maxPlayers: 12,
    supportsMultiplayer: true,
    supportsSingleDevice: true
  },
  {
    slug: "imposter-code",
    name: "Imposter Code",
    description: "Question Bluffing",
    summary: "Answer secret prompts, reveal every answer, then find the player who does not fit.",
    minPlayers: 3,
    maxPlayers: 12,
    supportsMultiplayer: true,
    supportsSingleDevice: true
  },
  {
    slug: "wavelength",
    name: "Wavelength",
    description: "Clue Guessing",
    summary: "Give a clue for a hidden number and see how close the group can land.",
    minPlayers: 2,
    maxPlayers: 12,
    supportsMultiplayer: true,
    supportsSingleDevice: true
  }
];

export const playableGameSlugs = new Set(["imposter", "imposter-code", "wavelength"]);

export function getGameBySlug(slug: string) {
  return games.find((game) => game.slug === slug);
}
