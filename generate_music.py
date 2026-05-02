"""
Sparkle Match — Themed Music Generator

Generates four themed loop tracks (~40–60s each) using layered synthesis:
  - Bell tones (inharmonic partials with exponential decay)
  - Plucked tones (Karplus-Strong-ish)
  - Soft pads (detuned sine layers)
  - Feedback reverb + stereo widening
  - Crossfade for seamless looping

Outputs WAV first, then converts to MP3 via ffmpeg.
"""

import numpy as np
import wave
import os
import subprocess

SR = 22050  # 22.05kHz is fine for ambient music; halves file size
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'audio')
os.makedirs(OUT_DIR, exist_ok=True)


# ===================== Synth primitives =====================

def bell_note(freq, dur, vol=0.3, brightness=1.0):
    """Bell-like: fundamental + inharmonic partials with exponential decay."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = (
        1.00 * np.sin(2 * np.pi * freq * t) * np.exp(-t * 1.8) +
        0.50 * np.sin(2 * np.pi * freq * 2.01 * t) * np.exp(-t * 3.5 / brightness) +
        0.30 * np.sin(2 * np.pi * freq * 3.0 * t) * np.exp(-t * 5.0 / brightness) +
        0.15 * np.sin(2 * np.pi * freq * 4.1 * t) * np.exp(-t * 7.0 / brightness)
    )
    a = int(0.005 * SR)
    if a < n:
        sig[:a] *= np.linspace(0, 1, a)
    return sig * vol


def pluck_note(freq, dur, vol=0.3):
    """Pluck: fast attack, fast decay with harmonics."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * freq * t) * np.exp(-t * 3.5)
    sig += 0.30 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t * 6)
    sig += 0.15 * np.sin(2 * np.pi * freq * 3 * t) * np.exp(-t * 9)
    a = int(0.002 * SR)
    if a < n:
        sig[:a] *= np.linspace(0, 1, a)
    return sig * vol


def pad_note(freq, dur, vol=0.15):
    """Soft pad: 3 detuned sines with slow attack/release."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = (
        np.sin(2 * np.pi * freq * t) +
        np.sin(2 * np.pi * freq * 1.006 * t) * 0.7 +
        np.sin(2 * np.pi * freq * 0.994 * t) * 0.7
    ) / 2.4
    a = min(int(0.4 * SR), n // 3)
    r = min(int(0.5 * SR), n - a)
    if a > 0:
        sig[:a] *= np.linspace(0, 1, a) ** 2
    if r > 0:
        sig[-r:] *= np.linspace(1, 0, r) ** 2
    return sig * vol


def soft_sine(freq, dur, vol=0.20, attack=0.05, release_ratio=0.5):
    """Pure sine with soft envelope, good for dreamy melodies."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * freq * t)
    a = min(int(attack * SR), n // 3)
    r = min(int(dur * release_ratio * SR), n - a)
    if a > 0:
        sig[:a] *= np.linspace(0, 1, a)
    if r > 0:
        sig[-r:] *= np.linspace(1, 0, r) ** 2
    return sig * vol


def add_at(track, sig, time):
    """Add signal to mono track at given time (in seconds), clipped to track length."""
    start = int(time * SR)
    end = start + len(sig)
    if start >= len(track):
        return
    if end > len(track):
        sig = sig[:len(track) - start]
        end = len(track)
    track[start:end] += sig


def feedback_reverb(signal, delay_ms=120, decay=0.4, taps=4):
    """Cheap feedback reverb: multiple delayed echoes."""
    delay = int(delay_ms * SR / 1000)
    out = signal.copy()
    fb = signal.copy()
    for _ in range(taps):
        new = np.zeros_like(out)
        if delay < len(fb):
            new[delay:] = fb[:-delay] * decay
        out = out + new
        fb = new
    return out


def stereo_from_mono(signal, delay_ms=14, lr_balance=0.7):
    """Make a stereo pair from mono by tiny inter-aural delay."""
    delay = int(delay_ms * SR / 1000)
    left = signal.copy()
    right = np.zeros_like(signal)
    if delay < len(signal):
        right[delay:] = signal[:-delay]
    # Slight blend so it doesn't sound too phasey
    L = left + right * (1 - lr_balance)
    R = right + left * (1 - lr_balance)
    return np.column_stack((L, R))


def normalize(sig, level=0.85):
    peak = np.max(np.abs(sig))
    if peak == 0:
        return sig
    return sig * (level / peak)


def crossfade_loop(track, fade_seconds=0.4):
    """Apply fade-in/fade-out so the track loops cleanly."""
    fade = int(fade_seconds * SR)
    fade = min(fade, len(track) // 2)
    if fade > 0:
        track[:fade] *= np.linspace(0, 1, fade)
        track[-fade:] *= np.linspace(1, 0, fade)
    return track


def write_wav(path, signal):
    """Write stereo float -> 16-bit WAV."""
    if signal.ndim == 1:
        signal = stereo_from_mono(signal)
    samples = (signal * 32767).clip(-32767, 32767).astype(np.int16)
    with wave.open(path, 'wb') as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(SR)
        f.writeframes(samples.tobytes())


# ===================== Note math =====================

def note_freq(name):
    """Convert note name like 'C4', 'F#5' to frequency. A4 = 440Hz."""
    notes = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
             'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    if '#' in name:
        pitch = notes[name[:2]]
        octave = int(name[2:])
    else:
        pitch = notes[name[0]]
        octave = int(name[1:])
    midi = (octave + 1) * 12 + pitch
    return 440.0 * (2 ** ((midi - 69) / 12))


# ===================== Track 1: Unicorn Meadow =====================

def unicorn_track():
    """Bright, hopeful major-key piece. Bell-tone melody over warm pad chords."""
    BPM = 86
    BEAT = 60 / BPM
    BARS = 16
    DUR = BARS * 4 * BEAT  # ~44.7s

    track = np.zeros(int((DUR + 2.0) * SR))

    # Chord progression: C - Am - F - G  (vi-IV-V repeating "happy" pop progression)
    chord_notes = {
        'C':  ['C3', 'E3', 'G3'],
        'Am': ['A3', 'C4', 'E4'],
        'F':  ['F3', 'A3', 'C4'],
        'G':  ['G3', 'B3', 'D4'],
    }
    chords = ['C', 'Am', 'F', 'G'] * 4  # 16 chords, 1 bar each

    for i, chord in enumerate(chords):
        t = i * 4 * BEAT
        ns = chord_notes[chord]
        # Bass (root, octave down)
        add_at(track, pad_note(note_freq(ns[0]) / 2, 4 * BEAT, 0.18), t)
        # Pad chord
        for n in ns:
            add_at(track, pad_note(note_freq(n), 4 * BEAT, 0.09), t)

    # Melody on C major pentatonic (C D E G A)
    melody_pool = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6']
    # Two phrases × repeat (4 cycles total = 16 bars)
    phrase_a = [(2, 1), (3, 1), (4, 0.5), (5, 0.5), (4, 1),
                (3, 1.5), (2, 0.5), (1, 1), (3, 1),
                (4, 1), (3, 1), (2, 2),
                (1, 1), (0, 1), (1, 1), (2, 1)]
    phrase_b = [(3, 1), (4, 1), (5, 0.5), (4, 0.5), (3, 1),
                (2, 1.5), (3, 0.5), (4, 1), (3, 1),
                (5, 1), (4, 1), (3, 2),
                (2, 1), (1, 1), (2, 1), (3, 1)]
    cur_t = 0
    for cycle in range(4):
        phrase = phrase_a if cycle % 2 == 0 else phrase_b
        for note_idx, dur_beats in phrase:
            dur = dur_beats * BEAT
            freq = note_freq(melody_pool[note_idx])
            add_at(track, bell_note(freq, dur * 1.5, 0.20), cur_t)
            cur_t += dur

    # Sparkle accents (high random pentatonic)
    rng = np.random.default_rng(7)
    sparkle_pool = ['C6', 'D6', 'E6', 'G6', 'A6']
    for _ in range(22):
        t = rng.uniform(0, DUR - 0.5)
        n = rng.choice(sparkle_pool)
        add_at(track, bell_note(note_freq(n), 0.55, 0.10), t)

    track = feedback_reverb(track, delay_ms=170, decay=0.28, taps=3)
    track = track[:int(DUR * SR)]
    track = crossfade_loop(track, 0.35)
    return normalize(track, 0.82)


# ===================== Track 2: Mermaid Lagoon =====================

def mermaid_track():
    """Slow, dreamy, watery. Harp-like rolled chords in a minor key."""
    BPM = 64
    BEAT = 60 / BPM
    BARS = 12
    DUR = BARS * 4 * BEAT  # ~45s

    track = np.zeros(int((DUR + 2.0) * SR))

    # Progression: Dm - F - C - Am  (gentle minor drift)
    chord_tones = {
        'Dm': ['D3', 'F3', 'A3', 'D4'],
        'F':  ['F3', 'A3', 'C4', 'F4'],
        'C':  ['C3', 'E3', 'G3', 'C4'],
        'Am': ['A3', 'C4', 'E4', 'A4'],
    }
    chords = ['Dm', 'F', 'C', 'Am'] * 3

    for i, chord in enumerate(chords):
        t = i * 4 * BEAT
        ns = chord_tones[chord]
        # Deep root pad
        add_at(track, pad_note(note_freq(ns[0]) / 2, 4 * BEAT, 0.16), t)
        # Soft chord pad
        for n in ns[:3]:
            add_at(track, pad_note(note_freq(n), 4 * BEAT, 0.07), t)
        # Harp arpeggio: roll up the chord, then back down
        roll = ns + list(reversed(ns[1:-1]))
        for k, note in enumerate(roll):
            offset = k * (BEAT / 2.5)  # eighth-note-ish roll
            if offset < 4 * BEAT - 0.3:
                add_at(track, pluck_note(note_freq(note), 1.5, 0.16), t + offset)

    # High dreamy melody on D minor pentatonic (D F G A C)
    melody_pool = ['D5', 'F5', 'G5', 'A5', 'C6', 'D6']
    melody_pattern = [(2, 2), (3, 2), (4, 4),
                      (3, 2), (2, 2), (1, 4),
                      (2, 2), (3, 2), (4, 2), (5, 2),
                      (4, 4), (3, 4)]
    cur_t = 2 * BEAT  # start on beat 3
    for note_idx, dur_beats in melody_pattern:
        dur = dur_beats * BEAT
        freq = note_freq(melody_pool[note_idx])
        add_at(track, soft_sine(freq, dur * 1.2, 0.16, attack=0.15, release_ratio=0.6), cur_t)
        cur_t += dur

    # Bubble sparkles
    rng = np.random.default_rng(13)
    bubble_pool = ['F5', 'A5', 'C6', 'D6', 'F6']
    for _ in range(18):
        t = rng.uniform(0, DUR - 0.6)
        n = rng.choice(bubble_pool)
        add_at(track, bell_note(note_freq(n), 0.7, 0.08, brightness=1.3), t)

    track = feedback_reverb(track, delay_ms=240, decay=0.42, taps=4)
    track = track[:int(DUR * SR)]
    track = crossfade_loop(track, 0.6)
    return normalize(track, 0.82)


# ===================== Track 3: Winter Wonder =====================

def winter_track():
    """Slow, glassy, sparse. Pure sine bells with lots of space."""
    BPM = 56
    BEAT = 60 / BPM
    BARS = 10
    DUR = BARS * 4 * BEAT  # ~43s

    track = np.zeros(int((DUR + 2.5) * SR))

    # Slow E major drift: E - C#m - A - B
    chord_notes = {
        'E':   ['E3', 'G#3', 'B3'],
        'C#m': ['C#4', 'E4', 'G#4'],
        'A':   ['A3', 'C#4', 'E4'],
        'B':   ['B3', 'D#4', 'F#4'],
    }
    chords = ['E', 'C#m', 'A', 'B'] * 2 + ['E', 'A']  # 10 chords

    for i, chord in enumerate(chords):
        t = i * 4 * BEAT
        ns = chord_notes[chord]
        # Very soft deep pad
        add_at(track, pad_note(note_freq(ns[0]) / 2, 4 * BEAT, 0.10), t)
        for n in ns:
            add_at(track, pad_note(note_freq(n), 4 * BEAT, 0.05), t)

    # Sparse glass-bell melody on E pentatonic (E F# G# B C#)
    melody = [
        (0, 'E5', 4),
        (4, 'G#5', 4),
        (8, 'B5', 4),
        (12, 'F#5', 4),
        (16, 'A5', 4),
        (20, 'C#6', 4),
        (24, 'E5', 4),
        (28, 'B5', 4),
        (32, 'G#5', 4),
        (36, 'E6', 4),
    ]
    for beat, note, dur_beats in melody:
        t = beat * BEAT
        if t < DUR:
            add_at(track, bell_note(note_freq(note), dur_beats * BEAT, 0.22, brightness=1.5), t)

    # Snowfall sparkles - very high random tones
    rng = np.random.default_rng(21)
    sparkle_pool = ['G#6', 'B6', 'D#7', 'E7', 'F#6']
    for _ in range(28):
        t = rng.uniform(0, DUR - 0.6)
        n = rng.choice(sparkle_pool)
        add_at(track, bell_note(note_freq(n), 0.6, 0.06, brightness=1.6), t)

    track = feedback_reverb(track, delay_ms=300, decay=0.5, taps=4)
    track = track[:int(DUR * SR)]
    track = crossfade_loop(track, 0.5)
    return normalize(track, 0.82)


# ===================== Track 4: Fairy Garden =====================

def fairy_track():
    """Lively, plucky, dancing. Brisk lute-like melody in G major."""
    BPM = 102
    BEAT = 60 / BPM
    BARS = 16
    DUR = BARS * 4 * BEAT  # ~37.6s

    track = np.zeros(int((DUR + 1.5) * SR))

    # Progression: G - Em - C - D (classic happy-folk)
    chord_notes = {
        'G':  ['G3', 'B3', 'D4'],
        'Em': ['E3', 'G3', 'B3'],
        'C':  ['C3', 'E3', 'G3'],
        'D':  ['D3', 'F#3', 'A3'],
    }
    chords = ['G', 'Em', 'C', 'D'] * 4

    for i, chord in enumerate(chords):
        t = i * 4 * BEAT
        ns = chord_notes[chord]
        # Walking bass: root, fifth, root, fifth on each beat
        bass = note_freq(ns[0]) / 2
        fifth = note_freq(ns[2]) / 2
        for k, freq in enumerate([bass, fifth, bass, fifth]):
            add_at(track, pluck_note(freq, BEAT * 0.95, 0.18), t + k * BEAT)
        # Soft pad chord
        for n in ns:
            add_at(track, pad_note(note_freq(n), 4 * BEAT, 0.05), t)

    # Melody — plucky on G major pentatonic (G A B D E)
    melody_pool = ['G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5', 'B5']
    pattern_a = [(0, 0.5), (1, 0.5), (2, 0.5), (3, 0.5),
                 (4, 1), (3, 0.5), (2, 0.5), (1, 1),
                 (2, 0.5), (3, 0.5), (4, 0.5), (5, 0.5),
                 (4, 1), (2, 1)]
    pattern_b = [(2, 0.5), (3, 0.5), (4, 0.5), (5, 0.5),
                 (6, 1), (5, 0.5), (4, 0.5), (3, 1),
                 (4, 0.5), (5, 0.5), (6, 0.5), (7, 0.5),
                 (6, 1), (4, 1)]
    cur_t = 0
    for cycle in range(8):
        pat = pattern_a if cycle % 2 == 0 else pattern_b
        for note_idx, dur_beats in pat:
            dur = dur_beats * BEAT
            freq = note_freq(melody_pool[note_idx])
            add_at(track, pluck_note(freq, dur * 1.4, 0.20), cur_t)
            cur_t += dur

    # Twinkly bell accents on the off-beats
    rng = np.random.default_rng(33)
    accent_pool = ['B5', 'D6', 'E6', 'G6']
    for _ in range(30):
        t = rng.uniform(0, DUR - 0.4)
        n = rng.choice(accent_pool)
        add_at(track, bell_note(note_freq(n), 0.4, 0.07), t)

    track = feedback_reverb(track, delay_ms=140, decay=0.22, taps=3)
    track = track[:int(DUR * SR)]
    track = crossfade_loop(track, 0.3)
    return normalize(track, 0.82)


# ===================== Render & convert =====================

def render_track(name, fn):
    print(f'  Rendering {name}...')
    audio = fn()
    wav_path = os.path.join('/tmp', 'sparkle_' + name + '.wav')
    write_wav(wav_path, audio)
    mp3_path = os.path.join(OUT_DIR, name + '.mp3')
    # Convert with ffmpeg, low bitrate is fine for ambient music
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error',
        '-i', wav_path,
        '-codec:a', 'libmp3lame', '-b:a', '96k',
        mp3_path
    ], check=True)
    try:
        os.remove(wav_path)
    except OSError:
        pass
    size = os.path.getsize(mp3_path) / 1024
    print(f'    -> {mp3_path} ({size:.0f} KB)')


if __name__ == '__main__':
    print('Generating Sparkle Match music tracks...')
    tracks = [
        ('unicorn', unicorn_track),
        ('mermaid', mermaid_track),
        ('winter',  winter_track),
        ('fairy',   fairy_track),
    ]
    for name, fn in tracks:
        render_track(name, fn)
    print('Done.')
