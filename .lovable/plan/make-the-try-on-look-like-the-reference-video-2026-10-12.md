# Make the try-on look like the reference video

## What the video shows
- You see the back of the wrist, and the watch lies flat on top of it, facing the camera.
- The full watch shows: the case in the middle and the metal bracelet going up and down across the wrist, so it looks like it wraps around the arm.
- The watch sits right behind the hand, on the narrow part of the wrist, with the crown pointing toward the hand.
- The case is a bit narrower than the wrist, and the bracelet runs off both edges of the arm.
- It stays put and turns with the wrist, and it doesn't flicker out when tracking drops for a moment.

## Why ours looks wrong now
The try-on pictures are tilted, cropped close-ups of the watch face with no full bracelet. Even when placed correctly, they look like a floating sticker instead of a watch worn on the wrist.

## Changes
1. **New try-on pictures (one per finish: steel, black, gold, rose gold)**
   - Flat, straight-on top view, transparent background, case centered, bracelet running straight up and down to both edges, crown on the right.
   - Match each finish to the collection colors. Collection photos stay as they are.
2. **Wearing it on the wrist**
   - Size it to the wrist: the case is about 80% of wrist width, and the bracelet runs past both edges of the arm.
   - Fade the bracelet ends and add a soft shadow under the case, so it looks wrapped around the arm instead of pasted on.
   - Move it slightly further onto the wrist (just behind the wrist crease), with the bracelet crossing the arm and the crown toward the hand.
3. **Steadier tracking**
   - Smoother movement, with less jitter in size and angle.
   - Keep the watch on screen for about half a second when tracking drops for a moment, then fade it out, instead of letting it flicker.
   - Show a short tip: "Show the back of your wrist, hand relaxed."
4. **Keep existing controls:** dragging to adjust, and the size − / reset / + buttons.

## Technical details
- `src/assets/try-on-*.png`: regenerate with transparent backgrounds as top-down shots. The case sits at about 45% of image height, and the bracelet fills the full height.
- `src/lib/wrist-overlay.ts`: add `wristWidth ≈ palmWidth * 0.9`. Set the image height to about 1.9 × wrist width and the width from the image aspect ratio. Move the anchor offset to about 0.25 × palm length behind landmark 0. Keep rotation so the image's vertical axis runs across the forearm, and keep foreshortening along the across-wrist axis.
- `smoothWristOverlay`: stronger smoothing for size and rotation (about 0.18), and lighter smoothing for position (about 0.3).
- `VirtualTryOn.tsx`: grace period for lost tracking (about 500 ms, then fade). Add a CSS mask fading the top and bottom 18% of the bracelet, plus a soft drop shadow.
- Update `src/test/wrist-overlay.test.ts` for the new size, anchor and rotation values, run the tests, and update `roadmap.md`.
