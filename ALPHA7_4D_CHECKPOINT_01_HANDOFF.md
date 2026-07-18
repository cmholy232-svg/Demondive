# DemonDive Alpha 7.4D — Checkpoint 01 Handoff

## Roadmap position

Active phase: **Alpha 7.4D — campaign/Deep Dive balance, stability and approval**.

Completed here: the first simulation/presentation performance safeguard. This checkpoint does not claim that the campaign balance, physical-device performance or two-hour Deep Dive approval gates are complete.

## Simulation-safe projectile policy

- Removed the live 320-projectile array trim that could delete earned damage and proc outcomes.
- All live projectiles now continue through ordinary update, collision and expiry rules.
- Normal and reduced-VFX modes bound detailed projectile rendering and trail emission independently of logical simulation.
- Player overflow is evenly consolidated visually.
- Hostile overflow is never hidden; it receives a cheaper high-contrast renderer so dodging information remains present.
- Local telemetry records logical, detailed, simplified and suppressed presentation counts.
- Projectile-versus-destructible-shot collision work now starts from a filtered hostile candidate list.

## Production-load safeguard

- Static campaign/content registries are split into a separate cacheable production chunk.
- This is a loading/compilation improvement, not proof of acceptable runtime frame pacing on phones.

## Automated evidence

- A 580-projectile stress fixture preserves exact logical count and summed damage.
- Every hostile projectile remains detailed or simplified.
- Presentation accounting covers all logical projectiles.
- Reduced-VFX projectile trails remain bounded.
- The existing deterministic campaign/room/save/input/boon gates remain required.

## Still required before Alpha 7.4D exit

- Full fresh-save and max-upgrade Levels 1–9 human completion matrix.
- Campaign/challenge-room difficulty review after boon reconciliation.
- Deep Dive block, cross-pollination, double-boss, wager/reward and obscene-build balance approval.
- Browser performance traces and a two-hour Deep Dive on representative hardware.
- Memory-growth, 30/60/90/120 Hz and physical keyboard/controller evidence.
- Resolution of every P0/P1 and disposition of all P2/P3 findings.

## Next safe task

Back up this checkpoint, then implement deterministic 7.4D integrity/stress fixtures and a campaign/Deep Dive difficulty budget report without replacing the required human playtest evidence.
