/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Tone from 'tone';

export enum InstrumentType {
  KICK = 'kick',
  KICK_ALT = 'kick_alt',
  SNARE = 'snare',
  HIHAT = 'hihat',
  SHAKER = 'shaker',
  BASS = 'bass',
  CHORDS = 'chords'
}

export enum SwingMode {
  NORMAL = 'normal',
  HATS_ONLY = 'hats_only',
  DRUMS_ONLY = 'drums_only',
  MICRO_TIMING = 'micro_timing'
}

export interface BeatPattern {
  id: string;
  name: string;
  tempo: number;
  swing: number; // 0 to 1
  swingMode: SwingMode;
  steps: number; // 16, 32, 64
  tracks: Record<InstrumentType, number[]>; // Array of velocities (0 or >0)
}

export interface AudioState {
  isPlaying: boolean;
  tempo: number;
  swing: number;
  noiseLevel: number; // 0 to 1
  currentBeatName: string;
  currentStep: number;
}
