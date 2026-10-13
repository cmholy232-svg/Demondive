# DemonDive

A fast, funny 2D action roguelite built in Godot 4.4. The design lives in [docs/design.md](docs/design.md) and the code rules in [CLAUDE.md](CLAUDE.md).

## Open and run

1. Install [Godot 4.4](https://godotengine.org/download/archive/4.4.1-stable/) (standard build, not .NET).
2. In the Godot project manager, choose **Import**, pick this folder's `project.godot`, then **Import & Edit**.
3. Press **F5** (or the play button) to run the test room.
4. Press **F3** in game to show the debug overlay.

## Tests

```
godot --headless --path . -s tests/run_tests.gd
```

It prints PASS or FAIL per test and exits with 1 if anything fails.

## Milestones

Each finished milestone is tagged (`m0`, `m1`, ...). The current milestone is listed in docs/design.md.
