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

app.use((_req, res, next) => {
  const sendJson = res.json.bind(res);
  res.json = ((payload: unknown) => sendJson(sanitizeResponsePayload(payload))) as typeof res.json;
  next();
});

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
  status?: "active" | "eliminated" | "disconnected" | "spectating";
};

type GameWinner = "players" | "imposters" | null;

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
  eliminatedPlayerIds: string[];
  usedPromptIds: string[];
  currentPromptId: string;
  gameOver: boolean;
  winner: GameWinner;
  lastEliminatedPlayerId: string | null;
  lastGuessWasImposter: boolean;
  lastTopVotedPlayerIds: string[];
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
  eliminatedPlayerIds: string[];
  usedPromptIds: string[];
  currentPromptId: string;
  gameOver: boolean;
  winner: GameWinner;
  lastEliminatedPlayerId: string | null;
  lastGuessWasImposter: boolean;
  lastTopVotedPlayerIds: string[];
};

type WavelengthRoundSummary = {
  round: number;
  target: number;
  guess: number | null;
  guesserId: string | null;
  distance: number | null;
  roundScore: number;
  clueGiverPoints: number;
  activeTeamId: "team-1" | "team-2" | null;
  guesses: Array<{ playerId: string; guess: number; distance: number; points: number }>;
};

type WavelengthGameState = {
  type: "wavelength";
  playMode: "multiplayer" | "single_device";
  phase: "announcement" | "clue" | "guess" | "results";
  players: GameParticipant[];
  mode: "teams" | "single";
  clueGiverId: string;
  clueGiverName: string;
  activeTeamId: "team-1" | "team-2" | null;
  teams: Record<"team-1" | "team-2", string[]>;
  teamNames: Record<"team-1" | "team-2", string>;
  scaleLeft: string;
  scaleRight: string;
  scalePack: string;
  secretNumber: number;
  clue: string | null;
  guess: number | null;
  guesses: Record<string, number>;
  acceptedGuessPlayerId: string | null;
  roundTimerSeconds: number;
  startedAt: string;
  endsAt: string;
  score: number;
  teamScores: Record<"team-1" | "team-2", number>;
  playerScores: Record<string, number>;
  maxRounds: number;
  round: number;
  usedPromptIds: string[];
  currentPromptId: string;
  roundHistory: WavelengthRoundSummary[];
  lastRoundScore: number;
  lastClueGiverPoints: number;
  isComplete: boolean;
};

type GameState = ImposterGameState | ImposterCodeGameState | WavelengthGameState;

type PromptPack<T> = {
  name: string;
  subcategories: Record<string, { name: string; items: T[] }>;
};

type IdentifiedPrompt<T> = { id: string; item: T };

type Room = {
  code: string;
  name?: string;
  players: Player[];
  status: "waiting" | "in_game" | "ended";
  selectedGame?: Game;
  gameState?: GameState;
};

function getPublicRoom(room: Room): Room {
  const publicRoom = structuredClone(room);
  const state = publicRoom.gameState;
  if (!state) return publicRoom;

  if (state.type === "imposter") {
    state.word = "";
    state.imposterPlayerId = "";
    state.imposterPlayerIds = [];
  } else if (state.type === "imposter-code") {
    state.question = "";
    state.imposterQuestion = "";
    state.imposterPlayerId = "";
    state.imposterPlayerIds = [];
  } else {
    state.secretNumber = -1;
  }
  return publicRoom;
}

function sanitizeResponsePayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("room" in payload)) return payload;
  const body = payload as Record<string, unknown> & { room?: Room };
  return body.room ? { ...body, room: getPublicRoom(body.room) } : payload;
}

function emitRoomState(code: string, room: Room) {
  io.to(code).emit("room:state", getPublicRoom(room));
}

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
        legacyState.eliminatedPlayerIds ??= [];
        legacyState.usedPromptIds ??= [];
        legacyState.currentPromptId ??= `legacy:${legacyState.wordCategory}:${legacyState.word}`;
        legacyState.gameOver ??= false;
        legacyState.winner ??= null;
        legacyState.lastEliminatedPlayerId ??= null;
        legacyState.lastGuessWasImposter ??= false;
        legacyState.lastTopVotedPlayerIds ??= [];
      }

      if (room.gameState?.type === "imposter-code") {
        room.gameState.eliminatedPlayerIds ??= [];
        room.gameState.usedPromptIds ??= [];
        room.gameState.currentPromptId ??= `legacy:${room.gameState.questionPack}:${room.gameState.question}`;
        room.gameState.gameOver ??= false;
        room.gameState.winner ??= null;
        room.gameState.lastEliminatedPlayerId ??= null;
        room.gameState.lastGuessWasImposter ??= false;
        room.gameState.lastTopVotedPlayerIds ??= [];
      }

      if (room.gameState?.type === "wavelength") {
        if ((room.gameState.mode as string) === "everyone") room.gameState.mode = "single";
        room.gameState.teamNames ??= getTeamNames(room.gameState.players, room.gameState.teams);
        room.gameState.usedPromptIds ??= [];
        room.gameState.currentPromptId ??= `legacy:${room.gameState.scalePack}:${room.gameState.scaleLeft}:${room.gameState.scaleRight}`;
        room.gameState.roundHistory ??= [];
        room.gameState.lastRoundScore ??= 0;
        room.gameState.lastClueGiverPoints ??= 0;
        room.gameState.acceptedGuessPlayerId ??= null;
        room.gameState.isComplete ??= room.gameState.round >= room.gameState.maxRounds;
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
const connectedPlayerSockets = new Map<string, Set<string>>();

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
  places: ["Airport", "Beach", "Cinema", "Hospital", "Library", "Restaurant", "School", "Stadium", "Train Station", "Museum", "Hotel", "Playground", "Supermarket", "Office", "Zoo", "Mosque", "Rooftop", "Shopping Mall", "Wedding Hall", "Bus Stop", "Dhaka University", "Cox's Bazar", "Old Dhaka", "Banani", "Gulshan"],
  food: ["Pizza", "Sushi", "Burger", "Tacos", "Pasta", "Biryani", "Ice Cream", "Pancakes", "Dumplings", "Curry", "Sandwich", "Ramen", "Chocolate", "Salad", "Popcorn", "Fuchka", "Chotpoti", "Kacchi", "Tehari", "Haleem", "Singara", "Samosa", "Jhalmuri", "Rasgulla", "Mishti Doi"],
  movies: ["Titanic", "Avatar", "Jaws", "The Matrix", "Jurassic Park", "The Lion King", "Frozen", "Spider-Man", "Batman", "Harry Potter", "Shrek", "Toy Story", "Inception", "Gladiator", "Home Alone", "3 Idiots", "Pathaan", "Coco", "Finding Nemo", "Inside Out"],
  objects: ["Backpack", "Camera", "Chair", "Clock", "Headphones", "Laptop", "Phone", "Sunglasses", "Umbrella", "Wallet", "Key", "Mirror", "Pillow", "Toothbrush", "Flashlight", "Charger", "Remote", "Water Bottle", "Notebook", "Power Bank", "Tiffin Box", "Prayer Mat", "Rickshaw Bell", "Cricket Bat", "Ceiling Fan"],
  animals: ["Elephant", "Penguin", "Tiger", "Dolphin", "Giraffe", "Kangaroo", "Owl", "Shark", "Panda", "Crocodile", "Rabbit", "Monkey", "Octopus", "Camel", "Wolf", "Cat", "Dog", "Cow", "Goat", "Kingfisher", "Hilsa"],
  sports: ["Football", "Cricket", "Basketball", "Tennis", "Swimming", "Boxing", "Golf", "Volleyball", "Cycling", "Baseball", "Badminton", "Hockey", "Rugby", "Surfing", "Skiing", "Table Tennis", "Kabaddi", "Carrom", "Chess", "Futsal"],
  jobs: ["Doctor", "Teacher", "Chef", "Pilot", "Designer", "Engineer", "Lawyer", "Photographer", "Firefighter", "Musician", "Actor", "Farmer", "Journalist", "Dentist", "Architect", "YouTuber", "Shopkeeper", "Driver", "Banker", "Developer", "Cricketer"],
  countries: ["Bangladesh", "Japan", "Brazil", "Canada", "Egypt", "France", "India", "Italy", "Mexico", "Norway", "Spain", "Thailand", "Turkey", "Australia", "South Korea", "Malaysia", "Nepal", "Indonesia", "Germany", "Argentina"],
  brands: ["Apple", "Nike", "Samsung", "Lego", "Netflix", "Adidas", "Coca-Cola", "IKEA", "Toyota", "Spotify", "Nintendo", "Google", "Sony", "Rolex", "Tesla", "bKash", "Pathao", "Foodpanda", "Aarong", "Bata"],
  actions: ["Cooking", "Dancing", "Sleeping", "Arguing", "Singing", "Pranking", "Studying", "Shopping", "Scrolling", "Gaming", "Cleaning", "Running", "Texting", "Daydreaming", "Negotiating"],
  vibes: ["Awkward", "Chaotic", "Cozy", "Suspicious", "Fancy", "Lazy", "Dramatic", "Confident", "Nervous", "Annoyed", "Romantic", "Competitive", "Sleepy", "Lucky", "Embarrassed"],
  social: ["First Date", "Group Chat", "Family Dinner", "Class Presentation", "Office Meeting", "Wedding Invite", "Birthday Surprise", "Exam Hall", "Traffic Jam", "Elevator Silence", "Friend's Secret", "Missed Call", "Late Reply", "Adda", "Iftar Plan"],
  random: ["Rainbow", "Birthday", "Thunder", "Selfie", "Dream", "Elevator", "Karaoke", "Treasure", "Wi-Fi", "Vacation", "Secret", "Magic", "Festival", "Robot", "Midnight"]
};

const imposterWordPacks: Record<string, PromptPack<string>> = {
  classic: {
    name: "Classic",
    subcategories: {
      objects: { name: "Things", items: imposterWordCategories.objects },
      places: { name: "Places", items: imposterWordCategories.places.filter((word) => !["Dhaka University", "Cox's Bazar", "Old Dhaka", "Banani", "Gulshan"].includes(word)) },
      food: { name: "Food", items: imposterWordCategories.food.filter((word) => !["Fuchka", "Chotpoti", "Kacchi", "Tehari", "Haleem", "Singara", "Samosa", "Jhalmuri", "Rasgulla", "Mishti Doi"].includes(word)) },
      animals: { name: "Animals", items: imposterWordCategories.animals },
      actions: { name: "Actions", items: imposterWordCategories.actions },
      social: { name: "Social", items: imposterWordCategories.social.filter((word) => !["Adda", "Iftar Plan"].includes(word)) }
    }
  },
  desi: {
    name: "Desi",
    subcategories: {
      dhaka: { name: "Dhaka", items: ["Old Dhaka", "Dhanmondi", "Gulshan", "Banani", "Bashundhara", "Jamuna Future Park", "New Market", "Farmgate", "Mirpur", "Hatirjheel", "CNG", "Rickshaw", "Traffic Jam", "Metro Rail", "Foodpanda Rider"] },
      food: { name: "Bangladeshi Food", items: ["Fuchka", "Chotpoti", "Kacchi", "Tehari", "Haleem", "Singara", "Samosa", "Jhalmuri", "Rasgulla", "Mishti Doi", "Panta Bhat", "Hilsa Fry", "Cha", "Naan", "Borhani"] },
      eid: { name: "Eid", items: ["Eid Salami", "Panjabi", "Mehendi", "Eid Namaz", "Shemai", "Cow Haat", "Family Photo", "New Clothes", "Iftar Plan", "Eid Traffic"] },
      school: { name: "School", items: ["Tiffin Box", "Coaching Center", "Exam Hall", "Class Captain", "Private Tutor", "School Van", "Report Card", "Assembly", "Dhaka University", "Campus Adda"] },
      family: { name: "Family", items: ["Aunty", "Cousin", "Family Dinner", "Wedding Invite", "Biye Bari", "Gaye Holud", "Nosy Relative", "Family WhatsApp", "Village House", "Rooftop Adda"] },
      cricket: { name: "Cricket", items: ["Cricket Bat", "Tape Tennis", "Sakib", "Mirpur Stadium", "Six", "Run Out", "Street Cricket", "Powerplay", "World Cup Match", "Tea Break"] }
    }
  }
};

const imposterCodePromptPacks: Record<string, PromptPack<{ question: string; imposterQuestion: string }>> = {
  casual: {
    name: "Casual",
    subcategories: {
      objects: { name: "Objects", items: [
        { question: "What would you bring to a beach day?", imposterQuestion: "What would you bring to a snowstorm?" },
        { question: "What object would survive a power cut?", imposterQuestion: "What object would make a power cut worse?" },
        { question: "What item belongs in every backpack?", imposterQuestion: "What item should never be in a backpack?" }
      ] },
      internet: { name: "Internet", items: [
        { question: "What app do you open when you are bored?", imposterQuestion: "What app do you open when you are lost?" },
        { question: "What meme format always works?", imposterQuestion: "What meme format is overused?" },
        { question: "What online habit is harmless?", imposterQuestion: "What online habit is suspicious?" }
      ] },
      funny: { name: "Funny", items: [
        { question: "What animal would be a chaotic roommate?", imposterQuestion: "What animal would be a calm roommate?" },
        { question: "What object would be funniest if it talked?", imposterQuestion: "What object would be terrifying if it talked?" },
        { question: "What job would be hardest to fake?", imposterQuestion: "What job sounds easiest to fake?" }
      ] }
    }
  },
  life: {
    name: "Life",
    subcategories: {
      food: { name: "Food", items: [
        { question: "What food belongs at a birthday party?", imposterQuestion: "What food belongs in a lunchbox?" },
        { question: "What snack disappears first at a hangout?", imposterQuestion: "What snack survives until the end?" },
        { question: "What drink feels refreshing in summer?", imposterQuestion: "What drink feels cozy in winter?" }
      ] },
      school: { name: "School", items: [
        { question: "What subject creates the most homework?", imposterQuestion: "What subject creates the least homework?" },
        { question: "What item saves you before an exam?", imposterQuestion: "What item distracts you before an exam?" },
        { question: "What excuse sounds believable to a teacher?", imposterQuestion: "What excuse sounds suspicious to a teacher?" }
      ] },
      work: { name: "Work", items: [
        { question: "What meeting should have been an email?", imposterQuestion: "What email should have been a meeting?" },
        { question: "What tool makes work faster?", imposterQuestion: "What tool makes work slower?" },
        { question: "What office habit is quietly annoying?", imposterQuestion: "What office habit is secretly helpful?" }
      ] },
      relationships: { name: "Friends", items: [
        { question: "What is a green flag in a friend?", imposterQuestion: "What is a red flag in a friend?" },
        { question: "What gift feels thoughtful?", imposterQuestion: "What gift feels lazy?" },
        { question: "What message is nice to wake up to?", imposterQuestion: "What message is stressful to wake up to?" }
      ] }
    }
  },
  desi: {
    name: "Desi",
    subcategories: {
      food: { name: "Food", items: [
        { question: "What snack belongs with cha?", imposterQuestion: "What snack belongs with a cold drink?" },
        { question: "What food disappears first at a dawath?", imposterQuestion: "What food is always left over at a dawath?" },
        { question: "What street food is worth waiting for?", imposterQuestion: "What street food is risky before a long ride?" }
      ] },
      dhaka: { name: "Dhaka", items: [
        { question: "What Dhaka traffic survival item helps most?", imposterQuestion: "What item is useless in Dhaka traffic?" },
        { question: "Where would you meet friends in Dhaka?", imposterQuestion: "Where would you avoid during rush hour?" },
        { question: "What makes a rickshaw ride better?", imposterQuestion: "What makes a CNG ride worse?" }
      ] },
      eid: { name: "Eid", items: [
        { question: "What Eid plan sounds fun?", imposterQuestion: "What Eid plan sounds exhausting?" },
        { question: "What should you wear on Eid morning?", imposterQuestion: "What should you never wear to Eid dawath?" },
        { question: "What is the best Eid snack?", imposterQuestion: "What is the most overrated Eid snack?" }
      ] },
      family: { name: "Family", items: [
        { question: "What question do relatives always ask?", imposterQuestion: "What question do relatives avoid asking?" },
        { question: "What makes a family wedding fun?", imposterQuestion: "What makes a family wedding stressful?" },
        { question: "What childhood memory feels very Bangladeshi?", imposterQuestion: "What childhood memory feels very foreign?" }
      ] }
    }
  }
};

const wavelengthScalePacks: Record<string, PromptPack<readonly [string, string]>> = {
  casual: {
    name: "Casual",
    subcategories: {
      simple: { name: "Simple", items: [["Cold", "Hot"], ["Safe", "Risky"], ["Cheap", "Expensive"], ["Quiet", "Loud"], ["Boring", "Exciting"]] },
      people: { name: "People", items: [["Introvert", "Extrovert"], ["Trustworthy", "Suspicious"], ["Low Effort", "High Effort"], ["Honest", "Tactful"], ["Relaxing", "Chaotic"]] },
      weird: { name: "Weird", items: [["Normal", "Weird"], ["Tiny", "Huge"], ["Useful", "Cursed"], ["Cute", "Terrifying"], ["Reasonable", "Unhinged"]] }
    }
  },
  culture: {
    name: "Culture",
    subcategories: {
      food: { name: "Food", items: [["Street Food", "Fine Dining"], ["Bland", "Spicy"], ["Snack", "Full Meal"], ["Healthy", "Junk Food"], ["Dry", "Saucy"]] },
      movies: { name: "Movies", items: [["Realistic", "Fantasy"], ["Slow", "Fast"], ["Funny", "Serious"], ["Underrated", "Overrated"], ["Comfort Watch", "Stress Watch"]] },
      music: { name: "Music", items: [["Soft", "Loud"], ["Old", "New"], ["Chill", "Hype"], ["Solo Song", "Party Song"], ["Simple", "Dramatic"]] }
    }
  },
  desi: {
    name: "Desi",
    subcategories: {
      dhaka: { name: "Dhaka", items: [["Rickshaw", "Uber"], ["Calm Road", "Traffic Jam"], ["Old Dhaka", "Gulshan"], ["Cheap Ride", "Expensive Ride"], ["Peaceful Bazaar", "Chaotic Bazaar"]] },
      food: { name: "Food", items: [["Cha", "Coffee"], ["Fuchka", "Fine Dining"], ["Mild", "Jhal"], ["Home Food", "Restaurant Food"], ["Dry Snack", "Messy Snack"]] },
      social: { name: "Social", items: [["Relaxing Adda", "Loud Adda"], ["Small Dawath", "Huge Wedding"], ["Polite Relative", "Nosy Relative"], ["Village", "City"], ["Childhood Nostalgia", "Adult Stress"]] },
      student: { name: "Student", items: [["Easy Exam", "Impossible Exam"], ["Helpful Coaching", "Useless Coaching"], ["Quiet Class", "Chaotic Class"], ["Good Tiffin", "Bad Tiffin"], ["Campus Adda", "Library Study"]] }
    }
  }
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

function getPackItems<T>(
  selection: unknown,
  packs: Record<string, PromptPack<T>>,
  fallbackPack: string
) {
  const rawSelection = typeof selection === "string" && selection.trim() ? selection.trim() : fallbackPack;
  const [requestedPack, requestedSubcategory] = rawSelection.split(":");
  const packId = packs[requestedPack] ? requestedPack : fallbackPack;
  const pack = packs[packId];
  const subcategory = requestedSubcategory ? pack.subcategories[requestedSubcategory] : undefined;
  const entries: IdentifiedPrompt<T>[] = subcategory
    ? subcategory.items.map((item, index) => ({ id: `${packId}:${requestedSubcategory}:${index}`, item }))
    : Object.entries(pack.subcategories).flatMap(([subcategoryId, entry]) =>
        entry.items.map((item, index) => ({ id: `${packId}:${subcategoryId}:${index}`, item }))
      );

  return {
    selection: subcategory ? `${packId}:${requestedSubcategory}` : packId,
    pack: packId,
    subcategory: subcategory ? requestedSubcategory : null,
    items: entries.map((entry) => entry.item),
    entries
  };
}

function getImposterWordList(category: unknown) {
  const { selection, items, entries } = getPackItems(category, imposterWordPacks, "classic");
  return {
    category: selection,
    words: items,
    entries
  };
}

function getImposterCodePromptList(pack: unknown) {
  const result = getPackItems(pack, imposterCodePromptPacks, "casual");
  return {
    pack: result.selection,
    prompts: result.items,
    entries: result.entries
  };
}

function getWavelengthScaleList(pack: unknown) {
  const result = getPackItems(pack, wavelengthScalePacks, "casual");
  return {
    pack: result.selection,
    scales: result.items,
    entries: result.entries
  };
}

function pickUnusedPrompt<T>(entries: IdentifiedPrompt<T>[], usedIds: string[], allowReset: boolean) {
  if (entries.length === 0) throw new Error("The selected category has no available prompts.");
  let available = entries.filter((entry) => !usedIds.includes(entry.id));
  let nextUsedIds = [...usedIds];

  if (available.length === 0) {
    available = entries;
    if (allowReset) nextUsedIds = [];
  }

  const previousId = usedIds.at(-1);
  const withoutImmediateRepeat = available.filter((entry) => entry.id !== previousId);
  const selected = pickRandomItem(withoutImmediateRepeat.length > 0 ? withoutImmediateRepeat : available);
  return { selected, usedIds: [...nextUsedIds, selected.id] };
}

function serializePromptPacks<T>(packs: Record<string, PromptPack<T>>) {
  return Object.fromEntries(Object.entries(packs).map(([packId, pack]) => [
    packId,
    {
      name: pack.name,
      subcategories: Object.fromEntries(Object.entries(pack.subcategories).map(([subcategoryId, subcategory]) => [
        subcategoryId,
        {
          name: subcategory.name,
          items: subcategory.items.map((item, index) => ({ id: `${packId}:${subcategoryId}:${index}`, value: item }))
        }
      ]))
    }
  ]));
}

function getPlayModeSetting(value: unknown) {
  return value === "single_device" ? "single_device" : "multiplayer";
}

function getTimerSetting(value: unknown, fallback = 90) {
  if (value === "none" || value === 0 || value === "0") {
    return 0;
  }
  return getNumberSetting(value, fallback, 30, 300);
}

function getWavelengthMode(value: unknown) {
  return value === "teams" ? "teams" : "single";
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

function getBalancedTeams(players: GameParticipant[]) {
  return players.reduce<Record<"team-1" | "team-2", string[]>>(
    (teams, player, index) => {
      teams[index % 2 === 0 ? "team-1" : "team-2"].push(player.id);
      return teams;
    },
    { "team-1": [], "team-2": [] }
  );
}

function getTeamNames(players: GameParticipant[], teams: Record<"team-1" | "team-2", string[]>) {
  const nameFor = (teamId: "team-1" | "team-2") => {
    const teamPlayers = players.filter((player) => teams[teamId].includes(player.id));
    const selected = pickRandomItem(teamPlayers);
    return `${selected?.name ?? (teamId === "team-1" ? "First" : "Second")}’s Team`;
  };
  const first = nameFor("team-1");
  let second = nameFor("team-2");
  if (second === first) second = `${second} 2`;
  return { "team-1": first, "team-2": second };
}

function getActivePlayers<T extends { players: GameParticipant[]; eliminatedPlayerIds: string[] }>(state: T) {
  return state.players.filter((player) => !state.eliminatedPlayerIds.includes(player.id) && player.status !== "disconnected" && player.status !== "spectating");
}

function getEliminationOutcome(
  players: GameParticipant[],
  votes: Record<string, string>,
  imposterIds: string[],
  eliminatedPlayerIds: string[]
) {
  const activeIds = new Set(players.filter((player) => !eliminatedPlayerIds.includes(player.id)).map((player) => player.id));
  const totals: Record<string, number> = {};
  Object.entries(votes).forEach(([voterId, targetId]) => {
    if (!activeIds.has(voterId) || !activeIds.has(targetId)) return;
    totals[targetId] = (totals[targetId] ?? 0) + 1;
  });
  const highestVoteCount = Math.max(0, ...Object.values(totals));
  const topVotedPlayerIds = Object.entries(totals).filter(([, count]) => count === highestVoteCount).map(([id]) => id);
  const eliminatedPlayerId = highestVoteCount > 0 && topVotedPlayerIds.length === 1 ? topVotedPlayerIds[0] : null;
  return {
    totals,
    highestVoteCount,
    topVotedPlayerIds,
    eliminatedPlayerId,
    caughtImposter: Boolean(eliminatedPlayerId && imposterIds.includes(eliminatedPlayerId))
  };
}

function getImposterWinState(players: GameParticipant[], imposterIds: string[], eliminatedIds: string[]) {
  const activeIds = new Set(players.filter((player) => !eliminatedIds.includes(player.id)).map((player) => player.id));
  const activeImposters = imposterIds.filter((id) => activeIds.has(id)).length;
  const activeNonImposters = activeIds.size - activeImposters;
  if (activeImposters === 0) return { gameOver: true, winner: "players" as const };
  if (activeImposters >= activeNonImposters) return { gameOver: true, winner: "imposters" as const };
  return { gameOver: false, winner: null };
}

type DeductionGameState = ImposterGameState | ImposterCodeGameState;

function resolveDeductionVote(state: DeductionGameState) {
  const outcome = getEliminationOutcome(state.players, state.votes, state.imposterPlayerIds, state.eliminatedPlayerIds);
  if (outcome.eliminatedPlayerId && !state.eliminatedPlayerIds.includes(outcome.eliminatedPlayerId)) {
    state.eliminatedPlayerIds.push(outcome.eliminatedPlayerId);
    const eliminated = state.players.find((player) => player.id === outcome.eliminatedPlayerId);
    if (eliminated) eliminated.status = "eliminated";
  }
  const winState = getImposterWinState(state.players, state.imposterPlayerIds, state.eliminatedPlayerIds);
  state.phase = "results";
  state.gameOver = winState.gameOver;
  state.winner = winState.winner;
  state.answerRevealed = winState.gameOver;
  state.lastEliminatedPlayerId = outcome.eliminatedPlayerId;
  state.lastGuessWasImposter = outcome.caughtImposter;
  state.lastTopVotedPlayerIds = outcome.topVotedPlayerIds;
  return outcome;
}

function startAnotherDeductionGuess(state: DeductionGameState) {
  if (state.phase !== "results" || state.answerRevealed) {
    throw new Error("Another guess is not available.");
  }
  const activePlayers = getActivePlayers(state);
  if (activePlayers.length < 2) throw new Error("Not enough active players remain for another guess.");
  const startedAt = new Date();
  state.phase = "voting";
  state.votes = {};
  state.startedAt = startedAt.toISOString();
  state.endsAt = state.roundTimerSeconds > 0
    ? new Date(startedAt.getTime() + state.roundTimerSeconds * 1000).toISOString()
    : startedAt.toISOString();
}

function revealDeductionResult(state: DeductionGameState) {
  if (state.phase !== "results") throw new Error("Results are not available.");
  state.answerRevealed = true;
  state.gameOver = true;
}

function resetParticipantEliminations(players: GameParticipant[]) {
  return players.map((player) => ({
    ...player,
    status: player.status === "disconnected" ? "disconnected" as const : "active" as const
  }));
}

function getPlayerTeamId(state: WavelengthGameState, playerId: string) {
  if (state.teams["team-1"].includes(playerId)) return "team-1";
  if (state.teams["team-2"].includes(playerId)) return "team-2";
  return null;
}

function getWavelengthEligibleGuesserIds(state: WavelengthGameState) {
  const connectedIds = new Set(state.players.filter((player) => player.status !== "disconnected" && player.status !== "spectating").map((player) => player.id));
  if (state.mode === "teams") {
    const activeTeamIds = state.activeTeamId ? state.teams[state.activeTeamId] : [];
    return activeTeamIds.filter((playerId) => playerId !== state.clueGiverId && connectedIds.has(playerId));
  }
  return state.players
    .map((player) => player.id)
    .filter((playerId) => playerId !== state.clueGiverId && connectedIds.has(playerId));
}

function replaceDisconnectedClueGiver(state: WavelengthGameState) {
  const current = state.players.find((player) => player.id === state.clueGiverId);
  if (current?.status !== "disconnected" || state.clue) return;
  const pool = state.mode === "teams" && state.activeTeamId
    ? state.players.filter((player) => state.teams[state.activeTeamId!].includes(player.id))
    : state.players;
  const replacement = pool.find((player) => player.status !== "disconnected" && player.id !== state.clueGiverId);
  if (replacement) {
    state.clueGiverId = replacement.id;
    state.clueGiverName = replacement.name;
  }
}

function getWavelengthGuessSummary(state: WavelengthGameState) {
  return Object.entries(state.guesses).map(([playerId, guess]) => ({
    playerId,
    guess,
    distance: Math.abs(state.secretNumber - guess),
    points: getWavelengthRoundScore(state.secretNumber, guess)
  }));
}

function applyWavelengthScores(state: WavelengthGameState) {
  const guessSummary = getWavelengthGuessSummary(state);
  const accepted = state.acceptedGuessPlayerId
    ? guessSummary.find((guess) => guess.playerId === state.acceptedGuessPlayerId)
    : guessSummary.sort((a, b) => a.distance - b.distance)[0];
  const roundScore = accepted?.points ?? 0;
  const clueGiverPoints = Math.max(0, roundScore - 1);

  if (state.mode === "teams" && state.activeTeamId) {
    state.teamScores[state.activeTeamId] += roundScore;
    state.playerScores[state.clueGiverId] = (state.playerScores[state.clueGiverId] ?? 0) + clueGiverPoints;
    state.score = state.teamScores["team-1"] + state.teamScores["team-2"];
  } else {
    guessSummary.forEach((guess) => {
      state.playerScores[guess.playerId] = (state.playerScores[guess.playerId] ?? 0) + guess.points;
    });
    state.playerScores[state.clueGiverId] = (state.playerScores[state.clueGiverId] ?? 0) + clueGiverPoints;
    state.score = Object.values(state.playerScores).reduce((total, value) => total + value, 0);
  }

  state.lastRoundScore = roundScore;
  state.lastClueGiverPoints = clueGiverPoints;
  state.roundHistory.push({
    round: state.round,
    target: state.secretNumber,
    guess: accepted?.guess ?? null,
    guesserId: accepted?.playerId ?? null,
    distance: accepted?.distance ?? null,
    roundScore,
    clueGiverPoints,
    activeTeamId: state.activeTeamId,
    guesses: guessSummary
  });
  state.isComplete = state.round >= state.maxRounds;
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
  return getEliminationOutcome(state.players, state.votes, state.imposterPlayerIds, state.eliminatedPlayerIds);
}

function startNewImposterRound(state: ImposterGameState) {
  const startedAt = new Date();
  const { entries } = getImposterWordList(state.wordCategory);
  const promptChoice = pickUnusedPrompt(entries, state.usedPromptIds, false);
  state.players = resetParticipantEliminations(state.players);
  const eligiblePlayers = state.players.filter((player) => player.status !== "disconnected");
  const imposters = pickRandomItems(
    eligiblePlayers,
    getNumberSetting(state.numberOfImposters, 1, 1, Math.max(1, eligiblePlayers.length - 1))
  );
  state.phase = "role_reveal";
  state.word = promptChoice.selected.item;
  state.currentPromptId = promptChoice.selected.id;
  state.usedPromptIds = promptChoice.usedIds;
  state.startedAt = startedAt.toISOString();
  state.endsAt = state.roundTimerSeconds > 0
    ? new Date(startedAt.getTime() + state.roundTimerSeconds * 1000).toISOString()
    : startedAt.toISOString();
  state.imposterPlayerId = imposters[0].id;
  state.imposterPlayerIds = imposters.map((player) => player.id);
  state.readyPlayerIds = [];
  state.votes = {};
  state.eliminatedPlayerIds = [];
  state.answerRevealed = false;
  state.gameOver = false;
  state.winner = null;
  state.lastEliminatedPlayerId = null;
  state.lastGuessWasImposter = false;
  state.lastTopVotedPlayerIds = [];
  state.round += 1;
}

function createImposterCodeState(
  gameParticipants: GameParticipant[],
  playMode: "multiplayer" | "single_device",
  round = 1,
  numberOfImposters = 1,
  questionPack: unknown = "casual",
  roundTimerSeconds = 90,
  history?: Pick<ImposterCodeGameState, "usedPromptIds">
): ImposterCodeGameState {
  const { pack, entries } = getImposterCodePromptList(questionPack);
  const promptChoice = pickUnusedPrompt(entries, history?.usedPromptIds ?? [], false);
  const prompt = promptChoice.selected.item;
  const resetPlayers = resetParticipantEliminations(gameParticipants);
  const eligiblePlayers = resetPlayers.filter((player) => player.status !== "disconnected");
  const imposters = pickRandomItems(eligiblePlayers, getNumberSetting(numberOfImposters, 1, 1, Math.max(1, eligiblePlayers.length - 1)));
  const startedAt = new Date();

  return {
    type: "imposter-code",
    playMode,
    phase: "answering",
    players: resetPlayers,
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
    answerRevealed: false,
    eliminatedPlayerIds: [],
    usedPromptIds: promptChoice.usedIds,
    currentPromptId: promptChoice.selected.id,
    gameOver: false,
    winner: null,
    lastEliminatedPlayerId: null,
    lastGuessWasImposter: false,
    lastTopVotedPlayerIds: []
  };
}

function createWavelengthState(
  gameParticipants: GameParticipant[],
  playMode: "multiplayer" | "single_device",
  round = 1,
  score = 0,
  scalePack: unknown = "casual",
  mode: "teams" | "single" = "single",
  maxRounds = 6,
  roundTimerSeconds = 90,
  existingTeamScores: Record<"team-1" | "team-2", number> = { "team-1": 0, "team-2": 0 },
  existingPlayerScores?: Record<string, number>,
  existingTeams?: Record<"team-1" | "team-2", string[]>
  ,existing?: Pick<WavelengthGameState, "teamNames" | "usedPromptIds" | "roundHistory">
): WavelengthGameState {
  const teams = existingTeams ?? getBalancedTeams(gameParticipants);
  const activeTeamId = mode === "teams" ? (round % 2 === 1 ? "team-1" : "team-2") : null;
  const cluePool =
    mode === "teams" && activeTeamId
      ? gameParticipants.filter((player) => teams[activeTeamId].includes(player.id))
      : gameParticipants;
  const clueGiver = cluePool[(Math.floor((round - 1) / (mode === "teams" ? 2 : 1))) % cluePool.length] ?? gameParticipants[0];
  const { pack, entries } = getWavelengthScaleList(scalePack);
  const promptChoice = pickUnusedPrompt(entries, existing?.usedPromptIds ?? [], true);
  const [scaleLeft, scaleRight] = promptChoice.selected.item;
  const startedAt = new Date();
  const timer = roundTimerSeconds;

  return {
    type: "wavelength",
    playMode,
    phase: mode === "teams" ? "announcement" : "clue",
    players: gameParticipants,
    mode,
    clueGiverId: clueGiver.id,
    clueGiverName: clueGiver.name,
    activeTeamId,
    teams,
    teamNames: existing?.teamNames ?? getTeamNames(gameParticipants, teams),
    scaleLeft,
    scaleRight,
    scalePack: pack,
    secretNumber: Math.floor(Math.random() * 101),
    clue: null,
    guess: null,
    guesses: {},
    acceptedGuessPlayerId: null,
    roundTimerSeconds: timer,
    startedAt: startedAt.toISOString(),
    endsAt: timer > 0 ? new Date(startedAt.getTime() + timer * 1000).toISOString() : startedAt.toISOString(),
    score,
    teamScores: existingTeamScores,
    playerScores: existingPlayerScores ?? Object.fromEntries(gameParticipants.map((player) => [player.id, 0])),
    maxRounds,
    round,
    usedPromptIds: promptChoice.usedIds,
    currentPromptId: promptChoice.selected.id,
    roundHistory: existing?.roundHistory ?? [],
    lastRoundScore: 0,
    lastClueGiverPoints: 0,
    isComplete: false
  };
}

function getImposterCodeOutcome(state: ImposterCodeGameState) {
  return getEliminationOutcome(state.players, state.votes, state.imposterPlayerIds, state.eliminatedPlayerIds);
}

function getWavelengthRoundScore(secretNumber: number, guess: number | null) {
  if (guess === null) return 0;
  const distance = Math.abs(secretNumber - guess);
  if (distance <= 3) return 5;
  if (distance <= 6) return 4;
  if (distance <= 9) return 3;
  if (distance <= 12) return 2;
  if (distance <= 15) return 1;
  return 0;
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

app.get("/game-content", (_req, res) => {
  res.json({
    imposter: serializePromptPacks(imposterWordPacks),
    "imposter-code": serializePromptPacks(imposterCodePromptPacks),
    wavelength: serializePromptPacks(wavelengthScalePacks)
  });
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

  if (room.status === "in_game") {
    return res.status(409).json({ message: "This room is already in a game." });
  }

  if (room.players.length >= 12) {
    return res.status(409).json({ message: "This room is full." });
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

  emitRoomState(code, room);

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

  emitRoomState(code, room);

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
  emitRoomState(code, room);
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

  emitRoomState(code, room);

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
    const roundTimerSeconds = getTimerSetting(
      settings?.roundTimer,
      60
    );
    const { category: wordCategory, entries } = getImposterWordList(
      settings?.wordCategory
    );
    const imposters = pickRandomItems(gameParticipants, numberOfImposters);
    const promptChoice = pickUnusedPrompt(entries, [], false);
    const word = promptChoice.selected.item;
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
      answerRevealed: false,
      eliminatedPlayerIds: [],
      usedPromptIds: promptChoice.usedIds,
      currentPromptId: promptChoice.selected.id,
      gameOver: false,
      winner: null,
      lastEliminatedPlayerId: null,
      lastGuessWasImposter: false,
      lastTopVotedPlayerIds: []
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
      settings?.questionPack,
      getTimerSetting(settings?.roundTimer, 90)
    );
  } else if (room.selectedGame.slug === "wavelength") {
    const wavelengthMode = getWavelengthMode(settings?.wavelengthMode);
    if (wavelengthMode === "teams" && gameParticipants.length < 4) {
      return res.status(400).json({ message: "Team Mode needs at least 4 players." });
    }
    room.gameState = createWavelengthState(
      gameParticipants,
      playMode,
      1,
      0,
      settings?.scalePack,
      wavelengthMode,
      wavelengthMode === "single"
        ? gameParticipants.length
        : getNumberSetting(settings?.maxRounds, 6, 1, 20),
      getTimerSetting(settings?.roundTimer, 90)
    );
  } else {
    room.gameState = undefined;
  }

  rooms.set(code, room);
  saveRooms();

  emitRoomState(code, room);
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

  emitRoomState(code, room);
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
  if (!room.gameState || room.gameState.type !== "imposter" || room.gameState.phase !== "role_reveal") {
    return res.status(400).json({ message: "Imposter game state not available." });
  }
  if (!room.gameState.players.some((player) => player.id === playerId) || room.gameState.eliminatedPlayerIds.includes(playerId)) {
    return res.status(404).json({ message: "Player not found in this game." });
  }
  if (!room.gameState.readyPlayerIds.includes(playerId)) {
    room.gameState.readyPlayerIds.push(playerId);
  }
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);

  return res.json({ room, readyCount: room.gameState.readyPlayerIds.length });
});

app.post("/rooms/:code/games/imposter/start-round", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can start the round." });
  if (!room.gameState || room.gameState.type !== "imposter" || room.gameState.phase !== "role_reveal") {
    return res.status(400).json({ message: "Imposter game state not available." });
  }
  if (room.gameState.readyPlayerIds.length < getActivePlayers(room.gameState).length) {
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
  emitRoomState(code, room);

  return res.json({ room });
});

app.post("/rooms/:code/games/imposter/start-voting", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can start voting." });
  if (!room.gameState || room.gameState.type !== "imposter" || room.gameState.phase !== "discussion") {
    return res.status(400).json({ message: "Imposter game state not available." });
  }

  room.gameState.phase = "voting";
  room.gameState.votes = {};
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);

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
  if (!room.gameState.players.some((player) => player.id === playerId) || room.gameState.eliminatedPlayerIds.includes(playerId)) {
    return res.status(404).json({ message: "Player not found in this game." });
  }
  if (!room.gameState.players.some((player) => player.id === targetPlayerId) || room.gameState.eliminatedPlayerIds.includes(targetPlayerId)) {
    return res.status(404).json({ message: "Vote target not found." });
  }
  if (room.gameState.votes[playerId] !== undefined) {
    return res.status(409).json({ message: "Vote already submitted." });
  }

  room.gameState.votes[playerId] = targetPlayerId;
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);

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
  if (room.gameState.phase !== "results" || !room.gameState.answerRevealed) {
    return res.status(409).json({ message: "Reveal the complete result before starting another round." });
  }
  startNewImposterRound(room.gameState);
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);

  return res.json({ room });
});

app.post("/rooms/:code/games/imposter/another-guess", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);
  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can start another guess." });
  if (!room.gameState || room.gameState.type !== "imposter") return res.status(400).json({ message: "Imposter state not available." });
  try {
    startAnotherDeductionGuess(room.gameState);
  } catch (error) {
    return res.status(409).json({ message: error instanceof Error ? error.message : "Another guess is unavailable." });
  }
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);
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

  if (Object.keys(room.gameState.votes).length < getActivePlayers(room.gameState).length) {
    return res.status(400).json({ message: "Wait until every active player votes." });
  }

  const outcome = resolveDeductionVote(room.gameState);

  rooms.set(code, room);
  saveRooms();

  emitRoomState(code, room);

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

  revealDeductionResult(room.gameState);
  rooms.set(code, room);
  saveRooms();
  const reveal = getImposterReveal(room, room.gameState);
  io.to(code).emit("imposter:revealed", reveal);
  emitRoomState(code, room);
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
  if (!room.gameState.players.some((player) => player.id === playerId) || room.gameState.eliminatedPlayerIds.includes(playerId)) {
    return res.status(404).json({ message: "Player not found in this game." });
  }
  if (room.gameState.answers[playerId] !== undefined) {
    return res.status(409).json({ message: "Answer already submitted." });
  }

  room.gameState.answers[playerId] = answer.trim().slice(0, 120);
  if (Object.keys(room.gameState.answers).length >= getActivePlayers(room.gameState).length) {
    room.gameState.phase = "answers";
  }
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);
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
  emitRoomState(code, room);
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
  if (!room.gameState.players.some((player) => player.id === playerId) || room.gameState.eliminatedPlayerIds.includes(playerId)) {
    return res.status(404).json({ message: "Player not found in this game." });
  }
  if (!room.gameState.players.some((player) => player.id === targetPlayerId) || room.gameState.eliminatedPlayerIds.includes(targetPlayerId)) {
    return res.status(404).json({ message: "Vote target not found." });
  }
  if (room.gameState.votes[playerId] !== undefined) {
    return res.status(409).json({ message: "Vote already submitted." });
  }

  room.gameState.votes[playerId] = targetPlayerId;
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);
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
  if (Object.keys(room.gameState.votes).length < getActivePlayers(room.gameState).length) {
    return res.status(400).json({ message: "Wait until every player votes." });
  }

  const outcome = resolveDeductionVote(room.gameState);
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);
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

  revealDeductionResult(room.gameState);
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);
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

  if (room.gameState.phase !== "results" || !room.gameState.answerRevealed) {
    return res.status(409).json({ message: "Reveal the complete result before starting another round." });
  }
  const previousState = room.gameState;
  room.gameState = createImposterCodeState(
    previousState.players,
    previousState.playMode,
    previousState.round + 1,
    previousState.numberOfImposters,
    previousState.questionPack,
    previousState.roundTimerSeconds,
    { usedPromptIds: previousState.usedPromptIds }
  );
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);
  return res.json({ room });
});

app.post("/rooms/:code/games/imposter-code/another-guess", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);
  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can start another guess." });
  if (!room.gameState || room.gameState.type !== "imposter-code") return res.status(400).json({ message: "Imposter Code state not available." });
  try {
    startAnotherDeductionGuess(room.gameState);
  } catch (error) {
    return res.status(409).json({ message: error instanceof Error ? error.message : "Another guess is unavailable." });
  }
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);
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
  room.gameState.guesses = {};
  const startedAt = new Date();
  room.gameState.startedAt = startedAt.toISOString();
  room.gameState.endsAt =
    room.gameState.roundTimerSeconds > 0
      ? new Date(startedAt.getTime() + room.gameState.roundTimerSeconds * 1000).toISOString()
      : startedAt.toISOString();
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);
  return res.json({ room });
});

app.post("/rooms/:code/games/wavelength/start-round", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body as { playerId?: string };
  const room = rooms.get(code);
  const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);
  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!player?.isHost) return res.status(403).json({ message: "Only the host can start the round." });
  if (!room.gameState || room.gameState.type !== "wavelength" || room.gameState.phase !== "announcement") {
    return res.status(400).json({ message: "Round announcement is not active." });
  }
  room.gameState.phase = "clue";
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);
  return res.json({ room });
});

app.post("/rooms/:code/games/wavelength/submit-guess", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, guess } = req.body as { playerId?: string; guess?: number };
  const room = rooms.get(code);

  if (!room) return res.status(404).json({ message: "Room not found." });
  if (!room.gameState || room.gameState.type !== "wavelength" || room.gameState.phase !== "guess") {
    return res.status(400).json({ message: "Guessing is not active." });
  }
  if (!playerId || !room.gameState.players.some((player) => player.id === playerId)) {
    return res.status(404).json({ message: "Player not found in this game." });
  }

  const eligibleGuesserIds = getWavelengthEligibleGuesserIds(room.gameState);
  if (!eligibleGuesserIds.includes(playerId)) {
    return res.status(403).json({ message: "You are not guessing this round." });
  }
  if (room.gameState.guesses[playerId] !== undefined) {
    return res.status(400).json({ message: "Guess already submitted." });
  }
  if (room.gameState.mode === "teams" && room.gameState.acceptedGuessPlayerId) {
    return res.status(409).json({ message: "A teammate already submitted the round guess." });
  }

  const nextGuess = getNumberSetting(guess, 50, 0, 100);
  room.gameState.guess = nextGuess;
  room.gameState.guesses[playerId] = nextGuess;
  if (room.gameState.mode === "teams") {
    room.gameState.acceptedGuessPlayerId = playerId;
    applyWavelengthScores(room.gameState);
    room.gameState.phase = "results";
  } else if (eligibleGuesserIds.every((eligiblePlayerId) => room.gameState?.type === "wavelength" && room.gameState.guesses[eligiblePlayerId] !== undefined)) {
    applyWavelengthScores(room.gameState);
    room.gameState.phase = "results";
  }
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);
  return res.json({ room });
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
  if (room.gameState.round >= room.gameState.maxRounds) {
    return res.status(400).json({ message: "Final round reached." });
  }

  const previousState = room.gameState;
  room.gameState = createWavelengthState(
    previousState.players,
    previousState.playMode,
    previousState.round + 1,
    previousState.score,
    previousState.scalePack,
    previousState.mode,
    previousState.maxRounds,
    previousState.roundTimerSeconds,
    previousState.teamScores,
    previousState.playerScores,
    previousState.teams,
    previousState
  );
  rooms.set(code, room);
  saveRooms();
  emitRoomState(code, room);
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
    const confirmedImposterIds = room.gameState.answerRevealed
      ? imposterIds
      : imposterIds.filter((id) => room.gameState?.type === "imposter" && room.gameState.eliminatedPlayerIds.includes(id));
    const confirmedImposters = imposters.filter((imposterPlayer) => confirmedImposterIds.includes(imposterPlayer.id));

    const sharedState = {
      readyPlayerIds: room.gameState.readyPlayerIds,
      votes: room.gameState.votes,
      round: room.gameState.round,
      answerRevealed: room.gameState.answerRevealed ?? false,
      eliminatedPlayerIds: room.gameState.eliminatedPlayerIds,
      isEliminated: room.gameState.eliminatedPlayerIds.includes(player.id),
      gameOver: room.gameState.gameOver,
      winner: room.gameState.winner
    };

    if (room.gameState.phase === "results") {
      const mayRevealWord = room.gameState.answerRevealed || !isImposter || room.gameState.eliminatedPlayerIds.includes(player.id);
      return res.json({
        gameSlug: room.selectedGame.slug,
        playMode: room.gameState.playMode,
        players: gameParticipants,
        phase: room.gameState.phase,
        role: isImposter ? "imposter" : "player",
        word: mayRevealWord ? room.gameState.word : null,
        wordCategory: room.gameState.wordCategory,
        roundTimerSeconds: room.gameState.roundTimerSeconds,
        startedAt: room.gameState.startedAt,
        endsAt: room.gameState.endsAt,
        imposterPlayerId: confirmedImposters[0]?.id ?? null,
        imposterPlayerName: confirmedImposters[0]?.name ?? null,
        imposterPlayerIds: confirmedImposterIds,
        imposterPlayerNames: confirmedImposters.map((imposterPlayer) => imposterPlayer.name),
        caughtImposter: room.gameState.lastGuessWasImposter,
        topVotedPlayerIds: room.gameState.lastTopVotedPlayerIds,
        eliminatedPlayerId: room.gameState.lastEliminatedPlayerId,
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
    const fullResultVisible = room.gameState.answerRevealed;
    const confirmedImposterIds = fullResultVisible
      ? imposterIds
      : imposterIds.filter((id) => room.gameState?.type === "imposter-code" && room.gameState.eliminatedPlayerIds.includes(id));
    const imposters = gameParticipants.filter((gameParticipant) =>
      imposterIds.includes(gameParticipant.id)
    );
    const submittedAnswer = room.gameState.answers[player.id];

    return res.json({
      gameSlug: room.selectedGame.slug,
      playMode: room.gameState.playMode,
      type: room.gameState.type,
      players: gameParticipants,
      phase: room.gameState.phase,
      role: isImposter ? "imposter" : "player",
      prompt: isImposter ? room.gameState.imposterQuestion : room.gameState.question,
      question: room.gameState.phase === "answering" ? null : room.gameState.question,
      imposterQuestion: fullResultVisible ? room.gameState.imposterQuestion : null,
      questionPack: room.gameState.questionPack,
      numberOfImposters: room.gameState.numberOfImposters,
      roundTimerSeconds: room.gameState.roundTimerSeconds,
      startedAt: room.gameState.startedAt,
      endsAt: room.gameState.endsAt,
      answers: room.gameState.phase === "answering" && submittedAnswer !== undefined ? { [player.id]: submittedAnswer } : room.gameState.phase === "answering" ? {} : room.gameState.answers,
      answeredPlayerIds: Object.keys(room.gameState.answers),
      submittedAnswer: submittedAnswer ?? null,
      votes: room.gameState.votes,
      round: room.gameState.round,
      answerRevealed: room.gameState.answerRevealed,
      imposterPlayerIds: confirmedImposterIds,
      imposterPlayerNames: imposters.filter((imposterPlayer) => confirmedImposterIds.includes(imposterPlayer.id)).map((imposterPlayer) => imposterPlayer.name),
      caughtImposter: room.gameState.lastGuessWasImposter,
      topVotedPlayerIds: room.gameState.lastTopVotedPlayerIds,
      eliminatedPlayerId: room.gameState.lastEliminatedPlayerId,
      eliminatedPlayerIds: room.gameState.eliminatedPlayerIds,
      isEliminated: room.gameState.eliminatedPlayerIds.includes(player.id),
      gameOver: room.gameState.gameOver,
      winner: room.gameState.winner
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
    const eligibleGuesserIds = getWavelengthEligibleGuesserIds(room.gameState);
    const playerTeamId = getPlayerTeamId(room.gameState, player.id);
    const guessSummary = getWavelengthGuessSummary(room.gameState);
    return res.json({
      gameSlug: room.selectedGame.slug,
      playMode: room.gameState.playMode,
      type: room.gameState.type,
      players: gameParticipants,
      phase: room.gameState.phase,
      mode: room.gameState.mode,
      clueGiverId: room.gameState.clueGiverId,
      clueGiverName: room.gameState.clueGiverName,
      isClueGiver,
      isEligibleGuesser: eligibleGuesserIds.includes(player.id),
      hasSubmittedGuess: room.gameState.guesses[player.id] !== undefined,
      activeTeamId: room.gameState.activeTeamId,
      playerTeamId,
      teams: room.gameState.teams,
      teamNames: room.gameState.teamNames,
      scaleLeft: room.gameState.scaleLeft,
      scaleRight: room.gameState.scaleRight,
      scalePack: room.gameState.scalePack,
      secretNumber: isClueGiver || room.gameState.phase === "results" ? room.gameState.secretNumber : null,
      clue: room.gameState.clue,
      guess: room.gameState.guess,
      guesses: room.gameState.phase === "results" ? room.gameState.guesses : {},
      guessSummary: room.gameState.phase === "results" ? guessSummary : [],
      acceptedGuessPlayerId: room.gameState.acceptedGuessPlayerId,
      eligibleGuesserIds,
      roundTimerSeconds: room.gameState.roundTimerSeconds,
      startedAt: room.gameState.startedAt,
      endsAt: room.gameState.endsAt,
      score: room.gameState.score,
      teamScores: room.gameState.teamScores,
      playerScores: room.gameState.playerScores,
      maxRounds: room.gameState.maxRounds,
      round: room.gameState.round,
      lastRoundScore: room.gameState.lastRoundScore,
      lastClueGiverPoints: room.gameState.lastClueGiverPoints,
      roundHistory: room.gameState.roundHistory,
      isComplete: room.gameState.isComplete
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
    endsAt: room.gameState.endsAt,
    readyPlayerIds: room.gameState.readyPlayerIds,
    votes: room.gameState.votes,
    round: room.gameState.round
  });
});

io.on("connection", socket => {
  socket.on("room:subscribe", ({ roomCode, playerId }: { roomCode: string; playerId?: string | null }) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);

    if (!room) {
      socket.emit("room:error", { message: "Room not found." });
      return;
    }

    socket.data.roomCode = code;
    socket.data.playerId = playerId ?? null;
    if (playerId) {
      const key = `${code}:${playerId}`;
      const sockets = connectedPlayerSockets.get(key) ?? new Set<string>();
      sockets.add(socket.id);
      connectedPlayerSockets.set(key, sockets);
      const participant = room.gameState?.players.find((item) => item.id === playerId);
      if (participant && participant.status === "disconnected") participant.status = "active";
    }
    socket.join(code);
    socket.emit("room:state", getPublicRoom(room));
    emitRoomState(code, room);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode as string | undefined;
    const playerId = socket.data.playerId as string | null | undefined;
    if (!code || !playerId) return;
    const key = `${code}:${playerId}`;
    const sockets = connectedPlayerSockets.get(key);
    sockets?.delete(socket.id);
    if (sockets && sockets.size > 0) return;
    connectedPlayerSockets.delete(key);
    const room = rooms.get(code);
    const participant = room?.gameState?.players.find((item) => item.id === playerId);
    const state = room?.gameState;
    const isEliminated = state && "eliminatedPlayerIds" in state && state.eliminatedPlayerIds.includes(playerId);
    if (room && state && participant && !isEliminated) {
      participant.status = "disconnected";
      if (state.type === "wavelength") replaceDisconnectedClueGiver(state);
      saveRooms();
      emitRoomState(code, room);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Ruckus Games server running on http://localhost:${PORT}`);
});
