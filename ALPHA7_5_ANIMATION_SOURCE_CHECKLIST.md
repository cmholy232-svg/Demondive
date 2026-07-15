# DemonDive Alpha 7.5 — Animation-Source Completeness Checklist

Alpha 7.6 must implement and tune motion, audio, VFX and feedback. It must not stop to discover that a required pose, mask, pivot, layer or effect source was never created. This checklist is the hard source gate.

## Universal source contract

Every animated gameplay asset must provide:

- stable canvas/cell size and integer crop bounds;
- transparent padding with no neighboring-cell bleed;
- named pivot and grounded-feet anchor;
- gameplay-facing direction convention;
- hitbox/hurtbox reference independent of painted silhouette;
- action start, active and recovery frame ownership;
- emissive/additive mask where glow is required;
- shadow/contact mask or explicit no-shadow rule;
- palette/value reference and color-accessibility note;
- runtime scale and mobile minimum-readable-size reference;
- authoring source plus optimized runtime export;
- status, human approval and version metadata.

## Milo source gate

### Baseline locomotion

- [ ] Idle breathing loop with stable planted feet
- [ ] Turn/reversal or a documented instantaneous flip rule
- [ ] Walk/low-speed locomotion coverage
- [ ] Full-speed run cycle
- [ ] Jump anticipation
- [ ] Jump rise
- [ ] Jump apex
- [ ] Fall
- [ ] Fast-fall distinction if visually required
- [ ] Soft landing
- [ ] Hard landing
- [ ] Ledge/collision recovery where required

### Expressive movement

- [ ] Dash anticipation/start
- [ ] Dash travel
- [ ] Dash recovery
- [ ] Wavedash contact confirmation source
- [ ] Waveland contact confirmation source
- [ ] Directional dash additive layer or all eight direction sources
- [ ] Perfect-dodge confirmation layer
- [ ] Hurt/invulnerability flash mask

### Arcane and Specials

- [ ] Neutral horizontal cast startup/release/recovery
- [ ] Upward cast startup/release/recovery
- [ ] Downward cast startup/release/recovery
- [ ] Diagonal cast startup/release/recovery or approved procedural arm/socket system
- [ ] Grounded-moving cast consistency
- [ ] Air-cast consistency
- [ ] Right-hand muzzle/socket reference for every cast direction
- [ ] Universal Special startup/release/recovery or per-Special exception list
- [ ] No purple/key-color contamination around feet or body edges

### Damage and presentation

- [ ] Light hurt
- [ ] Heavy hurt/knockdown
- [ ] Recovery/get-up
- [ ] Death
- [ ] Victory
- [ ] Dialogue neutral
- [ ] Dialogue determined/focused
- [ ] Dialogue hurt/exhausted

## Regular-enemy source gate

For every enemy archetype:

- [ ] Neutral/idle
- [ ] Locomotion
- [ ] Turn/facing contract
- [ ] Every attack telegraph
- [ ] Every active attack
- [ ] Recovery
- [ ] Hurt/stagger
- [ ] Death
- [ ] Elite modifier overlay compatibility
- [ ] Status overlays: burn, freeze, stun, charm, thorn/dream/predator marks and shadow trail
- [ ] Ranged muzzle/projectile source where applicable
- [ ] Grounded feet/pivot or explicit hover height
- [ ] No atlas-cell bleed at runtime sampling

## Mini-boss and boss source gate

For all eighteen campaign encounters:

- [ ] Intro/entrance
- [ ] Neutral and movement
- [ ] Every attack telegraph, active and recovery
- [ ] Vulnerable state
- [ ] Invulnerable state where mechanics require it
- [ ] Phase transition
- [ ] Summon/arena-control source where required
- [ ] Hurt/stagger response
- [ ] Defeat anticipation
- [ ] Death/clear
- [ ] Boss-bar portrait
- [ ] Small silhouette/icon
- [ ] Arena prop/hazard animation sources
- [ ] Deep Dive modifier compatibility
- [ ] Double-boss visual compatibility for eligible deep encounters
- [ ] Demon Lord silhouette/regalia approval for every campaign boss

## Twenty-boon source gate

For each boon:

- [x] Base projectile silhouette source
- [x] Base impact source
- [x] Status/identity source
- [x] Special identity source
- [x] Motion-language direction
- [x] SFX direction
- [x] Stack-escalation direction
- [x] High-stack consolidation rule
- [ ] Animated trail source/mask
- [ ] Passive indicator where necessary
- [ ] Enemy reaction/source requirement
- [ ] Special anticipation and payoff frames/layers
- [ ] Stack 1 gameplay capture
- [ ] Stack 2–3 gameplay capture
- [ ] Stack 4–5 gameplay capture
- [ ] Stack 6+ gameplay capture
- [ ] Mixed three-boon capture
- [ ] Mixed ten-boon capture
- [ ] Extreme-build consolidated capture
- [ ] Five-second recognition human approval

## Environment source gate

For all nine biomes:

- [ ] Layered background/parallax source
- [ ] Middle-ground source
- [ ] Gameplay platform family
- [ ] One-way platform readable state
- [ ] Hazard neutral/telegraph/active/recovery sources
- [ ] Entrance/exit gate states
- [ ] Reward pedestal/container states
- [ ] Recovery-room source
- [ ] Challenge-room source
- [ ] Mini-boss and boss arena sources
- [ ] Foreground occluder limits and masks
- [ ] Ambient motion sources
- [ ] Reduced-motion alternative
- [ ] Mobile-density alternative where required

## UI source gate

- [ ] Minimal combat HUD states
- [ ] Full-information/pause HUD states
- [ ] Health damage/heal transitions
- [ ] Demon Energy gain/spend/ready transitions
- [ ] Special ready/cooldown/insufficient states
- [ ] Boon pickup reveal and confirmation
- [ ] Dominant boon stack presentation
- [ ] Compact secondary stack presentation
- [ ] Boss introduction, phase and defeat states
- [ ] Wager inspect/accept/fail/win states
- [ ] Jackpot reveal states
- [ ] Deep Dive biome/depth/modifier transition states
- [ ] Global level/XP gain and level-up states
- [ ] Run summary, rank and personal-best states
- [ ] Keyboard/controller/touch focus and confirm states
- [ ] Reduced-motion UI transition option
- [ ] Desktop/mobile responsive source layouts

## Story/tutorial source gate

- [ ] Opening panels and portrait expressions
- [ ] Boon-giver introduction sources
- [ ] Boss introduction sources
- [ ] Inter-level scene sources
- [ ] Lilith sequence
- [ ] Hollow sequence
- [ ] Ending
- [ ] Credits
- [ ] Tutorial Room 1 movement/jump/Arcane prompts
- [ ] Tutorial Room 2 boon/passive/modifier/Special prompts
- [ ] Tutorial Room 3 dash/wavedash/waveland prompts and forgiving demonstration target
- [ ] Story-skip and subtitle presentation sources

## Final handoff fields per animation source

Each item delivered to Alpha 7.6 must record:

| Field | Required value |
|---|---|
| Asset ID | Stable registry key |
| Version | Incrementing source/runtime version |
| Status | Approved audit status |
| Human approval | Name/date or `false` |
| Source path | Editable master |
| Runtime path | Optimized export |
| Dimensions | Canvas and cell dimensions |
| Pivot/feet | Integer coordinates |
| Sockets | Named coordinates by frame |
| Frames | Ordered clip ranges |
| Timing intent | Anticipation/active/recovery milliseconds |
| Masks/layers | Emissive, additive, shadow, palette, hit-flash |
| Performance weight | Texture bytes, draw layers and expected simultaneous count |
| Accessibility | Flash/shake/motion dependencies |
| Test captures | Required gameplay scenarios |

Alpha 7.6 cannot begin full implementation until this checklist has no unknown required sources for Milo, the combat roster, environments, boon packages and core UI motion.
