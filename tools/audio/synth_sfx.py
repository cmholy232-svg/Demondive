"""Synthesizes the small UI and combat sounds DemonDive needs.
Run: python tools/audio/synth_sfx.py audio/sfx   (needs numpy)"""
import sys, wave, pathlib
import numpy as np

RATE = 44100
rng = np.random.default_rng(7)


def t(seconds):
    return np.arange(int(RATE * seconds)) / RATE


def env(n, attack=0.005, release=0.2):
    x = np.arange(n) / RATE
    a = np.clip(x / max(attack, 1e-4), 0, 1)
    r = np.exp(-x / max(release, 1e-4))
    return a * r


def sweep(f0, f1, seconds, shape="sine"):
    x = t(seconds)
    f = np.geomspace(f0, f1, len(x))
    phase = 2 * np.pi * np.cumsum(f) / RATE
    if shape == "square":
        return np.sign(np.sin(phase)) * 0.6
    if shape == "saw":
        return 2 * ((phase / (2 * np.pi)) % 1) - 1
    return np.sin(phase)


def noise(seconds, lowpass=0.5):
    n = rng.standard_normal(int(RATE * seconds))
    out = np.zeros_like(n)
    acc = 0.0
    for i, v in enumerate(n):
        acc += lowpass * (v - acc)
        out[i] = acc
    return out / (np.abs(out).max() + 1e-9)


def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[: len(p)] += p
    return out


def save(folder, name, data, gain=0.8):
    data = data / (np.abs(data).max() + 1e-9) * gain
    pcm = (np.clip(data, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(folder / f"sfx_{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())


def main(folder):
    folder = pathlib.Path(folder)
    s = sweep(520, 140, 0.28, "square") * env(int(RATE * 0.28), 0.002, 0.09)
    save(folder, "milo_hurt", mix(s, noise(0.2, 0.3) * env(int(RATE * 0.2), 0.001, 0.05) * 0.6))
    shimmer = sum(sweep(f, f * 1.5, 0.45) for f in (880, 1320, 1760)) * env(int(RATE * 0.45), 0.01, 0.18)
    save(folder, "perfect_dodge", shimmer, 0.7)
    ding = mix(sweep(1500, 1700, 0.12) * env(int(RATE * 0.12), 0.002, 0.05), sweep(2250, 2400, 0.16) * env(int(RATE * 0.16), 0.03, 0.06) * 0.6)
    save(folder, "pickup_shard", ding, 0.55)
    save(folder, "pickup_heal", sweep(400, 900, 0.3) * env(int(RATE * 0.3), 0.02, 0.12), 0.6)
    save(folder, "enemy_shoot", mix(sweep(900, 300, 0.16, "saw") * env(int(RATE * 0.16), 0.002, 0.05) * 0.5, noise(0.1, 0.6) * env(int(RATE * 0.1), 0.001, 0.03) * 0.4), 0.5)
    windup = sweep(120, 420, 0.5, "saw") * np.linspace(0.2, 1, int(RATE * 0.5)) * env(int(RATE * 0.5), 0.05, 2.0)
    save(folder, "boss_windup", windup, 0.55)
    boom = mix(sweep(90, 35, 0.9) * env(int(RATE * 0.9), 0.003, 0.35), noise(0.6, 0.15) * env(int(RATE * 0.6), 0.002, 0.2))
    save(folder, "boss_phase", boom, 0.9)
    whoosh = noise(1.6, 0.08) * np.sin(np.linspace(0, np.pi, int(RATE * 1.6)))
    save(folder, "boss_vortex", mix(whoosh, sweep(300, 60, 1.6) * 0.3), 0.7)
    chord = sum(sweep(f, f, 0.9) * env(int(RATE * 0.9), 0.01, 0.4) for f in (523, 659, 784, 1046))
    save(folder, "room_clear", chord, 0.6)
    save(folder, "cage_hit", mix(sweep(2000, 1800, 0.2) * env(int(RATE * 0.2), 0.001, 0.06), sweep(3100, 2900, 0.2) * env(int(RATE * 0.2), 0.001, 0.04) * 0.5), 0.5)
    save(folder, "door_open", mix(sweep(200, 400, 0.4, "saw") * env(int(RATE * 0.4), 0.05, 0.2) * 0.4, noise(0.4, 0.2) * env(int(RATE * 0.4), 0.05, 0.15) * 0.4), 0.6)
    save(folder, "ui_move", sweep(1200, 1300, 0.05) * env(int(RATE * 0.05), 0.001, 0.02), 0.35)
    save(folder, "ui_confirm", mix(sweep(700, 1050, 0.18) * env(int(RATE * 0.18), 0.002, 0.08), sweep(1050, 1400, 0.22) * env(int(RATE * 0.22), 0.06, 0.08) * 0.7), 0.5)
    save(folder, "special", mix(sweep(200, 1400, 0.35, "saw") * env(int(RATE * 0.35), 0.01, 0.2) * 0.5, noise(0.5, 0.3) * env(int(RATE * 0.5), 0.01, 0.2) * 0.5), 0.75)
    save(folder, "enemy_die", mix(sweep(600, 80, 0.35, "square") * env(int(RATE * 0.35), 0.001, 0.1) * 0.5, noise(0.3, 0.4) * env(int(RATE * 0.3), 0.001, 0.08) * 0.6), 0.65)
    save(folder, "milo_die", mix(sweep(400, 50, 1.4, "saw") * env(int(RATE * 1.4), 0.01, 0.6) * 0.6, noise(1.0, 0.1) * env(int(RATE * 1.0), 0.01, 0.4) * 0.4), 0.7)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "audio/sfx")
