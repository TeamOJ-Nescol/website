import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "./score-badge";
import { CRICKET_TARGETS, type CricketMark, type PlayerCricket, type ScoreTuple } from "./types";

export function CricketPanel({
  players,
  currentIdx,
  latestScores,
  onConfirm,
  onUndo,
}: {
  players: PlayerCricket[];
  currentIdx: number;
  latestScores: ScoreTuple[];
  onConfirm: () => void;
  onUndo: () => void;
}) {
  const current = players[currentIdx];
  if (!current) return null;

  function markDisplay(mark: CricketMark) {
    if (mark.closed) return "✕";
    if (mark.marks === 2) return "⦸";
    if (mark.marks === 1) return "/";
    return "";
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-3 text-left text-muted-foreground font-medium w-12">Num</th>
                {players.map((p, i) => (
                  <th key={i} className={`py-2 px-3 text-center font-semibold ${i === currentIdx ? "text-primary" : ""}`}>
                    {p.name.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CRICKET_TARGETS.map((target) => (
                <tr key={target} className="border-b border-border last:border-0">
                  <td className="py-2 px-3 font-mono font-bold">{target === 25 ? "Bull" : target}</td>
                  {players.map((p, i) => (
                    <td key={i} className="py-2 px-3 text-center text-base font-bold">
                      {markDisplay(p.marks[target])}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-muted/30">
                <td className="py-2 px-3 text-xs text-muted-foreground uppercase tracking-widest">Pts</td>
                {players.map((p, i) => (
                  <td key={i} className={`py-2 px-3 text-center font-black text-lg ${i === currentIdx ? "text-primary" : ""}`}>
                    {p.points}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

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
          <div className="flex gap-2">
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
