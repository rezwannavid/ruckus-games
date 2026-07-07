import type { Game } from "@/features/lobby/types/room";

export const games: Game[] = [
  {
    slug: "imposter",
    name: "Imposter",
    description: "Social Deduction",
    summary: "Find the hidden player before they blend in.",
    minPlayers: 2,
    maxPlayers: 12,
    supportsMultiplayer: true,
    supportsSingleDevice: true
  },
  {
    slug: "codenames",
    name: "Codenames",
    description: "Give clues and guess the right words with your team.",
    summary: "Team clue-giving for a full room.",
    minPlayers: 4,
    maxPlayers: 10,
    supportsMultiplayer: true,
    supportsSingleDevice: false
  },
  {
    slug: "name-3",
    name: "Name 3",
    description: "Name three things before time runs out.",
    summary: "Fast prompt rounds that work well passed around.",
    minPlayers: 3,
    maxPlayers: 12,
    supportsMultiplayer: true,
    supportsSingleDevice: true
  },
  {
    slug: "passwords",
    name: "Passwords",
    description: "Guess the secret word from clever clues.",
    summary: "Clue and guess word play for groups.",
    minPlayers: 4,
    maxPlayers: 10,
    supportsMultiplayer: true,
    supportsSingleDevice: false
  },
  {
    slug: "fibbage",
    name: "Fibbage",
    description: "Make up convincing lies and spot the truth.",
    summary: "Write lies and vote for the truth.",
    minPlayers: 3,
    maxPlayers: 8,
    supportsMultiplayer: true,
    supportsSingleDevice: true
  },
  {
    slug: "wavelength",
    name: "Wavelength",
    description: "Read the room and guess where the answer lands.",
    summary: "A shared guessing game for the whole room.",
    minPlayers: 2,
    maxPlayers: 12,
    supportsMultiplayer: true,
    supportsSingleDevice: true
  }
];

export function getGameBySlug(slug: string) {
  return games.find((game) => game.slug === slug);
}
