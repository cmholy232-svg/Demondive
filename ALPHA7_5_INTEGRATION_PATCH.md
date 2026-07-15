# Alpha 7.5 Asset Batch 01 — Non-Destructive Integration Map

## Safety rule

The authoritative playable/source baseline is Alpha 7.4A, preserved in ChatGPT Library with source SHA-256 `fe7dca1034df75ca893635378766d1707b017628f6c0d5f5f7f6ea5c07b9c870`.

This asset workspace was reconstructed from the preserved Alpha 7 Level 3 scaffold because the current Library source archive is temporarily not materializing. Do **not** replace the Alpha 7.4A tree with this tree or copy its `src` directory wholesale. Restore Alpha 7.4A first, then overlay only `public/assets/a75`, the selected source files under `source-assets/a75`, and reviewed mapping changes.

## Late-game boon portraits

Keep the stronger existing Level 1–3 portrait packages. Add these ten missing late-game mappings to the current boon registry:

| Boon | Runtime asset |
|---|---|
| Luna | `assets/a75/characters/boon-givers/chr-luna-portrait-v01.png` |
| Solara | `assets/a75/characters/boon-givers/chr-solara-portrait-v01.png` |
| Calyptra | `assets/a75/characters/boon-givers/chr-calyptra-portrait-v01.png` |
| Isolde | `assets/a75/characters/boon-givers/chr-isolde-portrait-v01.png` |
| Somnia | `assets/a75/characters/boon-givers/chr-somnia-portrait-v01.png` |
| Vespera | `assets/a75/characters/boon-givers/chr-vespera-portrait-v01.png` |
| Aurelia | `assets/a75/characters/boon-givers/chr-aurelia-portrait-v01.png` |
| Noctissa | `assets/a75/characters/boon-givers/chr-noctissa-portrait-v01.png` |
| Lilith | `assets/a75/characters/boon-givers/chr-lilith-portrait-v01.png` |
| Seraphine | `assets/a75/characters/boon-givers/chr-seraphine-portrait-v01.png` |

Do not replace existing Pyrra, Maris, Gaia, Zephyra, Flora, Voltara, Crya, Belladonna, Nerissa or Roxyne portrait routes without a side-by-side human review.

## Level 4–9 background foundations

Map one plate to each current biome/background registry entry:

| Level | Biome | Runtime asset |
|---:|---|---|
| 4 | Thunder Jackpot | `assets/a75/environment/level4/env-thunder-jackpot-background-main-v01.svg` |
| 5 | Frozen Basilica | `assets/a75/environment/level5/env-frozen-basilica-background-main-v01.svg` |
| 6 | Forever Motel | `assets/a75/environment/level6/env-forever-motel-background-main-v01.svg` |
| 7 | Thousand Faces | `assets/a75/environment/level7/env-thousand-faces-background-main-v01.svg` |
| 8 | Succubus Capital | `assets/a75/environment/level8/env-succubus-capital-background-main-v01.svg` |
| 9 | Self Below | `assets/a75/environment/level9/env-self-below-background-main-v01.svg` |

Treat these as low-density background foundations. Existing gameplay platforms, collision, hazards and room-generation data remain authoritative. Do not derive collision from the SVG art.

## Boon sigils

Every boon has a matching runtime sigil at `assets/a75/ui/boon-sigils/sigil-<boon-id>-v01.svg`. Integrate through the boon definition/asset registry, not with ad hoc component imports. Intended uses:

- 24–32px compact HUD stack indicator
- boon reward cards
- pause/run-summary identity
- Special-ready indicator where the HUD hierarchy permits it

Do not use all 20 simultaneously in the combat HUD. Show the equipped/dominant identity first, then compact stack counts. Preserve health, Demon Energy, immediate objective and hazard visibility as higher priorities.

## Required post-overlay gates

1. Run the current Alpha 7.4A verification suite, not the older scaffold suite.
2. Confirm fresh-save Levels 1–9 and Deep Dive still route correctly.
3. Check all 20 boon cards and all ten late portraits for missing-file fallback.
4. Compare each Level 4–9 plate against platforms, hazards, enemies, projectiles and rewards at gameplay scale.
5. Stress high-stack VFX against background contrast.
6. Test the sigils at 24px, 32px, 48px and mobile-equivalent scale.
7. Record human approval separately; automated checks must not change `humanApproved`.
