"""
Generates every sound effect used in the video.
Run with: npm run sfx
Requires numpy and scipy only. No network access and no downloaded samples.

The WAV files in public/audio are committed, so CI and editors do not need
Python. Re-run this script only when you want to change the sound design.
"""
import os
import wave

import numpy as np
from scipy import signal

SR = 44100
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "audio"))
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(20261115)


def t_axis(duration):
    return np.arange(int(SR * duration), dtype=np.float64) / SR


def noise(duration):
    return rng.standard_normal(int(SR * duration))


def sine(freq, t, phase=0.0):
    if np.isscalar(freq):
        f = np.full(t.shape, float(freq))
    else:
        f = np.asarray(freq, dtype=np.float64)
    return np.sin(2.0 * np.pi * np.cumsum(f) / SR + phase)


def decay(n, tau):
    return np.exp(-np.arange(n) / (SR * max(tau, 1e-4)))


def env_ad(n, attack, release, curve=1.6):
    env = np.ones(n)
    na = min(n, max(1, int(attack * SR)))
    nr = min(n, max(1, int(release * SR)))
    env[:na] = np.linspace(0.0, 1.0, na) ** curve
    env[n - nr :] *= np.linspace(1.0, 0.0, nr) ** curve
    return env


def lowpass(x, fc, order=4):
    fc = float(np.clip(fc, 30.0, SR * 0.45))
    sos = signal.butter(order, fc, btype="low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def highpass(x, fc, order=4):
    fc = float(np.clip(fc, 20.0, SR * 0.45))
    sos = signal.butter(order, fc, btype="high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def bandpass(x, lo, hi, order=3):
    lo = float(np.clip(lo, 20.0, SR * 0.44))
    hi = float(np.clip(hi, lo + 20.0, SR * 0.46))
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def band_sweep(x, f0, f1, q=1.3, blocks=56):
    """Sweeps a band pass filter across noise from f0 to f1."""
    n = len(x)
    out = np.zeros(n)
    edges = np.linspace(0, n, blocks + 1).astype(int)
    freqs = np.geomspace(f0, f1, blocks)
    zi = None
    for i in range(blocks):
        fc = float(freqs[i])
        lo = max(25.0, fc / (1.0 + 1.0 / q))
        hi = min(SR * 0.46, fc * (1.0 + 1.0 / q))
        if hi <= lo + 10.0:
            hi = lo + 40.0
        sos = signal.butter(2, [lo, hi], btype="band", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        segment = x[edges[i] : edges[i + 1]]
        y, zi = signal.sosfilt(sos, segment, zi=zi)
        out[edges[i] : edges[i + 1]] = y
    return out


def add_at(buffer, sound, start_seconds):
    start = max(0, int(start_seconds * SR))
    end = min(len(buffer), start + len(sound))
    if end > start:
        buffer[start:end] += sound[: end - start]


def save(name, data, peak=0.85):
    x = np.asarray(data, dtype=np.float64)
    x = np.nan_to_num(x)
    x = np.tanh(x * 1.1) / np.tanh(1.1)
    top = float(np.max(np.abs(x))) if x.size else 0.0
    if top > 1e-9:
        x = x / top * peak
    fade = max(1, int(0.005 * SR))
    fade = min(fade, len(x) // 2)
    if fade > 0:
        x[:fade] *= np.linspace(0.0, 1.0, fade)
        x[-fade:] *= np.linspace(1.0, 0.0, fade)
    x = np.clip(x, -1.0, 1.0)
    path = os.path.join(OUT, name)
    with wave.open(path, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes((x * 32767.0).astype("<i2").tobytes())
    print(f"wrote {name}  {len(x) / SR:.2f}s")


def bass_hit():
    duration = 1.8
    t = t_axis(duration)
    n = len(t)
    freq = 34.0 + 104.0 * np.exp(-t * 4.2)
    body = sine(freq, t) * decay(n, 0.52)
    click = highpass(noise(0.05), 1400.0, 2) * decay(len(t_axis(0.05)), 0.006)
    x = body.copy()
    add_at(x, 0.32 * click, 0.0)
    x = lowpass(x, 5200.0)
    save("bass_hit.wav", x, 0.88)


def key_click():
    duration = 0.16
    x = np.zeros(int(SR * duration))
    n1 = int(SR * 0.013)
    burst = highpass(noise(0.013), 2200.0, 2)[:n1] * decay(n1, 0.0022)
    x[:n1] += 0.8 * burst
    x[:n1] += 0.5 * (sine(2100.0, t_axis(0.013))[:n1] * decay(n1, 0.003))
    n2 = int(SR * 0.04)
    x[:n2] += 0.45 * (sine(155.0, t_axis(0.04))[:n2] * decay(n2, 0.012))
    x = lowpass(x, 9000.0)
    save("key_click.wav", x, 0.7)


def pop():
    duration = 0.26
    t = t_axis(duration)
    n = len(t)
    freq = 180.0 + 850.0 * np.exp(-t * 26.0)
    x = sine(freq, t) * decay(n, 0.05)
    click = highpass(noise(0.006), 2500.0, 2) * decay(len(t_axis(0.006)), 0.0015)
    add_at(x, 0.25 * click, 0.0)
    save("pop.wav", x, 0.7)


def chime():
    duration = 2.6
    t = t_axis(duration)
    n = len(t)
    x = np.zeros(n)
    partials = [
        (659.25, 0.45, 1.2),
        (987.77, 0.3, 0.95),
        (1318.51, 1.0, 0.8),
        (1975.53, 0.5, 0.55),
        (2637.02, 0.28, 0.4),
        (3520.0, 0.12, 0.28),
    ]
    for index, (freq, amp, tau) in enumerate(partials):
        detune = 1.0 + (index - 2) * 0.0008
        x += amp * np.sin(2.0 * np.pi * freq * detune * t + index * 0.3) * decay(n, tau)
    x *= np.minimum(1.0, t / 0.008)
    x = highpass(x, 220.0)
    save("chime.wav", x, 0.62)


def typing():
    duration = 1.7
    x = np.zeros(int(SR * duration))
    position = 0.02
    while position < 1.5:
        n1 = int(SR * 0.014)
        burst = highpass(noise(0.014), 1800.0, 2)[:n1] * decay(n1, 0.0025)
        body = sine(175.0, t_axis(0.014))[:n1] * decay(n1, 0.008)
        click = 0.55 * burst + 0.3 * body
        add_at(x, click * rng.uniform(0.6, 1.0), position)
        position += float(rng.uniform(0.055, 0.16))
    x = lowpass(x, 8500.0)
    x *= env_ad(len(x), 0.01, 0.12, 1.2)
    save("typing.wav", x, 0.62)


def whoosh():
    duration = 1.6
    t = t_axis(duration)
    n = len(t)
    u = np.linspace(0.0, 1.0, n)
    swept = band_sweep(noise(duration), 240.0, 4200.0, q=1.1)
    env = np.sin(np.pi * np.clip(u * 1.04, 0.0, 1.0)) ** 1.5
    x = swept * env
    x += 0.22 * sine(65.0 + 45.0 * u, t) * env**2
    save("whoosh.wav", x, 0.7)


def tick():
    duration = 0.14
    t = t_axis(duration)
    n = len(t)
    x = sine(2400.0, t) * decay(n, 0.008)
    x += 0.5 * sine(3600.0, t) * decay(n, 0.005)
    x += 0.12 * highpass(noise(duration), 3200.0, 2) * decay(n, 0.004)
    save("tick.wav", x, 0.52)


def riser():
    duration = 1.6
    t = t_axis(duration)
    n = len(t)
    u = np.linspace(0.0, 1.0, n)
    freq = np.geomspace(200.0, 1800.0, n)
    x = 0.48 * sine(freq, t)
    x += 0.5 * band_sweep(noise(duration), 400.0, 9000.0, q=1.4)
    env = u**1.7
    release = max(1, int(0.05 * SR))
    env[-release:] *= np.linspace(1.0, 0.0, release)
    x *= env
    save("riser.wav", x, 0.62)


def snap():
    duration = 0.22
    t = t_axis(duration)
    n = len(t)
    x = 0.55 * (sine(900.0 * np.exp(-t * 40.0) + 200.0, t) * decay(n, 0.035))
    n1 = int(SR * 0.018)
    click = bandpass(noise(0.018), 1200.0, 6500.0, 2)[:n1] * decay(n1, 0.0025)
    x[:n1] += 0.7 * click
    x[:n1] += 0.4 * sine(150.0, t_axis(0.018))[:n1] * decay(n1, 0.006)
    save("snap.wav", x, 0.72)


def rush():
    duration = 3.2
    t = t_axis(duration)
    n = len(t)
    u = np.linspace(0.0, 1.0, n)
    swept = band_sweep(noise(duration), 180.0, 3400.0, q=1.15)
    env = np.exp(-(((u - 0.55) / 0.34) ** 2))
    x = swept * env
    x += 0.3 * sine(42.0 + 22.0 * u, t) * env
    x = highpass(x, 28.0)
    save("rush.wav", x, 0.7)


def shimmer():
    duration = 1.8
    t = t_axis(duration)
    n = len(t)
    x = np.zeros(n)
    partials = [
        (2093.0, 0.22, 5.1),
        (2637.0, 0.2, 6.7),
        (3136.0, 0.18, 4.4),
        (3951.0, 0.14, 7.3),
        (5274.0, 0.1, 5.9),
    ]
    for freq, amp, rate in partials:
        tremolo = 0.55 + 0.45 * np.sin(2.0 * np.pi * rate * t + rng.uniform(0.0, 6.28))
        x += amp * np.sin(2.0 * np.pi * freq * t + rng.uniform(0.0, 6.28)) * tremolo
    x *= np.minimum(1.0, t / 0.12) * decay(n, 1.2)
    save("shimmer.wav", x, 0.42)


def hum():
    duration = 8.6
    t = t_axis(duration)
    n = len(t)
    x = np.zeros(n)
    partials = [
        (55.0, 1.0),
        (110.3, 0.45),
        (164.8, 0.25),
        (220.6, 0.15),
        (330.2, 0.08),
    ]
    for index, (freq, amp) in enumerate(partials):
        x += amp * np.sin(2.0 * np.pi * freq * t + index * 0.7)
    x += 0.18 * lowpass(noise(duration), 260.0)
    x *= 0.85 + 0.15 * np.sin(2.0 * np.pi * 0.07 * t)
    x *= env_ad(n, 1.2, 1.4, 1.2)
    save("hum.wav", x, 0.4)


def ding():
    duration = 1.15
    t = t_axis(duration)
    n = len(t)
    x = np.zeros(n)
    for freq, amp, tau in [(1568.0, 1.0, 0.28), (2352.0, 0.55, 0.18), (3136.0, 0.3, 0.12), (784.0, 0.25, 0.4)]:
        x += amp * np.sin(2.0 * np.pi * freq * t) * decay(n, tau)
    x *= np.minimum(1.0, t / 0.004)
    save("ding.wav", x, 0.55)


def thud():
    duration = 0.75
    t = t_axis(duration)
    n = len(t)
    freq = 42.0 + 105.0 * np.exp(-t * 11.0)
    x = sine(freq, t) * decay(n, 0.16)
    x += 0.3 * lowpass(noise(duration), 320.0) * decay(n, 0.03)
    save("thud.wav", x, 0.82)


def crack():
    duration = 2.2
    t = t_axis(duration)
    n = len(t)
    x = np.zeros(n)
    for _ in range(16):
        start = float(rng.uniform(0.0, 0.55) ** 1.5 * 0.55)
        length = float(rng.uniform(0.004, 0.018))
        ln = max(1, int(length * SR))
        burst = highpass(noise(length), rng.uniform(1800.0, 4200.0), 2)[:ln]
        burst = burst * decay(ln, rng.uniform(0.0015, 0.004))
        add_at(x, burst * rng.uniform(0.35, 1.0), start)
    for freq, amp, tau in [(2600.0, 0.4, 0.5), (3900.0, 0.28, 0.35), (5300.0, 0.16, 0.25), (7000.0, 0.08, 0.15)]:
        x += amp * np.sin(2.0 * np.pi * freq * t + rng.uniform(0.0, 1.0)) * decay(n, tau)
    x += 0.5 * sine(80.0 * np.exp(-t * 8.0) + 36.0, t) * decay(n, 0.25)
    x = highpass(x, 40.0)
    save("crack.wav", x, 0.62)


def dissonant():
    duration = 1.9
    t = t_axis(duration)
    n = len(t)
    x = 0.55 * np.sin(2.0 * np.pi * 392.0 * t)
    x += 0.5 * np.sin(2.0 * np.pi * 415.3 * t + 0.4)
    x += 0.25 * np.sin(2.0 * np.pi * 277.2 * t + 1.1)
    x += 0.18 * np.sin(2.0 * np.pi * 98.0 * t)
    x *= 0.75 + 0.25 * np.sin(2.0 * np.pi * 5.5 * t)
    x *= env_ad(n, 0.22, 0.6, 1.4)
    x = lowpass(x, 2400.0)
    save("dissonant.wav", x, 0.45)


def warm_swell():
    duration = 4.4
    t = t_axis(duration)
    n = len(t)
    x = np.zeros(n)
    partials = [
        (130.81, 1.0),
        (164.81, 0.7),
        (196.0, 0.6),
        (261.63, 0.5),
        (329.63, 0.3),
        (392.0, 0.2),
    ]
    for index, (freq, amp) in enumerate(partials):
        x += amp * np.sin(2.0 * np.pi * freq * t + index * 0.25)
        x += 0.22 * amp * np.sin(2.0 * np.pi * freq * 2.002 * t + index * 0.5)
    x = lowpass(x, 1600.0)
    x *= 0.75 + 0.25 * np.sin(2.0 * np.pi * 0.2 * t)
    x *= env_ad(n, 1.6, 1.4, 1.5)
    save("warm_swell.wav", x, 0.48)


def main():
    bass_hit()
    key_click()
    pop()
    chime()
    typing()
    whoosh()
    tick()
    riser()
    snap()
    rush()
    shimmer()
    hum()
    ding()
    thud()
    crack()
    dissonant()
    warm_swell()
    print(f"done, files are in {OUT}")


if __name__ == "__main__":
    main()
