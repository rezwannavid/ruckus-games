export type RoomStatus = "waiting" | "in_game" | "ended";

export type Player = {
  id: string;
  name: string;
  isHost: boolean;
};

export type Room = {
  code: string;
  players: Player[];
  status: RoomStatus;
};

export type Game = {
  id: string;
  slug: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
};