# DemonDive V2 Design Doc

Oct 13, 2026 · @Chris

## The game on one page

DemonDive is a fast, funny 2D action roguelite: a pleasure-seeking stoner dives into Hell, stacks the blessings of twenty supernatural women into a ridiculous Arcane Bolt, and faces the worst version of himself without losing what makes him human.

V2 is a from-scratch rebuild in Godot 4 with skeletal cutout art. It keeps the canon below and the lessons of Alpha 8.2, and carries over the design, music and dialogue, not the old code or sprite sheets.

**Five pillars.** Every decision in this doc serves one of these.

1. **Easy to start, deep to master.** Readable in the first minute; wavedashing, aim and boon synergy reward hundreds of hours.
2. **Gloriously unreasonable builds.** Late runs feel overpowered on purpose, and presentation caps never secretly cut damage.
3. **Twenty characters who matter.** Each boon-giver has a distinct mechanic, look, sound and voice, and remembers what Milo did.
4. **The fight is the screen.** Nothing on screen competes with Milo, hostile danger and the next decision.
5. **Respect the player's time.** Short scenes, fast retries, no grind, no manipulative monetization.

**Locked canon (unchanged from V1).**

- Milo, the nine-level story, the seven Demon Lords, Lilith, The Hollow and the ending.
- All authored dialogue, verbatim, until Chris approves a rewrite.
- The twenty boon-givers, their names and unlock order, with Pyrra as the fresh-save boon.
- One equipped Special; every boon's passive and Arcane modifier stay active for the whole run.
- The movement kit: variable jump, double jump, coyote time, 8-way invulnerable dash, wavedash and waveland.
- The physical Hellroom hub, Infernal Rush ranks, optional wagers and Deep Dive.
- Suggestive, comedic adult characters; no nudity or explicit content.
- Ethical monetization: no gacha, paid randomness, daily punishment or FOMO.

## Why rebuild

Alpha 8.2 has the whole game in it, but its code and art can't be cleaned up cheaply. V2 starts over in Godot 4 and builds each problem below out of the new project from day one.

These findings come from running Alpha 8.2 (recovered from its source maps) and bot-playing Level 1 plus the Belladonna, Roxyne, Memory Golem, Lilith and Hollow fights on 13 Oct 2026.

| Problem in Alpha 8.2 | How the rebuild prevents it |
| --- | --- |
| Internal code names shown to players ("Remaining: neutralFire · enemyDefeated") | All player-facing text lives in one strings file; no raw IDs on screen |
| Dev labels drawn over the fight ("ROUTE VERIFIED · COMPLEXITY 0", "D-MINOR ARCANE SAMPLE · DRY") | Debug overlays exist only in debug builds, behind one toggle |
| HUD panels overlap each other and boss labels | Six fixed HUD slots, built once as a Godot UI scene |
| Milo's 128 generated poses drifted in size and identity, fixed again in 8.1 and 8.2 | Skeletal cutout: each character drawn once in layered parts and animated with bones |
| Asset folders hold several versions of the same sheet (v01, v02-fixed, v02-authored) | One file per asset, a fixed naming convention, history kept by git |
| Most rooms are a flat floor plus three or four thin platforms | Rooms hand-built from a tile kit per biome |
| Level 8 has 22 rooms and Level 9 has 24 | 7–12 rooms per level |
| All game logic sits in one 8,279-line file, and its type definitions were missing from the build | Small scenes and scripts with one job each, statically typed GDScript |
| The spec is about 15,500 words, mostly approval gates and evidence rules | This doc plus a short CLAUDE.md of code rules |
| Builds piled up as 20+ zip folders in Downloads | One git repo; every change is a commit, every milestone a tag |

**Carries over:** the story and dialogue, the 31-track soundtrack, the boon and boss designs, the movement tuning numbers, and the character art as reference for redrawing. **Does not:** Alpha 8.2's code, sprite sheets or room generator.

## Run structure and pacing

A level should take 12–18 minutes, so V2 caps levels at 12 rooms and makes each room count.

The loop stays as it is: Hellroom, then a level's rooms, a mini-boss that grants a boon, harder rooms, a boss that grants a boon, then the next level. Death returns Milo to the Hellroom with permanent unlocks, currency and upgrades kept, and the run's boons cleared.

Room counts per level, generated from the Alpha 8.2 source, against V2 targets:

| Level | Alpha 8.2 rooms | V2 target |
| --- | --- | --- |
| 1. Neon Maw | 7 | 7 |
| 3. Thornwild | 11 | 9 |
| 5. Frozen Basilica | 16 | 10 |
| 8. Lilith's Throne | 22 | 12 |
| 9. The Self Below | 24 | 10 (curated Seven-Lord rush, then The Hollow) |

Pacing rules:

- Every level has at least one room type the player hasn't seen in the previous two rooms.
- One recovery or cache room before each mini-boss and boss.
- Complexity rises faster than length: later levels mix more enemy roles per room instead of adding rooms.
- Death to Hellroom control in under 10 seconds; Hellroom to the first room in under 20 seconds.
- Deep Dive keeps its long-session structure; these caps apply to the story campaign.

## Controls and game feel

Start from Alpha 8.2's tuning numbers: the advanced kit was good, but ordinary running and turning were too slow. The rebuild makes the first minute snappy and keeps dash, wavedash and waveland as they were.

Alpha 8.2's default profile (A0) accelerates on the ground at 3,500 px/s² with a 360 px/s run speed, so a full reversal takes 0.21 seconds. The A1 candidate already in the code cuts that to 0.17 seconds.

| Setting | A0 (current default) | V2 target |
| --- | --- | --- |
| Full left-right reversal | 0.21 s | 0.12 s or less (extra turnaround acceleration only when reversing) |
| Coyote time | 0.11 s | 0.13 s |
| Jump buffer | 0.13 s | 0.15 s |
| Dash speed, duration, cooldown | 890 px/s, 0.18 s, 0.09 s | Unchanged |
| Waveland speed, duration | 780 px/s, 0.30 s | Unchanged |

Feel rules:

- Inputs: Move, Jump, Magic, Special, Dash, Interact. Keyboard, controller and touch reach every action; mouse aim on PC is optional.
- The Arcane Bolt fires from Milo's hand in all eight directions, on the ground and in the air.
- Every hit lands with a short hit pause, a flash on the enemy, a sound and a small camera kick, scaled in four tiers from footstep to boss kill.
- Reduced-effects settings never remove a hostile telegraph and never lower damage.
- Physics runs at Godot's fixed 60 Hz tick, with physics interpolation turned on for smooth motion on faster displays.

## The twenty boons

Each boon must do exactly what its card says, and stacking it must change how it plays, not just its numbers. That rule outranks any new boon idea.

The last column lists where Alpha 7.3C's code didn't match the card, from the spec's audit. In the rebuild, every boon is built to its card from the start, and each one gets an automated test that checks the card's claims.

| Boon-giver | Unlocked | Stack identity | Passive | Special | Where Alpha 7.3C missed the card |
| --- | --- | --- | --- | --- | --- |
| Pyrra | Fresh save | Ignite → bloom | +Magic damage | Flame Nova | None; the reference boon |
| Maris | Level 1 | Enlarge → shove → roll through | +Max Health | Ground Wave | Weak knockback; undeclared air acceleration |
| Gaia | Level 1 | Commit → crush → brace | Armor/poise | Stone Barrier | Armor missing; adds undeclared pierce |
| Zephyra | Level 1 | Accelerate → pierce → fan | Cast speed | Crosswind Burst | Undeclared move speed |
| Belladonna | Level 1 | Feed → accelerate → consume | Pickup momentum | Devour | Pickup identity mostly missing |
| Flora | Level 2 | Plant → prime → bloom | Crit chance | Thorn Bind | Bursts every hit instead of building marks |
| Voltara | Level 2 | Connect → chain → recharge | Energy on hit | Arc Chain | None |
| Nerissa | Level 2 | Lure → charm → expose | Pickup magnet | Siren Call | Magnet and charm buildup missing |
| Crya | Level 3 | Slow → freeze → shatter | Defense vs controlled foes | Whiteout | Freeze and shatter missing |
| Roxyne | Level 3 | Isolate → mark → pounce | Duel damage | Predator Pounce | Boss mark hard to read |
| Luna | Level 4 | Record → repeat | Cheaper Specials | Moon Echo | Base echo missing |
| Calyptra | Level 4 | Roll → reveal → spike | Luck/crit damage | Loaded Dice | Roll result not shown per shot |
| Solara | Level 5 | Focus → pierce → execute | Elite/boss damage | Radiant Lance | No clear lance shape |
| Isolde | Level 5 | Preserve → reflect → repeat | Projectile range | Crystal Echo | Undeclared extra air jump |
| Aurelia | Level 6 | Accumulate → invest → cash out | More shards | Gilded Veil | Wealth-to-power missing |
| Somnia | Level 6 | Delay → deceive → repeat | Faster hurt recovery | Velvet Feint | Echo and passive missing |
| Noctissa | Level 7 | Vanish → trace → ambush | Ambush damage | Damage Blink | Ambush passive missing |
| Vespera | Level 7 | Counter → split → return | Wider perfect dodge | Mirror Shield | Shards and passive missing |
| Lilith | Level 8 | Sacrifice → drain → survive | Damage as Health falls | Blood Pact | Low-Health damage missing |
| Seraphine | Level 9 | Ward → orbit → retaliate | Regenerating shield | Halo Field | Boomerang instead of orbit |

System rules:

- Mini-boss and boss each offer a boon. Taking one activates its passive and Arcane modifier immediately; the player chooses whether to equip its Special.
- The strongest stacked boon sets the bolt's shape; others show as trails and impact effects.
- Each boon has two or three stack thresholds that unlock a new behavior.
- Named pair synergies (Steam Pressure, Stormfront, Crystal Garden, Eclipse Engine, Gilded Appetite) are bonuses, never required for a boon to be good.

## Levels, rooms and bosses

Each biome needs rooms that could only exist there. The level list and bosses are locked canon; the room layouts are where V2 does its work.

| Level | Core mechanic | Mini-boss | Boss |
| --- | --- | --- | --- |
| 1. Neon Maw | Moving club platforms, tempting dangerous pickups | Bottomless Bartender | Belladonna |
| 2. Drowned Court | Currents, bubble lifts, crowd buffs | The Fan Club | Nerissa |
| 3. Thornwild | Vine cover, ambush lanes, vertical pursuit | Perfect Prey | Roxyne |
| 4. Thunder Jackpot | Roulette effects with announced rules, timed rails | Lady Luckless | Calyptra |
| 5. Frozen Basilica | Ice momentum, delayed attacks | Memory Golem | Isolde |
| 6. Forever Motel | False awakening, looping doors | Dream Girl | Somnia |
| 7. City of a Thousand Faces | Mirrors, redirected and copied shots | Better Milo | Vespera |
| 8. Lilith's Throne | Recombines earlier mechanics, corruption | Lilith's Daughters | Lilith |
| 9. The Self Below | Curated Seven-Lord rush | Seven-Lord rush | The Hollow (three phases) |

Room rules:

- Every room is built from a biome kit: at least two height levels, one piece of cover or hazard tied to the level's mechanic, and a clear entry and exit.
- New mechanics follow teach, test, twist, combine, reward across a level.
- Enemy groups are composed, not random: each room mixes roles (chaser, shooter, area denial) chosen for that space.
- The room validator proves every room is reachable with the base kit, no dash or double-jump upgrades.

Boss rules:

- Each mini-boss teaches the concept its boss tests.
- At least four attacks, each with a wind-up the player can read from the boss's body and a sound, not from a text label.
- The Hollow suppresses Milo's build in phase two only, then restores all of it for a long, spectacular phase three.
- No HP inflation to cancel a strong build.

## Screen and HUD rules

During combat the player sees six small, fixed HUD slots at the edges, and nothing is drawn over the middle of the screen except the fight.

&#91;embedded content: V2 combat HUD layout · 6 slots\]

Alpha 8.2's Arcana loadout panel, Infernal Rush panel, room map and XP bar move to the pause screen or shrink to the slots above.

Rules:

- No raw code names, seeds or validator text on the play screen. Debug overlays need a debug flag.
- Hostile danger outranks everything: celebration text, Jackpot flourishes and grade letters never cover a telegraph.
- Floating combat text stays short (a damage number, KO) and never stacks into unreadable piles.
- Text in the HUD is at least 14 px at 1280×720, with a text-size setting.
- Separate settings for screen shake, flashes, camera motion, damage numbers and reduced effects.

## Art pipeline

Every character is drawn once, in layered parts, and animated with bones in Godot, so it looks the same in every frame and every pose.

1. **Model sheet.** One front-three-quarter drawing per character at a fixed height (Milo = 256 px in-game at 1280×720), plus a locked palette of 8–12 colors.
2. **Layered parts.** Split that drawing into parts on transparent layers: head, hair front and back, torso, upper and lower arms, hands, upper and lower legs, feet, plus 3–5 mouth and eye shapes for expressions. Export each part as its own PNG.
3. **Rig.** Assemble the parts on a Skeleton2D (or in Spine), with pivots at the joints and named sockets for the casting hand, feet and hit box.
4. **Animate.** Build idle, run, jump, fall, land, dash, cast (8 directions), hurt and defeat from the rig. Bosses add their attack wind-ups.
5. **Check in the game.** Look at it at real size next to Milo before approving.

Rules:

- One source file per character, kept in `art/source/`; exported parts in `art/export/<character>/`. No v01, v02-fixed copies; git keeps the history.
- Same line weight, lighting direction (top left) and outline color across all characters.
- Backgrounds are separate parallax layers behind a readable play layer; the play layer is always simpler and higher-contrast than the scenery.
- Bolt and boon effects are particles and shaders, not baked into character art.

## Story delivery

The story is told in short bursts the player can always skip, and the authored dialogue is used word for word.

**Theme:** desire is not evil, but letting it make every choice turns pleasure into a prison. Milo stays funny, horny and lazy, and still learns to take responsibility.

| Format | Length | Used for |
| --- | --- | --- |
| Bark | 1–5 s | Combat reactions, boon pickups, deaths |
| Micro-scene | 5–15 s | Room arrivals, Hellroom chats |
| Featured conversation | 15–35 s | Boss intros and defeats |
| Prestige scene | 45–90 s | Prologue, Memory Golem, False Awakening, Better Milo, Lilith, The Hollow, ending |

Rules:

- First playthrough: scenes play once. Repeat runs: nothing is forced; a skipped scene still grants its unlocks exactly once.
- The twenty boon-givers react to milestones, deaths, wins and their own boon being dominant, with cooldowns so lines don't repeat.
- Environment, hazards and boss behavior carry the story as much as dialogue.
- The ending stays as written: Milo wakes in his damaged room with bills and messages waiting, starts cleaning, and gets interrupted by another infernal problem.

## Build plan

Milo has to feel great in one plain room before any art, levels or boons get built. Alpha 8.2 scaled out content first and spent its last three releases fixing Milo.

&#91;embedded content: Rebuild milestones · 7 stages, each gated\]

Milestone 1 is the most important gate: if moving and shooting in an empty room isn't fun, nothing built on top of it will be.

## How decisions get made

Whoever builds the game (Claude Code or a contractor) can change how it plays and looks inside this doc; changes to who and what the game is go to Chris.

**Builders decide:** tuning numbers, room layouts, enemy variants, VFX and SFX hookup, HUD layout within the rules above, bug fixes, code structure and accessibility options.

**Chris decides:**

- Story, dialogue, the ending and content rating.
- The roster: adding, removing or reworking a boon-giver's core identity.
- Character redesigns after a model is locked.
- Engine changes, pricing and the free/full split.
- Whether art, animation or feel is good enough. Automated checks can't approve those.

**Every change** is a git commit with a plain-English message. **Every milestone** ends with a tagged build, a short change list, what was played to check it, and known problems. The next milestone doesn't start until Chris passes the current one's gate.

## Open decisions for Chris

These need your call before the milestones that depend on them.

- [ ] Who draws the layered character art (you, a hired artist, AI image tools plus cleanup), and in what tool? Needed before Milestone 2.
- [ ] Animate in Godot's built-in Skeleton2D, or in Spine with its Godot runtime? Needed before Milestone 2.
- [ ] Approve the shorter level targets (7–12 rooms per level instead of up to 24)? Needed before Milestone 4.
- [ ] Approve the snappier movement target (0.12 s reversal), with a setting for the old feel? Needed during Milestone 1.
- [ ] Should Infernal Rush stay on screen all the time, or only appear once the player reaches B rank?
- [ ] Where is the original July 2026 script? Until it turns up, Alpha 8.2's dialogue files are the source.
- [ ] Launch platforms (Steam, web, mobile), which set the content-rating and store work.

## Handoff to Claude Code

Start with an empty repo, this doc saved inside it, the CLAUDE.md below, and the Milestone 0 prompt.

1. Create an empty private GitHub repo called `demondive`.
2. Export this doc as Markdown and add it to the repo as `docs/design.md`.
3. Open the repo in Claude Code. Use the desktop app's Code tab with the repo on your PC if you want it to use files from your computer (music, reference art).
4. Add the CLAUDE.md below at the repo root.
5. Paste the Milestone 0 prompt. When it's done, play it, then paste the Milestone 1 prompt.

**Reference material on your PC**

| What | Where (inside `Downloads\DemonDive_Alpha8_2_Milo_Motion_Polish\DemonDive_Alpha8_2_Milo_Motion_Polish`) | Use in the rebuild |
| --- | --- | --- |
| 31 music tracks (mp3) | `assets\v1\audio`, `assets\a6\audio`, `assets\a7\audio`, `assets\a73\audio`, `assets\a73c\audio` | Copy into `audio/music/` with clean names |
| Portraits, bosses, enemies | `assets\a75\characters\boon-givers`, `assets\a5`–`assets\a8` | Reference for redrawing only |
| Alpha 8.2 source code (dialogue, boon data, tuning) | Inside the three `assets\*.js.map` files | Ask Claude Code to extract each map's `sourcesContent`; `types.ts` is missing because type-only files aren't in source maps |
| The old 18-part spec | `DemonDive_V1_Approved_Master_2026-10-13.docx` | Background only; this doc wins where they differ |

**Starter CLAUDE.md**

```markdown
# DemonDive — rules for Claude Code

Design source of truth: docs/design.md. Story, dialogue, character roster and names change only with Chris's approval.

## Engine
- Godot 4.4, GDScript with static types on every variable, parameter and return value.
- Ask Chris before adding any addon or plugin.

## Layout
- scenes/<feature>/ with each script next to its scene: player/, enemies/, bosses/, rooms/, ui/, hub/
- Autoloads only: Game (run state), Save, Audio, Strings, Debug.
- data/: boons, enemies and levels as Resource (.tres) files. Gameplay numbers live in data, not in code.
- art/source/ (layered originals), art/export/<character>/ (parts), audio/music/, audio/sfx/
- tests/: headless tests, run with Godot --headless.

## Code rules
- No script over 400 lines; split by responsibility.
- Player-facing text only through Strings. Never show IDs, seeds or debug text outside debug builds.
- Debug overlays live behind Debug.enabled (F3) and are stripped from release exports.
- Gameplay never depends on animation or VFX. Effect caps never reduce damage.
- Physics at a fixed 60 Hz with physics interpolation on.
- Every boon has a test that checks what its card says.

## Assets
- One file per asset; never v01/v02/fixed copies. Git is the history.
- Names: <kind>_<subject>_<part>.png, for example chr_milo_forearm_l.png.
- Characters are skeletal cutout rigs. Milo is 256 px tall in game at 1280x720.

## Workflow
- Work only on the current milestone in docs/design.md. Don't start the next until Chris passes its gate.
- Small commits with plain-English messages. Tag each finished milestone (m0, m1, ...).
- Before saying something works, run the tests and the scene. Say plainly what you couldn't check (feel, look) and ask Chris to play it.
```

**Milestone 0 prompt**

> Read docs/design.md and CLAUDE.md. Do Milestone 0: set up a Godot 4.4 project with the folder layout in CLAUDE.md, the Strings and Debug autoloads, a headless test runner with one passing test, and an empty test room with a placeholder Milo standing in it. Commit, tag m0, then tell me how to open and run it.

**Milestone 1 prompt**

> Do Milestone 1 from docs/design.md: Milo's full movement kit and 8-way Arcane Bolt in one test room, using simple placeholder shapes. Start from Alpha 8.2's A0 tuning (run 360 px/s, gravity 2350, jump velocity -760, dash 890 px/s for 0.18 s, waveland 780 px/s for 0.3 s), hit the reversal, coyote and buffer targets in the Controls section, and add an F3 debug panel to tune the numbers live. Then tell me what to try so I can judge the feel.
