# Feather Fiesta

A carnival party game for Android about a flock of tropical birds. It has a story mode, 8 minigames, local multiplayer for 1–4 players, and support for game controllers.

All characters, art, music and story are original. Graphics are drawn in code and music is synthesized at runtime, so the game ships with no image or audio files.

## Features

- **Adventure mode**: 5 chapters and 10 stages. Recover the five pieces of the stolen Golden Drum before the Fiesta. Each stage has a goal and 1–3 stars, and the last chapter ends with a boss fight.
- **Party mode**: 3, 5, 7 or 10 rounds of random minigames. Players earn points by placement, and the winner is shown on a podium.
- **Minigames (free play)**: play any minigame you've unlocked.
- **8 minigames**:
  - Fruit Frenzy: catch falling fruit
  - Beach Bump: sumo on a shrinking sandbar
  - Piñata Pop: aim and throw
  - Rooftop Hop: rooftop runner
  - Ring Rush: flying race through rings
  - Rapid River: rafting
  - Samba Beat: rhythm game
  - Crow Clash: co-op boss fight
- **5 playable birds**: Pico, Tuca, Zuzu, Nina and Don Corvo. Three of them are unlocked through the story.
- **Wardrobe**: spend the fruit you collect on 11 hats. Each bird remembers its own outfit.
- **1–4 players**: each controller is one player, and CPU birds (Easy, Normal or Hard) fill the empty seats.
- **Controls**: touch controls (virtual stick and buttons), Bluetooth/USB gamepads, and keyboard.
- **Other**: options (volume, vibration, touch button opacity, CPU skill), auto-save, and pause/resume.

## Getting the APK

Every push runs the **Build Android APK** GitHub Action. To download the APK:

1. Open the repository's **Actions** tab.
2. Open the latest run.
3. Download the `feather-fiesta-apk` artifact.
4. Unzip it and install the APK on your phone. You'll need to allow installs from unknown sources.

To build it yourself, open the project in Android Studio, or run `./gradlew assembleRelease` with the Android SDK installed.

## Controllers

Pair the controller in Android Bluetooth settings first. The first controller that connects is Player 1, the second is Player 2, and so on.

| Button | Action |
| --- | --- |
| Left stick / D-pad | Move / navigate |
| A | Jump, throw, confirm |
| B | Back |
| X / A / Y / B | Samba Beat notes (◀ ▼ ▲ ▶) |
| Start | Pause |

## Playing in a browser

Open `app/src/main/assets/game/index.html` in a browser. Keyboard controls are arrow keys/WASD to move, Space/J for A, Backspace/K for B, and Esc for pause. Browser gamepads also work.

## Project layout

```
app/src/main/java/.../MainActivity.java   Full-screen WebView host + native controller input
app/src/main/assets/game/js/               Engine, input, audio, drawing, menus
app/src/main/assets/game/games/            The 8 minigames
```
