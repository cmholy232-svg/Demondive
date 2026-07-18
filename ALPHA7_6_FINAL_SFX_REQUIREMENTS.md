# DemonDive Alpha 7.6 — Final Authored SFX Requirements

The game now has functional procedural fallbacks and working event hooks. These masters are the remaining authored-audio request. Nothing in this list is permission to replace the supplied music.

## Delivery specification

- Format: 48 kHz, 24-bit WAV, stereo unless the source is intentionally mono.
- Peak: no higher than -1 dBTP; leave mix headroom and do not master into a limiter wall.
- Tails: preserve natural tails; add 100 ms clean handles where practical.
- Loop files: seamless, zero-click loop points; also provide a one-shot tail.
- Naming: `sfx_<group>_<event>_<variant>_v01.wav`.
- Variants: routine repeated sounds need 4–6 variants; rare spectacle needs 1–3 layered stems.
- Stems: Tier 3/4 events should separate transient, body, magic, and tail when possible.
- Avoid spoken announcer lines. The temporary announcer remains disabled until a separately approved performance exists.

## 1. Milo and movement — 35 masters

| Family | Required files | Direction |
|---|---:|---|
| Footsteps | wood ×4, stone ×4, metal ×4, organic ×4 | Short, dry, readable under music |
| Jump | launch ×3, double-jump ×3 | Cloth/body plus restrained arcane lift |
| Landing | light ×3, hard ×3 | Weight without bass fatigue |
| Dash | start ×3, travel loop, end ×3 | Sharp occult displacement |
| Wavedash | confirm ×3 | Forward snap plus ground skim; unmistakable from dash |
| Waveland | confirm ×3 | Brighter vertical-to-ground conversion |
| Perfect dodge | confirm ×3 | Clean, rewarding, high-frequency window cue |
| Milo hurt | light ×3, heavy ×3 | Impact only; no voice required |
| Milo death | body, arcane break, tail | Three layerable stems |

## 2. Neutral Arcane Bolt and universal combat — 32 masters

| Family | Required files |
|---|---|
| Neutral fire | muzzle ×5, projectile loop, near-pass ×3 |
| Neutral impact | flesh ×5, armor ×4, stone ×4, shield ×4 |
| Enemy attack | melee swing ×4, heavy swing ×3, ranged launch ×4 |
| Enemy hit | light ×5, heavy ×4, stagger ×3 |
| Enemy defeat | small ×4, medium ×4, large ×3, elite break ×3 |
| Boss | hit ×3, phase transient ×3, defeat transient/body/tail |

## 3. Twenty boon sensory packages — 80 masters

Each boon needs four core masters: Arcane-layer shot, impact signature, status/passive confirmation, and Special. Specials may be delivered as transient/body/tail stems when noted.

| Boon | Shot / motion | Impact / status | Special direction |
|---|---|---|---|
| Pyrra | ignition crack | burning flare | expanding fire nova |
| Maris | pressurized water ribbon | splash/soak | restorative tidal surge |
| Gaia | stone launch | rock fracture/root | barrier rise and lock |
| Zephyra | air slice | gust displacement | high-speed wind rush |
| Flora | thorn whip | seed/root bloom | carnivorous garden burst |
| Voltara | electric snap | chain arc | escalating lightning storm |
| Crya | glassy ice shard | frost buildup/freeze | room-scale cold lock |
| Luna | lunar pulse | gravity mark | orbiting moon barrage |
| Solara | radiant spear | solar scorch | descending sun column |
| Aurelia | gilded chime | critical coin flash | invulnerable golden veil |
| Noctissa | shadow cut | void echo | teleport/afterimage strike |
| Belladonna | hungry maw launch | bite/slurp | ravenous devour eruption |
| Nerissa | sung projectile | charm chord | crushing demon-lord chorus |
| Roxyne | predator slash | bleed/mark | feral pounce sequence |
| Calyptra | roulette tick | critical jackpot ping | spinning wager wheel |
| Isolde | memory crystal | preserved fracture | cathedral freeze/recollection |
| Somnia | dream pulse | sleep echo | false-awakening wave |
| Vespera | mirror shard | reflection crack | thousandfold shatter |
| Lilith | royal decree bolt | crown brand | Queen-of-Hell command blast |
| Seraphine | halo fragment | shield/holy break | final ascendant intervention |

High stacks must add density through pitch, rhythm, or a consolidated layer—not twenty simultaneous full-volume loops.

## 4. Encounter signatures — 54 masters

Create three masters for every encounter: entrance/name sting, phase/escalation sting, and defeat tail.

| Level | Mini-boss | Boss |
|---:|---|---|
| 1 | Bottomless Bartender | Belladonna |
| 2 | Fan Champion | Nerissa |
| 3 | Perfect Prey | Roxyne |
| 4 | Lady Luckless | Calyptra |
| 5 | Memory Golem | Isolde |
| 6 | Dream Girl | Somnia |
| 7 | Better Milo | Vespera |
| 8 | Daughters relay | Lilith |
| 9 | Boss Rush Herald | The Hollow |

Boss phase stings must duck music cleanly without replacing or fighting the supplied boss themes.

## 5. Arcade, casino, rewards and UI — 33 masters

| Family | Required files |
|---|---|
| UI | navigate ×3, confirm ×3, cancel ×2, error ×2, pause, resume |
| Boons | orb appear ×3, inspect, claim transient/body/tail, reroll ×3, stack-up ×3 |
| Room reward | room clear D/C/B/A/S ×5, shard pickup ×4, health pickup ×3, energy pickup ×3 |
| Wagers | offer, accept, danger loop, win, lose |
| Infernal Rush | rank-up ×4, payout ×3 |
| Jackpot | anticipation loop, hit transient, marquee body, coin/shard shower, tail |
| Progression | XP tick ×3, level-up transient/body/tail, unlock |

## 6. Hazards and environment — 30 masters

- Fire: ignite, loop, extinguish.
- Water/current: current loop, bubble lift, splash.
- Thorn/snare: arm, trigger, release.
- Electric rail: charge, live loop, discharge.
- Ice: slide loop, crack, shatter.
- Dream door: enter, travel, exit.
- Mirror: reflect, crack, shatter.
- Royal sigil: telegraph, trigger.
- Memory rift: open, active loop, close.
- Generic platform: appear, break, moving-platform loop.

## Mix and implementation priorities

1. First delivery: Milo movement, neutral Arcane, enemy hit/defeat, UI confirm, boon claim.
2. Second delivery: twenty boon packages and boss phase/defeat signatures.
3. Third delivery: wagers, jackpots, progression, hazards, and environmental sweeteners.
4. Test every delivery over all supplied biome, mini-boss, and boss tracks at default volume.
5. Provide dry masters; reverb belongs to runtime biome buses where possible.

## Runtime mapping status

Already hooked: step, land, jump, double jump, dash, wavedash, waveland, perfect dodge, neutral fire, Special, Milo hurt, pickups, boon claim/reveal, enemy hit/shoot/defeat, boss defeat, boss phase, wager start/resolve, jackpot, rank/payout/clear chords.

Still requires authored-asset integration after delivery: material-specific impacts, biome reverb sends, encounter-specific signatures, all boon-specific SFX, hazard loops, UI navigation variants, and final loudness/fatigue tuning.
