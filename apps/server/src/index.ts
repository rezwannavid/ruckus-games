import express from "express";
import cors from "cors";
import http from "http";
import fs from "fs";
import path from "path";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const configuredWebOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const localDevOriginPattern =
  /^https?:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?::\d+)?$/;

function allowLocalDevOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) {
  if (!origin || configuredWebOrigins.includes(origin) || localDevOriginPattern.test(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`Origin ${origin} is not allowed by CORS.`));
}

app.use(cors({
  origin: allowLocalDevOrigin
}));

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowLocalDevOrigin,
    methods: ["GET", "POST"]
  }
});

const PORT = Number(process.env.PORT) || 4000;

type Player = {
  id: string;
  name: string;
  isHost: boolean;
};

type GameParticipant = {
  id: string;
  name: string;
};

type Game = {
  slug: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
};

type ImposterGameState = {
  type: "imposter";
  playMode: "multiplayer" | "single_device";
  phase: "playing" | "revealed";
  players: GameParticipant[];
  word: string;
  wordCategory: string;
  roundTimerSeconds: number;
  startedAt: string;
  endsAt: string;
  imposterPlayerId: string;
  imposterPlayerIds: string[];
};

type GameState = ImposterGameState;

type Room = {
  code: string;
  name?: string;
  players: Player[];
  status: "waiting" | "in_game" | "ended";
  selectedGame?: Game;
  gameState?: GameState;
};

const roomsFilePath = path.join(process.cwd(), "rooms.dev.json");

function loadRooms() {
  try {
    if (!fs.existsSync(roomsFilePath)) {
      return new Map<string, Room>();
    }

    const fileContents = fs.readFileSync(roomsFilePath, "utf-8");
    const parsedData = JSON.parse(fileContents) as { rooms?: [string, Room][] };

    return new Map<string, Room>(parsedData.rooms ?? []);
  } catch (error) {
    console.error("Could not load saved rooms:", error);
    return new Map<string, Room>();
  }
}

function saveRooms() {
  try {
    fs.writeFileSync(
      roomsFilePath,
      JSON.stringify(
        {
          rooms: Array.from(rooms.entries())
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error("Could not save rooms:", error);
  }
}

const rooms = loadRooms();

const games: Game[] = [
  {
    slug: "imposter",
    name: "Imposter",
    description: "Find the hidden player before they blend in.",
    minPlayers: 2,
    maxPlayers: 12
  },
  {
    slug: "codenames",
    name: "Codenames",
    description: "Give clues and guess the right words with your team.",
    minPlayers: 4,
    maxPlayers: 10
  },
  {
    slug: "name-3",
    name: "Name 3",
    description: "Name three things before time runs out.",
    minPlayers: 3,
    maxPlayers: 12
  },
  {
    slug: "passwords",
    name: "Passwords",
    description: "Guess the secret word from clever clues.",
    minPlayers: 4,
    maxPlayers: 10
  },
  {
    slug: "fibbage",
    name: "Fibbage",
    description: "Make up convincing lies and spot the truth.",
    minPlayers: 3,
    maxPlayers: 8
  },
  {
    slug: "wavelength",
    name: "Wavelength",
    description: "Read the room and guess where the answer lands.",
    minPlayers: 2,
    maxPlayers: 12
  }
];

const imposterWordCategories: Record<string, string[]> = {
  random: [
    "Airport",
    "Beach",
    "Cinema",
    "Hospital",
    "Library",
    "Restaurant",
    "School",
    "Shopping Mall",
    "Stadium",
    "Train Station",
    "Zoo",
    "Hotel",
    "Museum",
    "Park",
    "Office"
  ],
  movies: [
    "Titanic",
    "Avatar",
    "Jaws",
    "The Matrix",
    "Jurassic Park",
    "The Lion King",
    "Frozen",
    "Spider-Man",
    "Batman",
    "Harry Potter"
  ],
  places: [
    "Airport",
    "Beach",
    "Hospital",
    "Library",
    "Restaurant",
    "School",
    "Shopping Mall",
    "Stadium",
    "Train Station",
    "Museum"
  ],
  objects: [
    "Backpack",
    "Camera",
    "Chair",
    "Clock",
    "Headphones",
    "Laptop",
    "Phone",
    "Sunglasses",
    "Umbrella",
    "Wallet"
  ]
};

function pickRandomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickRandomItems<T>(items: T[], count: number) {
  const shuffledItems = [...items].sort(() => Math.random() - 0.5);
  return shuffledItems.slice(0, count);
}

function getNumberSetting(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }
  return Math.min(Math.max(Math.floor(parsedValue), minimum), maximum);
}

function getImposterWordList(category: unknown) {
  if (typeof category !== "string") {
    return {
      category: "random",
      words: imposterWordCategories.random
    };
  }
  const words = imposterWordCategories[category];
  if (!words) {
    return {
      category: "random",
      words: imposterWordCategories.random
    };
  }
  return {
    category,
    words
  };
}

function getPlayModeSetting(value: unknown) {
  return value === "single_device" ? "single_device" : "multiplayer";
}

function getManualParticipants(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seenNames = new Set<string>();

  return value
    .filter((playerName): playerName is string => typeof playerName === "string")
    .map((playerName) => playerName.trim())
    .filter((playerName) => playerName.length > 0)
    .filter((playerName) => {
      const normalizedName = playerName.toLowerCase();

      if (seenNames.has(normalizedName)) {
        return false;
      }

      seenNames.add(normalizedName);
      return true;
    })
    .map((playerName) => ({
      id: crypto.randomUUID(),
      name: playerName
    }));
}

function getRoomParticipants(room: Room) {
  return room.players.map((player) => ({
    id: player.id,
    name: player.name
  }));
}

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ruckus-games-server" });
});

app.get("/games", (_req, res) => {
  res.json({ games });
});

app.post("/rooms", (req, res) => {
  const { playerName, roomName } = req.body as {
    playerName?: string;
    roomName?: string;
  };

  if (!playerName || playerName.trim().length === 0) {
    return res.status(400).json({ message: "Player name is required." });
  }

  let code = generateRoomCode();

  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const player: Player = {
    id: crypto.randomUUID(),
    name: playerName.trim(),
    isHost: true
  };

  const room: Room = {
    code,
    name: roomName?.trim() || `${player.name}'s Room`,
    players: [player],
    status: "waiting"
  };

  rooms.set(code, room);
  saveRooms();

  return res.json({ room, player });
});

app.post("/rooms/:code/join", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerName } = req.body as { playerName?: string };

  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  if (room.status === "ended") {
    return res.status(400).json({ message: "Room has ended." });
  }

  if (!playerName || playerName.trim().length === 0) {
    return res.status(400).json({ message: "Player name is required." });
  }

  const normalizedName = playerName.trim();

  const nameTaken = room.players.some(
    player => player.name.toLowerCase() === normalizedName.toLowerCase()
  );

  if (nameTaken) {
    return res.status(400).json({ message: "Name already taken in this room." });
  }

  const player: Player = {
    id: crypto.randomUUID(),
    name: normalizedName,
    isHost: false
  };

  room.players.push(player);

  rooms.set(code, room);
  saveRooms();

  io.to(code).emit("room:state", room);

  return res.json({ room, player });
});


app.get("/rooms/:code", (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  return res.json({ room });
});

app.post("/rooms/:code/leave", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };

  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  if (!playerId) {
    return res.status(400).json({ message: "Player ID is required." });
  }

  const leavingPlayer = room.players.find((player) => player.id === playerId);

  if (!leavingPlayer) {
    return res.status(404).json({ message: "Player not found in this room." });
  }

  room.players = room.players.filter((player) => player.id !== playerId);

  if (room.players.length === 0) {
    rooms.delete(code);
    saveRooms();
    io.to(code).emit("room:ended", {
      message: "Room ended because everyone left."
    });

    return res.json({
      message: "Left room. Room ended because everyone left."
    });
  }

  if (leavingPlayer.isHost) {
    room.players = room.players.map((player, index) => ({
      ...player,
      isHost: index === 0
    }));
  }

  rooms.set(code, room);
  saveRooms();

  io.to(code).emit("room:state", room);

  return res.json({
    message: "Left room.",
    room
  });
});

app.post("/rooms/:code/games/select", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, gameSlug } = req.body as {
    playerId?: string;
    gameSlug?: string;
  };

  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  if (!playerId) {
    return res.status(400).json({ message: "Player ID is required." });
  }

  if (!gameSlug) {
    return res.status(400).json({ message: "Game slug is required." });
  }

  const player = room.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!player) {
    return res.status(404).json({ message: "Player not found in this room." });
  }

  if (!player.isHost) {
    return res.status(403).json({ message: "Only the host can select a game." });
  }

  if (room.status !== "waiting") {
    return res.status(400).json({ message: "Cannot select a game right now." });
  }

  const game = games.find((availableGame) => availableGame.slug === gameSlug);

  if (!game) {
    return res.status(404).json({ message: "Game not found." });
  }

  if (room.players.length > game.maxPlayers) {
    return res.status(400).json({
      message: `${game.name} supports up to ${game.maxPlayers} players.`
    });
  }

  room.selectedGame = game;

  rooms.set(code, room);
  saveRooms();

  io.to(code).emit("room:state", room);

  return res.json({
    message: `${game.name} selected.`,
    room
  });
});

app.post("/rooms/:code/games/start", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, settings } = req.body as {
    playerId?: string;
    settings?: Record<string, unknown>;
  };

  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  if (!playerId) {
    return res.status(400).json({ message: "Player ID is required." });
  }

  const player = room.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!player) {
    return res.status(404).json({ message: "Player not found in this room." });
  }

  if (!player.isHost) {
    return res.status(403).json({ message: "Only the host can start the game." });
  }

  if (!room.selectedGame) {
    return res.status(400).json({ message: "No game selected." });
  }

  if (room.status === "ended") {
    return res.status(400).json({ message: "This room has ended." });
  }

  if (room.status === "in_game") {
    io.to(code).emit("game:started", {
      roomCode: room.code,
      game: room.selectedGame,
      settings: settings ?? {}
    });

    return res.json({
      message: `${room.selectedGame.name} is already running.`,
      room,
      game: room.selectedGame,
      settings: settings ?? {}
    });
  }

  const playMode = getPlayModeSetting(settings?.playMode);
  const manualParticipants = getManualParticipants(settings?.manualPlayers);
  const gameParticipants =
    room.selectedGame.slug === "imposter" && playMode === "single_device"
      ? manualParticipants
      : getRoomParticipants(room);

  if (gameParticipants.length < room.selectedGame.minPlayers) {
    return res.status(400).json({
      message: `${room.selectedGame.name} needs at least ${room.selectedGame.minPlayers} players.`
    });
  }

  if (gameParticipants.length > room.selectedGame.maxPlayers) {
    return res.status(400).json({
      message: `${room.selectedGame.name} supports up to ${room.selectedGame.maxPlayers} players.`
    });
  }

  room.status = "in_game";

  if (room.selectedGame.slug === "imposter") {
    const maxImposters = Math.max(1, gameParticipants.length - 1);
    const numberOfImposters = getNumberSetting(
      settings?.numberOfImposters,
      1,
      1,
      maxImposters
    );
    const roundTimerSeconds = getNumberSetting(
      settings?.roundTimer,
      60,
      30,
      300
    );
    const { category: wordCategory, words } = getImposterWordList(
      settings?.wordCategory
    );
    const imposters = pickRandomItems(gameParticipants, numberOfImposters);
    const word = pickRandomItem(words);
    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + roundTimerSeconds * 1000);

    room.gameState = {
      type: "imposter",
      playMode,
      phase: "playing",
      players: gameParticipants,
      word,
      wordCategory,
      roundTimerSeconds,
      startedAt: startedAt.toISOString(),
      endsAt: endsAt.toISOString(),
      imposterPlayerId: imposters[0].id,
      imposterPlayerIds: imposters.map((imposter) => imposter.id)
    };
  } else {
    room.gameState = undefined;
  }

  rooms.set(code, room);
  saveRooms();

  io.to(code).emit("room:state", room);
  io.to(code).emit("game:started", {
    roomCode: room.code,
    game: room.selectedGame,
    settings: settings ?? {}
  });

  return res.json({
    message: `${room.selectedGame.name} started.`,
    room,
    game: room.selectedGame,
    settings: settings ?? {}
  });
});

app.post("/rooms/:code/games/end", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };

  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  if (!playerId) {
    return res.status(400).json({ message: "Player ID is required." });
  }

  const player = room.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!player) {
    return res.status(404).json({ message: "Player not found in this room." });
  }

  if (!player.isHost) {
    return res.status(403).json({ message: "Only the host can end the game." });
  }

  if (room.status === "ended") {
    return res.status(400).json({ message: "This room has ended." });
  }

  if (room.status !== "in_game") {
    io.to(code).emit("game:ended", {
      roomCode: room.code,
      game: room.selectedGame
    });

    return res.json({
      message: "Game already ended.",
      room,
      game: room.selectedGame
    });
  }

  const endedGame = room.selectedGame;

  room.status = "waiting";
  room.gameState = undefined;

  rooms.set(code, room);
  saveRooms();

  io.to(code).emit("room:state", room);
  io.to(code).emit("game:ended", {
    roomCode: room.code,
    game: endedGame
  });

  return res.json({
    message: "Game ended.",
    room,
    game: endedGame
  });
});

app.post("/rooms/:code/games/imposter/reveal", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };

  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  if (!playerId) {
    return res.status(400).json({ message: "Player ID is required." });
  }

  const player = room.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!player) {
    return res.status(404).json({ message: "Player not found in this room." });
  }

  if (!player.isHost) {
    return res.status(403).json({ message: "Only the host can reveal the imposter." });
  }

  if (room.status !== "in_game") {
    return res.status(400).json({ message: "No game is currently active." });
  }

  if (!room.selectedGame || room.selectedGame.slug !== "imposter") {
    return res.status(400).json({ message: "Imposter is not the active game." });
  }

  if (!room.gameState || room.gameState.type !== "imposter") {
    return res.status(400).json({ message: "Imposter game state not available." });
  }

  room.gameState.phase = "revealed";

  rooms.set(code, room);
  saveRooms();

  const imposterIds = room.gameState.imposterPlayerIds ?? [room.gameState.imposterPlayerId];
  const gameParticipants = room.gameState.players ?? getRoomParticipants(room);
  const imposters = gameParticipants.filter((gameParticipant) =>
    imposterIds.includes(gameParticipant.id)
  );
  const imposter = imposters[0];

  const reveal = {
    word: room.gameState.word,
    wordCategory: room.gameState.wordCategory,
    roundTimerSeconds: room.gameState.roundTimerSeconds,
    startedAt: room.gameState.startedAt,
    endsAt: room.gameState.endsAt,
    imposterPlayerId: imposter?.id ?? room.gameState.imposterPlayerId,
    imposterPlayerName: imposter?.name ?? "Unknown Player",
    imposterPlayerIds: imposterIds,
    imposterPlayerNames: imposters.map((imposterPlayer) => imposterPlayer.name)
  };

  io.to(code).emit("imposter:revealed", reveal);
  io.to(code).emit("room:state", room);

  return res.json({
    message: "Imposter revealed.",
    room,
    reveal
  });
});

app.get("/rooms/:code/game-state/:playerId", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.params;

  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  const roomPlayer = room.players.find((player) => player.id === playerId);

  if (room.status !== "in_game") {
    return res.status(400).json({ message: "No game is currently active." });
  }

  if (!room.selectedGame || !room.gameState) {
    return res.status(400).json({ message: "Game state not available." });
  }

  if (room.gameState.type === "imposter") {
    const gameParticipants = room.gameState.players ?? getRoomParticipants(room);
    const player =
      room.gameState.playMode === "single_device"
        ? gameParticipants.find((gameParticipant) => gameParticipant.id === playerId)
        : roomPlayer;

    if (!player) {
      return res.status(404).json({ message: "Player not found in this game." });
    }

    const imposterIds = room.gameState.imposterPlayerIds ?? [room.gameState.imposterPlayerId];
    const isImposter = imposterIds.includes(player.id);
    const imposters = gameParticipants.filter((gameParticipant) =>
      imposterIds.includes(gameParticipant.id)
    );
    const imposter = imposters[0];

    if (room.gameState.phase === "revealed") {
      return res.json({
        gameSlug: room.selectedGame.slug,
        playMode: room.gameState.playMode,
        players: gameParticipants,
        phase: room.gameState.phase,
        role: isImposter ? "imposter" : "player",
        word: room.gameState.word,
        wordCategory: room.gameState.wordCategory,
        roundTimerSeconds: room.gameState.roundTimerSeconds,
        startedAt: room.gameState.startedAt,
        endsAt: room.gameState.endsAt,
        imposterPlayerId: imposter?.id ?? room.gameState.imposterPlayerId,
        imposterPlayerName: imposter?.name ?? "Unknown Player",
        imposterPlayerIds: imposterIds,
        imposterPlayerNames: imposters.map((imposterPlayer) => imposterPlayer.name)
      });
    }

    return res.json({
      gameSlug: room.selectedGame.slug,
      playMode: room.gameState.playMode,
      players: gameParticipants,
      phase: room.gameState.phase,
      role: isImposter ? "imposter" : "player",
      word: isImposter ? null : room.gameState.word,
      wordCategory: room.gameState.wordCategory,
      roundTimerSeconds: room.gameState.roundTimerSeconds,
      startedAt: room.gameState.startedAt,
      endsAt: room.gameState.endsAt,
      imposterPlayerId: null,
      imposterPlayerName: null,
      imposterPlayerIds: null,
      imposterPlayerNames: null
    });
  }

  return res.status(400).json({ message: "Unsupported game state." });
});

app.get("/rooms/:code/single-device-game-state", (req, res) => {
  const code = req.params.code.toUpperCase();

  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ message: "Room not found." });
  }

  if (room.status !== "in_game") {
    return res.status(400).json({ message: "No game is currently active." });
  }

  if (!room.selectedGame || !room.gameState) {
    return res.status(400).json({ message: "Game state not available." });
  }

  if (room.gameState.type !== "imposter" || room.gameState.playMode !== "single_device") {
    return res.status(400).json({ message: "Single-device game state is not available." });
  }

  return res.json({
    gameSlug: room.selectedGame.slug,
    playMode: room.gameState.playMode,
    phase: room.gameState.phase,
    players: room.gameState.players,
    wordCategory: room.gameState.wordCategory,
    roundTimerSeconds: room.gameState.roundTimerSeconds,
    startedAt: room.gameState.startedAt,
    endsAt: room.gameState.endsAt
  });
});

io.on("connection", socket => {
  socket.on("room:subscribe", ({ roomCode }: { roomCode: string }) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      socket.emit("room:error", { message: "Room not found." });
      return;
    }

    socket.join(code);
    socket.emit("room:state", room);
  });

  socket.on("disconnect", () => {
    // Later: handle disconnect/reconnect properly.
  });
});

server.listen(PORT, () => {
  console.log(`Ruckus Games server running on http://localhost:${PORT}`);
});
