# DemonDive Alpha 7.5 — Asset Batch 01 Handoff

## Roadmap position

Current phase: **Alpha 7.5 — Art Direction, Asset Completion, Room Cleanup, Boon Visual Identities, Animation-Source Preparation**.

Alpha 7.4A remains the protected verified playable baseline. Alpha 7.5 is in progress and is not a playable release yet.

## What this batch adds

- Twenty reproducible 384×512 transparent boon portrait crops with a common runtime contract.
- Ten missing late-game portrait routes prepared for Luna through Seraphine while preserving stronger Level 1–3 portraits.
- Six distinct, low-density, dependency-free Level 4–9 biome foundation plates.
- Twenty distinct, dependency-free 128×128 boon sigils.
- Source and runtime manifests, visual QA contact sheets and automated batch verification.
- A non-destructive integration map for the authoritative Alpha 7.4A source.

All assets are deliberately marked `integrated-correction-pending` and `humanApproved: false`. “Integrated” here means built into the isolated asset-production scaffold; the current Alpha 7.4A playable overlay is still pending.

## Source recovery constraint

The current Alpha 7.4A full-source archive remains preserved in ChatGPT Library, but its content endpoint returned “not ready” while this batch was produced. To avoid overwriting or reconstructing the playable from an older source tree, work continued in a separate asset-only workspace based on the preserved Alpha 7 Level 3 scaffold.

Authoritative source Library ID: `libfile_4d5afaaabb6881919f1c2a660e58c2ae`

Authoritative source SHA-256: `fe7dca1034df75ca893635378766d1707b017628f6c0d5f5f7f6ea5c07b9c870`

Do not copy this scaffold over Alpha 7.4A. Follow `ALPHA7_5_INTEGRATION_PATCH.md` after the authoritative source is restored.

## QA status

Automated checks cover:

- exact package counts;
- source/runtime file existence;
- unique portrait and sigil identities;
- fixed SVG view boxes;
- absence of external/scripted SVG dependencies;
- explicit non-final and non-human-approved state;
- presence of all three visual QA sheets;
- TypeScript/Vite build and the inherited Alpha 7 verification suite.

The inherited suite validates the Level 3-era scaffold only. It is useful for asset/build regression but does not replace the current Alpha 7.4A Levels 1–9 gate.

## Visual review notes

Portrait contact sheet: `source-assets/a75/characters/boon-givers/QA_BoonPortraits_ContactSheet_v05.png`

- Adjacent-character bleed was removed through five crop passes.
- Several late-roster figures, especially Calyptra, still need paint-over and more consistent bust framing.

Environment contact sheet: `source-assets/a75/environment/QA_Environments_ContactSheet_v01.png`

- Each late biome now has a distinct low-value palette, silhouette rhythm and density foundation.
- These vector plates are intentionally restrained and simpler than the approved raster Levels 1–3 art; final style matching and room-specific prop layers remain.

Sigil contact sheet: `source-assets/a75/ui/boon-sigils/QA_BoonSigils_ContactSheet_v01.png`

- All twenty are visually distinct at 128px.
- Small-size gameplay/mobile readability, color-blind differentiation and five-second identity recognition remain human test items.

## Alpha 7.5 work still required

1. Restore the Alpha 7.4A source and apply this batch through the reviewed integration map.
2. Complete Level 4–9 enemy, mini-boss and Demon Lord boss production packages.
3. Complete biome platforms, hazards, foregrounds, room props and density cleanup.
4. Build every boon’s projectile, trail, impact, status, passive and Special source package.
5. Finish Milo’s proportion-locked animation-source package.
6. Finish final HUD/menu/title/Deep Dive/wager/jackpot asset sources.
7. Prepare tutorial, story, ending and credits art sources without implementing final narrative flow early.
8. Run the formal asset audit: final-integrated, final-not-integrated, needs-correction, missing, temporary-acceptable or rejected.
9. Obtain explicit human approval before anything is marked final.

## Exact continuation point

After restoring Alpha 7.4A, overlay Batch 01 and pass the current full-game gate. Then prioritize the **boon sensory-source packages and Level 4–9 combat-cast asset audit**; those are the largest dependencies for Alpha 7.6 and the clearest route to stronger power identity.
