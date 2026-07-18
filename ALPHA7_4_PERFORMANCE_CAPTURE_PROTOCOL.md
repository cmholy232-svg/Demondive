# DemonDive Alpha 7.4 Performance Capture Protocol

## Roadmap position

This protocol belongs to Alpha 7.4A measurement and Alpha 7.4D approval. It does not authorize movement retuning, fixed-step conversion, or removal of earned high-stack power.

## Reproducible baseline

- Baseline ID: `A0-alpha75-playable-339f20f`
- Protected source tag: `alpha-7.5-playable-preserved`
- Machine-readable values: `production/alpha7_4-a0-baseline.json`
- Starting state: fresh save, Pyrra selected, Level 1, no permanent upgrades
- Advanced-movement control: dash/wavedash/waveland values in the baseline JSON remain unchanged

## Local capture matrix

Run each row for at least three minutes after a 30-second warm-up. Record browser, OS, CPU, GPU, memory, display refresh rate, resolution, input device and reduced-VFX setting.

| Preset | Required scene | Purpose |
|---|---|---|
| A0-N | Fresh Level 1, neutral Pyrra bolt, ordinary movement | Baseline frame/input cost |
| A0-W | Fresh Level 1, repeated dash/wavedash/waveland | Advanced movement control |
| A0-B | One mini-boss and one boss per biome | Encounter/camera/hazard cost |
| A0-H | Scripted or naturally acquired high-stack build | Projectile/effect pressure |
| A0-D | Deep Dive for at least 30 rooms | Long-session growth and biome transitions |
| A0-X | Two-hour Deep Dive or deterministic soak substitute | Memory, frame pacing and stability |

Repeat A0-N and A0-W at 30, 60, 90 and 120 Hz where the display/browser permits. A fixed or semi-fixed simulation spike is justified only if travel, jump apex, shot cadence or advanced-movement outcomes materially diverge.

## Capturing the local report

Open the browser console and run:

```js
copy(JSON.stringify(window.__DEMONDIVE_TELEMETRY__(), null, 2))
```

Save the result with this filename pattern:

```text
A74_<preset>_<device>_<refresh>hz_<date>.json
```

The report remains local unless intentionally attached to a handoff. The game does not transmit telemetry.

## Initial budgets

These are warning thresholds for measurement, not automatic proof of failure:

- p95 frame time: desktop target at or below 16.67 ms at 60 Hz;
- maximum routine frame: below 33.33 ms outside loading/visibility changes;
- zero unexplained ignored inputs;
- zero live-projectile trims in ordinary campaign play;
- no unbounded growth in enemies, hazards, particles, floating text, effect arrays or active SFX;
- no monotonic memory growth after biome transitions and room cleanup;
- no material difference in jump apex, travel distance, fire cadence or wave-tech outcome across tested refresh rates.

## Required evidence

For every preset retain:

- telemetry JSON;
- one gameplay video with the full HUD visible;
- browser performance trace for A0-H and A0-X;
- peak process memory;
- notes separating stutter, input rejection, visual overload and intentional hit-stop;
- commit hash and save state.

Physical-device capture is a human approval gate. Automated build success must not mark it complete.
