"""
Generates every sound effect used in the video as a WAV file in public/audio.
Run:  python scripts/generate_sfx.py
Needs: numpy, scipy

Want better sounds? Drop your own files into public/audio with the SAME names
and they will be used instead. Nothing else needs to change.
"""
import os
import wave

import numpy as np
from scipy import signal

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "audio")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t_axis(d):
    return np.linspace(0, d, int(SR * d), endpoint=False)


def sine(f, d, phase=0.0):
    t = t_axis(d)
    if np.isscalar(f):
        return np.sin(2 * np.pi * f * t + phase)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def noise(d):
    return rng.standard_normal(int(SR * d))


def adsr(n, a, r, curve=2.0):
    """Simple attack/release envelope over n samples (a, r in seconds)."""
    e = np.ones(n)
    na = max(1, int(a * SR))
    nr = max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na) ** curve
    e[-nr:] = np.minimum(e[-nr:], np.linspace(1, 0, nr) ** curve)
    return e


def decay(n, tau):
    t = np.arange(n) / SR
    return np.exp(-t / tau)


def lowpass(x, fc, order=4):
    sos = signal.butter(order, fc, btype="low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def highpass(x, fc, order=4):
    sos = signal.butter(order, fc, btype="high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def bandpass_sweep(x, f0, f1, q=2.0, blocks=48):
    """Noise through a band-pass whose centre frequency sweeps f0 -> f1."""
    n = len(x)
    out = np.zeros(n)
    edges = np.linspace(0, n, blocks + 1, dtype=int)
    fs = np.geomspace(f0, f1, blocks)
    zi = None
    for i in range(blocks):
        fc = fs[i]
        lo, hi = fc / (1 + 1 / q), min(fc * (1 + 1 / q), SR / 2 - 100)
        sos = signal.butter(2, [lo, hi], btype="band", fs=SR, output="sos")
        seg = x[edges[i]:edges[i + 1]]
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        seg_out, zi = signal.sosfilt(sos, seg, zi=zi)
        out[edges[i]:edges[i + 1]] = seg_out
    return out


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak


def fade_edges(x, ms=8):
    n = int(SR * ms / 1000)
    x = x.copy()
    x[:n] *= np.linspace(0, 1, n)
    x[-n:] *= np.linspace(1, 0, n)
    return x


def save(name, x):
    x = fade_edges(np.clip(x, -1, 1))
    data = (x * 32767).astype("<i2")
    path = os.path.join(OUT, name)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print("wrote", name, f"{len(x) / SR:.2f}s")


# 1. Rising whoosh (opening)
d = 2.0
x = bandpass_sweep(noise(d), 200, 3500, q=1.2)
x *= adsr(len(x), 1.4, 0.5, curve=1.5)
save("whoosh_rise.wav", norm(x, 0.8))

# 2. Soft bass hit
d = 1.4
f = 90 * np.exp(-t_axis(d) * 3.0) + 38
x = sine(f, d) * decay(int(SR * d), 0.35)
x += 0.25 * lowpass(noise(d), 300) * decay(int(SR * d), 0.08)
save("bass_hit.wav", norm(x, 0.95))

# 3. Soft pop
d = 0.25
f = 700 * np.exp(-t_axis(d) * 18) + 220
x = sine(f, d) * decay(int(SR * d), 0.04)
save("pop.wav", norm(x, 0.7))

# 4. Low ambient hum (4s)
d = 4.0
x = sine(55, d) + 0.5 * sine(110.4, d) + 0.25 * sine(165.2, d)
x += 0.15 * lowpass(noise(d), 400)
x *= adsr(len(x), 1.0, 1.2, curve=1.0)
save("hum.wav", norm(x, 0.5))

# 5. Riser
d = 1.1
f = np.geomspace(300, 2400, int(SR * d))
x = sine(f, d) * 0.5 + bandpass_sweep(noise(d), 500, 6000, q=1.5) * 0.6
x *= adsr(len(x), 1.0, 0.08, curve=2.0)
save("riser.wav", norm(x, 0.7))

# 6. Glass chime
d = 2.2
x = np.zeros(int(SR * d))
for k, (fr, amp) in enumerate([(1318.5, 1.0), (1975.5, 0.6), (2637.0, 0.45), (3951.0, 0.2)]):
    x += amp * sine(fr, d) * decay(len(x), 0.9 / (1 + 0.4 * k))
save("chime.wav", norm(x, 0.7))

# 7. Notification ding
d = 0.9
x = sine(1568, d) * decay(int(SR * d), 0.18) + 0.5 * sine(2352, d) * decay(int(SR * d), 0.12)
save("ding.wav", norm(x, 0.6))

# 8. Paper crumple (cluster of tiny noise bursts)
d = 1.1
x = np.zeros(int(SR * d))
for _ in range(70):
    pos = int(rng.uniform(0, d - 0.1) * SR)
    ln = int(rng.uniform(0.006, 0.03) * SR)
    burst = highpass(rng.standard_normal(ln), 1500, 2) * np.linspace(1, 0, ln) ** 2
    x[pos:pos + ln] += burst[: len(x[pos:pos + ln])] * rng.uniform(0.3, 1.0)
x *= np.linspace(1, 0.4, len(x))
save("crumple.wav", norm(x, 0.8))

# 9. Soft thud
d = 0.6
f = 120 * np.exp(-t_axis(d) * 14) + 45
x = sine(f, d) * decay(int(SR * d), 0.09)
x += 0.2 * lowpass(noise(d), 600) * decay(int(SR * d), 0.03)
save("thud.wav", norm(x, 0.9))

# 10. Step click
d = 0.22
x = sine(1400, d) * decay(int(SR * d), 0.012)
x += 0.5 * highpass(noise(d), 2500) * decay(int(SR * d), 0.01)
x += 0.6 * sine(180, d) * decay(int(SR * d), 0.03)
save("step_click.wav", norm(x, 0.7))

# 11. Tick
d = 0.18
x = sine(2200, d) * decay(int(SR * d), 0.01) + 0.4 * sine(3300, d) * decay(int(SR * d), 0.008)
save("tick.wav", norm(x, 0.6))

# 12. Mechanical loop whir
d = 1.6
f = np.geomspace(180, 520, int(SR * d))
x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * 0.35
x = lowpass(x, 1800)
x += 0.2 * bandpass_sweep(noise(d), 600, 2200, q=2)
x *= adsr(len(x), 0.4, 0.5, curve=1.5)
save("loop_whir.wav", norm(x, 0.55))

# 13. Warm swell
d = 4.0
x = np.zeros(int(SR * d))
for fr in (130.8, 164.8, 196.0, 261.6):
    x += sine(fr, d) + 0.3 * sine(fr * 2.003, d)
x = lowpass(x, 1500)
x *= adsr(len(x), 2.2, 1.6, curve=1.4)
save("swell.wav", norm(x, 0.6))

# 14. Final deep hit
d = 2.5
f = 70 * np.exp(-t_axis(d) * 2.0) + 32
x = sine(f, d) * decay(int(SR * d), 0.9)
x += 0.3 * lowpass(noise(d), 250) * decay(int(SR * d), 0.12)
save("final_hit.wav", norm(x, 0.95))

# 15. Shimmer
d = 2.2
x = np.zeros(int(SR * d))
for fr in (2093, 2637, 3136, 3951, 4699):
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * rng.uniform(4, 9) * t_axis(d))
    x += sine(fr, d, rng.uniform(0, 6.28)) * trem * 0.4
x *= adsr(len(x), 0.25, 1.6, curve=1.5)
save("shimmer.wav", norm(x, 0.45))

