import { arcaneSoundTier, BOON_NOTE_SEMITONES, selectArcaneVoices } from './arcane-audio';
import type { BoonId } from './types';

interface AudioPool { players: HTMLAudioElement[]; cursor: number; }

const VOICES_BY_TIER = [0, 0, 1, 2, 3, 4] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// The supplied blast is a D-minor one-shot. Every harmonic layer is a short
// derivative of that same recording, pitch-shifted to a D-natural-minor scale
// tone. No unrelated synth or legacy note bank is mixed into Arcane casting.
export class ArcaneAudioDirector {
  private readonly blast: AudioPool;
  private readonly harmonic: AudioPool;
  private runVoicing = 0;

  constructor(private readonly baseUrl: string) {
    this.blast = this.makePool('arcane-blast-dminor.mp3', 10);
    this.harmonic = this.makePool('arcane-blast-harmonic.wav', 20);
  }

  setRunSeed(seed: number): void {
    this.runVoicing = Math.abs(Math.floor(seed)) % 3;
  }

  playBlast(stacks: Record<BoonId, number>, featured: BoonId, shotIndex: number, volume: number): void {
    if (volume <= .001) return;
    const tier = arcaneSoundTier(stacks);
    const microRate = [0.992, 1, 1.008][Math.abs(shotIndex + this.runVoicing) % 3];
    this.play(this.blast, .74 * volume, microRate);

    // Dense builds earn richer harmony without firing a full twenty-note
    // cluster on every projectile. Pickup reveals still play the large chord.
    const voiceLimit = VOICES_BY_TIER[tier];
    const cadence = tier >= 4 ? 2 : 3;
    if (voiceLimit === 0 || shotIndex % cadence !== 0) return;
    const voices = selectArcaneVoices(stacks, shotIndex + this.runVoicing, voiceLimit, featured);
    const support = .28 / Math.sqrt(Math.max(1, voices.length));
    voices.forEach((voice, index) => {
      const featuredGain = voice.id === featured ? .23 : support;
      const stackPresence = 1 + Math.min(.22, Math.max(0, voice.stacks - 1) * .035);
      this.play(this.harmonic, featuredGain * stackPresence * volume, this.pitchRate(voice.id, index));
    });
  }

  playReveal(stacks: Record<BoonId, number>, featured: BoonId, volume: number): void {
    if (volume <= .001) return;
    const tier = arcaneSoundTier(stacks);
    this.play(this.blast, .68 * volume, .92);
    const voices = selectArcaneVoices(stacks, this.runVoicing, Math.min(7, 2 + tier), featured);
    const support = .48 / Math.sqrt(Math.max(1, voices.length));
    voices.forEach((voice, index) => {
      window.setTimeout(() => {
        const gain = voice.id === featured ? .42 : support;
        this.play(this.harmonic, gain * volume, this.pitchRate(voice.id, index));
      }, index * 34);
    });
    window.setTimeout(() => this.play(this.harmonic, .34 * volume, clamp(this.pitchRate(featured, voices.length) * 2, .72, 1.92)), 55 + voices.length * 34);
  }

  private pitchRate(id: BoonId, voiceIndex: number): number {
    const pitchClass = BOON_NOTE_SEMITONES[id] % 12;
    let semitones = pitchClass;
    // Three deterministic inversions keep repeated runs from sounding
    // identical while the tonal center remains D minor.
    if (this.runVoicing === 1 && pitchClass >= 8) semitones -= 12;
    if (this.runVoicing === 2 && voiceIndex % 3 === 2 && pitchClass >= 5) semitones -= 12;
    return clamp(Math.pow(2, semitones / 12), .62, 1.9);
  }

  private makePool(filename: string, size: number): AudioPool {
    const src = `${this.baseUrl}assets/v1/audio/sfx/${filename}`;
    return {
      cursor: 0,
      players: Array.from({ length: size }, () => {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.preservesPitch = false;
        audio.load();
        return audio;
      }),
    };
  }

  private play(pool: AudioPool, volume: number, rate = 1): void {
    const audio = pool.players[pool.cursor++ % pool.players.length];
    audio.pause();
    audio.currentTime = 0;
    audio.playbackRate = clamp(rate, .5, 2);
    audio.volume = clamp(volume, 0, .82);
    void audio.play().catch(() => { /* The first valid player gesture unlocks media. */ });
  }
}
