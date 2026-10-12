# Virtual Watch Try-On

## Goal
Add an advanced virtual try-on to every individual watch page. Customers can start their camera, hold up a wrist, and see the currently selected watch follow it in real time as a lightweight 2D overlay.

## Experience
- Add a clear **Try on** action beside the existing watch viewer controls.
- Open a focused, full-screen try-on view with the live camera, selected watch name, close control, and privacy/status feedback.
- Request camera access only after the customer presses **Start camera**; prefer the rear camera on mobile and mirror the front camera when used.
- Detect wrist position from MediaPipe hand landmarks and continuously align the watch overlay by position, rotation, and estimated wrist width.
- Reuse the existing transparent image for each selected watch, so all four finishes work without introducing unrelated artwork.
- Provide size decrease/increase controls plus reset, allowing customers to correct the automatic fit.
- Show clear states for loading, no wrist detected, permission denied, unsupported camera, and detection failure. Stop camera tracks immediately when the view closes or the page changes.
- Keep the feature usable on desktop and mobile, including safe-area spacing, keyboard-accessible controls, and reduced-motion behavior.

## Technical details
- Add MediaPipe Tasks Vision and load the hand-landmark model lazily only when try-on starts, keeping the normal watch page lightweight.
- Isolate camera, landmark math, and overlay rendering in a dedicated client-side try-on component.
- Use landmark geometry around the wrist and palm to calculate a stable wrist center, angle, and scale; smooth successive frames to reduce jitter.
- Keep all camera processing local in the browser; do not capture, upload, or save video or images.
- Add small unit tests for the deterministic wrist-to-overlay calculations, including angle, scale, manual size adjustment, and invalid landmark handling.
- Record the new client-only try-on boundary in the project architecture notes and add the work to the existing roadmap.

## Verification
- Verify camera lifecycle and fallback states in the live preview.
- Verify watch selection, tracking, rotation, size controls, close/reopen behavior, and denied-permission behavior.
- Check the watch page at desktop and mobile dimensions, then confirm the project builds without errors and the focused tests pass.
