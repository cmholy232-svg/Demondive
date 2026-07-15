# DemonDive Alpha 7.5 — Master Asset Audit v01

## Purpose and evidence boundary

This audit is the production gate between Alpha 7.5 asset creation and Alpha 7.6 implementation. It inventories the required families, assigns an honest status and prevents missing animation sources from being discovered during the animation pass.

The authoritative Alpha 7.4A source cannot currently be restored from Library because its stored-byte service returns “content not ready.” Therefore all Levels 4–9 runtime entries are `unknown-until-source-restored` unless a separate Alpha 7.5 source package exists locally. Unknown does not mean absent; it means no claim is permitted without inspecting the current registry and build.

No item in this audit is human-approved or marked final.

## Status language

| Status | Meaning |
|---|---|
| `final-integrated` | Approved final source is registered and verified in the current playable. Requires human approval. |
| `final-not-integrated` | Approved final source exists but is not registered in the playable. |
| `needs-correction` | A usable source exists but known cleanup, consistency, readability or coverage work remains. |
| `missing` | Required source does not exist. |
| `temporary-acceptable` | Deliberate temporary asset approved for the current gate, with a named replacement phase. |
| `rejected` | Must not ship or be reused. |
| `unknown-until-source-restored` | Current source cannot be inspected; absence must not be assumed. |

## Current asset-batch evidence

### Batch 01

- 20 normalized boon portraits, all correction-pending.
- 20 distinct boon sigils, all correction-pending.
- Six Level 4–9 low-density vector environment foundations, all correction-pending.

### Batch 02

- 20 boon sensory contracts.
- 80 vector components: projectile, impact, status and Special for every boon.
- Distinct motion, SFX, stack escalation and high-stack consolidation direction.

These batches are source preparation. They are not proof of runtime integration.

## Required audit by family

### Milo

Required package:

- proportion-locked turnaround and palette reference;
- fixed feet anchor and body scale across every locomotion/cast frame;
- idle, walk, run, jump anticipation, rise, apex, fall, land and hard land;
- dash start, dash travel, wavedash confirmation and waveland confirmation;
- horizontal, upward, downward and diagonal Arcane cast poses;
- Special startup/release/recovery coverage or a universal additive casting layer;
- hurt, knockdown, recover, death, victory and dialogue portrait states;
- separate hand/socket, body and additive VFX masks where animation needs them;
- mobile-scale silhouette and contrast proof.

Current status: `needs-correction`. The A5 rig is valuable and reusable, but final source coverage and scale consistency are not approved.

### Twenty boon-givers

Each requires:

- approved portrait and recurring costume/details lock;
- sigil and color/value lock;
- projectile, trail, impact, status, Special and passive indicator sources;
- stack 1, 2–3, 4–5 and 6+ escalation source rules;
- high-stack consolidation source/mask rules;
- dialogue/emote coverage required by the story plan;
- final SFX brief and three-variation plan where repetition is likely;
- five-second dominant-identity approval at gameplay scale.

Current status: `needs-correction`. All twenty now have the basic portrait/sigil/sensory source contract, but final cleanup and runtime proof remain.

### Enemies, mini-bosses and bosses

Each regular enemy requires a silhouette sheet, neutral/locomotion/attack/hurt/death sources, attack telegraph mask, hitbox reference and grounded feet/pivot contract. Ranged units additionally need projectile and muzzle sources. Shield/control units need readable state layers.

Each mini-boss and boss additionally requires:

- neutral, movement and every attack source;
- entrance, phase transition, vulnerability/invulnerability and death sources;
- boss-bar portrait and compact silhouette;
- arena-specific prop/hazard sources;
- no overlapping cells or borrowed pixels in any atlas;
- Demon Lord visual test for all campaign bosses: unmistakable infernal anatomy, silhouette or regalia beyond an ordinary attractive humanoid.

Levels 1–3 are `needs-correction`; their existing atlases remain useful but known crop/grounding issues require a fresh pass. Levels 4–9 remain `unknown-until-source-restored`.

### Nine biomes and rooms

Every biome package must lock:

- palette and value range;
- contrast and lighting direction;
- saturation hierarchy and accent-color budget;
- shape language, architecture, materials and prop families;
- background, middle-ground, gameplay platform, foreground and hazard layers;
- enemy/projectile/hazard/reward separation rules;
- density classes and mobile-safe variants;
- forbidden off-theme elements;
- authored room variants for entrance, recovery, combat, challenge, reward, mini-boss, boss and transition uses.

Levels 1–3 have raster foundations but need room-by-room cleanup. Levels 4–9 have restrained vector foundations but still need final art, props, platforms, hazards and foreground packages.

### HUD and menus

Required source families:

- minimal combat HUD and full-information/pause alternative;
- health, Demon Energy, Special, objective and context priority states;
- dominant boon plus compact secondary stack presentation;
- boss health/phase plate;
- wager inspection, accepted state, failure and payout;
- Deep Dive depth/biome/modifier state;
- run summary, personal best and global level/XP presentation;
- title, pause, settings, help, save-reset and credits navigation;
- controller/keyboard/touch prompt tokens;
- responsive desktop, mobile landscape and mobile portrait layouts;
- notch/safe-area and touch-occlusion guides.

Current status: mostly `unknown-until-source-restored`; final mobile-safe source is `missing`.

### Story, tutorial, ending and marketing

Alpha 7.5 must provide source material, not implement final narrative timing early:

- opening and Milo motivation panels;
- boon-giver and boss introduction portraits/poses;
- inter-level scene compositions;
- Lilith and Hollow sequences;
- ending and credits sources;
- three-room tutorial diagrams/prompts;
- store icon, screenshots, key art and adaptable mobile source compositions where practical.

Current status: incomplete or unknown until current source restoration.

## Room readability gate

Every room capture must distinguish, in this order:

1. Milo
2. enemies
3. enemy attacks
4. Milo’s attacks
5. hazards
6. platforms
7. rewards
8. background decoration

The solution is not more outlines on everything. Use value separation, local contrast, saturation priority, restrained foreground density and effect ownership. Capture tests must include neutral Arcane, a three-boon build, a ten-boon build and an extreme Deep Dive build.

## Alpha 7.5 exit rule

Alpha 7.5 may exit only when:

- the authoritative runtime registry is reconciled against this audit;
- no unintended placeholder or malformed asset remains;
- every item needed by the animation checklist exists;
- every final claim has explicit human approval;
- readability passes at representative desktop and mobile-equivalent scales;
- rejected and missing items are zero, except explicitly approved deferred marketing variants;
- the final asset registry and source archive are independently restore-tested.
