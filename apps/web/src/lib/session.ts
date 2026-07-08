const playerIdKey = "ruckusPlayerId";
const playerNameKey = "ruckusPlayerName";
const roomCodeKey = "ruckusRoomCode";
const avatarIdKey = "ruckusAvatarId";

export type StoredSession = {
  playerId: string | null;
  playerName: string | null;
  roomCode: string | null;
  avatarId: number;
};

export function getStoredSession(): StoredSession {
  if (typeof window === "undefined") {
    return {
      playerId: null,
      playerName: null,
      roomCode: null,
      avatarId: 1
    };
  }

  return {
    playerId: localStorage.getItem(playerIdKey),
    playerName: localStorage.getItem(playerNameKey),
    roomCode: localStorage.getItem(roomCodeKey),
    avatarId: Number(localStorage.getItem(avatarIdKey)) || 1
  };
}

export function saveRoomSession({
  playerId,
  playerName,
  roomCode,
  avatarId
}: {
  playerId: string;
  playerName: string;
  roomCode: string;
  avatarId: number;
}) {
  localStorage.setItem(playerIdKey, playerId);
  localStorage.setItem(playerNameKey, playerName);
  localStorage.setItem(roomCodeKey, roomCode);
  localStorage.setItem(avatarIdKey, String(avatarId));
}

export function clearRoomSession() {
  localStorage.removeItem(playerIdKey);
  localStorage.removeItem(playerNameKey);
  localStorage.removeItem(roomCodeKey);
  localStorage.removeItem(avatarIdKey);
}
