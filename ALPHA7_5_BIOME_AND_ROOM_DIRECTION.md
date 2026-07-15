# DemonDive Alpha 7.5 — Biome Art Direction and Room Quality Gate

## Purpose

This package turns “make the rooms cohesive” into enforceable production rules. It does not replace current gameplay or claim that existing rooms already pass.

## Shared readability hierarchy

Every room must preserve this order:

1. Milo
2. enemies
3. enemy attacks
4. Milo’s attacks
5. hazards
6. platform top edges
7. rewards and interactables
8. decoration

Background art uses compressed values and reduced edge frequency. Foregrounds may frame a room but may never cross Milo’s feet, a platform edge, a telegraph, a pickup or a required route. Purple remains Milo’s Arcane ownership color; dangerous purple effects require a hot red danger core and distinct silhouette.

## Nine-biome lock

The production manifest defines one palette, lighting model, saturation hierarchy, shape language, architecture family, material family, prop family, hazard family, enemy silhouette rule, boss silhouette rule, accent rule, density target and forbidden list for every campaign biome.

The late-game vector plates remain foundations, not final environments. They establish values and silhouette rhythm while platforms, props, hazards, foregrounds and paint-over remain correction-pending.

## Room density

- Low: zero to two supported prop clusters; entrances and recovery.
- Standard: two to four clusters; ordinary combat.
- High: four to six clusters; challenge/boss staging only, with protected lanes.
- Rejected: more than six unrelated clusters, repeated micro-detail behind actors, or decoration that crosses gameplay silhouettes.

Density counts intentional clusters, not individual pixels. Repeating ten tiny props is still clutter even when each prop is small.

## Required room metadata

Every authored or generated room carries its intended movement mechanic, difficulty tier, weighted enemy and hazard budgets, density class, traversal type, recovery level, compatible modifiers/biomes, mobile suitability and performance weight.

Performance weight includes likely simultaneous projectiles, particles, animated props and offscreen actors. High-weight rooms cannot be paired freely with high-cost Deep Dive modifiers.

## Campaign sequence protections

- Level 1 remains the shortest baseline.
- Level 2 adds two to three rooms.
- Each following level adds one to three rooms over the prior level.
- The mini-boss occurs once at 45–55% of required rooms.
- The boss is the final required room.
- Two empty rooms never occur back-to-back.
- Branch decisions require at least two resolved rooms of separation.
- Wager offers require at least three resolved rooms of separation unless an authored biome event deliberately overrides the cooldown.

## Automated versus human validation

Automation owns geometry, grounding, budgets, overlap, sequence rules, deterministic regeneration, declared compatibility and mobile/performance metadata. Human review owns three-second comprehension, composition, movement-expression routes, recovery space, visual separation, physical plausibility, stylistic cohesion and physical-phone readability.

Solvability alone does not make a room shippable.

## Approval state

`source-ready-correction-pending`; `humanApproved: false`; `playableRelease: false`. Runtime validation waits for restoration of the authoritative Alpha 7.4A Levels 1–9 source.
