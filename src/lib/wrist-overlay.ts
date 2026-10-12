export type NormalizedLandmark = { x: number; y: number; z?: number };

export type VideoFit = {
  containerWidth: number;
  containerHeight: number;
  videoWidth: number;
  videoHeight: number;
  mirrored: boolean;
};

export type WristOverlay = {
  x: number;
  y: number;
  size: number;
  rotation: number;
  palmWidth: number;
  tilt: number;
};

function toCoverPoint(point: NormalizedLandmark, fit: VideoFit) {
  const scale = Math.max(fit.containerWidth / fit.videoWidth, fit.containerHeight / fit.videoHeight);
  const renderedWidth = fit.videoWidth * scale;
  const renderedHeight = fit.videoHeight * scale;
  const cropX = (renderedWidth - fit.containerWidth) / 2;
  const cropY = (renderedHeight - fit.containerHeight) / 2;
  const rawX = point.x * renderedWidth - cropX;
  return {
    x: fit.mirrored ? fit.containerWidth - rawX : rawX,
    y: point.y * renderedHeight - cropY,
  };
}

export function wristOverlayFromLandmarks(
  landmarks: readonly NormalizedLandmark[],
  fit: VideoFit,
  sizeAdjustment = 1,
  armAdjustment = 0,
  crossAdjustment = 0,
): WristOverlay | null {
  const wrist = landmarks[0];
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];
  if (!wrist || !indexMcp || !pinkyMcp || fit.videoWidth <= 0 || fit.videoHeight <= 0 || fit.containerWidth <= 0 || fit.containerHeight <= 0) return null;
  if (![wrist, indexMcp, pinkyMcp].every(point => Number.isFinite(point.x) && Number.isFinite(point.y)) || ![sizeAdjustment, armAdjustment, crossAdjustment].every(Number.isFinite)) return null;

  const wristPoint = toCoverPoint(wrist, fit);
  const indexPoint = toCoverPoint(indexMcp, fit);
  const pinkyPoint = toCoverPoint(pinkyMcp, fit);
  const palmCenter = {
    x: (indexPoint.x + pinkyPoint.x) / 2,
    y: (indexPoint.y + pinkyPoint.y) / 2,
  };
  const palmWidth = Math.hypot(indexPoint.x - pinkyPoint.x, indexPoint.y - pinkyPoint.y);
  if (!Number.isFinite(palmWidth) || palmWidth < 4) return null;
  const palmLength = Math.hypot(palmCenter.x - wristPoint.x, palmCenter.y - wristPoint.y);
  if (palmLength < 4) return null;
  const offset = palmLength * .5 + palmWidth * armAdjustment;
  const axisX = (palmCenter.x - wristPoint.x) / palmLength;
  const axisY = (palmCenter.y - wristPoint.y) / palmLength;
  // Depth foreshortens the bracelet across the wrist, not the arm direction.
  const coverScale = Math.max(fit.containerWidth / fit.videoWidth, fit.containerHeight / fit.videoHeight);
  const depth = ((indexMcp.z ?? 0) - (pinkyMcp.z ?? 0)) * fit.videoWidth * coverScale;
  const tilt = Number.isFinite(depth) ? Math.max(.6, palmWidth / Math.hypot(palmWidth, depth)) : 1;

  return {
    x: wristPoint.x - axisX * offset - axisY * palmWidth * crossAdjustment,
    y: wristPoint.y - axisY * offset + axisX * palmWidth * crossAdjustment,
    size: Math.max(24, Math.min(Math.min(fit.containerWidth, fit.containerHeight) * .8, palmWidth * 1.35 * sizeAdjustment)),
    // Source crown points right: keep it toward the hand, bracelet across the arm.
    rotation: Math.atan2(axisY, axisX),
    palmWidth,
    tilt,
  };
}

/** Keep manual placement in palm-width units so it follows camera distance and rotation. */
export function armAdjustmentFromDrag(start: number, dx: number, dy: number, rotation: number, palmWidth: number) {
  if (![start, dx, dy, rotation, palmWidth].every(Number.isFinite) || palmWidth <= 0) return start;
  return Math.max(-.6, Math.min(1.2, start - (Math.cos(rotation) * dx + Math.sin(rotation) * dy) / palmWidth));
}

export function crossAdjustmentFromDrag(start: number, dx: number, dy: number, rotation: number, palmWidth: number) {
  if (![start, dx, dy, rotation, palmWidth].every(Number.isFinite) || palmWidth <= 0) return start;
  return Math.max(-.5, Math.min(.5, start + (-Math.sin(rotation) * dx + Math.cos(rotation) * dy) / palmWidth));
}

export function smoothWristOverlay(previous: WristOverlay | null, next: WristOverlay, amount = 0.24): WristOverlay {
  if (!previous) return next;
  const blend = (from: number, to: number) => from + (to - from) * amount;
  let rotationDelta = next.rotation - previous.rotation;
  while (rotationDelta > Math.PI) rotationDelta -= Math.PI * 2;
  while (rotationDelta < -Math.PI) rotationDelta += Math.PI * 2;
  return {
    x: blend(previous.x, next.x),
    y: blend(previous.y, next.y),
    size: blend(previous.size, next.size),
    rotation: previous.rotation + rotationDelta * amount,
    palmWidth: blend(previous.palmWidth, next.palmWidth),
    tilt: blend(previous.tilt, next.tilt),
  };
}