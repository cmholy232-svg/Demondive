# DemonDive Alpha 7.5 — Asset Batch 04 Handoff

## Roadmap position

Alpha 7.5 art-direction and animation-source preparation. This batch addresses room incohesion, excessive visual density, combat-cast silhouette drift, atlas clipping, state-specific scale changes and missing late-campaign source requirements. It is not a playable build.

## Included

- Nine detailed biome templates covering Levels 1–9.
- Shared entity/value/contrast hierarchy and reserved gameplay colors.
- Low, standard, high and rejected room-density classes.
- Required metadata plus automated and human room-quality checks.
- Campaign sequence rules for progressive length, midpoint mini-boss, final boss, empty-room prevention and lower branch/wager frequency.
- Eighteen mini-boss/boss source contracts with states, pivots, sockets, cell safety and silhouette targets.
- Eight retained defect records covering Milo scale/grounding, Level 1 enemy cells, unresolved altitude and mini-boss glitches, Belladonna and Roxyne.
- A Demon Lord silhouette gate for every campaign boss, with Nerissa explicitly preserved as demonic.

## Explicit exclusions

- No authoritative Levels 1–9 runtime changes.
- No final Level 4–9 combat atlases invented from portraits.
- No behavior bug is relabeled as an art fix.
- No final human approval.

## Verification boundary

The Alpha 7.5 manifests and source boards are automated and visually reviewed. The full local test suite builds successfully, but its executable smoke message identifies the older Alpha 7 Level 3 scaffold. Current campaign integration must wait for the exact Alpha 7.4A source hash recorded in the recovery ledger.

## Next work

Complete the remaining runtime-independent Alpha 7.5 source families: Milo final pose/layer checklist against actual surviving sources, enemy-role correction specs, boss/mini-boss final art creation after source recovery, remaining UI states, tutorial/story/ending composition sources, and a final asset status audit before Alpha 7.6.

## Approval state

`source-ready-correction-pending`; `humanApproved: false`; `playableRelease: false`.
