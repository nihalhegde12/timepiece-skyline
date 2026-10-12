<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Build the private jet as one local procedural assembly so its compact fuselage, rear engines, windows, and wings share a reliable scroll transform without remote model dependencies.
- Use shared bespoke watch geometry with merged static meshes and locally generated dial textures for collection and detail views, keeping visual consistency without third-party model dependencies.
- Mount watch viewers client-side with React Three Fiber and local Lightformer lighting, and keep the airplane canvas selectors isolated from product-viewer canvases to preserve navigation and interaction.
- Keep each watch detail at a typed dynamic TanStack route with its own metadata so collection links are shareable and validated.
- Keep watch descriptions and visual detail labels in the shared catalog; mount the animated photo gallery only on individual watch pages, reusing existing photos without inventing specifications or changing the main collection.
- Keep per-watch close-up captions in the shared catalog and honor reduced-motion preferences in automatic gallery playback so each watch's story stays consistent and accessible.
- Use shared OrbitControls for manual watch rotation, suppress collection navigation after drags, and disable collection wheel zoom to preserve page scrolling.
- Drive watch assembly from a shared scroll-progress calculation in a sticky stage after the product viewer, rather than a timed loop, so all finishes assemble consistently and reverse with scroll.
- Keep virtual try-on client-only and lazy-load wrist detection after explicit camera consent so video remains on-device and watch pages stay lightweight.
- Use face-centered local crops with the crown toward the fingers, bracelet across the arm, depth-based foreshortening, and normalized two-axis manual offsets so fit follows wrist rotation and camera distance without changing collection imagery.
