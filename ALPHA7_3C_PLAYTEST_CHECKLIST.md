# DemonDive Alpha 7.3C — Full Campaign Hands-On Checklist

Automated verification has passed. These checks require a person playing the exact downloadable package. A checked item means personally observed, not inferred from code or tests.

## Test record

- Build ZIP and SHA-256:
- Date / tester:
- Browser / OS / controller:
- Starting save: fresh / upgraded / migrated:
- Seed(s):

## Launch, title, saves, and retry

- [ ] The extracted package launches with `START_DEMONDIVE.cmd`, PowerShell, or `node serve.mjs` without an install step.
- [ ] Title music starts after the first browser-approved interaction and does not require opening Settings.
- [ ] A fresh save begins with no retained upgrades, unlocks, records, Dive XP, or run history.
- [ ] Global Dive XP appears under the resource HUD, increments from play, and persists without affecting combat power.
- [ ] Death Retry and Retry Same Seed both return to Level 1 with the chosen starting boon and no temporary boons from the failed run.
- [ ] Settings reset requires confirmation, erases the whole save, and returns to the opening state.

## Protected Milo feel

- [ ] Idle, run, jump, fall, landing, dash, wavedash, waveland, Magic, and Special still feel like the approved build.
- [ ] Milo remains grounded visually; quick left/right taps leave him facing the tapped direction.
- [ ] Forward movement plus shooting does not enlarge him; upward shooting is correctly sized with no purple foot fragment.
- [ ] Keyboard, controller, and available touch action mappings remain usable.

## Campaign structure and build agency

- [ ] The campaign moves continuously through Levels 1–9 while retaining the current run build between levels.
- [ ] Level lengths feel progressive: 7–8, 9–10, 11–12, 13–14, 15–16, 17–18, 19–20, 21–22, then 23–24 rooms.
- [ ] Every mini-boss appears near the exact midpoint and every boss is the final room.
- [ ] No two empty/recovery/event rooms occur consecutively.
- [ ] Branches offer exactly two meaningful routes and wagers feel occasional rather than constant.
- [ ] Major boon rewards show two physical choices, never three.
- [ ] Starting and acquired boon families recur often enough to support intentional stacking without crowding out discovery.
- [ ] Rerolls lean more strongly toward the current build; high stacks remain possible but rare rather than guaranteed.
- [ ] Taking the owner of the currently equipped Special never offers a meaningless swap-to-itself action.

## Levels 1–7 regression sample

- [ ] Neon Maw enemies, Blade Siren, Belladonna, Drowned Court enemies, Roxyne, and the Level 2 mini-boss render without clipped neighboring cells or floating grounded poses.
- [ ] Nerissa is fully invulnerable while any music pillar remains and becomes vulnerable only after all pillars break.
- [ ] Thornwild snares visibly slow Milo while preserving jump and dash.
- [ ] Perfect Prey fights back rather than only fleeing.
- [ ] Levels 4–7 hazards, mini-boss rules, Demon Lord forms, rewards, and music remain functional.
- [ ] Challenge/boon rooms reach the intended stronger pressure instead of collapsing instantly.

## Level 8 — Lilith's Throne

- [ ] The biome reads as one coherent royal/succubus capital rather than random prior rooms.
- [ ] Grounded new enemies sit on their support surfaces; floating roles hover intentionally.
- [ ] Royal Sigils telegraph before applying their effect and learned hazards remain readable when recombined.
- [ ] Lilith's Daughters appear exactly halfway.
- [ ] Relay 1 is Attack + Defense, Relay 2 is Movement + Energy, and Relay 3 uses all four at reduced vitality without uncapped add spam.
- [ ] Each Daughter role is visually and behaviorally distinct.
- [ ] Track 24 plays for exploration/post-mini-boss, track 25 for the Daughters, and track 26 for Lilith.
- [ ] Lilith is unmistakably demonic and regal: horns, wings, tail, crown/regalia—not a normal human woman.
- [ ] Portal summons/rifts, rotating charm gaps, throne-pillar line-of-sight tether, and ten-second Royal Decrees are readable and avoidable.
- [ ] Lilith's three phases intensify without creating unavoidable overlaps.
- [ ] Defeating Lilith awards/unlocks Lilith and transitions to Level 9 while preserving the run build.

## Level 9 — The Self Below

- [ ] The biome coherently remixes Milo's apartment, Hellroom, memories, previous biomes, and impossible internal space.
- [ ] Cross-pollinated enemies remain readable and grounded roles do not float.
- [ ] Memory Rifts telegraph and function.
- [ ] The midpoint boss rush presents Belladonna, Nerissa, Roxyne, Calyptra, Isolde, Somnia, and Vespera sequentially with shortened health and no overlap between waves.
- [ ] Track 27 plays for exploration, track 28 for the boss rush, track 29 for Hollow phases I–II, and track 30 for the final phase.
- [ ] Hollow phase I visibly mirrors the current build without flooding the screen.
- [ ] Campaign phase II removes temporary boon power and remains beatable with protected base movement, Magic, and Special.
- [ ] Phase III restores acquired boon families in readable staged beats and the HUD/loadout agrees with the restored build.
- [ ] Defeating The Hollow restores anything still queued and transitions into acceptance rather than a kill/explosion framing.
- [ ] Seraphine unlocks correctly.

## Ending and credits

- [ ] Milo wakes, apologizes, puts the weed away, begins cleaning, sees the queens on TV, orders pizza, and accepts rather than destroys The Hollow.
- [ ] The mechanical ending can be advanced/skipped without losing unlocks or corrupting the save.
- [ ] Track 31 plays through the functional credits and does not loop incorrectly.
- [ ] First completion marks the campaign complete and unlocks Deep Dive; later completion offers the intended cash-out/Deep Dive choice.

## Deep Dive

- [ ] Rooms can extend left, right, up, and down rather than forming a one-direction tunnel.
- [ ] One biome remains coherent for ten rooms: five regular, altered mini-boss at six, three regular, empowered boss at ten, then a different biome.
- [ ] All nine biomes can appear before the deterministic rotation repeats.
- [ ] Opening rooms begin above trivial one- or two-enemy pressure and difficulty continues climbing.
- [ ] Boss powers visibly stack with depth; cross-pollination, altered arenas, escalating boons/wagers, and deep double bosses work.
- [ ] Hollow in Deep Dive never strips the player's build and all text/HUD says the build remains active.
- [ ] Extreme duplicate stacks remain functional and readable during a long run.

## Audio and stability

- [ ] Enemy hit, Milo hit, enemy shot, and enemy death events are audible and remain controlled under high stacks.
- [ ] Music crossfades, loudness, loops, pause/resume, and Master/Music/SFX sliders feel correct across all nine levels.
- [ ] No progression blocker, softlock, repeatable crash, save corruption, missing reward, or broken gate occurs.
- [ ] A long Deep Dive does not show runaway entity counts, severe slowdown, or audio saturation.

## Failure format

For every unchecked failure, record: seed; save type; level/depth; room number/name; entry/exit direction; route; wager; boon stacks/Special; exact input sequence; expected result; actual result; screenshot/video; whether it reproduces after Retry Same Seed.
