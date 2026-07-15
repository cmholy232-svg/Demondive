# DemonDive Alpha 7.3C — Start Here

## Roadmap position

Alpha 7.3 implementation and the Alpha 7.3D integration audit are complete at the automated-verification level. The next phase is Alpha 7.4 hands-on full-game testing, bug fixing, balance, and stability. Levels 8–9 and the whole-campaign flow are not yet personally approved.

## Play the build

1. Download and fully extract `DemonDive_Alpha7_3C_FullCampaign_Playable.zip`.
2. On Windows, double-click `START_DEMONDIVE.cmd`. If Windows blocks it, run `START_DEMONDIVE.ps1` with PowerShell.
3. On any platform with Node.js 18+, run `node serve.mjs` inside the extracted folder.
4. Keep the server window open and visit `http://127.0.0.1:4173/`.
5. Use `ALPHA7_3C_PLAYTEST_CHECKLIST.md`; record the seed, level, room, route, save state, boon stacks, and screenshot for every failure.

The playable ZIP is self-contained and does not run `npm install`.

## Continue development

1. Extract `DemonDive_V1_Alpha7_3C_SourceAndHandoff.zip`.
2. Read `HANDOFF_ALPHA7_3C.md`, `ROADMAP_STATUS.md`, and `ALPHA7_3D_INTEGRATION_AUDIT.md`.
3. Run `npm ci`, then `npm run verify` before editing.
4. Preserve Milo's movement/controller and all systems marked protected.
5. Begin Alpha 7.4 from human playtest findings; do not relabel automated checks as approval.

## Recovery

If the final source package is unavailable, restore `DemonDive_Alpha7_3C_Checkpoint_02_VerifiedFullCampaign_Source.zip` and verify SHA-256 `7b06c3c23c540f3790c644467315c1e1f5cf1e959f25ade9aa3c9a4c43da6257` before installing dependencies.
