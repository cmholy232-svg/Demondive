# DemonDive Alpha 7.5 — Combat-Cast Correction Register

## Outcome

This register separates reported art defects, runtime drawing defects and encounter-behavior defects so one category is not “fixed” by damaging another. It defines the complete source gate for all nine mini-bosses and nine bosses.

## Non-negotiable source rules

- One gameplay body scale per character across every state.
- Feet or declared hover pivots determine placement; transparent image bounds do not.
- Colliders never scale with art.
- Every atlas cell has at least 6% transparent inset.
- No frame borrows pixels from an adjacent row or column.
- Large attack effects, tails, wings, hair, antlers and phase auras export as separate layers where they exceed the body cell.
- Every action includes anticipation, active and recovery sources.
- Hit-flash, emissive and palette masks exist before Alpha 7.6.

## Reported-defect intake retained

The register explicitly carries forward:

- Milo floating above the floor;
- Milo becoming too large during moving fire;
- upward fire becoming too small and clipping purple at his feet;
- floating/cropped Neon Maw enemies and Blade Siren attack/head clipping;
- an unresolved enemy-altitude defect;
- Belladonna attack-form clipping;
- Roxyne phase-two clipping;
- an unresolved mini-boss image glitch.

Unresolved identity/cell reports require a restored-runtime debug capture showing asset id, state, frame, source rectangle, pivot and draw scale. Whole atlases must not be shifted blindly.

## Demon Lord standard

Every campaign boss must read as infernal in a five-second silhouette test before color, portrait or effects are visible. Horns alone are insufficient when the rest of the figure reads as an ordinary attractive human. Use controlled demonic anatomy, wings/tails/fins, regalia, monstrous phase shapes or impossible apparatus appropriate to the character’s identity.

Nerissa remains a horned/fin-crested siren Demon Lord; Roxyne remains a horned predatory Demon Lord; Belladonna remains appetite framed by independent maws; Calyptra, Isolde, Somnia, Vespera and Lilith each receive their own infernal silhouette grammar. The Hollow begins at Milo’s scale instead of becoming a generic giant monster.

## Art versus mechanics

The register preserves mechanical notes that must be fixed in the restored runtime:

- Nerissa’s music-pillar state must communicate and enforce invulnerability until all pillars break.
- Perfect Prey cannot only run away; its combat loop requires actual attacks.
- A valid art pivot cannot compensate for a renderer applying a state-specific scale or source rectangle.

## Current availability

Levels 1–3 have source/keyed assets and corrected exports that still need runtime-cell review. Levels 4–9 do not have authoritative combat atlases in this isolated workspace; portraits, sigils and sensory direction are not substitutes for animation sources.

## Approval state

`source-ready-correction-pending`; `humanApproved: false`; `playableRelease: false`. The silhouette board is a production brief, not final character art.
