/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';
import { InstrumentType, BeatPattern, SwingMode } from './types.ts';

class BeatEngine {
  private kick: Tone.MembraneSynth;
  private snare: Tone.NoiseSynth;
  private hihat: Tone.MetalSynth;
  private bass: Tone.MonoSynth;
  private chords: Tone.PolySynth;
  private filter: Tone.Filter;
  private reverb: Tone.Reverb;
  
  private currentPattern: BeatPattern | null = null;
  private stepCallback: ((step: number) => void) | null = null;
  private triggerCallback: ((type: InstrumentType) => void) | null = null;

  private shaker: Tone.NoiseSynth;
  private kickAlt: Tone.MembraneSynth;
  private noise: Tone.Noise;
  private noiseLFO: Tone.LFO;
  private noiseGate: Tone.Gain;
  private stepCounter: number = 0;

  constructor() {
    this.filter = new Tone.Filter(2000, "lowpass").toDestination();
    this.reverb = new Tone.Reverb(1.2).connect(this.filter);
    
    // Vinyl Crackle Layer - Managed by a gate
    this.noiseGate = new Tone.Gain(0).connect(this.filter);
    this.noise = new Tone.Noise("pink").start();
    const noiseFilter = new Tone.Filter(400, "lowpass").connect(this.noiseGate);
    this.noiseLFO = new Tone.LFO(0.1, -75, -72).start(); 
    this.noiseLFO.connect(this.noise.volume);
    this.noise.connect(noiseFilter);

    // MPC Effects Chain
    const bitcrush = new Tone.BitCrusher(10).connect(this.filter);
    const dist = new Tone.Distortion(0.12).connect(bitcrush);
    const compressor = new Tone.Compressor(-18, 6).connect(dist);

    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.12,
      octaves: 6,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
    }).connect(compressor);

    this.kickAlt = new Tone.MembraneSynth({
      pitchDecay: 0.8, 
      octaves: 4,
      oscillator: { type: "sine" },
      envelope: { attack: 0.2, decay: 0.8, sustain: 0 } 
    }).connect(compressor);
    this.kickAlt.volume.value = 6;

    this.snare = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.001, decay: 0.25, sustain: 0 }
    }).connect(compressor);

    this.hihat = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.04, sustain: 0 },
      harmonicity: 8,
      modulationIndex: 12,
      resonance: 800,
      octaves: 0.4
    }).connect(compressor);
    this.hihat.frequency.value = 250;

    this.shaker = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.02, decay: 0.08, sustain: 0 }
    }).connect(compressor);
    this.shaker.volume.value = -18;

    this.bass = new Tone.MonoSynth({
      oscillator: { type: "triangle" }, 
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.5 }
    }).connect(compressor);

    this.chords = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "fmsine", modulationIndex: 1, harmonicity: 0.5 }, 
      envelope: { attack: 0.05, decay: 0.1, sustain: 0.4, release: 1.2 }
    }).connect(bitcrush);
  }

  public getAnalyser() {
    const analyzer = new Tone.Analyser("waveform", 128);
    this.filter.connect(analyzer);
    return analyzer;
  }

  public setStepCallback(cb: (step: number) => void) {
    this.stepCallback = cb;
  }

  public setTriggerCallback(cb: (type: InstrumentType) => void) {
    this.triggerCallback = cb;
  }

  public async start() {
    await Tone.start();
    this.noiseGate.gain.rampTo(1, 0.5);
    Tone.getTransport().start();
  }

  public stop() {
    this.noiseGate.gain.rampTo(0, 0.5);
    Tone.getTransport().pause();
  }

  public setPattern(pattern: BeatPattern) {
    this.currentPattern = pattern;
    Tone.getTransport().bpm.value = pattern.tempo;
    
    Tone.getTransport().cancel();
    this.stepCounter = 0;

    const stepDuration = "16n";
    
    Tone.getTransport().scheduleRepeat((time) => {
      const step = this.stepCounter % pattern.steps;
      const swing = pattern.swing;
      const mode = pattern.swingMode;

      // Independent offsets for that "drunk" Dilla feel
      let kickOff = 0;
      let snareOff = 0;
      let hatOff = 0;

      if (mode === SwingMode.NORMAL) {
        snareOff = swing * 0.04;
        kickOff = (step % 2 !== 0) ? (swing * 0.035) : 0;
        hatOff = (step % 2 !== 0) ? (swing * 0.04) : 0;
      } else if (mode === SwingMode.HATS_ONLY) {
        hatOff = (step % 2 !== 0) ? (swing * 0.06) : (Math.random() * 0.01);
        snareOff = Math.random() * 0.005; 
      } else if (mode === SwingMode.DRUMS_ONLY) {
        snareOff = swing * 0.05;
        kickOff = (step % 2 !== 0) ? (swing * 0.04) : (Math.random() * 0.01);
      } else if (mode === SwingMode.MICRO_TIMING) {
        // Random micro-offsets for every hit (humanization)
        kickOff = (Math.random() - 0.5) * swing * 0.05;
        snareOff = (Math.random()) * swing * 0.06;
        hatOff = (Math.random() - 0.5) * swing * 0.08;
      }

      const shakerOffset = (Math.random()) * (swing * 0.04);

      if (pattern.tracks[InstrumentType.KICK][step] > 0) {
        this.kick.triggerAttackRelease("C1", "8n", time + kickOff);
        this.chords.volume.rampTo(-35, 0.05, time + kickOff);
        this.chords.volume.rampTo(-16, 0.4, time + kickOff + 0.1);
        if (this.triggerCallback) {
          Tone.Draw.schedule(() => this.triggerCallback!(InstrumentType.KICK), time + kickOff);
        }
      }

      if (pattern.tracks[InstrumentType.KICK_ALT] && pattern.tracks[InstrumentType.KICK_ALT][step] > 0) {
        this.kickAlt.triggerAttackRelease("G1", "4n", time + kickOff);
        if (this.triggerCallback) {
          Tone.Draw.schedule(() => this.triggerCallback!(InstrumentType.KICK_ALT), time + kickOff);
        }
      }
      
      if (pattern.tracks[InstrumentType.SNARE][step] > 0) {
        this.snare.triggerAttackRelease("16n", time + snareOff);
        if (this.triggerCallback) {
          Tone.Draw.schedule(() => this.triggerCallback!(InstrumentType.SNARE), time + snareOff);
        }
      }
      
      if (pattern.tracks[InstrumentType.HIHAT][step] > 0) {
        this.hihat.triggerAttackRelease("32n", time + hatOff);
        if (this.triggerCallback) {
          Tone.Draw.schedule(() => this.triggerCallback!(InstrumentType.HIHAT), time + hatOff);
        }
      }

      if (pattern.tracks[InstrumentType.SHAKER] && pattern.tracks[InstrumentType.SHAKER][step] > 0) {
        this.shaker.triggerAttackRelease("32n", time + shakerOffset, 0.4 + Math.random() * 0.4);
        if (this.triggerCallback) {
          Tone.Draw.schedule(() => this.triggerCallback!(InstrumentType.SHAKER), time + shakerOffset);
        }
      }
      
      if (pattern.tracks[InstrumentType.BASS][step] > 0) {
        const bassNotes = ["C1", "F1", "G1", "Ab1"];
        const noteIndex = Math.floor(step / 4) % bassNotes.length;
        this.bass.triggerAttackRelease(bassNotes[noteIndex], "8n", time);
        if (this.triggerCallback) {
          Tone.Draw.schedule(() => this.triggerCallback!(InstrumentType.BASS), time);
        }
      }
      
      if (pattern.tracks[InstrumentType.CHORDS][step] > 0) {
        const chordSets = [
          ["C3", "Eb3", "G3", "Bb3"],
          ["F2", "Ab3", "C3", "Eb3"],
          ["Bb2", "D3", "F3", "Ab3"],
          ["G2", "B2", "D3", "F3"],
          ["Ab2", "C3", "Eb3", "G3"],
          ["Db2", "F3", "Ab3", "C3"],
          ["E2", "Ab2", "B2", "Eb3"],
          ["A2", "C3", "E3", "G3"]
        ];
        
        const isSlice = Math.random() > 0.7;
        const setIndex = Math.floor(step / 4) % chordSets.length;
        const notes = isSlice ? [chordSets[setIndex][0]] : chordSets[setIndex];
        
        const releaseTime = Math.random() > 0.8 ? "16n" : (Math.random() > 0.5 ? "8n" : "2n");
        const detune = (Math.random() - 0.5) * 15; 
        
        this.chords.set({ detune });
        this.chords.triggerAttackRelease(notes, releaseTime, time);
        
        if (this.triggerCallback) {
          Tone.Draw.schedule(() => this.triggerCallback!(InstrumentType.CHORDS), time);
        }
      }

      if (this.stepCallback) {
        Tone.Draw.schedule(() => {
          this.stepCallback!(step);
        }, time);
      }

      this.stepCounter++;
    }, stepDuration);
  }

  public setSwing(swing: number) {
    if (this.currentPattern) {
      this.currentPattern.swing = swing;
    }
  }

  public setFilter(freq: number) {
    this.filter.frequency.rampTo(freq, 0.1);
  }

  public setNoiseLevel(level: number) {
    // Noise level is subtle by default, so we multiply by a small range
    this.noiseGate.gain.rampTo(level, 0.5);
  }

  public getCurrentPattern(): BeatPattern | null {
    return this.currentPattern;
  }
}

export const engine = new BeatEngine();
