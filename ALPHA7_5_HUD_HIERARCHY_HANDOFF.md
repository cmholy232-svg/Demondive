# DemonDive Alpha 7.5 — HUD Hierarchy Source Handoff

## Outcome

This package defines the information hierarchy and source assets that Alpha 7.6 can animate and the restored runtime can integrate. It does not merely shrink the current HUD.

## Minimal combat hierarchy

Always visible:

1. Health
2. Demon Energy
3. Equipped Special and ready/cooldown state
4. Dominant boon identity and stack count

Contextual:

- current sealed-room/boss mechanic objective;
- accepted wager condition;
- up to two secondary boon color pips where they add immediate build context.

Temporary:

- global XP and level progress;
- currency/shard gain;
- rewards, failures, personal bests and level-up celebration.

Pause/loadout only:

- complete boon list and descriptions;
- seed, elapsed time, biome/depth, elite powers and run statistics;
- permanent progression details.

Removed for now:

- spoken rush/payout announcer. Keep a bounded text event until the final approved announcer voice direction exists.

## Global XP placement

The global level remains infinite and primarily communicates play history. It appears as a thin bar directly beneath Demon Energy when XP is gained or a level changes, then fades. It should not permanently compete with health, hazards or enemy attacks. The persistent value remains available in pause, hub and run summary.

## Mobile guardrails

- The same logical HUD view model must feed desktop and mobile layouts.
- Keep central gameplay, Milo’s immediate landing space and attack lanes clear.
- Reserve bottom corners for touch controls and avoid placing essential text beneath thumbs.
- Respect notches and rounded safe areas.
- Full boon information remains in a deliberate menu; do not miniaturize a desktop list over combat.
- Test text and icon recognition at physical-phone size, not only browser emulation.

## Source outputs

- `UI_HUD_Desktop_Minimal_v01.svg`
- `UI_HUD_MobileLandscape_Minimal_v01.svg`
- `UI_HUD_Pause_FullInformation_v01.svg`
- seven dependency-free runtime SVG components
- `hud-hierarchy-manifest-v01.json`

All outputs remain `source-ready-correction-pending` and `humanApproved: false` until current-runtime integration and hands-on readability approval.

## Verification note

The three presentation layouts inline their component artwork for renderer-independent QA while the seven runtime components remain separate files for implementation. The automated check rejects external/nested SVG dependencies, validates the exact component count in each layout and requires the rendered contact sheet. This specifically prevents invisible-component previews from passing the source gate.

The inherited executable smoke test in this isolated asset workspace identifies itself as the older Alpha 7 Level 3 scaffold. Its successful build is useful for source compatibility, but is not evidence that these assets are integrated into or validated against the authoritative Levels 1–9 Alpha 7.4A runtime.
