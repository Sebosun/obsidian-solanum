# Solanum

Solanum is an Obsidian extension for doing pomodoro.

The theme is farming, you plant some kind of plant and get it's produce, you can see all the produce you've done (pomodoros) in a 3D grid. The app has a similar idea for itself as Forest, with different theme.

It's meant to cozy and minimal with it's UI's. No maximalist monsters, but also no AI sloppified too-many-features-that-nobody-will-use type thing. UI's are meant to be comprehensive and non-bloaty. Data is stored in Obsidian directly, there's no database or sql-lite running in background.

<img width="1148" height="1248" alt="image" src="https://github.com/user-attachments/assets/532d4d07-fec8-4a18-bf19-5a9caaf1c9ba" />

# Features

## Pomodoro timer

You likely know what pomodoro timer is since you're here. Yeah, that's exactly it. Typical, you can choose time, after each pomo there's a resting period. All configurable.

You can choose to have your current pomodoro associated with Obsidian tags or with a note.

<img width="874" height="1095" alt="image" src="https://github.com/user-attachments/assets/6a532d23-01c8-45da-a358-fe030154899c" />

## Harvest

Harvest is a fancy way of saying collection for the purpouses of this app. You can see which crops you've earned (which pomodoros were completed) in a given month. It's giving a visual representation of your work.

<img width="751" height="1141" alt="image" src="https://github.com/user-attachments/assets/f31b683b-013e-4a2b-a09d-3555f5809061" />

## Meta

You also can:

- export / import your pomos collection
- import them from Forest
- modify sounds played at the completion

# Import and export

Both live in Obsidian's settings for Solanum, under **Backup**.

## Export

**Export** writes your whole history to one JSON file in the vault, at `[solanum_path]/exports/solanum-sessions-YYYY-MM-DD.json`.

```json
{
  "format": "solanum-sessions",
  "version": 1,
  "exportedAt": "2026-10-31T20:15:00.000Z",
  "sessions": [
    {
      "schema": 1,
      "id": "3b241101-e2bb-4255-8caf-4136c566a962",
      "sessionId": "3b241101-e2bb-4255-8caf-4136c566a962",
      "parents": [],
      "startedAt": 1785000000000,
      "updatedAt": 1785001500000,
      "durationMs": 1500000,
      "breakMs": 300000,
      "autoBreak": false,
      "phase": "done",
      "status": "completed",
      "deadline": null,
      "remainingMs": 0,
      "focusEndedAt": 1785001500000,
      "intervals": [{ "start": 1785000000000, "end": 1785001500000 }],
      "tags": ["study"],
      "notePath": "Projects/Thesis.md",
      "crop": "tomato"
    }
  ]
}
```

- Times are Unix milliseconds. `crop` is one of produces.
- Each entry is a _revision_: pausing or resuming a session writes a new one, so one session can appear several times, linked through `sessionId` and `parents`.

## Import

**Import…** (pick a file) or **From vault…** accepts any of:

- a Solanum export, as above;
- a bare JSON array of revisions;
- a single revision file.

An export made by a newer version of Solanum is refused with a message asking you to update the plugin.

Each revision is matched by `id`:

| Case                                               | What happens                                       |
| -------------------------------------------------- | -------------------------------------------------- |
| New `id`                                           | Added                                              |
| Same `id`, same content                            | Counted as a duplicate and skipped                 |
| Same `id`, different content                       | Your local copy is kept, and the clash is reported |
| Not a valid revision (bad shape, impossible times) | Skipped and counted                                |
| Demo or debug entry                                | Ignored                                            |

By default the daily notes for the days touched are created or updated too, and the **Create/update documents when importing** toggle turns that off.

## Import from Forest

**Choose CSV…** or **CSV from vault…** reads the CSV that Forest exports. It needs these columns, in any order:

```csv
"Start Time","End Time","Tag","Note","Tree Type","Is Success"
"Wed Jul 28 12:53:32 GMT+02:00 2021","Wed Jul 28 13:18:32 GMT+02:00 2021","Study","","Bush","True"
```

- `Start Time` and `End Time` are required and use Forest's date format, including its time zone offset. `Tag`, `Note`, `Tree Type` and `Is Success` are optional.
- We don't have Forest-tree-to-produce mapping, and it would be pointless to add one. That's your job to define how you want them represented. After importing you'll be prompted to assign each Tag to your Obsidian tag and each produce to your Solanium produce.

# Performance

I'm trying not to bloat the app too much, but it should be said. We're using Three.js + React + Drei underneath. This is not the most lightweight stack, so you might get performance that's less than satisfying. We're baking lights and using low-poly models so it shouldn't be that hard on the PC, without too fancy of effects. Should work fine on most modern hardware, but no guarantees.

There's a planned feature to show everything in 2D, but it's yet to be done. So be warned.

# Planned features

- [ ] Gamification. Some crops are unlocked by default, some you have to unlock. Each completed pomo gives you a produce which you can sell and that money you can spend to buy new produce.
- [ ] Skins for the cat, some twists and accessories for him. General customization.
