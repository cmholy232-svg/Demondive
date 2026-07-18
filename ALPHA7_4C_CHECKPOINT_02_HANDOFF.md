# DemonDive Alpha 7.4C — Checkpoint 02 Handoff

## Roadmap position

Active phase: **Alpha 7.4C1 — Twenty boon mechanical contracts**.

This checkpoint reconciles the remaining high-confidence runtime/copy mismatches identified in checkpoint `64e44d3`. It does not close the human recognition, extreme-stack, HUD or room-quality gates.

## Mechanical reconciliation

- Maris now adds explicit hit knockback.
- Zephyra now creates smaller, faster piercing needles with bounded threshold multishot.
- Flora now accumulates visible thorn marks and bursts at stack-driven thresholds.
- Crya's unrelated projectile growth was removed; frost now builds into freeze and heavy follow-up shatter.
- Luna now banks repeated-target damage and echoes it every third hit.
- Solara now creates faster, longer piercing lances in addition to major-target damage.
- Belladonna pickups now build short movement momentum and persistent room damage; full-resource pickups trigger a protective damage burst. Devour remains her Special.
- Nerissa retains homing and the corrected pickup magnet, and now gains a high-stack execution threshold.
- Somnia now shortens hurt/knockback presentation and creates bounded delayed Arcane echoes at explicit stack thresholds.
- Vespera now widens the perfect-dodge window and creates bounded impact shards.
- Aurelia now improves temporary currency collection, adds bounded bonus wealth drops and converts current run wealth into capped Arcane power.
- Noctissa now receives the promised full-health ambush multiplier. Player copy was corrected to the implemented lingering shade wound rather than an absent ground hazard.
- Lilith now gains damage as Health falls in addition to major-target lifesteal and Blood Pact.
- Seraphine now regenerates bounded shield charges and fires periodic orbit-fragment shots. The unrelated returning-bolt behavior was removed.

## Automated protections

- Status buildup thresholds are pure and tested.
- Somnia echo counts are bounded and tested at 0/1/4/8 stacks.
- Seraphine shield capacity is bounded and tested at 0/1/4/10 stacks.
- Delayed echo projectiles are dormant until activation and are not rendered early.
- Dominant identity and at most two secondary visual attachments remain unchanged.

## Still required before 7.4C1 exit

- Single, three, ten and extreme-stack scripted combat fixtures measuring damage/proc correctness and entity growth.
- Five-second recognition sessions with temporary silhouettes.
- Numeric balance review; mechanical reconciliation intentionally changes several builds' power.
- Removal of destructive live-projectile trimming in 7.4D before extreme Deep Dive approval.
- Full human approval of contract changes and player-facing copy.
