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
- Render the countdown in the page, in a layer behind the transparent Three.js canvas so no scene effect can cross it, using bundled typography. Frame crops and text for narrow, tall, and short sidebars, not just one viewport.
- Design choice: we plant seeds, and a crop may grow into a tree, but what we harvest is always produce. The timer shows the plant growing; the harvest overviews (month blocks, year crates) show the produce, never the tree. A crop whose plant is not what you pick (the coconut palm) has its own `<Model>_produce.glb` and a `produce` entry in the crop catalog; a crop that has none is shown as its mature plant, which carries its fruit.
- The break is a view of its own, not the crop with a different clock: once a break is running the scene is a cat asleep beside a steaming mug, under the same sun clock. Like the focus, a running break fills the view by default, and Escape brings the controls back. The cat and the mug are Blender models in `assets/break/`; the steam is a shader.
- Keep pause/end controls accessible through a discreet reveal affordance and Escape. Respect reduced motion and provide a readable non-WebGL fallback.
- Empty, loading, failed, and filtered-empty harvests are distinct states. A loading indicator must have a bounded wait and a recovery path.
- Clone materials before instance-specific animation; dispose owned resources without disposing shared GLTF data. Growth transitions stay grounded; completion effects play once for a new live harvest, not restored history.
- Use scoped, prefixed Tailwind styles without a global reset. Test light/dark themes and keyboard/touch behaviour when changing UI.

## Data and assets

- Route live notes, Forest/backup imports, backfill, and note opening through `DayNoteService`. It alone owns document location, legacy migration, and recovery; callers must not construct document paths or select a legacy writer. Test saved legacy settings as well as fresh defaults when changing these workflows.
- Persist crops independently of mounted views. Closing Obsidian never cancels a session. Reconcile timestamps without inventing subsequent focus sessions.
- Preserve conflicting offline revisions and award a completion once. Keep synthetic/debug sessions separate from real history and disabled in production builds.
- Models live under `assets/<group>/` (`crops/` for the crops and their produce, `break/` for the break scene's models), each group with its own `NOTICE.txt`; the plugin refers to a model by its path under `assets/`, such as `crops/Tomato_1.glb`. Bundle licensed models and fonts locally with provenance. Models we make ourselves are generated by a script under `scripts/` that rebuilds them byte for byte, and say so in the group's `NOTICE.txt`. Read GLBs through the vault binary adapter; app resource URLs are not a portable fetch contract. Avoid runtime CDN/font dependencies.
