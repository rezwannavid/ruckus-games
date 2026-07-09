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
  avatarId: number;
  isHost: boolean;
};

type GameParticipant = {
  id: string;
  name: string;
  avatarId?: number;
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
  phase: "role_reveal" | "discussion" | "voting" | "results";
  players: GameParticipant[];
  word: string;
  wordCategory: string;
  roundTimerSeconds: number;
  startedAt: string;
  endsAt: string;
  imposterPlayerId: string;
  imposterPlayerIds: string[];
  readyPlayerIds: string[];
  votes: Record<string, string>;
  round: number;
  numberOfImposters: number;
  answerRevealed: boolean;
};

type ImposterCodeGameState = {
  type: "imposter-code";
  playMode: "multiplayer" | "single_device";
  phase: "answering" | "answers" | "voting" | "results";
  players: GameParticipant[];
  question: string;
  imposterQuestion: string;
  questionPack: string;
  roundTimerSeconds: number;
  startedAt: string;
  endsAt: string;
  imposterPlayerId: string;
  imposterPlayerIds: string[];
  numberOfImposters: number;
  answers: Record<string, string>;
  votes: Record<string, string>;
  round: number;
  answerRevealed: boolean;
};

type WavelengthGameState = {
  type: "wavelength";
  playMode: "multiplayer" | "single_device";
  phase: "clue" | "guess" | "results";
  players: GameParticipant[];
  clueGiverId: string;
  clueGiverName: string;
  scaleLeft: string;
  scaleRight: string;
  scalePack: string;
  secretNumber: number;
  clue: string | null;
  guess: number | null;
  score: number;
  round: number;
};

type GameState = ImposterGameState | ImposterCodeGameState | WavelengthGameState;

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

    const loadedRooms = new Map<string, Room>(parsedData.rooms ?? []);

    for (const [code, room] of loadedRooms) {
      room.players = room.players.map((player, index) => ({
        ...player,
        avatarId: player.avatarId ?? (index % 14) + 1
      }));

      if (room.gameState?.type === "imposter") {
        const legacyState = room.gameState;
        const legacyPhase = String(legacyState.phase);
        legacyState.phase =
          legacyPhase === "playing"
            ? "discussion"
            : legacyPhase === "revealed"
              ? "results"
              : legacyState.phase;
        legacyState.players = legacyState.players.map((player, index) => ({
          ...player,
          avatarId: player.avatarId ?? room.players.find((item) => item.id === player.id)?.avatarId ?? (index % 14) + 1
        }));
        legacyState.readyPlayerIds ??= legacyState.players.map((player) => player.id);
        legacyState.votes ??= {};
        legacyState.round ??= 1;
        legacyState.numberOfImposters ??= legacyState.imposterPlayerIds?.length || 1;
        legacyState.answerRevealed ??= legacyPhase === "revealed";
      }

      loadedRooms.set(code, room);
    }

    return loadedRooms;
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
    slug: "imposter-code",
    name: "Imposter Code",
    description: "Answer prompts, reveal responses, and find the odd one out.",
    minPlayers: 3,
    maxPlayers: 12
  },
  {
    slug: "wavelength",
    name: "Wavelength",
    description: "Give a clue and land closest to the secret number.",
    minPlayers: 2,
    maxPlayers: 12
  }
];

const imposterWordCategories: Record<string, string[]> = {
  places: ["Airport", "Beach", "Cinema", "Hospital", "Library", "Restaurant", "School", "Stadium", "Train Station", "Museum", "Hotel", "Playground", "Supermarket", "Office", "Zoo"],
  food: ["Pizza", "Sushi", "Burger", "Tacos", "Pasta", "Biryani", "Ice Cream", "Pancakes", "Dumplings", "Curry", "Sandwich", "Ramen", "Chocolate", "Salad", "Popcorn"],
  movies: ["Titanic", "Avatar", "Jaws", "The Matrix", "Jurassic Park", "The Lion King", "Frozen", "Spider-Man", "Batman", "Harry Potter", "Shrek", "Toy Story", "Inception", "Gladiator", "Home Alone"],
  objects: ["Backpack", "Camera", "Chair", "Clock", "Headphones", "Laptop", "Phone", "Sunglasses", "Umbrella", "Wallet", "Key", "Mirror", "Pillow", "Toothbrush", "Flashlight"],
  animals: ["Elephant", "Penguin", "Tiger", "Dolphin", "Giraffe", "Kangaroo", "Owl", "Shark", "Panda", "Crocodile", "Rabbit", "Monkey", "Octopus", "Camel", "Wolf"],
  sports: ["Football", "Cricket", "Basketball", "Tennis", "Swimming", "Boxing", "Golf", "Volleyball", "Cycling", "Baseball", "Badminton", "Hockey", "Rugby", "Surfing", "Skiing"],
  jobs: ["Doctor", "Teacher", "Chef", "Pilot", "Designer", "Engineer", "Lawyer", "Photographer", "Firefighter", "Musician", "Actor", "Farmer", "Journalist", "Dentist", "Architect"],
  countries: ["Bangladesh", "Japan", "Brazil", "Canada", "Egypt", "France", "India", "Italy", "Mexico", "Norway", "Spain", "Thailand", "Turkey", "Australia", "South Korea"],
  brands: ["Apple", "Nike", "Samsung", "Lego", "Netflix", "Adidas", "Coca-Cola", "IKEA", "Toyota", "Spotify", "Nintendo", "Google", "Sony", "Rolex", "Tesla"],
  random: ["Rainbow", "Birthday", "Thunder", "Selfie", "Dream", "Elevator", "Karaoke", "Treasure", "Wi-Fi", "Vacation", "Secret", "Magic", "Festival", "Robot", "Midnight"]
};

const imposterCodePromptPacks: Record<string, Array<{ question: string; imposterQuestion: string }>> = {
  casual: [
    { question: "What would you bring to a beach day?", imposterQuestion: "What would you bring to a snowstorm?" },
    { question: "What app do you open when you are bored?", imposterQuestion: "What app do you open when you are lost?" },
    { question: "What object would survive a power cut?", imposterQuestion: "What object would make a power cut worse?" }
  ],
  food: [
    { question: "What food belongs at a birthday party?", imposterQuestion: "What food belongs in a lunchbox?" },
    { question: "What snack disappears first at a hangout?", imposterQuestion: "What snack survives until the end?" },
    { question: "What drink feels refreshing in summer?", imposterQuestion: "What drink feels cozy in winter?" }
  ],
  school: [
    { question: "What subject creates the most homework?", imposterQuestion: "What subject creates the least homework?" },
    { question: "What item saves you before an exam?", imposterQuestion: "What item distracts you before an exam?" },
    { question: "What excuse sounds believable to a teacher?", imposterQuestion: "What excuse sounds suspicious to a teacher?" }
  ],
  work: [
    { question: "What meeting should have been an email?", imposterQuestion: "What email should have been a meeting?" },
    { question: "What tool makes work faster?", imposterQuestion: "What tool makes work slower?" },
    { question: "What office habit is quietly annoying?", imposterQuestion: "What office habit is secretly helpful?" }
  ],
  relationships: [
    { question: "What is a green flag in a friend?", imposterQuestion: "What is a red flag in a friend?" },
    { question: "What gift feels thoughtful?", imposterQuestion: "What gift feels lazy?" },
    { question: "What message is nice to wake up to?", imposterQuestion: "What message is stressful to wake up to?" }
  ],
  travel: [
    { question: "What belongs in a carry-on bag?", imposterQuestion: "What belongs in checked luggage?" },
    { question: "What city activity is worth the money?", imposterQuestion: "What city activity is overrated?" },
    { question: "What makes a road trip better?", imposterQuestion: "What ruins a road trip?" }
  ],
  party: [
    { question: "What game starts a party quickly?", imposterQuestion: "What game slows a party down?" },
    { question: "What song gets everyone moving?", imposterQuestion: "What song clears the room?" },
    { question: "What item should every party have?", imposterQuestion: "What item makes a party awkward?" }
  ],
  deep: [
    { question: "What do people pretend not to care about?", imposterQuestion: "What do people care about too much?" },
    { question: "What makes someone trustworthy?", imposterQuestion: "What makes someone hard to trust?" },
    { question: "What memory would you replay?", imposterQuestion: "What memory would you erase?" }
  ],
  funny: [
    { question: "What animal would be a chaotic roommate?", imposterQuestion: "What animal would be a calm roommate?" },
    { question: "What object would be funniest if it talked?", imposterQuestion: "What object would be terrifying if it talked?" },
    { question: "What job would be hardest to fake?", imposterQuestion: "What job sounds easiest to fake?" }
  ],
  desi: [
    { question: "What snack belongs with cha?", imposterQuestion: "What snack belongs with a cold drink?" },
    { question: "What Eid plan sounds fun?", imposterQuestion: "What Eid plan sounds exhausting?" },
    { question: "What Dhaka traffic survival item helps most?", imposterQuestion: "What item is useless in Dhaka traffic?" }
  ]
};

const wavelengthScalePacks: Record<string, Array<readonly [string, string]>> = {
  casual: [["Cold", "Hot"], ["Safe", "Risky"], ["Cheap", "Expensive"], ["Quiet", "Loud"], ["Boring", "Exciting"]],
  food: [["Street Food", "Fine Dining"], ["Bland", "Spicy"], ["Snack", "Full Meal"], ["Healthy", "Junk Food"], ["Dry", "Saucy"]],
  movies: [["Realistic", "Fantasy"], ["Slow", "Fast"], ["Funny", "Serious"], ["Underrated", "Overrated"], ["Comfort Watch", "Stress Watch"]],
  music: [["Soft", "Loud"], ["Old", "New"], ["Chill", "Hype"], ["Solo Song", "Party Song"], ["Simple", "Dramatic"]],
  school: [["Easy", "Hard"], ["Useful", "Useless"], ["Strict", "Relaxed"], ["Quiet Class", "Chaotic Class"], ["Memorize", "Understand"]],
  work: [["Focused", "Distracting"], ["Quick Task", "Long Task"], ["Helpful", "Annoying"], ["Casual", "Formal"], ["Clear", "Confusing"]],
  relationships: [["Green Flag", "Red Flag"], ["Introvert", "Extrovert"], ["Low Effort", "High Effort"], ["Honest", "Tactful"], ["Relaxing", "Chaotic"]],
  party: [["Awkward", "Fun"], ["Chill", "Wild"], ["Small Group", "Big Crowd"], ["Early Night", "Late Night"], ["Background Song", "Main Character Song"]],
  desi: [["Rickshaw", "Uber"], ["Cha", "Coffee"], ["Calm Bazaar", "Chaotic Bazaar"], ["Home Food", "Restaurant Food"], ["Relaxing Adda", "Loud Adda"]],
  weird: [["Normal", "Weird"], ["Tiny", "Huge"], ["Useful", "Cursed"], ["Cute", "Terrifying"], ["Reasonable", "Unhinged"]]
};

function pickRandomItem<T>(items: readonly T[]) {
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

function getImposterCodePromptList(pack: unknown) {
  const packName = typeof pack === "string" && imposterCodePromptPacks[pack] ? pack : "casual";
  return {
    pack: packName,
    prompts: imposterCodePromptPacks[packName]
  };
}

function getWavelengthScaleList(pack: unknown) {
  const packName = typeof pack === "string" && wavelengthScalePacks[pack] ? pack : "casual";
  return {
    pack: packName,
    scales: wavelengthScalePacks[packName]
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
    name: player.name,
    avatarId: player.avatarId
  }));
}

function getImposterReveal(room: Room, state: ImposterGameState) {
  const imposterIds = state.imposterPlayerIds ?? [state.imposterPlayerId];
  const imposters = state.players.filter((player) => imposterIds.includes(player.id));

  return {
    word: state.word,
    wordCategory: state.wordCategory,
    roundTimerSeconds: state.roundTimerSeconds,
    startedAt: state.startedAt,
    endsAt: state.endsAt,
    imposterPlayerId: imposters[0]?.id ?? state.imposterPlayerId,
    imposterPlayerName: imposters[0]?.name ?? "Unknown Player",
    imposterPlayerIds: imposterIds,
    imposterPlayerNames: imposters.map((player) => player.name),
    votes: state.votes,
    round: state.round
  };
}

function getVoteOutcome(state: ImposterGameState) {
  const totals: Record<string, number> = {};
  Object.values(state.votes).forEach((targetId) => {
    totals[targetId] = (totals[targetId] ?? 0) + 1;
  });
  const highestVoteCount = Math.max(0, ...Object.values(totals));
  const topVotedPlayerIds = Object.entries(totals)
    .filter(([, count]) => count === highestVoteCount)
    .map(([playerId]) => playerId);
  const caughtImposter =
    highestVoteCount > 0 &&
    topVotedPlayerIds.length === 1 &&
    state.imposterPlayerIds.includes(topVotedPlayerIds[0]);

  return { totals, highestVoteCount, topVotedPlayerIds, caughtImposter };
}

function resetImposterRound(state: ImposterGameState) {
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + state.roundTimerSeconds * 1000);

  state.phase = "discussion";
  state.startedAt = startedAt.toISOString();
  state.endsAt = endsAt.toISOString();
  state.readyPlayerIds = state.players.map((player) => player.id);
  state.votes = {};
  state.answerRevealed = false;
  state.round += 1;
}

function createImposterCodeState(
  gameParticipants: GameParticipant[],
  playMode: "multiplayer" | "single_device",
  round = 1,
  numberOfImposters = 1,
  questionPack: unknown = "casual"
): ImposterCodeGameState {
  const { pack, prompts } = getImposterCodePromptList(questionPack);
  const prompt = pickRandomItem(prompts);
  const imposters = pickRandomItems(
    gameParticipants,
    getNumberSetting(numberOfImposters, 1, 1, Math.max(1, gameParticipants.length - 1))
  );
  const startedAt = new Date();
  const roundTimerSeconds = 90;

  return {
    type: "imposter-code",
    playMode,
    phase: "answering",
    players: gameParticipants,
    question: prompt.question,
    imposterQuestion: prompt.imposterQuestion,
    questionPack: pack,
    roundTimerSeconds,
    startedAt: startedAt.toISOString(),
    endsAt: new Date(startedAt.getTime() + roundTimerSeconds * 1000).toISOString(),
    imposterPlayerId: imposters[0].id,
    imposterPlayerIds: imposters.map((imposter) => imposter.id),
    numberOfImposters: imposters.length,
    answers: {},
    votes: {},
    round,
    answerRevealed: false
  };
}

function createWavelengthState(
  gameParticipants: GameParticipant[],
  playMode: "multiplayer" | "single_device",
  round = 1,
  score = 0,
  scalePack: unknown = "casual"
): WavelengthGameState {
  const clueGiver = gameParticipants[(round - 1) % gameParticipants.length];
  const { pack, scales } = getWavelengthScaleList(scalePack);
  const [scaleLeft, scaleRight] = pickRandomItem(scales);

  return {
    type: "wavelength",
    playMode,
    phase: "clue",
    players: gameParticipants,
    clueGiverId: clueGiver.id,
    clueGiverName: clueGiver.name,
    scaleLeft,
    scaleRight,
    scalePack: pack,
    secretNumber: Math.floor(Math.random() * 101),
    clue: null,
    guess: null,
    score,
    round
  };
}

function getImposterCodeOutcome(state: ImposterCodeGameState) {
  const totals: Record<string, number> = {};
  Object.values(state.votes).forEach((targetId) => {
    totals[targetId] = (totals[targetId] ?? 0) + 1;
  });
  const highestVoteCount = Math.max(0, ...Object.values(totals));
  const topVotedPlayerIds = Object.entries(totals)
    .filter(([, count]) => count === highestVoteCount)
    .map(([playerId]) => playerId);
  const caughtImposter =
    highestVoteCount > 0 &&
    topVotedPlayerIds.length === 1 &&
    state.imposterPlayerIds.includes(topVotedPlayerIds[0]);

  return { totals, highestVoteCount, topVotedPlayerIds, caughtImposter };
}

function getWavelengthRoundScore(secretNumber: number, guess: number | null) {
  if (guess === null) return 0;
  const distance = Math.abs(secretNumber - guess);
  return Math.max(0, 10 - Math.floor(distance / 5));
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
  const { playerName, roomName, avatarId } = req.body as {
    playerName?: string;
    roomName?: string;
    avatarId?: number;
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
    avatarId: getNumberSetting(avatarId, 1, 1, 14),
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
  const { playerName, avatarId } = req.body as {
    playerName?: string;
    avatarId?: number;
  };

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
    avatarId: getNumberSetting(avatarId, 1, 1, 14),
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

app.delete("/rooms/:code/players/:targetPlayerId", (req, res) => {
  const code = req.params.code.toUpperCase();
  const targetPlayerId = req.params.targetPlayerId;
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ message: "Room not found." });
  const requester = room.players.find((player) => player.id === playerId);
  if (!requester?.isHost) {
    return res.status(403).json({ message: "Only the room owner can remove players." });
  }

  const target = room.players.find((player) => player.id === targetPlayerId);
  if (!target) return res.status(404).json({ message: "Player not found." });
  if (target.isHost) {
    return res.status(400).json({ message: "The room owner cannot be removed." });
  }

  room.players = room.players.filter((player) => player.id !== targetPlayerId);
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:removed", {
    playerId: targetPlayerId,
    message: "The room owner removed you."
  });
  io.to(code).emit("room:state", room);
  return res.json({ room });
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
  const gameParticipants: GameParticipant[] =
    ["imposter", "imposter-code", "wavelength"].includes(room.selectedGame.slug) && playMode === "single_device"
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
      phase: "role_reveal",
      players: gameParticipants,
      word,
      wordCategory,
      roundTimerSeconds,
      startedAt: startedAt.toISOString(),
      endsAt: endsAt.toISOString(),
      imposterPlayerId: imposters[0].id,
      imposterPlayerIds: imposters.map((imposter) => imposter.id),
      readyPlayerIds: [],
      votes: {},
      round: 1,
      numberOfImposters,
      answerRevealed: false
    };
  } else if (room.selectedGame.slug === "imposter-code") {
    const maxImposters = Math.max(1, gameParticipants.length - 1);
    const numberOfImposters = getNumberSetting(
      settings?.numberOfImposters,
      1,
      1,
      maxImposters
    );
    room.gameState = createImposterCodeState(
      gameParticipants,
      playMode,
      1,
      numberOfImposters,
      settings?.questionPack
    );
  } else if (room.selectedGame.slug === "wavelength") {
    room.gameState = createWavelengthState(
      gameParticipants,
      playMode,
      1,
      0,
      settings?.scalePack
    );
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

app.post("/rooms/:code/games/imposter/ready", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!playerId) return res.status(400).json({ message: "Player ID is required." });
  if (!room.gameState || room.gameState.type !== "imposter") {
    return res.status(400).json({ message: "Imposter game state not available." });
  }
  if (!room.gameState.players.some((player) => player.id === playerId)) {
    return res.status(404).json({ message: "Player not found in this game." });
  }
  if (!room.gameState.readyPlayerIds.includes(playerId)) {
    room.gameState.readyPlayerIds.push(playerId);
  }
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:state", room);

  return res.json({ room, readyCount: room.gameState.readyPlayerIds.length });
});

app.post("/rooms/:code/games/imposter/start-round", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can start the round." });
  if (!room.gameState || room.gameState.type !== "imposter") {
    return res.status(400).json({ message: "Imposter game state not available." });
  }
  if (room.gameState.readyPlayerIds.length < room.gameState.players.length) {
    return res.status(400).json({ message: "Wait until every player is ready." });
  }

  const startedAt = new Date();
  room.gameState.phase = "discussion";
  room.gameState.startedAt = startedAt.toISOString();
  room.gameState.endsAt = new Date(
    startedAt.getTime() + room.gameState.roundTimerSeconds * 1000
  ).toISOString();
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:state", room);

  return res.json({ room });
});

app.post("/rooms/:code/games/imposter/start-voting", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can start voting." });
  if (!room.gameState || room.gameState.type !== "imposter") {
    return res.status(400).json({ message: "Imposter game state not available." });
  }

  room.gameState.phase = "voting";
  room.gameState.votes = {};
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:state", room);

  return res.json({ room });
});

app.post("/rooms/:code/games/imposter/vote", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, targetPlayerId } = req.body as {
    playerId?: string;
    targetPlayerId?: string;
  };
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!playerId || !targetPlayerId) {
    return res.status(400).json({ message: "Player and vote target are required." });
  }
  if (!room.gameState || room.gameState.type !== "imposter" || room.gameState.phase !== "voting") {
    return res.status(400).json({ message: "Voting is not active." });
  }
  if (!room.gameState.players.some((player) => player.id === playerId)) {
    return res.status(404).json({ message: "Player not found in this game." });
  }
  if (!room.gameState.players.some((player) => player.id === targetPlayerId)) {
    return res.status(404).json({ message: "Vote target not found." });
  }

  room.gameState.votes[playerId] = targetPlayerId;
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:state", room);

  return res.json({ room, voteCount: Object.keys(room.gameState.votes).length });
});

app.post("/rooms/:code/games/imposter/next-round", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can start another round." });
  if (!room.gameState || room.gameState.type !== "imposter") {
    return res.status(400).json({ message: "Imposter game state not available." });
  }

  resetImposterRound(room.gameState);
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:state", room);

  return res.json({ room });
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

  const outcome = getVoteOutcome(room.gameState);
  room.gameState.phase = "results";
  room.gameState.answerRevealed = outcome.caughtImposter;

  rooms.set(code, room);
  saveRooms();

  io.to(code).emit("room:state", room);

  return res.json({
    message: outcome.caughtImposter ? "The imposter was voted out." : "The vote missed the imposter.",
    room,
    outcome
  });
});

app.post("/rooms/:code/games/imposter/reveal-answer", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can reveal the imposter." });
  if (!room.gameState || room.gameState.type !== "imposter" || room.gameState.phase !== "results") {
    return res.status(400).json({ message: "Results are not available." });
  }

  room.gameState.answerRevealed = true;
  rooms.set(code, room);
  saveRooms();
  const reveal = getImposterReveal(room, room.gameState);
  io.to(code).emit("imposter:revealed", reveal);
  io.to(code).emit("room:state", room);
  return res.json({ room, reveal });
});

app.post("/rooms/:code/games/imposter-code/submit-answer", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, answer } = req.body as { playerId?: string; answer?: string };
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!playerId || !answer?.trim()) return res.status(400).json({ message: "Answer is required." });
  if (!room.gameState || room.gameState.type !== "imposter-code" || room.gameState.phase !== "answering") {
    return res.status(400).json({ message: "Answers are not being collected." });
  }
  if (!room.gameState.players.some((player) => player.id === playerId)) {
    return res.status(404).json({ message: "Player not found in this game." });
  }

  room.gameState.answers[playerId] = answer.trim().slice(0, 120);
  if (Object.keys(room.gameState.answers).length >= room.gameState.players.length) {
    room.gameState.phase = "answers";
  }
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:state", room);
  return res.json({ room });
});

app.post("/rooms/:code/games/imposter-code/start-voting", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can start voting." });
  if (!room.gameState || room.gameState.type !== "imposter-code" || room.gameState.phase !== "answers") {
    return res.status(400).json({ message: "Answers are not ready." });
  }

  room.gameState.phase = "voting";
  room.gameState.votes = {};
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:state", room);
  return res.json({ room });
});

app.post("/rooms/:code/games/imposter-code/vote", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, targetPlayerId } = req.body as { playerId?: string; targetPlayerId?: string };
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!playerId || !targetPlayerId) return res.status(400).json({ message: "Player and vote target are required." });
  if (!room.gameState || room.gameState.type !== "imposter-code" || room.gameState.phase !== "voting") {
    return res.status(400).json({ message: "Voting is not active." });
  }
  if (!room.gameState.players.some((player) => player.id === playerId)) {
    return res.status(404).json({ message: "Player not found in this game." });
  }
  if (!room.gameState.players.some((player) => player.id === targetPlayerId)) {
    return res.status(404).json({ message: "Vote target not found." });
  }

  room.gameState.votes[playerId] = targetPlayerId;
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:state", room);
  return res.json({ room });
});

app.post("/rooms/:code/games/imposter-code/reveal", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can reveal results." });
  if (!room.gameState || room.gameState.type !== "imposter-code" || room.gameState.phase !== "voting") {
    return res.status(400).json({ message: "Voting is not active." });
  }
  if (Object.keys(room.gameState.votes).length < room.gameState.players.length) {
    return res.status(400).json({ message: "Wait until every player votes." });
  }

  const outcome = getImposterCodeOutcome(room.gameState);
  room.gameState.phase = "results";
  room.gameState.answerRevealed = outcome.caughtImposter;
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:state", room);
  return res.json({ room, outcome });
});

app.post("/rooms/:code/games/imposter-code/reveal-answer", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can reveal the answer." });
  if (!room.gameState || room.gameState.type !== "imposter-code" || room.gameState.phase !== "results") {
    return res.status(400).json({ message: "Results are not available." });
  }

  room.gameState.answerRevealed = true;
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:state", room);
  return res.json({ room });
});

app.post("/rooms/:code/games/imposter-code/next-round", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can start another round." });
  if (!room.gameState || room.gameState.type !== "imposter-code") {
    return res.status(400).json({ message: "Imposter Code state not available." });
  }

  room.gameState = createImposterCodeState(
    room.gameState.players,
    room.gameState.playMode,
    room.gameState.round + 1,
    room.gameState.numberOfImposters,
    room.gameState.questionPack
  );
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:state", room);
  return res.json({ room });
});

app.post("/rooms/:code/games/wavelength/submit-clue", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, clue } = req.body as { playerId?: string; clue?: string };
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!playerId || !clue?.trim()) return res.status(400).json({ message: "Clue is required." });
  if (!room.gameState || room.gameState.type !== "wavelength" || room.gameState.phase !== "clue") {
    return res.status(400).json({ message: "Clues are not being collected." });
  }
  if (room.gameState.clueGiverId !== playerId) {
    return res.status(403).json({ message: "Only the clue-giver can submit the clue." });
  }

  room.gameState.clue = clue.trim().slice(0, 80);
  room.gameState.phase = "guess";
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:state", room);
  return res.json({ room });
});

app.post("/rooms/:code/games/wavelength/submit-guess", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, guess } = req.body as { playerId?: string; guess?: number };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can lock the guess." });
  if (!room.gameState || room.gameState.type !== "wavelength" || room.gameState.phase !== "guess") {
    return res.status(400).json({ message: "Guessing is not active." });
  }

  const nextGuess = getNumberSetting(guess, 50, 0, 100);
  const roundScore = getWavelengthRoundScore(room.gameState.secretNumber, nextGuess);
  room.gameState.guess = nextGuess;
  room.gameState.score += roundScore;
  room.gameState.phase = "results";
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:state", room);
  return res.json({ room, roundScore });
});

app.post("/rooms/:code/games/wavelength/next-round", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can start another round." });
  if (!room.gameState || room.gameState.type !== "wavelength") {
    return res.status(400).json({ message: "Wavelength state not available." });
  }

  room.gameState = createWavelengthState(
    room.gameState.players,
    room.gameState.playMode,
    room.gameState.round + 1,
    room.gameState.score,
    room.gameState.scalePack
  );
  rooms.set(code, room);
  saveRooms();
  io.to(code).emit("room:state", room);
  return res.json({ room });
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

    const sharedState = {
      readyPlayerIds: room.gameState.readyPlayerIds,
      votes: room.gameState.votes,
      round: room.gameState.round,
      answerRevealed: room.gameState.answerRevealed ?? false
    };

    if (room.gameState.phase === "results") {
      const outcome = getVoteOutcome(room.gameState);
      const mayRevealAnswer = room.gameState.answerRevealed || outcome.caughtImposter;
      return res.json({
        gameSlug: room.selectedGame.slug,
        playMode: room.gameState.playMode,
        players: gameParticipants,
        phase: room.gameState.phase,
        role: isImposter ? "imposter" : "player",
        word: mayRevealAnswer || !isImposter ? room.gameState.word : null,
        wordCategory: room.gameState.wordCategory,
        roundTimerSeconds: room.gameState.roundTimerSeconds,
        startedAt: room.gameState.startedAt,
        endsAt: room.gameState.endsAt,
        imposterPlayerId: mayRevealAnswer ? imposter?.id ?? room.gameState.imposterPlayerId : null,
        imposterPlayerName: mayRevealAnswer ? imposter?.name ?? "Unknown Player" : null,
        imposterPlayerIds: mayRevealAnswer ? imposterIds : null,
        imposterPlayerNames: mayRevealAnswer ? imposters.map((imposterPlayer) => imposterPlayer.name) : null,
        caughtImposter: outcome.caughtImposter,
        topVotedPlayerIds: outcome.topVotedPlayerIds,
        ...sharedState
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
      imposterPlayerNames: null,
      ...sharedState
    });
  }

  if (room.gameState.type === "imposter-code") {
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
    const outcome = room.gameState.phase === "results" ? getImposterCodeOutcome(room.gameState) : null;
    const answerVisible = Boolean(room.gameState.answerRevealed || outcome?.caughtImposter);
    const imposters = gameParticipants.filter((gameParticipant) =>
      imposterIds.includes(gameParticipant.id)
    );

    return res.json({
      gameSlug: room.selectedGame.slug,
      playMode: room.gameState.playMode,
      type: room.gameState.type,
      players: gameParticipants,
      phase: room.gameState.phase,
      role: isImposter ? "imposter" : "player",
      prompt: isImposter ? room.gameState.imposterQuestion : room.gameState.question,
      question: room.gameState.phase === "answering" ? null : room.gameState.question,
      imposterQuestion: answerVisible ? room.gameState.imposterQuestion : null,
      questionPack: room.gameState.questionPack,
      numberOfImposters: room.gameState.numberOfImposters,
      roundTimerSeconds: room.gameState.roundTimerSeconds,
      startedAt: room.gameState.startedAt,
      endsAt: room.gameState.endsAt,
      answers: room.gameState.phase === "answering" ? {} : room.gameState.answers,
      votes: room.gameState.votes,
      round: room.gameState.round,
      answerRevealed: room.gameState.answerRevealed,
      imposterPlayerIds: answerVisible ? imposterIds : null,
      imposterPlayerNames: answerVisible ? imposters.map((imposterPlayer) => imposterPlayer.name) : null,
      caughtImposter: outcome?.caughtImposter ?? false,
      topVotedPlayerIds: outcome?.topVotedPlayerIds ?? []
    });
  }

  if (room.gameState.type === "wavelength") {
    const gameParticipants = room.gameState.players ?? getRoomParticipants(room);
    const player =
      room.gameState.playMode === "single_device"
        ? gameParticipants.find((gameParticipant) => gameParticipant.id === playerId)
        : roomPlayer;

    if (!player) {
      return res.status(404).json({ message: "Player not found in this game." });
    }

    const isClueGiver = room.gameState.clueGiverId === player.id;
    return res.json({
      gameSlug: room.selectedGame.slug,
      playMode: room.gameState.playMode,
      type: room.gameState.type,
      players: gameParticipants,
      phase: room.gameState.phase,
      clueGiverId: room.gameState.clueGiverId,
      clueGiverName: room.gameState.clueGiverName,
      isClueGiver,
      scaleLeft: room.gameState.scaleLeft,
      scaleRight: room.gameState.scaleRight,
      scalePack: room.gameState.scalePack,
      secretNumber: isClueGiver || room.gameState.phase === "results" ? room.gameState.secretNumber : null,
      clue: room.gameState.clue,
      guess: room.gameState.guess,
      score: room.gameState.score,
      round: room.gameState.round
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
    ,readyPlayerIds: room.gameState.readyPlayerIds,
    votes: room.gameState.votes,
    round: room.gameState.round
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
