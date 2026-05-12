"use client";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGames, useGameStats } from "@/hooks/useGames";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const links = [
  {
    href: "/dashboard/games",
    title: "New Game",
    description: "Add local players and start a new match.",
  },
  {
    href: "/dashboard/games/live",
    title: "Live Game",
    description: "Jump back into the current live game.",
  },
  {
    href: "/dashboard/games/pick-mode",
    title: "Pick Mode",
    description: "Choose a game mode (501, Cricket, ATC).",
  },
  {
    href: "/dashboard/test",
    title: "Test",
    description: "Test the dart detection stream.",
  },
  {
    href: "/dashboard/calibration",
    title: "Calibration",
    description: "Calibrate and cache board homography before live play.",
  },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function Page() {
  const { data: stats } = useGameStats();
  const { data: games } = useGames();
  const auth = useAuth()

  useEffect(() => {
    if (auth.user == null) {
      window.location.replace("/login")
    }
  }, [])

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Games</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats?.totalGames ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Finished</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats?.finishedGames ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Wins</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats?.wins ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Darts Thrown</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats?.totalDarts ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full transition-colors hover:bg-accent">
              <CardHeader>
                <CardTitle>{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Games</CardTitle>
          <CardDescription>Your last matches.</CardDescription>
        </CardHeader>
        <CardContent>
          {!games || games.length === 0 ? (
            <p className="text-sm text-muted-foreground">No games yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {games.slice(0, 10).map((g) => (
                <li key={g.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">
                      {g.mode.toUpperCase()}{" "}
                      <span className="text-muted-foreground font-normal">
                        — {g.players.map((p) => p.name).join(", ")}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(g.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.winner && <Badge variant="secondary">Won by {g.winner}</Badge>}
                    <Badge variant={g.status === "finished" ? "default" : "outline"}>
                      {g.status === "finished" ? "Finished" : "In Progress"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
