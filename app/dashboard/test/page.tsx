"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { Wifi, WifiOff, Camera, Target, RefreshCw, Crosshair } from "lucide-react"
import { CONFIG} from "@/lib/config"

type ScoreTuple = [number, string]

type ScoresMessage = {
  type: "scores"
  cam_id: number
  scores: ScoreTuple[]
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

type CameraOption = {
  id: string
  label: string
}

function ScoreBadge({ score, desc }: { score: number; desc: string }) {
  const isTriple = desc.toUpperCase().includes("T") || desc.toUpperCase().includes("TRIPLE")
  const isDouble = desc.toUpperCase().includes("D") || desc.toUpperCase().includes("DOUBLE")
  const isBull = score === 25 || score === 50

  let badgeClass = "bg-slate-700 text-white"
  if (isBull) badgeClass = "bg-amber-500 text-black"
  else if (isTriple) badgeClass = "bg-red-600 text-white"
  else if (isDouble) badgeClass = "bg-emerald-600 text-white"

  return (
    <div className={`flex flex-col items-center justify-center rounded-lg px-4 py-3 min-w-[80px] ${badgeClass}`}>
      <span className="text-2xl font-black">{score}</span>
      <span className="text-xs font-mono mt-0.5 opacity-80">{desc}</span>
    </div>
  )
}

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const pendingFrameRef = useRef<boolean>(false)
  const intentionalCloseRef = useRef<boolean>(false)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const captureLoopRef = useRef<number | null>(null)
  const annotatedFrameTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const sendingFrameRef = useRef<boolean>(false)
  const streamingActiveRef = useRef<boolean>(false)
  const responsePartsPendingRef = useRef<number>(0)
  const selectedVideoFileRef = useRef<File | null>(null)
  const selectedVideoUrlRef = useRef<string | null>(null)

  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const [latestScores, setLatestScores] = useState<ScoreTuple[]>([])
  const [scoreHistory, setScoreHistory] = useState<ScoreTuple[][]>([])
  const [availableCameras, setAvailableCameras] = useState<CameraOption[]>([])
  const [camId, setCamId] = useState<string>("")
  const [selectedVideoName, setSelectedVideoName] = useState<string>("")
  const [frameCount, setFrameCount] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [fps, setFps] = useState(0)
  const [showRawPreview, setShowRawPreview] = useState(false)

  const fpsCounterRef = useRef({ count: 0, last: Date.now() })

  const stopCaptureLoop = useCallback(() => {
    if (captureLoopRef.current !== null) {
      cancelAnimationFrame(captureLoopRef.current)
      captureLoopRef.current = null
    }
  }, [])

  const clearAnnotatedFrameTimeout = useCallback(() => {
    if (annotatedFrameTimeoutRef.current !== null) {
      window.clearTimeout(annotatedFrameTimeoutRef.current)
      annotatedFrameTimeoutRef.current = null
    }
  }, [])

  const stopMediaStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop())
    mediaStreamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.pause()
    }
  }, [])

  const clearSelectedVideo = useCallback(() => {
    if (selectedVideoUrlRef.current) {
      URL.revokeObjectURL(selectedVideoUrlRef.current)
      selectedVideoUrlRef.current = null
    }

    selectedVideoFileRef.current = null
    setSelectedVideoName("")

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    if (videoRef.current) {
      videoRef.current.removeAttribute("src")
      videoRef.current.load()
    }
  }, [])

  const refreshCameras = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return
    }

    const devices = await navigator.mediaDevices.enumerateDevices()
    const cameras = devices
      .filter(device => device.kind === "videoinput")
      .map((device, index) => ({
        id: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
      }))

    setAvailableCameras(cameras)
    setCamId(prev => prev || cameras[0]?.id || "")
  }, [])

  const startCaptureLoop = useCallback((ws: WebSocket) => {
    streamingActiveRef.current = true

    const tick = () => {
      const video = videoRef.current
      const captureCanvas = captureCanvasRef.current

      if (!streamingActiveRef.current) {
        captureLoopRef.current = null
        return
      }

      if (!video || !captureCanvas || ws.readyState !== WebSocket.OPEN) {
        captureLoopRef.current = requestAnimationFrame(tick)
        return
      }

      if (
        sendingFrameRef.current ||
        responsePartsPendingRef.current > 0 ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        captureLoopRef.current = requestAnimationFrame(tick)
        return
      }

      const ctx = captureCanvas.getContext("2d")
      if (!ctx) {
        captureLoopRef.current = requestAnimationFrame(tick)
        return
      }

      captureCanvas.width = CONFIG.game.CAPTURE_WIDTH
      captureCanvas.height = CONFIG.game.CAPTURE_HEIGHT
      ctx.drawImage(
        video, 0, 0, 
        CONFIG.game.CAPTURE_WIDTH, 
        CONFIG.game.CAPTURE_HEIGHT
      )
      sendingFrameRef.current = true

      captureCanvas.toBlob(async blob => {
        if (!streamingActiveRef.current || wsRef.current !== ws) {
          sendingFrameRef.current = false
          return
        }

        if (!blob) {
          sendingFrameRef.current = false
          return
        }

        try {
          const bytes = await blob.arrayBuffer()
          if (streamingActiveRef.current && wsRef.current === ws && ws.readyState === WebSocket.OPEN) {
            responsePartsPendingRef.current = 2
            ws.send(bytes)
          }
        } catch {
          if (ws.readyState === WebSocket.OPEN) {
            setLastError("Failed to encode camera frame")
          }
        } finally {
          sendingFrameRef.current = false
        }
      }, "image/jpeg", 0.8)

      captureLoopRef.current = requestAnimationFrame(tick)
    }

    stopCaptureLoop()
    captureLoopRef.current = requestAnimationFrame(tick)
  }, [stopCaptureLoop])

  const startMediaStream = useCallback(async (selectedCamId: string) => {
    stopMediaStream()

    const video = videoRef.current
    if (!video) {
      throw new Error("Preview video element is unavailable")
    }

    if (selectedCamId === CONFIG.game.VIDEO_SOURCE_ID) {
      const selectedVideoFile = selectedVideoFileRef.current
      if (!selectedVideoFile) {
        throw new Error("Please choose a video file first")
      }

      if (selectedVideoUrlRef.current) {
        URL.revokeObjectURL(selectedVideoUrlRef.current)
      }

      const videoUrl = URL.createObjectURL(selectedVideoFile)
      selectedVideoUrlRef.current = videoUrl

      video.loop = true
      video.muted = true
      video.playsInline = true

      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          video.removeEventListener("canplay", handleCanPlay)
          video.removeEventListener("error", handleError)
        }

        const handleCanPlay = () => {
          cleanup()
          resolve()
        }

        const handleError = () => {
          cleanup()
          const err = video.error
          reject(new Error(err ? `Video error ${err.code}: ${err.message}` : "Failed to load video file"))
        }

        video.addEventListener("canplay", handleCanPlay)
        video.addEventListener("error", handleError)

        video.src = videoUrl
        video.currentTime = 0
        video.load()

        if (video.error) {
          handleError()
        }
      })

      await video.play()
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Browser camera capture is not supported")
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: selectedCamId
        ? {
            deviceId: { exact: selectedCamId },
            width: { ideal: CONFIG.game.CAPTURE_WIDTH },
            height: { ideal: CONFIG.game.CAPTURE_WIDTH },
          }
        : {
            width: { ideal: CONFIG.game.CAPTURE_WIDTH },
            height: { ideal: CONFIG.game.CAPTURE_HEIGHT },
          },
      audio: false,
    })

    mediaStreamRef.current = stream

    video.srcObject = stream
    video.removeAttribute("src")
    await video.play()
    await refreshCameras()
  }, [refreshCameras, stopMediaStream])

  const drawFrame = useCallback((bytes: ArrayBuffer) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const blob = new Blob([bytes], { type: "image/jpeg" })
    const url = URL.createObjectURL(blob)
    const img = new Image()

    img.onload = () => {
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        pendingFrameRef.current = false
        return
      }

      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      pendingFrameRef.current = false

      setFrameCount(c => c + 1)

      const now = Date.now()
      fpsCounterRef.current.count++
      if (now - fpsCounterRef.current.last >= 1000) {
        setFps(fpsCounterRef.current.count)
        fpsCounterRef.current.count = 0
        fpsCounterRef.current.last = now
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      pendingFrameRef.current = false
    }

    img.src = url
  }, [])

  const connect = useCallback(async (selectedCamId: string) => {
    if (wsRef.current) {
      streamingActiveRef.current = false
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "stop" }))
      }
      wsRef.current.close()
      wsRef.current = null
    }

    setStatus("connecting")
    setLastError(null)
    setFrameCount(0)
    setFps(0)
    setShowRawPreview(false)
    setLatestScores([])
    pendingFrameRef.current = false
    sendingFrameRef.current = false
    responsePartsPendingRef.current = 0
    streamingActiveRef.current = false
    fpsCounterRef.current = { count: 0, last: Date.now() }
    clearAnnotatedFrameTimeout()
    stopCaptureLoop()
    stopMediaStream()

    const sharedOnMessage = (event: MessageEvent) => {
      if (responsePartsPendingRef.current > 0) {
        responsePartsPendingRef.current -= 1
      }
      if (event.data instanceof ArrayBuffer) {
        if (!pendingFrameRef.current) {
          setShowRawPreview(false)
          pendingFrameRef.current = true
          drawFrame(event.data)
        }
        return
      }
      try {
        const msg = JSON.parse(event.data as string)
        if (msg.type === "scores") {
          const parsed = msg as ScoresMessage
          setLatestScores(parsed.scores)
          if (parsed.scores.length > 0) {
            setScoreHistory(prev => [parsed.scores, ...prev].slice(0, 20))
          }
        }
        if (msg.type === "error") {
          responsePartsPendingRef.current = 0
          setLastError(msg.message)
        }
      } catch { }
    }

    const sharedOnError = () => {
      setStatus("error")
      setLastError("WebSocket connection error")
    }

    const sharedOnClose = (e: CloseEvent) => {
      streamingActiveRef.current = false
      wsRef.current = null
      responsePartsPendingRef.current = 0
      stopCaptureLoop()
      stopMediaStream()
      clearAnnotatedFrameTimeout()
      if (!intentionalCloseRef.current && e.code !== 1000) {
        setLastError(`Connection closed (code ${e.code})`)
      }
      setStatus("disconnected")
      setShowRawPreview(false)
      intentionalCloseRef.current = false
    }

    try {
      if (selectedCamId === CONFIG.game.VIDEO_SOURCE_ID) {
        // --- Video file path: upload to /video/ws, Python/OpenCV decodes ---
        const file = selectedVideoFileRef.current
        if (!file) throw new Error("No video file selected")

        const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".mp4"
        const fileBytes = await file.arrayBuffer()

        const ws = new WebSocket("ws://localhost:8000/video/ws")
        ws.binaryType = "arraybuffer"
        wsRef.current = ws

        ws.onopen = () => {
          ws.send(JSON.stringify({ cam_id: 0, frame_skip: 2, ext }))
          ws.send(fileBytes)
          setStatus("connected")
          setShowRawPreview(true)
        }

        ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            sharedOnMessage(event)
            return
          }
          try {
            const msg = JSON.parse(event.data as string)
            if (msg.type === "ready") return
            if (msg.type === "done") {
              intentionalCloseRef.current = true
              ws.close(1000)
              return
            }
          } catch { }
          sharedOnMessage(event)
        }

        ws.onerror = sharedOnError
        ws.onclose = sharedOnClose

      } else {
        // --- Live camera path: browser captures frames, sends to /ws ---
        await startMediaStream(selectedCamId)

        const ws = new WebSocket(CONFIG.INFRENCE_API)
        ws.binaryType = "arraybuffer"
        wsRef.current = ws

        ws.onopen = () => {
          ws.send(JSON.stringify({ cam_id: selectedCamId }))
          setStatus("connected")
          setShowRawPreview(true)
          startCaptureLoop(ws)
        }

        ws.onmessage = sharedOnMessage
        ws.onerror = sharedOnError
        ws.onclose = sharedOnClose
      }
    } catch (error) {
      stopCaptureLoop()
      stopMediaStream()
      setStatus("error")
      setLastError(error instanceof Error ? error.message : "Failed to connect")
    }
  }, [clearAnnotatedFrameTimeout, drawFrame, startCaptureLoop, startMediaStream, stopCaptureLoop, stopMediaStream])

  const disconnect = useCallback(() => {
    if (!wsRef.current) return
    streamingActiveRef.current = false
    responsePartsPendingRef.current = 0
    stopCaptureLoop()
    stopMediaStream()
    clearAnnotatedFrameTimeout()
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }))
    }
    intentionalCloseRef.current = true
    wsRef.current.close(1000, "User disconnected")
    wsRef.current = null
    pendingFrameRef.current = false
    sendingFrameRef.current = false
    setLatestScores([])
    setFrameCount(0)
    setFps(0)
    setShowRawPreview(false)
  }, [clearAnnotatedFrameTimeout, stopCaptureLoop, stopMediaStream])

  const handleVideoFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      if (camId === CONFIG.game.VIDEO_SOURCE_ID && !selectedVideoFileRef.current && availableCameras[0]?.id) {
        setCamId(availableCameras[0].id)
      }
      return
    }

    selectedVideoFileRef.current = file
    setSelectedVideoName(file.name)
    setCamId(CONFIG.game.VIDEO_SOURCE_ID)
    setLastError(null)
  }, [availableCameras, camId])

  const handleSourceChange = useCallback((value: string) => {
    if (value === CONFIG.game.VIDEO_SOURCE_ID) {
      setCamId(CONFIG.game.VIDEO_SOURCE_ID)
      fileInputRef.current?.click()
      return
    }

    if (camId === CONFIG.game.VIDEO_SOURCE_ID) {
      clearSelectedVideo()
    }

    setCamId(value)
  }, [camId, clearSelectedVideo])

  useEffect(() => {
    refreshCameras().catch(() => {
      setLastError("Unable to enumerate cameras")
    })

    const handleDeviceChange = () => {
      refreshCameras().catch(() => {
        setLastError("Unable to refresh camera list")
      })
    }

    navigator.mediaDevices?.addEventListener?.("devicechange", handleDeviceChange)

    return () => {
      streamingActiveRef.current = false
      responsePartsPendingRef.current = 0
      stopCaptureLoop()
      stopMediaStream()
      clearAnnotatedFrameTimeout()
      clearSelectedVideo()
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "stop" }))
        }
        intentionalCloseRef.current = true
        wsRef.current.close(1000, "Page unmounted")
        wsRef.current = null
      }

      navigator.mediaDevices?.removeEventListener?.("devicechange", handleDeviceChange)
    }
  }, [clearAnnotatedFrameTimeout, clearSelectedVideo, refreshCameras, stopCaptureLoop, stopMediaStream])

  const totalRoundScore = latestScores.reduce((acc, [s]) => acc + s, 0)

  const statusColor: Record<ConnectionStatus, string> = {
    disconnected: "text-slate-400",
    connecting: "text-amber-400",
    connected: "text-emerald-400",
    error: "text-red-400",
  }

  const statusLabel: Record<ConnectionStatus, string> = {
    disconnected: "Disconnected",
    connecting: "Connecting…",
    connected: "Live",
    error: "Error",
  }

  return (
    <main className="flex-1 h-screen  text-black flex flex-col overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.mp4,.mov,.m4v,.webm"
        className="hidden"
        onChange={handleVideoFileChange}
      />

      {/* Top bar */}
      <header className="flex items-center justify-between px-5 h-18 min-w-full">

        <div className="flex items-center gap-4">
          {/* Camera selector */}
          <div className="flex items-center gap-2 text-sm text-black">
            <Camera size={16} />
            <label htmlFor="cam-select" className="sr-only">Camera ID</label>
            <select
              id="cam-select"
              value={camId}
              onChange={e => handleSourceChange(e.target.value)}
              disabled={status === "connected" || status === "connecting"}
              className="bg-gray-600 border border-white/10 rounded px-2 py-1 text-white text-sm disabled:opacity-40"
            >
              {availableCameras.map(camera => (
                <option key={camera.id} value={camera.id}>{camera.label}</option>
              ))}
              <option value={CONFIG.game.VIDEO_SOURCE_ID}>{selectedVideoName ? `Video: ${selectedVideoName}` : "Video"}</option>
            </select>
          </div>

          {/* Status indicator */}
          <div className={`flex items-center gap-1.5 text-sm font-medium ${statusColor[status]}`}>
            {status === "connected" ? <Wifi size={16} /> : <WifiOff size={16} />}
            {statusLabel[status]}
          </div>

          {/* Connect / Disconnect */}
          {status === "connected" || status === "connecting" ? (
            <button
              onClick={disconnect}
              className="flex items-center gap-2 bg-red-700 hover:bg-red-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={() => connect(camId)}
              disabled={availableCameras.length === 0 && !selectedVideoFileRef.current}
              className="flex items-center gap-2 bg-[#C9C9EE] hover:bg-white text-black text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCw size={14} />
              Connect
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 gap-0 min-h-0">

        {/* Video feed */}
        <section className="flex-1 flex flex-col items-center justify-center p-6 gap-4 overflow-y-auto min-h-0">
          <canvas ref={captureCanvasRef} className="hidden" />
          <div className="relative w-full max-w-3xl aspect-video bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
            <video
              ref={videoRef}
              className={showRawPreview && status === "connected" ? "absolute inset-0 w-full h-full object-contain" : "hidden"}
              muted
              playsInline
              autoPlay
            />
            {(status !== "connected" || (!showRawPreview && frameCount === 0)) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Camera size={48} strokeWidth={1} />
                <p className="text-sm">
                  {status === "connecting"
                    ? "Connecting to inference server…"
                    : status === "connected"
                      ? "Waiting for frames…"
                      : camId === CONFIG.game.VIDEO_SOURCE_ID && !selectedVideoFileRef.current
                        ? "Choose a video file to start"
                        : availableCameras.length === 0 && !selectedVideoFileRef.current
                        ? "No camera devices found"
                        : "Press Connect to start"}
                </p>
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain"
              style={{ display: !showRawPreview && frameCount > 0 ? "block" : "none" }}
            />

            {/* Live badge */}
            {status === "connected" && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </div>
            )}

            {/* FPS counter */}
            {status === "connected" && (
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-slate-400 font-mono">
                {fps} fps · {frameCount} frames
              </div>
            )}
          </div>

          {/* Current round scores */}
          <div className="w-full max-w-3xl">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Current Detection</p>
            {latestScores.length === 0 ? (
              <div className="flex items-center gap-2 text-slate-600 text-sm">
                <Target size={16} />
                <span>No darts detected</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                {latestScores.map(([score, desc], i) => (
                  <ScoreBadge key={i} score={score} desc={desc} />
                ))}
                <div className="ml-auto text-right">
                  <p className="text-xs text-slate-500">Round Total</p>
                  <p className="text-3xl font-black text-[#C9C9EE]">{totalRoundScore}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
