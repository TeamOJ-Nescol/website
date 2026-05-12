import { useCallback, useEffect, useRef, useState } from "react";
import { CONFIG } from "@/lib/config";
import type { ConnectionStatus, ScoreTuple } from "./types";

export function useDartStream() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pendingFrameRef = useRef(false);
  const intentionalCloseRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const captureLoopRef = useRef<number | null>(null);
  const annotatedFrameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendingFrameRef = useRef(false);
  const streamingActiveRef = useRef(false);
  const responsePartsPendingRef = useRef(0);
  const selectedVideoFileRef = useRef<File | null>(null);
  const selectedVideoUrlRef = useRef<string | null>(null);
  const fpsCounterRef = useRef({ count: 0, last: Date.now() });
  // While disarmed, incoming non-empty score messages are ignored — this keeps the
  // server from re-recording a round while the just-thrown darts are still stuck
  // in the board. We re-arm only after the board is observed empty.
  const armedRef = useRef(true);

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [latestScores, setLatestScores] = useState<ScoreTuple[]>([]);
  const [armed, setArmed] = useState(true);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [camId, setCamId] = useState("");
  const [selectedVideoName, setSelectedVideoName] = useState("");
  const [frameCount, setFrameCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [showRawPreview, setShowRawPreview] = useState(false);

  const stopCaptureLoop = useCallback(() => {
    if (captureLoopRef.current !== null) {
      cancelAnimationFrame(captureLoopRef.current);
      captureLoopRef.current = null;
    }
  }, []);

  const clearAnnotatedFrameTimeout = useCallback(() => {
    if (annotatedFrameTimeoutRef.current !== null) {
      clearTimeout(annotatedFrameTimeoutRef.current);
      annotatedFrameTimeoutRef.current = null;
    }
  }, []);

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }
  }, []);

  const clearSelectedVideo = useCallback(() => {
    if (selectedVideoUrlRef.current) {
      URL.revokeObjectURL(selectedVideoUrlRef.current);
      selectedVideoUrlRef.current = null;
    }
    selectedVideoFileRef.current = null;
    setSelectedVideoName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (videoRef.current) {
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
  }, []);

  const refreshCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices
      .filter((d) => d.kind === "videoinput")
      .map((d, i) => ({ id: d.deviceId, label: d.label || `Camera ${i + 1}` }));
    setAvailableCameras(cams);
    setCamId((prev) => prev || cams[0]?.id || "");
  }, []);

  const drawFrame = useCallback((bytes: ArrayBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = new Blob([bytes], { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) { pendingFrameRef.current = false; return; }
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      pendingFrameRef.current = false;
      setFrameCount((c) => c + 1);
      const now = Date.now();
      fpsCounterRef.current.count++;
      if (now - fpsCounterRef.current.last >= 1000) {
        setFps(fpsCounterRef.current.count);
        fpsCounterRef.current.count = 0;
        fpsCounterRef.current.last = now;
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); pendingFrameRef.current = false; };
    img.src = url;
  }, []);

  const startCaptureLoop = useCallback((ws: WebSocket) => {
    streamingActiveRef.current = true;
    const tick = () => {
      const video = videoRef.current;
      const cap = captureCanvasRef.current;
      if (!streamingActiveRef.current) { captureLoopRef.current = null; return; }
      if (!video || !cap || ws.readyState !== WebSocket.OPEN) {
        captureLoopRef.current = requestAnimationFrame(tick); return;
      }
      if (
        sendingFrameRef.current ||
        responsePartsPendingRef.current > 0 ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth === 0
      ) { captureLoopRef.current = requestAnimationFrame(tick); return; }

      const ctx = cap.getContext("2d");
      if (!ctx) { captureLoopRef.current = requestAnimationFrame(tick); return; }
      cap.width = CONFIG.game.CAPTURE_WIDTH;
      cap.height = CONFIG.game.CAPTURE_HEIGHT;
      // Normalize capture size before encoding so the inference server sees a
      // consistent input geometry across cameras.
      ctx.drawImage(video, 0, 0, CONFIG.game.CAPTURE_WIDTH, CONFIG.game.CAPTURE_HEIGHT);
      sendingFrameRef.current = true;

      cap.toBlob(async (blob) => {
        if (!streamingActiveRef.current || wsRef.current !== ws) { sendingFrameRef.current = false; return; }
        if (!blob) { sendingFrameRef.current = false; return; }
        try {
          const bytes = await blob.arrayBuffer();
          if (streamingActiveRef.current && wsRef.current === ws && ws.readyState === WebSocket.OPEN) {
            // Each frame should yield one JSON payload and one annotated image.
            responsePartsPendingRef.current = 2;
            ws.send(bytes);
          }
        } finally { sendingFrameRef.current = false; }
      }, "image/jpeg", 0.8);

      captureLoopRef.current = requestAnimationFrame(tick);
    };
    stopCaptureLoop();
    captureLoopRef.current = requestAnimationFrame(tick);
  }, [stopCaptureLoop]);

  const startMediaStream = useCallback(async (selectedCamId: string) => {
    stopMediaStream();
    const video = videoRef.current;
    if (!video) throw new Error("No video element");

    if (selectedCamId === CONFIG.game.VIDEO_SOURCE_ID) {
      const file = selectedVideoFileRef.current;
      if (!file) throw new Error("No video file selected");
      if (selectedVideoUrlRef.current) URL.revokeObjectURL(selectedVideoUrlRef.current);
      const videoUrl = URL.createObjectURL(file);
      selectedVideoUrlRef.current = videoUrl;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          video.removeEventListener("canplay", onCanPlay);
          video.removeEventListener("error", onError);
        };
        const onCanPlay = () => { cleanup(); resolve(); };
        const onError = () => {
          cleanup();
          reject(new Error(video.error ? `Video error ${video.error.code}` : "Failed to load video"));
        };
        video.addEventListener("canplay", onCanPlay);
        video.addEventListener("error", onError);
        video.src = videoUrl;
        video.currentTime = 0;
        video.load();
        if (video.error) onError();
      });
      await video.play();
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: selectedCamId
        ? { deviceId: { exact: selectedCamId }, width: { ideal: CONFIG.game.CAPTURE_WIDTH }, height: { ideal: CONFIG.game.CAPTURE_HEIGHT } }
        : { width: { ideal: CONFIG.game.CAPTURE_WIDTH }, height: { ideal: CONFIG.game.CAPTURE_HEIGHT } },
      audio: false,
    });
    mediaStreamRef.current = stream;
    video.srcObject = stream;
    video.removeAttribute("src");
    await video.play();
    await refreshCameras();
  }, [refreshCameras, stopMediaStream]);

  const handleVideoFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    selectedVideoFileRef.current = file;
    setSelectedVideoName(file.name);
    setCamId(CONFIG.game.VIDEO_SOURCE_ID);
  }, []);

  const handleSourceChange = useCallback((value: string) => {
    if (value === CONFIG.game.VIDEO_SOURCE_ID) {
      setCamId(CONFIG.game.VIDEO_SOURCE_ID);
      fileInputRef.current?.click();
      return;
    }
    if (camId === CONFIG.game.VIDEO_SOURCE_ID) clearSelectedVideo();
    setCamId(value);
  }, [camId, clearSelectedVideo]);

  const connect = useCallback(async (selectedCamId: string) => {
    if (wsRef.current) {
      streamingActiveRef.current = false;
      if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: "stop" }));
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus("connecting");
    setLatestScores([]);
    setFrameCount(0);
    setFps(0);
    setShowRawPreview(false);
    pendingFrameRef.current = false;
    sendingFrameRef.current = false;
    responsePartsPendingRef.current = 0;
    streamingActiveRef.current = false;
    armedRef.current = true;
    setArmed(true);
    fpsCounterRef.current = { count: 0, last: Date.now() };
    clearAnnotatedFrameTimeout();
    stopCaptureLoop();
    stopMediaStream();

    const onMessage = (event: MessageEvent) => {
      if (responsePartsPendingRef.current > 0) responsePartsPendingRef.current -= 1;
      if (event.data instanceof ArrayBuffer) {
        if (!pendingFrameRef.current) { setShowRawPreview(false); pendingFrameRef.current = true; drawFrame(event.data); }
        return;
      }
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "error") {
          // Server bailed out (e.g. calibration failed on the first frame) and
          // won't send the matching annotated-frame chunk. Clear the pending
          // counter so the capture loop can send the next frame and retry —
          // otherwise we deadlock on a single failed frame and never recalibrate.
          responsePartsPendingRef.current = 0;
          return;
        }
        if (msg.type === "scores") {
          const scores = msg.scores as ScoreTuple[];
          // Always reflect the latest detection in the UI (matches /test).
          setLatestScores(scores);
          // Re-arm when the board is observed empty. We deliberately do NOT
          // disarm here when scores hit 3 — if we did, `armed` would flip
          // false in the same React batch as `latestScores` becoming length
          // 3, and the auto-advance effect would skip the round entirely.
          // Disarming is the responsibility of `clearScores`, which runs
          // after the round has been recorded.
          if (scores.length === 0) {
            armedRef.current = true;
            setArmed(true);
          }
        }
      } catch { }
    };

    const onClose = () => {
      streamingActiveRef.current = false;
      wsRef.current = null;
      responsePartsPendingRef.current = 0;
      stopCaptureLoop();
      stopMediaStream();
      clearAnnotatedFrameTimeout();
      setStatus("disconnected");
      setShowRawPreview(false);
      intentionalCloseRef.current = false;
    };

    try {
      if (selectedCamId === CONFIG.game.VIDEO_SOURCE_ID) {
        const file = selectedVideoFileRef.current;
        if (!file) throw new Error("No video file selected");
        const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".mp4";
        const fileBytes = await file.arrayBuffer();

        const ws = new WebSocket("ws://localhost:8000/video/ws");
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;
        ws.onopen = () => {
          // File playback uses a different websocket endpoint that ingests the
          // entire clip instead of a live frame-by-frame stream.
          ws.send(JSON.stringify({ cam_id: selectedCamId, frame_skip: 2, ext }));
          ws.send(fileBytes);
          setStatus("connected");
          setShowRawPreview(true);
        };
        ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) { onMessage(event); return; }
          try {
            const msg = JSON.parse(event.data as string);
            if (msg.type === "ready") return;
            if (msg.type === "done") { intentionalCloseRef.current = true; ws.close(1000); return; }
          } catch { }
          onMessage(event);
        };
        ws.onerror = () => setStatus("error");
        ws.onclose = onClose;
      } else {
        await startMediaStream(selectedCamId);
        const ws = new WebSocket(CONFIG.INFRENCE_API);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;
        ws.onopen = () => {
          // The server uses the initial JSON message to select the capture
          // source before binary frames start arriving.
          ws.send(JSON.stringify({ cam_id: selectedCamId }));
          setStatus("connected");
          setShowRawPreview(true);
          startCaptureLoop(ws);
        };
        ws.onmessage = onMessage;
        ws.onerror = () => setStatus("error");
        ws.onclose = onClose;
      }
    } catch {
      stopCaptureLoop();
      stopMediaStream();
      setStatus("error");
    }
  }, [clearAnnotatedFrameTimeout, drawFrame, startCaptureLoop, startMediaStream, stopCaptureLoop, stopMediaStream]);

  const disconnect = useCallback(() => {
    if (!wsRef.current) return;
    streamingActiveRef.current = false;
    responsePartsPendingRef.current = 0;
    stopCaptureLoop();
    stopMediaStream();
    clearAnnotatedFrameTimeout();
    if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: "stop" }));
    intentionalCloseRef.current = true;
    wsRef.current.close(1000);
    wsRef.current = null;
    setLatestScores([]);
    setFrameCount(0);
    setFps(0);
    setShowRawPreview(false);
  }, [clearAnnotatedFrameTimeout, stopCaptureLoop, stopMediaStream]);

  useEffect(() => {
    refreshCameras();
    const onDeviceChange = () => refreshCameras();
    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    return () => {
      streamingActiveRef.current = false;
      stopCaptureLoop();
      stopMediaStream();
      clearAnnotatedFrameTimeout();
      clearSelectedVideo();
      if (wsRef.current) {
        intentionalCloseRef.current = true;
        wsRef.current.close(1000);
        wsRef.current = null;
      }
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
    };
  }, [clearAnnotatedFrameTimeout, clearSelectedVideo, refreshCameras, stopCaptureLoop, stopMediaStream]);

  const hasSelectedVideo = () => selectedVideoFileRef.current !== null;

  // Clear the on-screen darts and disarm — auto-advance won't fire again
  // until the camera reports an empty board.
  const clearScores = useCallback(() => {
    armedRef.current = false;
    setArmed(false);
    setLatestScores([]);
  }, []);

  return {
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
  };
}
