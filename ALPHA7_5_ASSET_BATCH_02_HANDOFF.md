# DemonDive Alpha 7.5 — Asset Batch 02 Handoff

## Roadmap position

Current phase: **Alpha 7.5**. This batch prepares the boon sensory sources required by Alpha 7.6; it does not begin the final animation/audio implementation pass.

## Delivered

- Twenty distinct boon sensory contracts.
- Eighty dependency-free 128×128 runtime vector components: projectile, impact, status and Special for every boon.
- Twenty source boards with explicit motion language.
- A complete direction matrix for impact behavior, status, Special, SFX, stack escalation and high-stack consolidation.
- Automated checks that require distinct motion, impact, SFX and consolidation direction for all twenty identities.
- A visual QA sheet at `source-assets/a75/vfx/boon-sensory/QA_BoonSensory_ContactSheet_v01.png`.

## Identity hierarchy

At low and medium stack counts, the equipped/dominant modifier owns the Arcane Bolt core silhouette and motion. Secondary influences attach through bounded trails, impact signatures, target marks and status responses. Specials retain their own full presentation. At extreme stacks, shared graphs, fans, echoes, tethers and particle pools consolidate presentation without reducing the earned mechanics.

This makes “I am using Pyrra” immediately legible while preserving hybrid builds instead of allowing every combination to become the same purple particle cloud.

## SFX status

Every boon now has written SFX direction, but no claim is made that final audio files exist. Alpha 7.6 should first implement the verified existing SFX set, then map/create the boon-specific sounds. If suitable assets cannot be produced in-project, the final 7.6 handoff must provide the promised exact Suno production list with event, duration, variations, intensity tier, loop behavior and mix priority.

## Required 7.6 implementation tests

1. Input-to-fire and impact latency with the neutral Arcane Bolt.
2. Dominant-boon recognition after five seconds, without boon names visible.
3. Secondary-effect readability in two-, four- and eight-boon builds.
4. Extreme-stack pooling and simultaneous-effect caps without reducing damage or proc counts.
5. Enemy hit, status, stagger and death response alignment.
6. SFX audibility over every exploration, mini-boss and boss track.
7. reduced-flash, reduced-shake, reduced-particles and haptic-disable paths.
8. mobile-scale contrast, thermal and overdraw review.

## Safety and integration constraint

The authoritative Alpha 7.4A source archive remains preserved but was not materializable during this batch. These assets were created in the isolated Alpha 7.5 asset workspace. Do not overwrite current source with the scaffold. Overlay only `public/assets/a75/vfx/boon-sensory`, retain the manifest, then implement through the current asset registry after source restoration.

All files remain `source-ready-correction-pending` and `humanApproved: false`.
