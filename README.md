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

A 2D top-down boss-fighting game built with HTML Canvas and vanilla JavaScript. Fight the Cinder Warden, dodge its telegraphed attacks, and earn one of seven persistent ranks. The game supports solo play and server-backed co-op for up to 15 players.

### Play

Run `./start.sh` with Node.js to start the game and co-op server (default port `3000`; set `PORT` to change it), then open the served page. A static web server or opening `index.html` directly still allows solo play, but does not provide online co-op.

- **Move:** WASD or arrow keys
- **Attack:** Space or click/tap
- **Dodge:** Shift (or the on-screen Dodge button)
- **Touch:** Virtual joystick and action buttons on narrow screens

A katana hit deals 20 damage. The shared boss starts with 50,000 HP and becomes more aggressive at 75%, 50%, and 25% health. Choose a player name from the menu to join co-op; players share boss health, and the server stores profiles and boss health in `.ashen-profiles.json` and `.ashen-boss.json` beside `server.mjs`. Solo progression is stored in browser `localStorage`. At least 1,000 damage is required to qualify for victory rank progression.

### Multiplayer and test status

The native Node.js server serves the game and handles co-op over WebSockets. The server enforces the 15-player limit, validates boss hits, shares boss/player state, and records deaths and qualified victory awards. Boss health and online profiles persist across server restarts. Remove `.ashen-boss.json` while the server is stopped to restore the boss to its initial health; online profiles are stored separately and remain intact.

Verified with Node.js checks and live local HTTP/WebSocket probes: health endpoint, two-player join and state broadcasts, server-counted death and rejoin with the same profile and boss health, a 20-damage boss hit, the 15-player capacity limit and rejection of an additional player, and a seeded isolated victory award at exactly 1,000 contribution. Full browser playthroughs and visual/audio behavior have not been re-tested in this environment.
