"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

export default function Home() {
  const router = useRouter();

  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  async function createRoom() {
    setError("");

    const response = await fetch(`${serverUrl}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        playerName
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message ?? "Could not create room.");
      return;
    }

    localStorage.setItem("ruckusPlayerId", data.player.id);
    localStorage.setItem("ruckusPlayerName", data.player.name);
    localStorage.setItem("ruckusRoomCode", data.room.code);

    router.push(`/room/${data.room.code}`);
  }

  async function joinRoom() {
    setError("");

    const response = await fetch(`${serverUrl}/rooms/${roomCode}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        playerName
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message ?? "Could not join room.");
      return;
    }

    localStorage.setItem("ruckusPlayerId", data.player.id);
    localStorage.setItem("ruckusPlayerName", data.player.name);
    localStorage.setItem("ruckusRoomCode", data.room.code);

    router.push(`/room/${data.room.code}`);
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="space-y-3">
          <h1 className="text-5xl font-bold">Ruckus Games</h1>
          <p className="text-xl opacity-80">One room. Many games. No signups.</p>
        </header>

        <section className="rounded-2xl border p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Start or Join</h2>

          <input
            className="w-full rounded-lg border p-3 text-black"
            placeholder="Your name"
            value={playerName}
            onChange={event => setPlayerName(event.target.value)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={createRoom}
              className="rounded-lg border p-3 font-semibold hover:bg-white/10"
            >
              Create Room
            </button>

            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border p-3 text-black"
                placeholder="Room code"
                value={roomCode}
                onChange={event => setRoomCode(event.target.value)}
              />

              <button
                onClick={joinRoom}
                className="rounded-lg border px-4 font-semibold hover:bg-white/10"
              >
                Join
              </button>
            </div>
          </div>

          {error && <p className="text-red-500">{error}</p>}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Games You Can Play</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {["Imposter", "Codenames", "Name 3", "Passwords", "Fibbage", "Wavelength"].map(game => (
              <div key={game} className="rounded-2xl border p-5">
                <h3 className="text-xl font-semibold">{game}</h3>
                <p className="mt-2 opacity-70">Played inside a room.</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}