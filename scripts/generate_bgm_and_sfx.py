import os
import wave
import numpy as np

SAMPLE_RATE = 44100
OUT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "remotion-video", "public", "audio")
)
os.makedirs(OUT_DIR, exist_ok=True)


def save_wav(filename: str, samples: np.ndarray, sample_rate: int = SAMPLE_RATE):
    path = os.path.join(OUT_DIR, filename)
    clipped = np.clip(samples, -1.0, 1.0)
    pcm16 = (clipped * 32767.0).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm16.tobytes())
    print(f"[Audio Generated] {path} ({len(pcm16) / sample_rate:.2f}s)")


def generate_ambient_bgm(duration_sec: float = 420.0):
    """
    Synthesizes a warm, modern, unobtrusive corporate/civic ambient pad loop
    (Cmaj9 -> Am9 -> Fmaj7 -> G6) with gentle harmonic shimmer and soft pulse,
    specifically carved around 250Hz-3.5kHz so the narrator's voice sits crystal clear on top.
    """
    loop_sec = 32.0  # 4 chords x 8 seconds each
    n_loop = int(loop_sec * SAMPLE_RATE)
    t = np.linspace(0, loop_sec, n_loop, endpoint=False)

    # Chord frequencies (warm low-mid pads + gentle high harmonic)
    chords = [
        # Cmaj9: C3, G3, B3, D4, E4
        [130.81, 196.00, 246.94, 293.66, 329.63],
        # Am9: A2, E3, G3, B3, C4
        [110.00, 164.81, 196.00, 246.94, 261.63],
        # Fmaj7: F2, C3, E3, A3, C4
        [87.31, 130.81, 164.81, 220.00, 261.63],
        # G6: G2, D3, E3, B3, D4
        [98.00, 146.83, 164.81, 246.94, 293.66],
    ]

    loop_audio = np.zeros(n_loop, dtype=np.float64)
    chord_len = int(8.0 * SAMPLE_RATE)
    fade_len = int(1.2 * SAMPLE_RATE)

    for idx, freqs in enumerate(chords):
        start = idx * chord_len
        end = start + chord_len
        ct = np.linspace(0, 8.0, chord_len, endpoint=False)

        # Smooth envelope with crossfade-friendly attack and release
        env = np.ones(chord_len, dtype=np.float64)
        env[:fade_len] = 0.5 * (1.0 - np.cos(np.pi * np.linspace(0, 1, fade_len)))
        env[-fade_len:] = 0.5 * (1.0 + np.cos(np.pi * np.linspace(0, 1, fade_len)))

        # Slow LFO for warm movement
        lfo = 0.88 + 0.12 * np.sin(2.0 * np.pi * 0.25 * ct)

        chord_wave = np.zeros(chord_len, dtype=np.float64)
        weights = [0.34, 0.24, 0.18, 0.14, 0.10]
        for f, w in zip(freqs, weights):
            # Fundamental + soft detuned chorus
            chord_wave += w * (
                np.sin(2.0 * np.pi * f * ct)
                + 0.35 * np.sin(2.0 * np.pi * (f * 1.002) * ct + 0.4)
            )

        # Gentle arpeggiated bell plucks (very soft, adds modern tech feel)
        arp_step = int(0.5 * SAMPLE_RATE)
        for step_i in range(16):
            s0 = step_i * arp_step
            s1 = min(chord_len, s0 + arp_step)
            st = np.linspace(0, (s1 - s0) / SAMPLE_RATE, s1 - s0, endpoint=False)
            note_f = freqs[step_i % len(freqs)] * 2.0
            pluck_env = np.exp(-5.5 * st) * (1.0 - np.exp(-80.0 * st))
            chord_wave[s0:s1] += 0.045 * pluck_env * np.sin(2.0 * np.pi * note_f * st)

        loop_audio[start:end] += chord_wave * env * lfo

    # Normalize loop to a comfortable level
    max_val = np.max(np.abs(loop_audio))
    if max_val > 0:
        loop_audio = (loop_audio / max_val) * 0.45

    # Tile to full duration
    n_total = int(duration_sec * SAMPLE_RATE)
    repeats = (n_total // n_loop) + 1
    full_audio = np.tile(loop_audio, repeats)[:n_total]

    # Fade in first 2s and fade out last 3s
    fi = int(2.0 * SAMPLE_RATE)
    fo = int(3.0 * SAMPLE_RATE)
    full_audio[:fi] *= np.linspace(0, 1, fi)
    full_audio[-fo:] *= np.linspace(1, 0, fo)

    save_wav("bgm_ambient.wav", full_audio)


def generate_sfx():
    # 1. Soft UI Click (for search button & citation click)
    dur_click = 0.09
    t = np.linspace(0, dur_click, int(dur_click * SAMPLE_RATE), endpoint=False)
    click = (
        0.55 * np.sin(2 * np.pi * 1150 * t) * np.exp(-65 * t)
        + 0.35 * np.sin(2 * np.pi * 2400 * t) * np.exp(-110 * t)
    )
    save_wav("sfx_click.wav", click)

    # 2. Soft Scene Whoosh / Air Transition
    dur_whoosh = 0.42
    t = np.linspace(0, dur_whoosh, int(dur_whoosh * SAMPLE_RATE), endpoint=False)
    env = np.sin(np.pi * (t / dur_whoosh)) ** 2.2
    freq_sweep = np.linspace(180, 520, len(t))
    phase = 2 * np.pi * np.cumsum(freq_sweep) / SAMPLE_RATE
    rng = np.random.default_rng(42)
    noise = rng.normal(0, 0.12, len(t))
    # Simple moving-average lowpass on noise
    kernel = np.ones(32) / 32.0
    filtered_noise = np.convolve(noise, kernel, mode="same")
    whoosh = env * (0.28 * np.sin(phase) + 0.55 * filtered_noise)
    save_wav("sfx_whoosh.wav", whoosh)

    # 3. Soft Verification Chime (for grounded synthesis / inspector reveal)
    dur_chime = 0.65
    t = np.linspace(0, dur_chime, int(dur_chime * SAMPLE_RATE), endpoint=False)
    env1 = np.exp(-6.0 * t) * (1.0 - np.exp(-120.0 * t))
    env2 = np.exp(-5.0 * np.maximum(0, t - 0.08)) * (t >= 0.08)
    chime = (
        0.32 * env1 * np.sin(2 * np.pi * 587.33 * t)  # D5
        + 0.36 * env2 * np.sin(2 * np.pi * 880.00 * t)  # A5
    )
    save_wav("sfx_chime.wav", chime)

    # 4. Soft Modern Pop / Card Elevation SFX
    dur_pop = 0.12
    t_pop = np.linspace(0, dur_pop, int(dur_pop * SAMPLE_RATE), endpoint=False)
    freq_pop = np.linspace(420, 880, len(t_pop))
    phase_pop = 2 * np.pi * np.cumsum(freq_pop) / SAMPLE_RATE
    env_pop = np.exp(-32.0 * t_pop) * (1.0 - np.exp(-180.0 * t_pop))
    pop = 0.38 * env_pop * np.sin(phase_pop)
    save_wav("sfx_pop.wav", pop)

    # 5. Subtle Tech Radar / Embedding Shimmer SFX
    dur_shimmer = 0.75
    t_shim = np.linspace(0, dur_shimmer, int(dur_shimmer * SAMPLE_RATE), endpoint=False)
    env_shim = np.sin(np.pi * (t_shim / dur_shimmer)) ** 1.8
    shim = (
        0.20 * np.sin(2 * np.pi * 523.25 * t_shim)  # C5
        + 0.22 * np.sin(2 * np.pi * 659.25 * t_shim)  # E5
        + 0.25 * np.sin(2 * np.pi * 783.99 * t_shim)  # G5
        + 0.18 * np.sin(2 * np.pi * 1046.50 * t_shim)  # C6
    ) * env_shim
    save_wav("sfx_shimmer.wav", shim)


if __name__ == "__main__":
    generate_ambient_bgm(435.0)
    generate_sfx()
