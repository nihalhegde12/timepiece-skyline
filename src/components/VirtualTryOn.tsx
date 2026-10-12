import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Camera, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { watches } from '@/lib/watches';
import { armAdjustmentFromDrag, crossAdjustmentFromDrag, smoothWristOverlay, wristOverlayFromLandmarks, type WristOverlay } from '@/lib/wrist-overlay';
import { tryOnImages } from '@/lib/try-on-images';

type Watch = typeof watches[number];
type TryOnStatus = 'idle' | 'loading' | 'tracking' | 'searching' | 'denied' | 'unsupported' | 'error';

const statusText: Record<TryOnStatus, string> = {
  idle: 'Your camera stays on this device and is never recorded.',
  loading: 'Starting camera and wrist detection…',
  tracking: 'Wrist detected',
  searching: 'Hold one wrist in view with your hand open.',
  denied: 'Camera access was denied. Allow camera access in your browser settings and try again.',
  unsupported: 'Camera try-on is not supported by this browser.',
  error: 'Try-on could not start. Check your camera and try again.',
};

export function VirtualTryOn({ watch, open, onClose }: { watch: Watch; open: boolean; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<{ detectForVideo: (video: HTMLVideoElement, timestamp: number) => { landmarks?: Array<Array<{ x: number; y: number; z?: number }>> }; close?: () => void } | null>(null);
  const frameRef = useRef(0);
  const lastDetectionRef = useRef(0);
  const smoothOverlayRef = useRef<WristOverlay | null>(null);
  const sizeRef = useRef(1);
  const armAdjustmentRef = useRef(0);
  const crossAdjustmentRef = useRef(0);
  const mirroredRef = useRef(false);
  const sessionRef = useRef(0);
  const dragRef = useRef<{ id: number; x: number; y: number; start: number; crossStart: number; rotation: number; palmWidth: number } | null>(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<TryOnStatus>('idle');
  const [overlay, setOverlay] = useState<WristOverlay | null>(null);
  const [size, setSize] = useState(1);
  const [mirrored, setMirrored] = useState(false);

  useEffect(() => { sizeRef.current = size; }, [size]);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    dragRef.current = null;
    window.cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    detectorRef.current?.close?.();
    detectorRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    smoothOverlayRef.current = null;
    setOverlay(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; stop(); };
  }, [stop]);

  useEffect(() => {
    if (!open) { stop(); setStatus('idle'); setSize(1); armAdjustmentRef.current = 0; crossAdjustmentRef.current = 0; }
  }, [open, stop]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKeyDown); document.body.style.overflow = overflow; };
  }, [open, onClose]);

  const runDetection = useCallback(() => {
    const video = videoRef.current;
    const stage = stageRef.current;
    const detector = detectorRef.current;
    if (!video || !stage || !detector || !streamRef.current) return;
    const now = performance.now();
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && now - lastDetectionRef.current > 34) {
      lastDetectionRef.current = now;
       let result: ReturnType<typeof detector.detectForVideo>;
       try { result = detector.detectForVideo(video, now); }
       catch { stop(); setStatus('error'); return; }
      const landmarks = result.landmarks?.[0];
      if (landmarks) {
        const next = wristOverlayFromLandmarks(landmarks, {
          containerWidth: stage.clientWidth,
          containerHeight: stage.clientHeight,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
           mirrored: mirroredRef.current,
          }, sizeRef.current, armAdjustmentRef.current, crossAdjustmentRef.current);
        if (next) {
           const smoothed = smoothWristOverlay(smoothOverlayRef.current, next, dragRef.current ? 1 : .24);
          smoothOverlayRef.current = smoothed;
          setOverlay(smoothed);
          setStatus('tracking');
         } else { setOverlay(null); smoothOverlayRef.current = null; setStatus('searching'); }
      } else {
        setOverlay(null);
        smoothOverlayRef.current = null;
        setStatus('searching');
      }
    }
    frameRef.current = window.requestAnimationFrame(runDetection);
  }, [stop]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setStatus('unsupported'); return; }
    stop();
    const session = sessionRef.current;
    setStatus('loading');
    try {
      const [{ FilesetResolver, HandLandmarker }, stream] = await Promise.all([
        import('@mediapipe/tasks-vision'),
        navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } }),
      ]);
      if (!mountedRef.current || session !== sessionRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      const frontCamera = stream.getVideoTracks()[0]?.getSettings().facingMode === 'user';
      mirroredRef.current = frontCamera;
      setMirrored(frontCamera);
      const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm');
      if (session !== sessionRef.current) return;
      const detector = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
      if (session !== sessionRef.current) { detector.close(); return; }
      detectorRef.current = detector;
      const video = videoRef.current;
      if (!video) { stop(); return; }
      video.srcObject = stream;
      await video.play();
      if (session !== sessionRef.current) return;
      setStatus('searching');
      frameRef.current = window.requestAnimationFrame(runDetection);
    } catch (error) {
      if (session !== sessionRef.current) return;
      stop();
      const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      setStatus(denied ? 'denied' : 'error');
    }
  }, [open, runDetection, stop]);

  const beginDrag = (event: PointerEvent<HTMLImageElement>) => {
    if (!overlay) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, start: armAdjustmentRef.current, crossStart: crossAdjustmentRef.current, rotation: overlay.rotation, palmWidth: overlay.palmWidth };
  };
  const moveDrag = (event: PointerEvent<HTMLImageElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const adjustment = armAdjustmentFromDrag(drag.start, event.clientX - drag.x, event.clientY - drag.y, drag.rotation, drag.palmWidth);
    const delta = (adjustment - armAdjustmentRef.current) * drag.palmWidth;
    const crossAdjustment = crossAdjustmentFromDrag(drag.crossStart, event.clientX - drag.x, event.clientY - drag.y, drag.rotation, drag.palmWidth);
    const crossDelta = (crossAdjustment - crossAdjustmentRef.current) * drag.palmWidth;
    armAdjustmentRef.current = adjustment;
    crossAdjustmentRef.current = crossAdjustment;
    setOverlay(previous => {
      if (!previous) return null;
      const next = { ...previous, x: previous.x - Math.cos(drag.rotation) * delta - Math.sin(drag.rotation) * crossDelta, y: previous.y - Math.sin(drag.rotation) * delta + Math.cos(drag.rotation) * crossDelta };
      smoothOverlayRef.current = next;
      return next;
    });
  };
  const endDrag = () => { dragRef.current = null; };

  if (!open) return null;
  const cameraActive = ['loading', 'tracking', 'searching'].includes(status);
  return <div className="try-on-dialog" role="dialog" aria-modal="true" aria-labelledby="try-on-title">
    <header className="try-on-header">
      <div><p>Virtual fitting</p><h2 id="try-on-title">Try on {watch.name}</h2></div>
      <Button size="icon" variant="ghost" aria-label="Close virtual try-on" title="Close" onClick={onClose}><X /></Button>
    </header>
    <div className="try-on-stage" ref={stageRef} data-active={cameraActive}>
      <video ref={videoRef} className="try-on-video" data-mirrored={mirrored} playsInline muted aria-label="Live camera view" />
      {overlay && <img className="try-on-watch" src={tryOnImages[watch.id]} alt={`${watch.name} wrist fitting`} draggable={false} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} style={{ width: overlay.size, transform: `translate(-50%, -50%) rotate(${overlay.rotation}rad) scaleY(${overlay.tilt})`, left: overlay.x, top: overlay.y }} />}
      {!cameraActive && <div className="try-on-empty"><Camera aria-hidden="true" /><p>See this finish on your wrist.</p><Button onClick={start}>Start camera</Button></div>}
      <div className="try-on-reticle" aria-hidden="true" />
      <p className="try-on-status" role="status">{statusText[status]}</p>
    </div>
    <footer className="try-on-controls">
      <span>Fit</span>
      <div>
        <Button size="icon" variant="ghost" title="Make watch smaller" aria-label="Make watch smaller" disabled={!cameraActive || size <= .7} onClick={() => setSize(value => Math.max(.7, value - .1))}><Minus /></Button>
        <Button size="icon" variant="ghost" title="Reset watch fit" aria-label="Reset watch fit" disabled={!cameraActive} onClick={() => { setSize(1); armAdjustmentRef.current = 0; crossAdjustmentRef.current = 0; smoothOverlayRef.current = null; }}><RotateCcw /></Button>
        <Button size="icon" variant="ghost" title="Make watch larger" aria-label="Make watch larger" disabled={!cameraActive || size >= 1.4} onClick={() => setSize(value => Math.min(1.4, value + .1))}><Plus /></Button>
      </div>
      <span>{Math.round(size * 100)}%</span>
    </footer>
  </div>;
}