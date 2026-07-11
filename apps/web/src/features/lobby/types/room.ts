export type Player = {
  id: string;
  name: string;
  avatarId: number;
  isHost: boolean;
};

export type Game = {
  slug: string;
  name: string;
  description: string;
  summary?: string;
  minPlayers: number;
  maxPlayers: number;
  supportsMultiplayer?: boolean;
  supportsSingleDevice?: boolean;
};

export type Room = {
  code: string;
  name?: string;
  players: Player[];
  status: "waiting" | "in_game" | "ended";
  selectedGame?: Game;
  gameState?: {
    players: Array<{ id: string; status?: "active" | "eliminated" | "disconnected" | "spectating" | "left" | "kicked" }>;
  };
  lastGameEndedByHost?: boolean;
};
