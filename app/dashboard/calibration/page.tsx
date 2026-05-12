"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Crosshair, Wifi, WifiOff } from "lucide-react";
import { CONFIG } from "@/lib/config";

type CalibrationStatus = "idle" | "starting" | "running" | "error";

type CameraOption = {
  id: string;
  label: string;
};

export default function CalibrationPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const activeRef = useRef(false);
  const selectedVideoFileRef = useRef<File | null>(null);
  const selectedVideoUrlRef = useRef<string | null>(null);

  const [status, setStatus] = useState<CalibrationStatus>("idle");
  const [availableCameras, setAvailableCameras] = useState<CameraOption[]>([]);
  const [camId, setCamId] = useState("");
  const [selectedVideoName, setSelectedVideoName] = useState("");
  const [hasSelectedVideo, setHasSelectedVideo] = useState(false);
  const [pointsDetected, setPointsDetected] = useState(0);
  const [homographyReady, setHomographyReady] = useState(false);
  const [cacheActive, setCacheActive] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState("Start calibration to inspect markers.");

  const usingVideoFile = camId === CONFIG.game.VIDEO_SOURCE_ID;
  const canStartCalibration = usingVideoFile
    ? hasSelectedVideo
    : availableCameras.length > 0;

  const stopLoop = useCallback(() => {
    activeRef.current = false;
    if (loopRef.current !== null) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
    processingRef.current = false;
  }, []);

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
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
    setHasSelectedVideo(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (videoRef.current) {
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
  }, []);

  const refreshCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices
      .filter((device) => device.kind === "videoinput")
      .map((device, index) => ({
        id: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
      }));

    setAvailableCameras(cameras);
    setCamId((prev) => {
      if (prev === CONFIG.game.VIDEO_SOURCE_ID) {
        return prev;
      }
      return prev || cameras[0]?.id || "";
    });
  }, []);

  const drawAnnotatedBlob = useCallback((blob: Blob) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  }, []);

  const startMediaStream = useCallback(async (selectedCamId: string) => {
    stopMediaStream();
    const video = videoRef.current;
    if (!video) {
      throw new Error("Preview video element is unavailable");
    }

    if (selectedCamId === CONFIG.game.VIDEO_SOURCE_ID) {
      const file = selectedVideoFileRef.current;
      if (!file) {
        throw new Error("Choose a video file first");
      }

      if (selectedVideoUrlRef.current) {
        URL.revokeObjectURL(selectedVideoUrlRef.current);
      }

      const videoUrl = URL.createObjectURL(file);
      selectedVideoUrlRef.current = videoUrl;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          video.removeEventListener("canplay", handleCanPlay);
          video.removeEventListener("error", handleError);
        };
        const handleCanPlay = () => {
          cleanup();
          resolve();
        };
        const handleError = () => {
          cleanup();
          reject(new Error(video.error ? `Video error ${video.error.code}` : "Failed to load video"));
        };

        video.addEventListener("canplay", handleCanPlay);
        video.addEventListener("error", handleError);
        video.src = videoUrl;
        video.currentTime = 0;
        video.load();
        if (video.error) {
          handleError();
        }
      });

      await video.play();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Browser camera capture is not supported");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: selectedCamId
        ? {
            deviceId: { exact: selectedCamId },
            width: { ideal: CONFIG.game.CAPTURE_WIDTH },
            height: { ideal: CONFIG.game.CAPTURE_HEIGHT },
          }
        : {
            width: { ideal: CONFIG.game.CAPTURE_WIDTH },
            height: { ideal: CONFIG.game.CAPTURE_HEIGHT },
          },
      audio: false,
    });

    mediaStreamRef.current = stream;
    video.srcObject = stream;
    video.removeAttribute("src");
    await video.play();
    await refreshCameras();
  }, [refreshCameras, stopMediaStream]);

  const sendCalibrationFrame = useCallback(async (selectedCamId: string, blob: Blob) => {
    const formData = new FormData();
    formData.append("cam_id", selectedCamId);
    formData.append("file", blob, "frame.jpg");

    const response = await fetch(`${CONFIG.INFERENCE_HTTP_BASE}/calibration/frame`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Calibration request failed");
    }

    setPointsDetected(Number(response.headers.get("X-Calibration-Points") || 0));
    setHomographyReady(response.headers.get("X-Calibration-Ready") === "true");
    setCacheActive(response.headers.get("X-Calibration-Cache-Active") === "true");

    const blobResponse = await response.blob();
    drawAnnotatedBlob(blobResponse);
  }, [drawAnnotatedBlob]);

  const startCalibration = useCallback(async () => {
    try {
      setStatus("starting");
      setLastError(null);
      setPointsDetected(0);
      setHomographyReady(false);
      setLastAction("Starting calibration preview...");

      await startMediaStream(camId);

      activeRef.current = true;
      setStatus("running");

      const tick = () => {
        const video = videoRef.current;
        const captureCanvas = captureCanvasRef.current;
        if (!activeRef.current) {
          loopRef.current = null;
          return;
        }
        if (!video || !captureCanvas || processingRef.current) {
          loopRef.current = requestAnimationFrame(tick);
          return;
        }
        if (
          video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
          video.videoWidth === 0 ||
          video.videoHeight === 0
        ) {
          loopRef.current = requestAnimationFrame(tick);
          return;
        }

        const ctx = captureCanvas.getContext("2d");
        if (!ctx) {
          loopRef.current = requestAnimationFrame(tick);
          return;
        }

        captureCanvas.width = CONFIG.game.CAPTURE_WIDTH;
        captureCanvas.height = CONFIG.game.CAPTURE_HEIGHT;
        ctx.drawImage(video, 0, 0, CONFIG.game.CAPTURE_WIDTH, CONFIG.game.CAPTURE_HEIGHT);
        processingRef.current = true;

        captureCanvas.toBlob(async (blob) => {
          if (!blob || !activeRef.current) {
            processingRef.current = false;
            return;
          }

          try {
            await sendCalibrationFrame(camId, blob);
            setLastAction("Inspect the overlay, then cache the latest successful homography.");
          } catch (error) {
            setStatus("error");
            setLastError(error instanceof Error ? error.message : "Calibration failed");
            stopLoop();
          } finally {
            processingRef.current = false;
          }
        }, "image/jpeg", 0.85);

        loopRef.current = requestAnimationFrame(tick);
      };

      stopLoop();
      activeRef.current = true;
      loopRef.current = requestAnimationFrame(tick);
    } catch (error) {
      stopLoop();
      stopMediaStream();
      setStatus("error");
      setLastError(error instanceof Error ? error.message : "Failed to start calibration");
    }
  }, [camId, sendCalibrationFrame, startMediaStream, stopLoop, stopMediaStream]);

  const stopCalibration = useCallback(() => {
    stopLoop();
    stopMediaStream();
    setStatus("idle");
    setLastAction("Calibration stopped.");
  }, [stopLoop, stopMediaStream]);

  const postCacheAction = useCallback(async (path: string, successMessage: string) => {
    const formData = new FormData();
    formData.append("cam_id", camId);

    const response = await fetch(`${CONFIG.INFERENCE_HTTP_BASE}${path}`, {
      method: "POST",
      body: formData,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.detail || "Calibration cache request failed");
    }

    setLastError(null);
    setLastAction(successMessage);
    return payload;
  }, [camId]);

  const cacheLatestCalibration = useCallback(async () => {
    try {
      await postCacheAction("/calibration/cache", "Cached homography for normal gameplay.");
      setCacheActive(true);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Unable to cache calibration");
    }
  }, [postCacheAction]);

  const clearCachedCalibration = useCallback(async () => {
    try {
      await postCacheAction("/calibration/cache/clear", "Cleared cached homography. Continue previewing to recalibrate.");
      setCacheActive(false);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Unable to clear cached calibration");
    }
  }, [postCacheAction]);

  const handleVideoFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    selectedVideoFileRef.current = file;
    setSelectedVideoName(file.name);
    setHasSelectedVideo(true);
    setCamId(CONFIG.game.VIDEO_SOURCE_ID);
    setLastError(null);
  }, []);

  const handleSourceChange = useCallback((value: string) => {
    if (value === CONFIG.game.VIDEO_SOURCE_ID) {
      setCamId(CONFIG.game.VIDEO_SOURCE_ID);
      fileInputRef.current?.click();
      return;
    }

    if (camId === CONFIG.game.VIDEO_SOURCE_ID) {
      clearSelectedVideo();
    }

    setCamId(value);
  }, [camId, clearSelectedVideo]);

  useEffect(() => {
    const initId = window.setTimeout(() => {
      refreshCameras().catch(() => {
        setLastError("Unable to enumerate cameras");
      });
    }, 0);

    const onDeviceChange = () => {
      refreshCameras().catch(() => {
        setLastError("Unable to refresh camera list");
      });
    };

    navigator.mediaDevices?.addEventListener?.("devicechange", onDeviceChange);
    return () => {
      window.clearTimeout(initId);
      stopLoop();
      stopMediaStream();
      clearSelectedVideo();
      navigator.mediaDevices?.removeEventListener?.("devicechange", onDeviceChange);
    };
  }, [clearSelectedVideo, refreshCameras, stopLoop, stopMediaStream]);

  const statusColor: Record<CalibrationStatus, string> = {
    idle: "text-slate-400",
    starting: "text-amber-400",
    running: "text-emerald-400",
    error: "text-red-400",
  };

  const statusLabel: Record<CalibrationStatus, string> = {
    idle: "Idle",
    starting: "Starting…",
    running: "Calibrating",
    error: "Error",
  };

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 lg:px-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.mp4,.mov,.m4v,.webm"
        className="hidden"
        onChange={handleVideoFileChange}
      />

      <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Board Calibration</p>
            <h1 className="text-3xl font-semibold">Lock a homography before live scoring</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              This view recalculates calibration on every preview frame, shows detected markers immediately,
              and lets you promote the latest valid homography into the gameplay cache.
            </p>
          </div>

          <div className={`flex items-center gap-2 text-sm font-medium ${statusColor[status]}`}>
            {status === "running" ? <Wifi size={16} /> : <WifiOff size={16} />}
            {statusLabel[status]}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Camera size={16} />
              <select
                value={camId}
                onChange={(event) => handleSourceChange(event.target.value)}
                disabled={status === "starting" || status === "running"}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {availableCameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>{camera.label}</option>
                ))}
                <option value={CONFIG.game.VIDEO_SOURCE_ID}>
                  {selectedVideoName ? `Video: ${selectedVideoName}` : "Video file"}
                </option>
              </select>
            </div>

            {status === "running" || status === "starting" ? (
              <button
                onClick={stopCalibration}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                Stop Preview
              </button>
            ) : (
              <button
                onClick={startCalibration}
                disabled={!canStartCalibration}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:opacity-90 disabled:opacity-40"
              >
                Start Calibration
              </button>
            )}

            <button
              onClick={cacheLatestCalibration}
              disabled={!homographyReady}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
            >
              Cache Latest Homography
            </button>

            <button
              onClick={clearCachedCalibration}
              className="rounded-lg border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Clear Cache
            </button>
          </div>

          <canvas ref={captureCanvasRef} className="hidden" />
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-border bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-contain opacity-0 pointer-events-none"
              muted
              playsInline
              autoPlay
            />
            <canvas ref={canvasRef} className="h-full w-full object-contain" />
            {status !== "running" && status !== "starting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-300">
                <Crosshair size={42} strokeWidth={1.5} />
                <p className="text-sm">
                  {camId === CONFIG.game.VIDEO_SOURCE_ID && !selectedVideoName
                    ? "Choose a video file to preview calibration"
                    : "Start calibration to see the annotated feed"}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Latest Frame</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Markers</p>
                <p className="mt-2 text-3xl font-semibold">{pointsDetected}</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ready To Cache</p>
                <p className="mt-2 text-3xl font-semibold">{homographyReady ? "Yes" : "No"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/40 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Gameplay Cache</p>
                <p className="mt-2 text-3xl font-semibold">{cacheActive ? "Active" : "Cleared"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Operator Notes</h2>
            <p className="mt-3 text-sm text-muted-foreground">{lastAction}</p>
            {lastError && (
              <p className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {lastError}
              </p>
            )}
            <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              If four distinct markers are visible, the server overlays the scoring rings and stores that frame as
              the latest calibration candidate. If fewer are visible, the frame still comes back annotated with the
              detections that were found.
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Recalibration Flow</h2>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <p>1. Start the preview and adjust the board until the marker count reaches four.</p>
              <p>2. Confirm the ring overlay looks correct, then cache the latest homography.</p>
              <p>3. Clear the cache any time you move the camera or board, then keep previewing until a new solve looks right.</p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
