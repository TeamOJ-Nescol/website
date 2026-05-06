"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountdownPanel } from "./countdown-panel";
import { CricketPanel } from "./cricket-panel";
import { VideoFeed } from "./video-feed";
import { useDartStream } from "./use-dart-stream";
import {
  CRICKET_TARGETS,
  initCricketPlayer,
  isCricketNumber,
  type GameMode,
  type PlayerCricket,
  type PlayerState501,
} from "./types";
import { useGame, useUpdateGameState, useFinishGame } from "@/hooks/useGames";

const AUTO_ADVANCE_DARTS = 3;

export default function LiveGamePage() {
  const [gameId, setGameId] = useState<number | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem("@gameId");
    if (raw) setGameId(Number(raw));
  }, []);

  const { data: game } = useGame(gameId);
  const updateState = useUpdateGameState();
  const finishGame = useFinishGame();

  const [gameMode, setGameMode] = useState<GameMode>("501");
  const [playerNames, setPlayerNames] = useState<string[]>([]);

  const {
    canvasRef,
    videoRef,
    captureCanvasRef,
    fileInputRef,
    status,
    latestScores,
    armed,
    clearScores,
    availableCameras,
    camId,
    selectedVideoName,
    frameCount,
    fps,
    showRawPreview,
    handleVideoFileChange,
    handleSourceChange,
    connect,
    disconnect,
    hasSelectedVideo,
  } = useDartStream();

  const [countdown501, setCountdown501] = useState<PlayerState501[]>([]);
  const [cricket, setCricket] = useState<PlayerCricket[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [dartsThrown, setDartsThrown] = useState<Record<string, number>>({});
  const finishedRef = useRef(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (!game || initRef.current) return;
    initRef.current = true;
    const mode = game.mode as GameMode;
    const names = game.players.map((p) => p.name);
    setGameMode(mode);
    setPlayerNames(names);
    setDartsThrown(Object.fromEntries(names.map((n) => [n, 0])));

    let restored = false;
    if (game.state && game.state !== "{}") {
      try {
        const parsed = JSON.parse(game.state);
        if (parsed.mode === mode) {
          if (mode === "cricket" && Array.isArray(parsed.cricket)) {
            setCricket(parsed.cricket);
            restored = true;
          } else if (Array.isArray(parsed.countdown501)) {
            setCountdown501(parsed.countdown501);
            restored = true;
          }
          if (typeof parsed.currentPlayerIdx === "number") {
            setCurrentPlayerIdx(parsed.currentPlayerIdx);
          }
          if (parsed.dartsThrown && typeof parsed.dartsThrown === "object") {
            setDartsThrown(parsed.dartsThrown);
          }
        }
      } catch {
        /* ignore corrupted snapshot */
      }
    }

    if (!restored) {
      const startScore = mode === "301" ? 301 : 501;
      if (mode === "cricket") setCricket(names.map(initCricketPlayer));
      else setCountdown501(names.map((n) => ({ name: n, score: startScore, history: [] })));
    }
  }, [game]);

  const isCricket = gameMode === "cricket";

  const persistState = useCallback(
    (
      snapshot: object,
      players?: { position: number; currentScore?: number; dartsThrown?: number }[],
    ) => {
      if (gameId == null) return;
      updateState.mutate({ id: gameId, state: snapshot, players });
    },
    [gameId, updateState],
  );

  const confirmThrow501 = useCallback(() => {
    const roundTotal = latestScores.reduce((a, [s]) => a + s, 0);
    const dartsCount = latestScores.length;
    let nextWinner: string | null = null;
    let nextState: PlayerState501[] = [];
    setCountdown501((prev) => {
      nextState = prev.map((p, i) => {
        if (i !== currentPlayerIdx) return p;
        const newScore = p.score - roundTotal;
        if (newScore < 0 || newScore === 1) return p;
        if (newScore === 0) nextWinner = p.name;
        return { ...p, score: newScore, history: [...p.history, latestScores.map(([s]) => s)] };
      });
      return nextState;
    });
    const currentName = playerNames[currentPlayerIdx];
    const nextDarts = { ...dartsThrown, [currentName]: (dartsThrown[currentName] ?? 0) + dartsCount };
    setDartsThrown(nextDarts);
    if (nextWinner) setWinner(nextWinner);
    clearScores();
    const nextIdx = (currentPlayerIdx + 1) % playerNames.length;
    setCurrentPlayerIdx(nextIdx);
    persistState(
      {
        mode: gameMode,
        countdown501: nextState,
        currentPlayerIdx: nextIdx,
        dartsThrown: nextDarts,
      },
      nextState.map((p, position) => ({
        position,
        currentScore: p.score,
        dartsThrown: nextDarts[p.name] ?? 0,
      })),
    );
  }, [currentPlayerIdx, latestScores, playerNames, clearScores, dartsThrown, gameMode, persistState]);

  const undoThrow501 = useCallback(() => {
    const prevIdx = currentPlayerIdx === 0 ? playerNames.length - 1 : currentPlayerIdx - 1;
    setCountdown501((prev) =>
      prev.map((p, i) => {
        if (i !== prevIdx || p.history.length === 0) return p;
        const lastRound = p.history[p.history.length - 1];
        return { ...p, score: p.score + lastRound.reduce((a, b) => a + b, 0), history: p.history.slice(0, -1) };
      })
    );
    setCurrentPlayerIdx(prevIdx);
    clearScores();
    setWinner(null);
  }, [currentPlayerIdx, playerNames.length, clearScores]);

  const confirmThrowCricket = useCallback(() => {
    const dartsCount = latestScores.length;
    let nextWinner: string | null = null;
    let nextState: PlayerCricket[] = [];
    setCricket((prev) => {
      const next = prev.map((p, pi) => {
        if (pi !== currentPlayerIdx) return p;
        const updated = { ...p, marks: { ...p.marks } };
        for (const [score, desc] of latestScores) {
          if (!isCricketNumber(score)) continue;
          const multiplier = desc.toUpperCase().includes("T") ? 3 : desc.toUpperCase().includes("D") ? 2 : 1;
          const cur = updated.marks[score];
          if (cur.closed) continue;
          const newMarks = Math.min(cur.marks + multiplier, 3);
          updated.marks[score] = { marks: newMarks, closed: newMarks >= 3 };
          if (newMarks >= 3) {
            const othersOpen = prev.some((op, oi) => oi !== pi && !op.marks[score].closed);
            if (othersOpen) {
              const excess = cur.marks + multiplier - 3;
              updated.points += score * Math.max(0, excess);
            }
          }
        }
        return updated;
      });
      const current = next[currentPlayerIdx];
      const allClosed = CRICKET_TARGETS.every((t) => current.marks[t].closed);
      if (allClosed) {
        const maxPoints = Math.max(...next.map((p) => p.points));
        if (current.points >= maxPoints) nextWinner = current.name;
      }
      nextState = next;
      return next;
    });
    const currentName = playerNames[currentPlayerIdx];
    const nextDarts = { ...dartsThrown, [currentName]: (dartsThrown[currentName] ?? 0) + dartsCount };
    setDartsThrown(nextDarts);
    if (nextWinner) setWinner(nextWinner);
    clearScores();
    const nextIdx = (currentPlayerIdx + 1) % playerNames.length;
    setCurrentPlayerIdx(nextIdx);
    persistState(
      {
        mode: gameMode,
        cricket: nextState,
        currentPlayerIdx: nextIdx,
        dartsThrown: nextDarts,
      },
      nextState.map((p, position) => ({
        position,
        currentScore: p.points,
        dartsThrown: nextDarts[p.name] ?? 0,
      })),
    );
  }, [currentPlayerIdx, latestScores, playerNames, clearScores, dartsThrown, gameMode, persistState]);

  const undoThrowCricket = useCallback(() => {
    setCurrentPlayerIdx((i) => (i === 0 ? playerNames.length - 1 : i - 1));
    clearScores();
    setWinner(null);
  }, [playerNames.length, clearScores]);

  useEffect(() => {
    if (winner || !armed || latestScores.length < AUTO_ADVANCE_DARTS) return;
    if (isCricket) confirmThrowCricket();
    else confirmThrow501();
  }, [latestScores, armed, winner, isCricket, confirmThrow501, confirmThrowCricket]);

  useEffect(() => {
    if (!winner || finishedRef.current || gameId == null) return;
    finishedRef.current = true;
    const players = playerNames.map((name, position) => {
      const finalScore = isCricket
        ? cricket.find((p) => p.name === name)?.points ?? 0
        : countdown501.find((p) => p.name === name)?.score ?? 0;
      return {
        name,
        position,
        finalScore,
        dartsThrown: dartsThrown[name] ?? 0,
      };
    });
    finishGame.mutate({
      id: gameId,
      winner,
      state: isCricket
        ? { mode: gameMode, cricket, currentPlayerIdx, dartsThrown }
        : { mode: gameMode, countdown501, currentPlayerIdx, dartsThrown },
      players,
    });
  }, [winner, gameId, isCricket, cricket, countdown501, currentPlayerIdx, dartsThrown, gameMode, playerNames, finishGame]);

  return (
    <main className="flex h-screen overflow-hidden">
      <aside className="w-105 shrink-0 flex flex-col gap-4 p-5 border-r border-border overflow-y-auto">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Mode</p>
            <h1 className="text-2xl font-bold uppercase">{gameMode}</h1>
          </div>
          <Badge variant={status === "connected" ? "default" : "secondary"} className="gap-1.5">
            {status === "connected" ? <Wifi size={12} /> : <WifiOff size={12} />}
            {status === "connected" ? "Live" : status}
          </Badge>
        </div>

        {winner && (
          <Card className="border-primary bg-primary/10 shrink-0">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Winner 🎯</p>
              <p className="text-3xl font-black text-primary">{winner}</p>
            </CardContent>
          </Card>
        )}

        {!winner && (
          isCricket ? (
            <CricketPanel
              players={cricket}
              currentIdx={currentPlayerIdx}
              latestScores={latestScores}
              onConfirm={confirmThrowCricket}
              onUndo={undoThrowCricket}
            />
          ) : (
            <CountdownPanel
              players={countdown501}
              currentIdx={currentPlayerIdx}
              latestScores={latestScores}
              onConfirm={confirmThrow501}
              onUndo={undoThrow501}
            />
          )
        )}
      </aside>

      <VideoFeed
        canvasRef={canvasRef}
        videoRef={videoRef}
        captureCanvasRef={captureCanvasRef}
        fileInputRef={fileInputRef}
        status={status}
        latestScores={latestScores}
        availableCameras={availableCameras}
        camId={camId}
        selectedVideoName={selectedVideoName}
        frameCount={frameCount}
        fps={fps}
        showRawPreview={showRawPreview}
        hasSelectedVideo={hasSelectedVideo()}
        onSourceChange={handleSourceChange}
        onVideoFileChange={handleVideoFileChange}
        onConnect={() => connect(camId)}
        onDisconnect={disconnect}
      />
    </main>
  );
}
