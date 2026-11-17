"""Generates every sound effect for the video into public/audio.

Only numpy and scipy are used, nothing is downloaded, so the whole audio bed
works offline in CI. Run `npm run sfx` after changing a sound, then commit the
wav files. The voice is not generated here; it is added later in the editor.
"""
from __future__ import annotations

import os

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "audio")

rng = np.random.default_rng(20261117)


def clock(duration: float) -> np.ndarray:
    return np.arange(int(round(duration * SR))) / SR


def noise(duration: float) -> np.ndarray:
    return rng.standard_normal(int(round(duration * SR)))


def lowpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, cutoff / (SR / 2), btype="low", output="sos")
    return signal.sosfilt(sos, x)


def highpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, cutoff / (SR / 2), btype="high", output="sos")
    return signal.sosfilt(sos, x)


def bandpass(x: np.ndarray, low: float, high: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(
        order,
        [low / (SR / 2), high / (SR / 2)],
        btype="band",
        output="sos",
    )
    return signal.sosfilt(sos, x)


def swept_band(
    x: np.ndarray,
    start_hz: float,
    peak_hz: float,
    end_hz: float,
    q: float = 1.15,
) -> np.ndarray:
    """State variable band pass with a moving centre frequency."""
    n = len(x)
    half = n // 2
    centers = np.concatenate(
        [
            np.linspace(start_hz, peak_hz, max(1, half), endpoint=False),
            np.linspace(peak_hz, end_hz, n - half),
        ]
    )
    out = np.empty(n)
    low = 0.0
    band = 0.0
    damp = 1.0 / q
    for i in range(n):
        f = 2.0 * np.sin(np.pi * min(centers[i], SR * 0.45) / SR)
        low += f * band
        high = x[i] - low - damp * band
        band += f * high
        out[i] = band
    return out


def fade_edges(x: np.ndarray, ms: float = 8.0) -> np.ndarray:
    n = min(max(1, int(SR * ms / 1000)), max(1, len(x) // 2))
    ramp = np.linspace(0.0, 1.0, n)
    y = x.copy()
    y[:n] *= ramp
    y[-n:] *= ramp[::-1]
    return y


def write(name: str, x: np.ndarray, peak: float) -> None:
    x = np.nan_to_num(np.asarray(x, dtype=float))
    level = float(np.max(np.abs(x))) if len(x) else 0.0
    if level > 0:
        x = x / level * peak
    x = fade_edges(x)
    path = os.path.join(OUT_DIR, name)
    wavfile.write(path, SR, (np.clip(x, -1.0, 1.0) * 32767).astype(np.int16))
    print(f"{name:16s} {len(x) / SR:5.2f}s  {os.path.getsize(path) / 1024:7.1f} KiB")


def low_hit() -> np.ndarray:
    d = 2.4
    t = clock(d)
    freq = 46.0 + 92.0 * np.exp(-t * 3.2)
    phase = 2.0 * np.pi * np.cumsum(freq) / SR
    body = np.sin(phase) * np.exp(-t * 1.7)
    sub = np.sin(2.0 * np.pi * 32.0 * t) * np.exp(-t * 1.1) * 0.55
    click = lowpass(noise(d), 2600.0) * np.exp(-t * 70.0) * 0.22
    return lowpass(body + sub + click, 700.0)


def swish() -> np.ndarray:
    d = 0.55
    t = clock(d)
    n = noise(d)
    body = swept_band(n, 600.0, 2600.0, 700.0)
    env = np.exp(-(((t - 0.16) / 0.13) ** 2))
    air = highpass(n, 1800.0) * np.exp(-(((t - 0.15) / 0.08) ** 2)) * 0.22
    return (body * env + air) * 0.6


def dull_swipe() -> np.ndarray:
    d = 0.46
    t = clock(d)
    n = noise(d)
    body = swept_band(n, 240.0, 900.0, 220.0, q=0.9)
    env = np.exp(-(((t - 0.15) / 0.15) ** 2))
    return lowpass(body * env, 1400.0)


def chime() -> np.ndarray:
    d = 2.6
    t = clock(d)
    partials = (
        (1046.5, 1.05, 1.0),
        (1568.0, 0.78, 0.6),
        (2093.0, 0.55, 0.34),
        (3136.0, 0.36, 0.18),
    )
    out = np.zeros_like(t)
    for index, (freq, tau, amp) in enumerate(partials):
        out += np.sin(2.0 * np.pi * freq * t + index * 0.4) * np.exp(-t / tau) * amp
    attack = np.minimum(1.0, t / 0.005)
    sparkle = bandpass(noise(d), 3000.0, 10000.0) * np.exp(-t * 11.0) * 0.1
    return (out * attack + sparkle) * 0.8


def tick() -> np.ndarray:
    d = 0.14
    t = clock(d)
    tone = np.sin(2.0 * np.pi * 1450.0 * t) * np.exp(-t * 32.0)
    click = lowpass(noise(d), 5200.0) * np.exp(-t * 120.0) * 0.4
    return tone + click


def flash_tone() -> np.ndarray:
    d = 0.95
    t = clock(d)
    freq = 420.0 * np.exp(t * 2.5)
    phase = 2.0 * np.pi * np.cumsum(freq) / SR
    chirp = np.sin(phase) * np.exp(-t * 3.4)
    burst = highpass(noise(d), 2200.0) * np.exp(-t * 8.0) * 0.42
    tail = np.sin(2.0 * np.pi * 2637.0 * t) * np.exp(-t * 3.0) * 0.18
    return lowpass(chirp + tail, 9000.0) + burst


def pulse_hum() -> np.ndarray:
    d = 3.8
    t = clock(d)
    tremolo = 0.62 + 0.38 * np.sin(2.0 * np.pi * 1.1 * t - np.pi / 2.0)
    tone = (
        np.sin(2.0 * np.pi * 88.0 * t)
        + 0.45 * np.sin(2.0 * np.pi * 176.0 * t + 0.3)
        + 0.18 * np.sin(2.0 * np.pi * 264.0 * t + 0.7)
    )
    breath = lowpass(noise(d), 320.0) * 0.18
    fade = np.minimum(1.0, t / 0.6) * np.minimum(1.0, (d - t) / 0.9)
    return lowpass(tone * tremolo * 0.5 + breath, 700.0) * fade


def warm_swell() -> np.ndarray:
    d = 2.9
    t = clock(d)
    env = (1.0 - np.exp(-t / 0.5)) * np.exp(-t / 1.9)
    out = np.zeros_like(t)
    for index, freq in enumerate((196.0, 246.94, 293.66, 392.0)):
        vib = 1.0 + 0.0015 * np.sin(2.0 * np.pi * 4.6 * t + index)
        out += np.sin(2.0 * np.pi * freq * vib * t + index * 0.6) / (index + 1.6)
    air = bandpass(noise(d), 1200.0, 5200.0) * env * 0.06
    return lowpass(out * env, 2600.0) + air


def tunnel_tone() -> np.ndarray:
    d = 9.5
    t = clock(d)
    n = noise(d)
    movement = 2100.0 + 900.0 * np.sin(2.0 * np.pi * 0.11 * t)
    air = swept_band(n, 1500.0, 2400.0, 1800.0, q=0.55)
    air = air * (0.55 + 0.45 * np.sin(2.0 * np.pi * 0.17 * t + 1.2))
    drone = 0.28 * np.sin(2.0 * np.pi * 110.0 * t) + 0.18 * np.sin(
        2.0 * np.pi * 164.8 * t + 0.4
    )
    fade = np.minimum(1.0, t / 1.8) * np.minimum(1.0, (d - t) / 2.2)
    swell = 0.9 + 0.1 * np.sin(2.0 * np.pi * 0.05 * t)
    return lowpass((air * 0.35 * movement / movement.mean() + drone * 0.3) * fade * swell, 5200.0)


def ping() -> np.ndarray:
    d = 1.5
    t = clock(d)
    out = (
        np.sin(2.0 * np.pi * 1568.0 * t) * np.exp(-t / 0.38)
        + 0.55 * np.sin(2.0 * np.pi * 2093.0 * t + 0.4) * np.exp(-t / 0.26)
        + 0.24 * np.sin(2.0 * np.pi * 3136.0 * t + 0.9) * np.exp(-t / 0.16)
    )
    attack = np.minimum(1.0, t / 0.004)
    return out * attack


def glass_tap() -> np.ndarray:
    d = 1.0
    t = clock(d)
    out = np.zeros_like(t)
    for index, (freq, tau) in enumerate(
        ((2140.0, 0.11), (3260.0, 0.075), (4410.0, 0.05))
    ):
        out += np.sin(2.0 * np.pi * freq * t + index) * np.exp(-t / tau) / (index + 1.4)
    strike = bandpass(noise(d), 1800.0, 9000.0) * np.exp(-t * 120.0) * 0.5
    return out + strike


def timer_tick() -> np.ndarray:
    d = 0.18
    t = clock(d)
    body = np.sin(2.0 * np.pi * 940.0 * t) * np.exp(-t * 45.0)
    click = lowpass(noise(d), 3800.0) * np.exp(-t * 150.0) * 0.3
    return body + click


def decay_tail() -> np.ndarray:
    d = 4.0
    t = clock(d)
    tone = (
        np.sin(2.0 * np.pi * 52.0 * t) * np.exp(-t / 1.6)
        + 0.4 * np.sin(2.0 * np.pi * 78.0 * t + 0.4) * np.exp(-t / 1.1)
    )
    wash = lowpass(noise(d), 480.0) * np.exp(-t / 1.3) * 0.22
    return lowpass(tone + wash, 600.0)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"writing {OUT_DIR}")
    write("low_hit.wav", low_hit(), 0.78)
    write("swish.wav", swish(), 0.5)
    write("dull_swipe.wav", dull_swipe(), 0.42)
    write("chime.wav", chime(), 0.62)
    write("tick.wav", tick(), 0.5)
    write("flash.wav", flash_tone(), 0.66)
    write("pulse_hum.wav", pulse_hum(), 0.3)
    write("swell.wav", warm_swell(), 0.55)
    write("tunnel.wav", tunnel_tone(), 0.24)
    write("ping.wav", ping(), 0.5)
    write("glass_tap.wav", glass_tap(), 0.55)
    write("timer_tick.wav", timer_tick(), 0.4)
    write("decay.wav", decay_tail(), 0.5)


if __name__ == "__main__":
    main()
