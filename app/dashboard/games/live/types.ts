export type ScoreTuple = [number, string];
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
export type GameMode = "501" | "301" | "cricket";

export type PlayerState501 = { name: string; score: number; history: number[][] };
export type CricketMark = { marks: number; closed: boolean };
export type CricketTarget = 15 | 16 | 17 | 18 | 19 | 20 | 25;
export type PlayerCricket = {
  name: string;
  marks: Record<CricketTarget, CricketMark>;
  points: number;
  history: string[];
};

export const CRICKET_TARGETS: CricketTarget[] = [20, 19, 18, 17, 16, 15, 25];

export function initCricketPlayer(name: string): PlayerCricket {
  const marks = {} as Record<CricketTarget, CricketMark>;
  CRICKET_TARGETS.forEach((t) => (marks[t] = { marks: 0, closed: false }));
  return { name, marks, points: 0, history: [] };
}

export function isCricketNumber(score: number): score is CricketTarget {
  return CRICKET_TARGETS.includes(score as CricketTarget);
}
