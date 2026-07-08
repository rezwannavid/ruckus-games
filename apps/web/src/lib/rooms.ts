import { serverUrl } from "@/lib/config";
import type { Room, Player, Game } from "@/features/lobby/types/room";

type RoomResponse = {
  room: Room;
  player: Player;
};

export async function createRoom({
  playerName,
  roomName,
  avatarId
}: {
  playerName: string;
  roomName?: string;
  avatarId: number;
}): Promise<RoomResponse> {
  const response = await fetchWithTimeout(`${serverUrl}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      playerName,
      roomName,
      avatarId
    })
  });

  return parseRoomResponse(response, "Could not create room.");
}

export async function joinRoom({
  roomCode,
  playerName,
  avatarId
}: {
  roomCode: string;
  playerName: string;
  avatarId: number;
}): Promise<RoomResponse> {
  const response = await fetchWithTimeout(`${serverUrl}/rooms/${roomCode}/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      playerName,
      avatarId
    })
  });

  return parseRoomResponse(response, "Could not join room.");
}

export async function leaveRoom({
  roomCode,
  playerId
}: {
  roomCode: string;
  playerId: string;
}) {
  const response = await fetchWithTimeout(`${serverUrl}/rooms/${roomCode}/leave`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      playerId
    })
  });

  return parseJsonResponse<{ room: Room }>(response, "Could not leave room.");
}

export async function selectRoomGame({
  roomCode,
  playerId,
  gameSlug
}: {
  roomCode: string;
  playerId: string;
  gameSlug: string;
}) {
  const response = await fetchWithTimeout(`${serverUrl}/rooms/${roomCode}/games/select`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      playerId,
      gameSlug
    })
  });

  return parseJsonResponse<{ room: Room; game?: Game }>(
    response,
    "Could not select game."
  );
}

async function parseRoomResponse(response: Response, fallbackMessage: string) {
  return parseJsonResponse<RoomResponse>(response, fallbackMessage);
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? fallbackMessage);
  }

  return data as T;
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Could not reach the room server. Make sure this phone is on the same Wi-Fi and use the computer's network address.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
