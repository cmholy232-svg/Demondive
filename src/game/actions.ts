export type GameAction = 'left' | 'right' | 'up' | 'down' | 'jump' | 'fire' | 'special' | 'dash' | 'interact';

export const GAME_ACTIONS: readonly GameAction[] = Object.freeze([
  'left','right','up','down','jump','fire','special','dash','interact',
]);

export const KEYBOARD_ACTION_BINDINGS: Readonly<Record<GameAction, readonly string[]>> = Object.freeze({
  left:['ArrowLeft','KeyA'],
  right:['ArrowRight','KeyD'],
  up:['ArrowUp','KeyW'],
  down:['ArrowDown','KeyS'],
  jump:['Space'],
  fire:['KeyJ','KeyX'],
  special:['KeyK','KeyC'],
  dash:['ShiftLeft','ShiftRight','KeyL'],
  interact:['KeyE'],
});

export interface GamepadLike {
  axes: ArrayLike<number>;
  buttons: ArrayLike<{ pressed?: boolean } | undefined>;
}

export function isGameAction(value: string): value is GameAction {
  return (GAME_ACTIONS as readonly string[]).includes(value);
}

export function keyboardActionActive(action: GameAction, pressedCodes: ReadonlySet<string>): boolean {
  return KEYBOARD_ACTION_BINDINGS[action].some(code => pressedCodes.has(code));
}

export function gamepadActionActive(action: GameAction, gamepad: GamepadLike | null | undefined): boolean {
  if (!gamepad) return false;
  const x = gamepad.axes[0] ?? 0;
  const y = gamepad.axes[1] ?? 0;
  const pressed = (index: number) => Boolean(gamepad.buttons[index]?.pressed);
  if (action === 'left') return x < -.35;
  if (action === 'right') return x > .35;
  if (action === 'up') return y < -.35;
  if (action === 'down') return y > .35;
  if (action === 'jump') return pressed(0);
  if (action === 'dash') return pressed(1) || pressed(5);
  if (action === 'fire') return pressed(2) || pressed(7);
  if (action === 'special') return pressed(3) || pressed(4);
  return pressed(3);
}
