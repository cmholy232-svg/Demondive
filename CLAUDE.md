# DemonDive — rules for Claude Code

Design source of truth: docs/design.md. Story, dialogue, character roster and names change only with Chris's approval.

## Engine
- Godot 4.4, GDScript with static types on every variable, parameter and return value.
- Ask Chris before adding any addon or plugin.

## Layout
- scenes/<feature>/ with each script next to its scene: player/, enemies/, bosses/, rooms/, ui/, hub/
- Autoloads only: Game (run state), Save, Audio, Strings, Debug. Their scripts live in autoload/.
- data/: boons, enemies and levels as Resource (.tres) files. Gameplay numbers live in data, not in code.
- art/source/ (layered originals), art/export/<character>/ (parts), audio/music/, audio/sfx/
- tests/: headless tests. Run: godot --headless --path . -s tests/run_tests.gd (exits 1 on any failure). Each test file extends TestCase; methods named test_* run.

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
