# DemonDive Alpha 7.7A — Checkpoint 02

## Playable flow

- Fresh saves enter the three-room tutorial after the prologue arrival beat and before the normal Hellroom.
- Room 1 requires movement, a jump, a neutral Arcane Bolt, and one defeated training imp.
- Room 2 presents one deterministic Pyrra orb, then requires the modified Bolt and Flame Nova.
- Room 3 requires dash plus either wavedash or waveland; both remain available for practice.
- The current input abstraction remains authoritative. The tutorial does not fork player physics.

## Safety and migration

- Existing saves are not forced through the new tutorial.
- Completing or skipping writes both the versioned tutorial flag and the legacy Hellroom completion flag.
- Pause includes an explicit Skip Tutorial action.
- Playtest Tools includes Replay Three-Room Tutorial.
- Tutorial rooms carry no wagers, progression branches, permanent-upgrade dependency, or advanced-room hazards.

## Honest test boundary

Automated checks validate room count, stable ground, encounter count, advanced-room safety, action gates, and non-frame-perfect completion. Keyboard/controller prompt clarity and actual first-player comprehension remain human tests.
