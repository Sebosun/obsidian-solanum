# Solanum development standards

## Workflow

- Work in tested vertical slices: agree the observable behaviour, write a meaningful failing test, implement it, and commit the completed task with its tests. Refactoring keeps those behavioural tests green.
- Test workflows and real boundaries: persistence/recovery, sync conflicts, focus/break transitions, note references, calendar totals, asset loading, and scene lifecycle. A test that only proves React renders a div is insufficient.
- Use deterministic clocks and seeded data. Keep expected values independent of the implementation under test.
- Before committing, run `npm run check`. For renderer, layout, animation, or asset changes, also run `npm run test:browser` and inspect the real rendered result. Report unavailable Obsidian-runtime checks explicitly.
- Stage task-specific paths. Preserve unrelated vault, tooling, and user changes.

## Structure and state

- Group React components by functionality under `src/components/<feature>/`. Each component has its own matching file. The 3D side is split three ways: `components/scenes/` holds the actual scenes (the crop, the break, the harvest month and year, with their fallbacks), `components/models/` holds the things placed in them (a plant, the cat, the mug, a crate), and `components/stage/` holds what any scene is staged with (lights, camera, weather, platform, transitions, the error boundary). A model never builds a scene and a scene never draws a model by hand; the logic behind a model lives in `src/lib/models/`. Obsidian view adapters belong in `src/views/`, app integration in `src/plugin/`, domain logic in `src/lib/`, shared UI state in `src/state/`, and hooks in `src/hooks/`.
- The timer service owns transitions and persistence. The scoped Zustand store shares session snapshots, drafts, UI actions, errors, and transient effects across views; it must not become a second timer engine.
- Components read shared state through typed selectors/hooks. Pass props for genuinely local presentation data, rather than threading services, session collections, and action bundles through the tree.
- Release subscriptions when the plugin unloads. Keep the same Canvas mounted when focus controls hide or return.

## TypeScript and readability

- Use named interfaces for props, service ports, options, and domain records. Validate external data; avoid assertion chains that disguise incomplete types.
- Use `@/` for source imports and `@assets/` for bundled assets. External package and Node tooling imports retain their normal forms.
- Keep event handlers and nontrivial calculations named and readable. Prefer explicit branches to nested ternaries or dense inline callbacks.
- Extract domain lookup arrays and tuning values into named constants with units, close to the owning feature. Self-evident arithmetic literals may stay local.
- Use Prettier and ESLint as the formatting/linting authorities. Keep abstractions motivated by current behaviour rather than speculative reuse.

## UI and Three.js

- Keep the sidebar minimal: no branding block, motivational copy, instructional paragraphs, or duplicate countdown. Preferences live in Obsidian settings, reached from the top-right icon menu.
- Render the countdown in the page, in a layer behind the transparent Three.js canvas so no scene effect can cross it, using bundled typography. A digit that changes flips like a flip clock's (the top half folds down, then the new bottom half drops in), and holds still under reduced motion. Every timer scene (the crop, the break) is a `SceneFrame` in `components/stage/`: the time centred at the top, a thin progress bar along the bottom, the transparent canvas with its camera, labels, and the 3D fallback. A scene supplies only what is drawn inside the canvas; never copy the frame's pieces into a scene. No sun or ring is drawn, they cost the picture its room. The sun still exists as the light, the bar's colour and the sky's darkening. Frame crops and text for narrow, tall, and short sidebars, not just one viewport.
- Design choice: we plant seeds, and a crop may grow into a tree, but what we harvest is always produce. The timer shows the plant growing; the harvest overviews (month blocks, year crates) show the produce, never the tree. A crop whose plant is not what you pick (the coconut palm) has its own `<Model>_produce.glb` and a `produce` entry in the crop catalog; a crop that has none is shown as its mature plant, which carries its fruit.
- The break is a view of its own, not the crop with a different clock: once a break is running the scene is a cat asleep on a bed beside a steaming mug, with the time centred at the top and a thin progress bar along the bottom, and no sun or ring competing for the room. Like the focus, a break fills the view for as long as it is under way. The cat, the mug and the bed are Blender models in `assets/break/`; the steam is a shader. Baked models (unlit, lighting in the texture) are drawn without tone mapping, so their colours arrive exactly as baked.
- A session under way (running, paused, or waiting for its break) always fills the view: no toolbar, no tags or note, no reveal button, no Escape toggle, no debug shortcut. Pause/resume and end live inside the `SceneFrame`, as icon buttons centred directly below the countdown, so the same Canvas stays mounted. Only an error or a sync conflict brings the rest of the interface back, since neither could otherwise be dismissed or resolved. Respect reduced motion and provide a readable non-WebGL fallback.
- Empty, loading, failed, and filtered-empty harvests are distinct states. A loading indicator must have a bounded wait and a recovery path.
- Clone materials before instance-specific animation; dispose owned resources without disposing shared GLTF data. Growth transitions stay grounded; completion effects play once for a new live harvest, not restored history.
- Use scoped, prefixed Tailwind styles without a global reset. Test light/dark themes and keyboard/touch behaviour when changing UI.

## Data and assets

- Route live notes, Forest/backup imports, backfill, and note opening through `DayNoteService`. It alone owns document location, legacy migration, and recovery; callers must not construct document paths or select a legacy writer. Test saved legacy settings as well as fresh defaults when changing these workflows.
- Persist crops independently of mounted views. Closing Obsidian never cancels a session. Reconcile timestamps without inventing subsequent focus sessions.
- Preserve conflicting offline revisions and award a completion once. Keep synthetic/debug sessions separate from real history and disabled in production builds.
- Models live under `assets/<group>/` (`crops/` for the crops and their produce, including the Blender-built `crops/garden/`; `break/` for the break scene's models; `stage/` for what scenes are staged on, the farm platform; `harvest/` for the harvest overview's crate; `fonts/` is not models but the bundled typography), each group with its own `NOTICE.txt`; the plugin refers to a model by its path under `assets/`, such as `crops/Tomato_1.glb`. Bundle licensed models and fonts locally with provenance. Models we make ourselves are generated by a script under `scripts/` that rebuilds them byte for byte (`tests/blender-models.test.ts` checks this whenever Blender is installed, and reports a skip when it is not), and say so in the group's `NOTICE.txt`. The Blender scripts share `scripts/blender_common.py`; neither runs another. The exception is `break/` (the cat, the mug and the pillow): they were authored by hand in Blender, no script or source file is kept, and its `NOTICE.txt` says so. Do not add another exception without recording it there. Every GLB under `assets/` is either referenced by `src/` or listed, with the reason, in `tests/assets.test.ts`. Read GLBs through the vault binary adapter; app resource URLs are not a portable fetch contract. Avoid runtime CDN/font dependencies.
