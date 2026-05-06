import { Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "./score-badge";
import { suggestCheckout } from "./checkouts";
import type { PlayerState501, ScoreTuple } from "./types";

export function CountdownPanel({
  players,
  currentIdx,
  latestScores,
  onConfirm,
  onUndo,
}: {
  players: PlayerState501[];
  currentIdx: number;
  latestScores: ScoreTuple[];
  onConfirm: () => void;
  onUndo: () => void;
}) {
  const current = players[currentIdx];
  if (!current) return null;

  const roundTotal = latestScores.reduce((a, [s]) => a + s, 0);
  const remaining = current.score - roundTotal;
  const bust = remaining < 0 || remaining === 1;
  const dartsLeft = Math.max(0, 3 - latestScores.length);
  const checkout = bust ? null : suggestCheckout(remaining, dartsLeft);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="grid grid-cols-2 gap-3">
        {players.map((p, i) => (
          <Card key={i} className={i === currentIdx ? "border-primary" : "border-border"}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium truncate">{p.name}</span>
                {i === currentIdx && (
                  <Badge variant="secondary" className="ml-auto text-xs shrink-0">Throwing</Badge>
                )}
              </div>
              <p className="text-4xl font-black tracking-tight mt-1">{p.score}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="flex-1">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest">
            Current Throw — {current.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="flex gap-2 flex-wrap min-h-[56px] items-center">
            {latestScores.length === 0 ? (
              <span className="text-muted-foreground text-sm">Waiting for darts…</span>
            ) : (
              latestScores.map(([s, d], i) => <ScoreBadge key={i} score={s} desc={d} />)
            )}
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Round total</p>
              <p className="text-3xl font-black">{roundTotal}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className={`text-3xl font-black ${bust ? "text-destructive" : ""}`}>
                {bust ? "BUST" : remaining}
              </p>
            </div>
          </div>

          {checkout && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30">
              <Target size={14} className="text-amber-500 shrink-0" />
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Checkout</span>
              <span className="font-mono font-bold ml-auto text-amber-500">{checkout}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onUndo}>Undo</Button>
            <Button className="flex-1" onClick={onConfirm} disabled={latestScores.length === 0}>
              Confirm
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
