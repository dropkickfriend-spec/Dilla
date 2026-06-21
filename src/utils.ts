/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentType, BeatPattern, SwingMode } from './types.ts';

export const createRandomDillaPattern = (name: string): BeatPattern => {
  const steps = Math.random() > 0.6 ? (Math.random() > 0.5 ? 64 : 32) : 16;
  const tempo = 84 + Math.floor(Math.random() * 12);
  const swing = 0.5 + Math.random() * 0.4;
  
  const modes = Object.values(SwingMode);
  const swingMode = modes[Math.floor(Math.random() * modes.length)];

  const tracks: Record<InstrumentType, number[]> = {
    [InstrumentType.KICK]: new Array(steps).fill(0),
    [InstrumentType.KICK_ALT]: new Array(steps).fill(0),
    [InstrumentType.SNARE]: new Array(steps).fill(0),
    [InstrumentType.HIHAT]: new Array(steps).fill(0),
    [InstrumentType.SHAKER]: new Array(steps).fill(0),
    [InstrumentType.BASS]: new Array(steps).fill(0),
    [InstrumentType.CHORDS]: new Array(steps).fill(0),
  };

  const kick = tracks[InstrumentType.KICK];
  const kickAlt = tracks[InstrumentType.KICK_ALT];
  const snare = tracks[InstrumentType.SNARE];
  const hihat = tracks[InstrumentType.HIHAT];
  const shaker = tracks[InstrumentType.SHAKER];
  const bass = tracks[InstrumentType.BASS];
  const chords = tracks[InstrumentType.CHORDS];

  // ROCK BOX STUTTER LOGIC & VARIATIONS
  for (let bar = 0; bar < steps; bar += 16) {
    const stutterType = Math.random();
    if (stutterType > 0.8) {
      [0, 1, 2, 8, 9].forEach(i => kick[bar + i] = 1);
    } else if (stutterType > 0.5) {
      [0, 3, 6, 8, 11].forEach(i => kick[bar + i] = 1);
    } else {
      [0, 8].forEach(i => kick[bar + i] = 1);
      if (Math.random() > 0.5) kick[bar + 11] = 1;
      if (Math.random() > 0.5) kick[bar + 1] = 1;
    }

    if (Math.random() > 0.5) kickAlt[bar + 15] = 1;
    if (Math.random() > 0.7) kickAlt[bar + 7] = 1;

    snare[bar + 4] = 1;
    snare[bar + 12] = 1;
    if (Math.random() > 0.8) snare[bar + 15] = 1;

    const hatMode = Math.random();
    for (let i = 0; i < 16; i++) {
      const idx = bar + i;
      if (hatMode > 0.5) {
        if (i % 2 === 0) hihat[idx] = 1;
      } else {
        if (i % 4 === 0) hihat[idx] = 1;
        if (i % 4 === 1 && Math.random() > 0.6) hihat[idx] = 0.5;
      }
      if (i % 2 !== 0 && Math.random() > 0.4) shaker[idx] = 1;
    }

    [0, 7, 8, 11].forEach(i => {
      if (Math.random() > 0.6) bass[bar + i] = 1;
    });

    const chopMode = Math.random();
    if (chopMode > 0.7) {
      [0, 2, 4, 6, 8, 10, 12, 14].forEach(i => chords[bar + i] = 1);
    } else if (chopMode > 0.4) {
      [0, 4, 8, 12].forEach(i => chords[bar + i] = 1);
    } else {
      [0, 3, 8, 11].forEach(i => chords[bar + i] = 1);
    }
  }

  return {
    id: Math.random().toString(36).substring(2, 9),
    name,
    tempo,
    swing,
    swingMode,
    steps,
    tracks,
  };
};
