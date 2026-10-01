# Classroom game reference review — 2026-10-01

The user supplied these references while requesting individual play for 26 learners, a Dewey Tây Hồ Tây campus theme, and a shared community event. This review distinguishes observed menus and public builds from a fully playable 3D test. The cloud review browser could not initialize WebGL; no claim is made that all gameplay or frame rates were verified.

| Reference | Observed evidence | Useful direction for this classroom game |
| --- | --- | --- |
| KITEFALL, buicongnguyen/3D_game_fighting-play | The current URL and README identify KITEFALL rather than the sniper description. README says compiled browser build; editable source and tests are private. Loading reports WebGL failure. | Clear rescue story, cinematic introduction, coherent environmental art. Do not assume the public bundle is an editable source release. |
| Vesper, dream-loop-demo.anshu.dev | Sanctuary scene shell, click to walk, drag to orbit, scroll to zoom, reset, sound and hide-interface controls. The 3D scene did not complete here. | Scene-first campus presentation, compact camera controls, distinct place names. A dark fantasy palette is not automatically appropriate for a school campus. |
| Zephyr Reef Grand Prix, kart-deepseek-astra | Fails to initialize WebGL in this review browser. | Candidate for later device-based driving comparison; insufficient evidence to rank its driving quality. |
| Lumen Rally, kart-astra-deepseek | Navy/cream/lime menu, four driver cards, one clear start action; desktop WASD and Shift; displayed six racers/three laps. Public bundle has local racer state. | Strong hierarchy, readable race setup, cosmetic character choices without unequal horsepower. |
| Tidebloom Rally, kart-astra-solo | Teal/lime menu, four character cards, concise controls including items, quality/audio controls; displayed six riders/three laps. | Friendly classroom art direction and visible controls. Do not interpret six riders as six connected classmates. |
| Prismfall Grand Prix, kart-deepseek-solo | Reports WebGL unavailable. Public HTML includes quality, pause/restart, and race-result views. | A low-quality option, recovery path and clear end-of-race flow. Gameplay quality remains unverified here. |
| Sunwake | Direct build does not render a usable scene here. Author's OpenAI Developers article describes procedural water and a boat whose motion shares the wave simulation. | The best visual/simulation reference for a future authored boat-racing module. Its published exploration game is not evidence of a 26-player classroom mode. |
| Void Explorer | Launch illustration and expedition-manifest layout are visible; initialization fails without WebGL. | Large map → selected destination → local scene, strong theme, concise destination information. Universe-scale terrain is unnecessary for a 30-minute lesson. |
| Hollowflux | Pixel-style story/menu, movement/strike/slip controls visible; entering does not reveal a usable scene here. Author describes a 2D action RPG. | Mission, inventory and progressive unlock structure. Use classroom-friendly adventure mechanics in place of importing combat wholesale. |
| Không Chiến Việt Nam | Vietnamese/English launch screen, camera/settings controls and loading bar visible; rendered page reports a script error. | Information hierarchy and radar/navigation concepts for a future flight challenge. Do not use this review to claim combat performance or multiplayer support. |

## Integration decision

The current release implements an original lightweight Math regatta: 10 seconds to prepare, 45 to answer up to six short-answer questions, 10 for results, then automatic return to the main game. It is a lane-and-mascot race rather than a copied Sunwake engine or a free-driving 3D race. Main timers, hint freezes, drafts and progress pause together. One shared event starts when the first active player crosses cell 18. The server grades each question once and owns the leaderboard/reward ledger.

The public kart repository is a catalog of static builds. The inspected Lumen and Tidebloom bundles do not expose a classroom result bridge or a multiplayer room service; local racer state and menus alone are not a 26-player implementation. No top-level license was advertised by the GitHub API for either supplied GitHub repository. Third-party library notices are not an affirmative license for all authored game code or artwork. Confirm authors' distribution terms and obtain editable source before copying a complete game. Browser-visible assets or the absence of frame-denial headers do not establish reuse rights or a working score bridge.

A future imported game must map participant identity to the classroom session, use a common start/end time, validate results server-side, keep reconnects idempotent, preserve the main game's timer, reject forged client scores, and have a usable touch/keyboard path. An iframe alone supplies none of those guarantees.

## Campus illustration provenance

`public/assets/campaign-dewey.webp` is an original generated 1600×900 illustration, using inspected public architecture references. The curved white fin facade, connected courtyards, planting and orange/red braces were used as visual cues. The task's five station coordinates and route are fictional game overlays, not real school wayfinding.

- Official campus information/photos: https://thedeweyschools.edu.vn/dewey-tay-ho-tay/
- Architect-provided description/photos/site plan, published 2022 (design dated 2020): https://www.gooood.cn/the-dewey-school-112-architects.htm
- Game-design source: https://developers.openai.com/blog/how-to-build-games-with-astra
- Kart catalog: https://github.com/alesha-pro/bench-portal
- Current KITEFALL build notes: https://github.com/buicongnguyen/3D_game_fighting-play

## Validation scope

Automated API integration simulates 26 separate learners concurrently: independent rolls, one community trigger, private answer data, concurrent grading, countdown and deadline, one attempt per question, cooldown, retry deduplication, late spectators, a single reward, virtual time pause/resume, individual pass pact and room reset. This is an integration test, not measured network load from 26 physical classroom devices.
