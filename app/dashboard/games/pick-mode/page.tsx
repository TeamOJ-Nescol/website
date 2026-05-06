"use client";
import { useAuth } from "@/hooks/useAuth";
import { useCreateGame, type GameMode } from "@/hooks/useGames";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const games: { id: GameMode; label: string; desc: string }[] = [
  { id: "501", label: "501", desc: "Classic countdown from 501" },
  { id: "301", label: "301", desc: "Fast-paced countdown from 301" },
  { id: "cricket", label: "Cricket", desc: "Close out numbers 15–20 & bull" },
];

export default function Page() {
  const auth = useAuth();
  const router = useRouter();
  const createGame = useCreateGame();
  const [users, setUsers] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameMode | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem("@players");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setUsers(Array.isArray(parsed) && parsed.length > 0 ? parsed : [auth.user.name]);
      } catch {
        setUsers([auth.user.name]);
      }
    } else {
      setUsers([auth.user.name]);
    }
  }, [auth.user.name]);

  async function selectGame(gameId: GameMode) {
    if (createGame.isPending || users.length === 0) return;
    setSelectedGame(gameId);
    const game = await createGame.mutateAsync({ mode: gameId, players: users });
    window.sessionStorage.setItem("@gameId", String(game.id));
    router.push("/dashboard/games/live");
  }

  return (
    <section className="min-h-screen w-full flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Dartz</p>
          <h1 className="text-4xl font-bold tracking-tight">New Game</h1>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Players</p>
          <div className="flex flex-wrap gap-2">
            {users.map((name, i) => (
              <Badge key={i} variant="secondary" className="px-3 py-1.5 text-sm gap-2 p-5">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {name.charAt(0).toUpperCase()}
                </span>
                {name}
              </Badge>
            ))}
          </div>
        </div>

        <hr className="border-border" />

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Select Game</p>
          {games.map((game) => (
            <Card
              key={game.id}
              onClick={() => selectGame(game.id)}
              className={`cursor-pointer transition-all hover:border-primary ${
                selectedGame === game.id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-accent"
              } ${createGame.isPending ? "opacity-60 pointer-events-none" : ""}`}
            >
              <CardContent className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-semibold text-base">{game.label}</p>
                  <p className="text-sm text-muted-foreground">{game.desc}</p>
                </div>
                {selectedGame === game.id && (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {createGame.isError && (
          <p className="text-sm text-destructive">Failed to create game. Try again.</p>
        )}
      </div>
    </section>
  );
}
