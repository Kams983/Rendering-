"""Synthesizes every sound effect used in the video. Run: python3 scripts/make_sfx.py"""
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
rng = np.random.default_rng(7)
OUT = "public/sfx/"

def t(d): return np.arange(int(SR * d)) / SR
def norm(x, peak=0.9): return (x / (np.max(np.abs(x)) + 1e-9) * peak).astype(np.float32)
def save(name, x): wavfile.write(OUT + name + ".wav", SR, (norm(x) * 32767).astype(np.int16))
def lp(x, f): return sosfilt(butter(2, f, "low", fs=SR, output="sos"), x)
def hp(x, f): return sosfilt(butter(2, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)
def fade(x, a=0.005, b=0.02):
    n = len(x); y = x.copy()
    na, nb = int(SR * a), int(SR * b)
    y[:na] *= np.linspace(0, 1, na); y[-nb:] *= np.linspace(1, 0, nb); return y

def whoosh(d=0.7, f0=300, f1=4000):
    n = rng.standard_normal(int(SR * d)); out = np.zeros_like(n)
    chunks = 24; step = len(n) // chunks
    for i in range(chunks):
        c = f0 * (f1 / f0) ** (i / (chunks - 1))
        seg = n[i * step:(i + 1) * step]
        out[i * step:(i + 1) * step] = bp(seg, c * 0.6, min(c * 1.6, 20000))
    env = np.sin(np.linspace(0, np.pi, len(out))) ** 1.5
    return fade(out * env)

def hit(d=0.9, f0=160, f1=38):
    x = t(d); f = f1 + (f0 - f1) * np.exp(-x * 18)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 5)
    click = lp(rng.standard_normal(len(x)), 3000) * np.exp(-x * 60) * 0.6
    return fade(body + click)

def tick(f=1800, d=0.03):
    x = t(d); return fade(np.sin(2 * np.pi * f * x) * np.exp(-x * 150), 0.0005, 0.005)

def pop(d=0.18):
    x = t(d); f = 500 + 500 * (1 - np.exp(-x * 40))
    return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 22))

def ding(f=1318, d=1.2):
    x = t(d)
    y = np.sin(2 * np.pi * f * x) + 0.4 * np.sin(2 * np.pi * f * 2.01 * x) + 0.15 * np.sin(2 * np.pi * f * 3.02 * x)
    return fade(y * np.exp(-x * 4))

def key(d=0.04):
    x = t(d); return fade(hp(rng.standard_normal(len(x)), 2500) * np.exp(-x * 110), 0.0005, 0.005)

def shutter():
    a = key(0.05); b = key(0.07) * 0.7; gap = np.zeros(int(SR * 0.05))
    return np.concatenate([a, gap, b])

def blip(f=900, d=0.08):
    x = t(d); return fade(np.sin(2 * np.pi * f * x) * np.exp(-x * 30))

def riser(d=2.3):
    n = rng.standard_normal(int(SR * d)); out = np.zeros_like(n)
    chunks = 40; step = len(n) // chunks
    for i in range(chunks):
        c = 200 * (6000 / 200) ** (i / (chunks - 1))
        out[i * step:(i + 1) * step] = bp(n[i * step:(i + 1) * step], c * 0.7, min(c * 1.4, 20000))
    x = t(d); tone = np.sin(2 * np.pi * np.cumsum(120 + 700 * (x / d) ** 2) / SR) * 0.5
    env = (x / d) ** 1.6
    return fade((out / np.max(np.abs(out)) + tone) * env, 0.01, 0.01)

def glitch(d=0.35):
    x = t(d); y = np.zeros(len(x))
    for i in range(6):
        s = int(i * 0.05 * SR); f = rng.choice([400, 800, 1200, 2400])
        seg = np.sin(2 * np.pi * f * t(0.04)) * np.exp(-t(0.04) * 60)
        y[s:s + len(seg)] += seg
    y += hp(rng.standard_normal(len(x)), 3000) * np.exp(-x * 14) * 0.4
    return fade(y)

def bed(d=33.0):
    x = t(d); y = np.zeros(len(x))
    for f, g in [(55, 1.0), (110, 0.7), (164.8, 0.5), (220, 0.4), (277.2, 0.25)]:
        for det in (-0.6, 0.0, 0.6):
            y += g * np.sin(2 * np.pi * (f + det) * x + rng.uniform(0, 6.28))
    y *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.12 * x)
    y += 0.12 * lp(rng.standard_normal(len(x)), 600)
    return lp(y, 1400)

for name, fn in {
    "whoosh": whoosh, "hit": hit, "tick": tick, "pop": pop, "ding": ding, "key": key,
    "shutter": shutter, "blip": blip, "riser": riser, "glitch": glitch, "bed": bed,
}.items():
    save(name, fn()); print("made", name)
