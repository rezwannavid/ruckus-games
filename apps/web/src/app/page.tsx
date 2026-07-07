"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { NumberInput } from "@/components/ui/NumberInput";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

export default function Home() {
  const router = useRouter();

  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

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
    setIsJoining(true);

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
      setIsJoining(false);
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
          <h1 className="text-display-lg-bold">Ruckus Games</h1>
          <p className="text-title-sm-regular opacity-80">
            One room. Many games. No signups.
          </p>
        </header>

        <section className="rounded-2xl border p-6 space-y-4">
          <h2 className="text-title-md-semibold">Start or Join</h2>

          <input
            className="w-full rounded-lg border p-3 text-black"
            placeholder="Your name"
            value={playerName}
            onChange={event => setPlayerName(event.target.value)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              onClick={createRoom}
              variant="primary"
              size="md"
              className="w-full"
            >
              Create Room
            </Button>

            <div className="flex flex-col gap-3">
              <label className="text-footnote-semibold uppercase tracking-[0.18em] opacity-70">
                Room Code
              </label>

              <input
                className="sr-only"
                aria-label="Room code"
                inputMode="numeric"
                value={roomCode}
                onChange={event => {
                  setError("");
                  setIsJoining(false);
                  setRoomCode(event.target.value.replace(/\D/g, "").slice(0, 4));
                }}
              />

              <button
                type="button"
                onClick={() => {
                  const input = document.querySelector<HTMLInputElement>(
                    'input[aria-label="Room code"]'
                  );
                  input?.focus();
                }}
                className="rounded-[var(--radius-lg)] bg-[var(--surface-inverted)] p-5"
              >
                <NumberInput
                  value={roomCode}
                  state={
                    error
                      ? "wrong-code"
                      : isJoining
                        ? "joining"
                        : roomCode.length > 0
                          ? "typed"
                          : "initial"
                  }
                  onTryAgain={() => {
                    setError("");
                    setIsJoining(false);
                    setRoomCode("");
                  }}
                />
              </button>

              <Button
                onClick={joinRoom}
                disabled={roomCode.length < 4 || isJoining}
                variant="secondary"
                size="md"
                showLeftIcon={false}
                className="w-full"
              >
                {isJoining ? "Joining" : "Join"}
              </Button>
            </div>
          </div>

          {error && <p className="text-red-500">{error}</p>}
        </section>

        <section className="space-y-4">
          <h2 className="text-title-md-semibold">Games You Can Play</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {["Imposter", "Codenames", "Name 3", "Passwords", "Fibbage", "Wavelength"].map(game => (
              <div key={game} className="rounded-2xl border p-5">
                <h3 className="text-title-sm-semibold">{game}</h3>
                <p className="mt-2 text-body-regular opacity-70">Played inside a room.</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}