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

# Performance

I'm trying not to bloat the app too much, but it should be said. We're using Three.js + React + Drei underneath. This is not the most lightweight stack, so you might get performance that's less than satisfying. We're baking lights and using low-poly models so it shouldn't be that hard on the PC, without too fancy of effects. Should work fine on most modern hardware, but no guarantees. 

There's a planned feature to show everything in 2D, but it's yet to be done. So be warned.


# Planned features
- [ ] Gamification. Some crops are unlocked by default, some you have to unlock. Each completed pomo gives you a produce which you can sell and that money you can spend to buy new produce.
- [ ] Skins for the cat, some twists and accessories for him. General customization. 
