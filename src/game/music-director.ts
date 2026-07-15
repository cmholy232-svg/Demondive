import { MUSIC_CUES, MUSIC_STATE_ROUTES, type MusicCueId, type MusicState } from './music';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

interface TransitionOptions {
  fadeSeconds?: number;
  resumeSaved?: boolean;
  onEnded?: () => void;
}

export class MusicDirector {
  private readonly players = [new Audio(), new Audio()];
  private activeIndex = 0;
  private currentCue: MusicCueId | null = null;
  private currentState: MusicState = 'NONE';
  private transitionToken = 0;
  private duckToken = 0;
  private unlocked = false;
  private pausedByGame = false;
  private masterVolume = 1;
  private musicVolume = .72;
  private duckGain = 1;
  private readonly playheads = new Map<MusicCueId, number>();

  constructor(private readonly baseUrl: string) {
    for (const player of this.players) {
      player.preload = 'auto';
      player.loop = true;
      player.volume = 0;
    }
    this.players[0].src = this.urlFor('music_title_main');
    this.players[1].src = this.urlFor('music_hub_main');
    this.players[0].load();
    this.players[1].load();
  }

  requestState(state: MusicState, options: TransitionOptions = {}): void {
    const route = MUSIC_STATE_ROUTES[state];
    if (state === this.currentState && route.cue === this.currentCue) return;
    this.currentState = state;
    if (route.duckDb !== undefined) this.setDuckDb(route.duckDb, .22);
    else if (state !== 'PORTAL_TRANSITION') this.setDuckDb(0, .35);
    if (!route.cue) {
      this.fadeOut(options.fadeSeconds ?? route.fadeSeconds);
      return;
    }
    this.transitionTo(route.cue, {
      fadeSeconds: options.fadeSeconds ?? route.fadeSeconds,
      resumeSaved: options.resumeSaved ?? route.resumeSaved,
      onEnded: options.onEnded,
    });
  }

  async unlock(): Promise<void> {
    this.unlocked = true;
    const current = this.players[this.activeIndex];
    if (!this.currentCue || this.pausedByGame) return;
    try { await current.play(); }
    catch { this.unlocked = false; }
  }

  pause(): void {
    this.pausedByGame = true;
    for (const player of this.players) player.pause();
  }

  resume(): void {
    this.pausedByGame = false;
    if (this.unlocked && this.currentCue) void this.players[this.activeIndex].play().catch(() => { this.unlocked = false; });
  }

  setMasterVolume(value: number): void {
    this.masterVolume = clamp01(value);
    this.applyActiveVolume();
  }

  setMusicVolume(value: number): void {
    this.musicVolume = clamp01(value);
    this.applyActiveVolume();
  }

  setDuckDb(db: number, seconds = .2): void {
    const token = ++this.duckToken;
    const from = this.duckGain;
    const to = dbToLinear(Math.min(0, db));
    const started = performance.now();
    const duration = Math.max(.01, seconds) * 1000;
    const tick = (now: number) => {
      if (token !== this.duckToken) return;
      const t = clamp01((now - started) / duration);
      this.duckGain = from + (to - from) * (1 - Math.pow(1 - t, 3));
      this.applyActiveVolume();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  getCurrentCue(): MusicCueId | null { return this.currentCue; }
  getCurrentPlayhead(): number { return this.players[this.activeIndex].currentTime || 0; }

  private transitionTo(cueId: MusicCueId, options: TransitionOptions): void {
    if (this.currentCue === cueId) {
      this.applyActiveVolume();
      if (!this.pausedByGame) void this.players[this.activeIndex].play().then(() => { this.unlocked = true; }).catch(() => { /* first valid interaction will unlock */ });
      return;
    }
    const token = ++this.transitionToken;
    const outgoingIndex = this.activeIndex;
    const incomingIndex = 1 - outgoingIndex;
    const outgoing = this.players[outgoingIndex];
    const incoming = this.players[incomingIndex];
    if (this.currentCue && Number.isFinite(outgoing.currentTime)) this.playheads.set(this.currentCue, outgoing.currentTime);

    const cue = MUSIC_CUES[cueId];
    incoming.pause();
    incoming.onended = null;
    incoming.src = this.urlFor(cueId);
    incoming.loop = cue.loop;
    incoming.preload = 'auto';
    incoming.load();
    const saved = options.resumeSaved && cue.resumePolicy === 'resume_if_recent' ? this.playheads.get(cueId) : undefined;
    const seek = () => {
      if (saved !== undefined && Number.isFinite(saved)) incoming.currentTime = Math.min(saved, Math.max(0, cue.loopEnd - .25));
      else incoming.currentTime = cue.loopStart;
    };
    if (incoming.readyState >= 1) seek(); else incoming.addEventListener('loadedmetadata', seek, { once: true });
    incoming.volume = 0;
    this.currentCue = cueId;
    this.activeIndex = incomingIndex;
    if (!cue.loop && options.onEnded) {
      incoming.onended = () => {
        if (token === this.transitionToken && this.currentCue === cueId) options.onEnded?.();
      };
    }
    if (!this.pausedByGame) void incoming.play().then(() => { this.unlocked = true; }).catch(() => { /* autoplay policy: DIVE IN will unlock */ });

    const duration = Math.max(.01, options.fadeSeconds ?? .8) * 1000;
    const started = performance.now();
    const outgoingStart = outgoing.volume;
    const target = this.targetVolume(cueId);
    const tick = (now: number) => {
      if (token !== this.transitionToken) return;
      const t = clamp01((now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      incoming.volume = clamp01(target * eased);
      outgoing.volume = clamp01(outgoingStart * (1 - eased));
      if (t < 1) requestAnimationFrame(tick);
      else {
        outgoing.pause();
        outgoing.volume = 0;
      }
    };
    requestAnimationFrame(tick);
  }

  private fadeOut(seconds: number): void {
    const token = ++this.transitionToken;
    const active = this.players[this.activeIndex];
    const inactive = this.players[1 - this.activeIndex];
    inactive.pause();
    inactive.volume = 0;
    const cue = this.currentCue;
    if (cue && Number.isFinite(active.currentTime)) this.playheads.set(cue, active.currentTime);
    this.currentCue = null;
    const startVolume = active.volume;
    const started = performance.now();
    const duration = Math.max(.01, seconds) * 1000;
    const tick = (now: number) => {
      if (token !== this.transitionToken) return;
      const t = clamp01((now - started) / duration);
      active.volume = clamp01(startVolume * (1 - t));
      if (t < 1) requestAnimationFrame(tick);
      else { active.pause(); active.volume = 0; }
    };
    requestAnimationFrame(tick);
  }

  private targetVolume(cueId: MusicCueId): number {
    return clamp01(this.masterVolume * this.musicVolume * this.duckGain * dbToLinear(MUSIC_CUES[cueId].gainDb));
  }

  private applyActiveVolume(): void {
    if (this.currentCue) this.players[this.activeIndex].volume = this.targetVolume(this.currentCue);
  }

  private urlFor(cueId: MusicCueId): string {
    return `${this.baseUrl}${MUSIC_CUES[cueId].file}`;
  }
}
