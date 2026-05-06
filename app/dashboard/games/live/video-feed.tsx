import type { RefObject } from "react";
import { Camera, RefreshCw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONFIG } from "@/lib/config";
import { ScoreBadge } from "./score-badge";
import type { ConnectionStatus, ScoreTuple } from "./types";

const STATUS_COLOR: Record<ConnectionStatus, string> = {
  disconnected: "text-muted-foreground",
  connecting: "text-amber-500",
  connected: "text-emerald-500",
  error: "text-destructive",
};

export function VideoFeed({
  canvasRef,
  videoRef,
  captureCanvasRef,
  fileInputRef,
  status,
  latestScores,
  availableCameras,
  camId,
  selectedVideoName,
  frameCount,
  fps,
  showRawPreview,
  hasSelectedVideo,
  onSourceChange,
  onVideoFileChange,
  onConnect,
  onDisconnect,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  captureCanvasRef: RefObject<HTMLCanvasElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  status: ConnectionStatus;
  latestScores: ScoreTuple[];
  availableCameras: { id: string; label: string }[];
  camId: string;
  selectedVideoName: string;
  frameCount: number;
  fps: number;
  showRawPreview: boolean;
  hasSelectedVideo: boolean;
  onSourceChange: (value: string) => void;
  onVideoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <canvas ref={captureCanvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.mp4,.mov,.m4v,.webm"
        className="hidden"
        onChange={onVideoFileChange}
      />

      <header className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
        <Camera size={16} className="text-muted-foreground shrink-0" />
        <select
          value={camId}
          onChange={(e) => onSourceChange(e.target.value)}
          disabled={status === "connected" || status === "connecting"}
          className="bg-muted border border-border rounded px-2 py-1 text-sm disabled:opacity-40 max-w-[200px] truncate"
        >
          {availableCameras.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
          <option value={CONFIG.game.VIDEO_SOURCE_ID}>
            {selectedVideoName ? `📹 ${selectedVideoName}` : "Video file…"}
          </option>
        </select>

        <span className={`text-sm font-medium ${STATUS_COLOR[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>

        <div className="ml-auto">
          {status === "connected" || status === "connecting" ? (
            <Button variant="destructive" size="sm" onClick={onDisconnect}>Stop</Button>
          ) : (
            <Button
              size="sm"
              onClick={onConnect}
              disabled={availableCameras.length === 0 && !hasSelectedVideo}
            >
              <RefreshCw size={14} className="mr-1.5" /> Connect
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center bg-black relative overflow-hidden">
        <video
          ref={videoRef}
          className={showRawPreview && status === "connected" ? "absolute inset-0 w-full h-full object-contain" : "hidden"}
          muted
          playsInline
          autoPlay
        />
        {(status !== "connected" || frameCount === 0) && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Camera size={48} strokeWidth={1} />
            <p className="text-sm">
              {status === "connecting"
                ? "Connecting…"
                : status === "connected"
                ? "Waiting for frames…"
                : camId === CONFIG.game.VIDEO_SOURCE_ID && !hasSelectedVideo
                ? "Choose a video file to start"
                : "Press Connect to start"}
            </p>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
          style={{ display: !showRawPreview && frameCount > 0 ? "block" : "none" }}
        />
        {status === "connected" && (
          <>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              LIVE
            </div>
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-slate-400 font-mono">
              {fps} fps · {frameCount} frames
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 px-5 py-3 border-t border-border flex items-center gap-3 bg-background min-h-[72px]">
        <Target size={16} className="text-muted-foreground shrink-0" />
        {latestScores.length === 0 ? (
          <span className="text-sm text-muted-foreground">No darts detected</span>
        ) : (
          <div className="flex gap-2 flex-wrap items-center w-full">
            {latestScores.map(([s, d], i) => <ScoreBadge key={i} score={s} desc={d} />)}
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Round</p>
              <p className="text-2xl font-black">{latestScores.reduce((a, [s]) => a + s, 0)}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
