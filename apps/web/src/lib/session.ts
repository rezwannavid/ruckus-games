const playerIdKey = "ruckusPlayerId";
const playerNameKey = "ruckusPlayerName";
const roomCodeKey = "ruckusRoomCode";

export type StoredSession = {
  playerId: string | null;
  playerName: string | null;
  roomCode: string | null;
};

export function getStoredSession(): StoredSession {
  if (typeof window === "undefined") {
    return {
      playerId: null,
      playerName: null,
      roomCode: null
    };
  }

  return {
    playerId: localStorage.getItem(playerIdKey),
    playerName: localStorage.getItem(playerNameKey),
    roomCode: localStorage.getItem(roomCodeKey)
  };
}

export function saveRoomSession({
  playerId,
  playerName,
  roomCode
}: {
  playerId: string;
  playerName: string;
  roomCode: string;
}) {
  localStorage.setItem(playerIdKey, playerId);
  localStorage.setItem(playerNameKey, playerName);
  localStorage.setItem(roomCodeKey, roomCode);
}

export function clearRoomSession() {
  localStorage.removeItem(playerIdKey);
  localStorage.removeItem(playerNameKey);
  localStorage.removeItem(roomCodeKey);
}

export function getFallbackPlayerName() {
  if (typeof window === "undefined") {
    return "Player";
  }

  return localStorage.getItem(playerNameKey) ?? "Player";
}
