# DemonDive Alpha 7.7A — Current Narrative and Tutorial Audit

## Current runtime state

- Prologue, hub arrival, Level 1, Level 2, and Level 3 dialogue beats are implemented.
- Level 4–9 campaign mechanics and transitions exist, but equivalent authored entrance/rescue/mini-boss/boss/aftermath dialogue is absent.
- The ending has a mechanical Alpha finale/credits route, but its intended wake-up, apology, cleanup, television, pizza, and acceptance sequence is not fully staged as narrative scenes.
- The existing tutorial is a nine-step Hellroom checklist. It is useful as temporary control guidance but is not the approved three-room onboarding.
- Control prompts already follow the active keyboard/controller/touch abstraction, so tutorial presentation does not need to fork the movement controller.

## Approved three-room gate

1. Fundamentals: move, jump, neutral Arcane Bolt, defeat one basic enemy.
2. Arcana: collect Pyrra, fire the changed Bolt, use her Special; explain that passive/modifier stack while the equipped Special is replaceable.
3. Expression: dash and complete either a wavedash or waveland. Both are demonstrated, but one successful conversion opens the exit so onboarding never requires frame-perfect mastery.

## Migration rule

- Existing saves with `hellroom_tutorial_complete` must not be forced through the new tutorial.
- Fresh saves should enter the three-room tutorial after the prologue and before the normal Hellroom.
- A visible Skip Tutorial action must set a versioned completion flag and route safely to the Hellroom.
- The old Hellroom checklist remains only as temporary fallback until the playable three-room flow is integrated and verified.

## Story content gate

Do not invent final Level 4–9 dialogue merely to fill slots. The runtime needs a beat manifest and transition coverage first; final line writing must preserve the approved ending and Demon Lord identities and should receive narrative approval.
