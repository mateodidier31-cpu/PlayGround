# PlayGround

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/mateodidier31-cpu/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/mateodidier31-cpu/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/mateodidier31-cpu/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/mateodidier31-cpu/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/mateodidier31-cpu/PlayGround).
- 🛠️ [Check build runs](https://github.com/mateodidier31-cpu/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/mateodidier31-cpu/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/mateodidier31-cpu).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->

## The Ashen Arena

A self-contained, 2D top-down boss-fighting game built with HTML Canvas and vanilla JavaScript. Fight the Cinder Warden, dodge its telegraphed attacks, and earn one of seven persistent ranks.

### Play

Run `./start.sh` in the OMGithub runtime, or serve this folder with any static web server and open `index.html`.

- **Move:** WASD or arrow keys
- **Attack:** Space or click/tap
- **Dodge:** Shift (or the on-screen Dodge button)
- **Touch:** Virtual joystick and action buttons on narrow screens

A katana hit deals 20 damage. The boss has 50,000 HP and becomes more aggressive at 75%, 50%, and 25% health. Progression is stored locally in the browser; surviving a victory with at least 1,000 damage earns rank progress.

### Multiplayer and test status

This build is a local single-player version. Online multiplayer (including the requested 15-player co-op) is not connected and requires a server/networking backend.

Verified in Chromium: the menu loads, a new fight starts, canvas combat reduces boss HP by exactly 20 per hit, and JavaScript syntax passes `node --check`. Browser console showed only a missing optional `/favicon.ico` (404). Full end-to-end testing of defeat, victory, and all rank thresholds remains outstanding.
