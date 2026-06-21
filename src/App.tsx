/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipForward, Radio, Filter, Zap, Info, Drum, Activity, Download } from 'lucide-react';
import { engine } from './BeatEngine.ts';
import { AudioState, BeatPattern, InstrumentType } from './types.ts';
import { createRandomDillaPattern } from './utils.ts';
import { generateBeatMetadata } from './geminiService.ts';

const Visualizer = ({ isPlaying }: { isPlaying: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = engine.getAnalyser();
    const bufferLength = analyser.size;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      const dataArray = analyser.getValue();

      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 3;
      ctx.strokeStyle = '#D42A2A';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Tone.js waveform gives values between -1 and 1
        const v = dataArray[i] as number; 
        const y = (v * canvas.height) / 2 + canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    if (isPlaying) {
      draw();
    } else {
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#D42A2A55';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }

    return () => cancelAnimationFrame(animationRef.current);
  }, [isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={120} 
      className="w-full h-24 rounded-sm border border-white/5 opacity-80"
    />
  );
};

const Pad = ({ label, type, activeType }: { label: string, type: InstrumentType, activeType: InstrumentType | null }) => {
  const isActive = activeType === type;
  return (
    <motion.div 
      animate={{ 
        backgroundColor: isActive ? '#D42A2A' : '#1e1e1e',
        scale: isActive ? 1.05 : 1,
        borderColor: isActive ? '#D42A2A' : '#333'
      }}
      className={`aspect-square rounded border-2 flex flex-col items-center justify-center transition-colors duration-75`}
    >
      <span className={`text-[8px] font-mono tracking-widest ${isActive ? 'text-white' : 'opacity-30'}`}>{label}</span>
    </motion.div>
  );
};

export default function App() {
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    tempo: 92,
    swing: 0.3,
    noiseLevel: 0.05,
    currentBeatName: "Initializing...",
    currentStep: 0
  });

  const [titles, setTitles] = useState<string[]>([]);
  const [activeTrigger, setActiveTrigger] = useState<InstrumentType | null>(null);
  const [filterVal, setFilterVal] = useState(2000);
  const patternsRef = useRef<BeatPattern[]>([]);
  const currentPattern = engine.getCurrentPattern();

  useEffect(() => {
    const init = async () => {
      const fetchedTitles = await generateBeatMetadata();
      setTitles(fetchedTitles);
      
      const firstPattern = createRandomDillaPattern(fetchedTitles[0] || "Donuts");
      patternsRef.current = [firstPattern];
      setState(prev => ({ 
        ...prev, 
        currentBeatName: firstPattern.name, 
        tempo: firstPattern.tempo, 
        swing: firstPattern.swing,
        noiseLevel: 0.05
      }));
      engine.setPattern(firstPattern);
      engine.setNoiseLevel(0.05);
      
      engine.setStepCallback((step) => {
        setState(prev => ({ ...prev, currentStep: step }));
      });

      engine.setTriggerCallback((type) => {
        setActiveTrigger(type);
        setTimeout(() => setActiveTrigger(null), 100);
      });
    };
    init();
  }, []);

  const togglePlay = async () => {
    if (!state.isPlaying) {
      await engine.start();
      setState(prev => ({ ...prev, isPlaying: true }));
    } else {
      engine.stop();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const nextBeat = () => {
    const nextTitle = titles[Math.floor(Math.random() * titles.length)] || "Unknown Tape";
    const newPattern = createRandomDillaPattern(nextTitle);
    setState(prev => ({ 
      ...prev, 
      currentBeatName: newPattern.name, 
      tempo: newPattern.tempo, 
      swing: newPattern.swing,
      currentStep: 0
    }));
    engine.setPattern(newPattern);
  };

  const exportPattern = () => {
    const pattern = engine.getCurrentPattern();
    if (!pattern) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pattern, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${pattern.name.replace(/\s+/g, '_')}_dilla_pattern.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSwingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setState(prev => ({ ...prev, swing: val }));
    engine.setSwing(val);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setFilterVal(val);
    engine.setFilter(val);
  };

  const handleNoiseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setState(prev => ({ ...prev, noiseLevel: val }));
    engine.setNoiseLevel(val);
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#F5F5DC] font-sans selection:bg-[#D42A2A] selection:text-[#F5F5DC] flex flex-col items-center justify-center p-0 overflow-x-hidden border-[16px] border-[#1a1a1a]">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.05]" 
           style={{ backgroundImage: 'radial-gradient(#F5F5DC 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 w-full max-w-6xl min-h-[85vh] p-8 md:p-12 flex flex-col justify-between"
      >
        {/* BIG TYPOGRAPHY HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-12">
          <div className="space-y-1">
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.8] text-[#D42A2A] uppercase">
              DILLA<br/>RADIO
            </h1>
            <p className="text-sm md:text-xl font-medium tracking-widest opacity-60 ml-1 mt-4">
              ALWAYS UNQUANTIZED / DETROIT, MI
            </p>
          </div>
          <div className="text-left md:text-right mt-8 md:mt-0 border-l-4 md:border-l-0 md:border-r-4 border-[#D42A2A] pl-4 md:pr-4">
            <div className="text-3xl md:text-5xl font-bold mb-1 tracking-tighter tabular-nums leading-none">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[10px] md:text-sm uppercase tracking-[0.3em] opacity-40">The King of Beats</div>
          </div>
        </div>

        {/* MIDDLE SECTION: DISPLAY & INFO */}
        <div className="flex flex-col lg:flex-row gap-12 items-end">
          {/* Virtual MPC Display */}
          <div className="flex-1 w-full bg-[#1e1e1e] p-6 md:p-8 rounded-sm border-t-4 border-[#333] shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-4">
                <motion.div 
                  animate={{ opacity: state.isPlaying ? [1, 0.4, 1] : 0.2 }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-12 h-2 bg-[#D42A2A]"
                />
                <div className="w-12 h-2 bg-white opacity-10"></div>
                <div className="w-12 h-2 bg-white opacity-10"></div>
              </div>
              <div className="text-[10px] font-mono opacity-50 flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${state.isPlaying ? 'bg-orange-500' : 'bg-white/20'}`}></span>
                MPC 3000 / EMULATION ENGINE v.1.0
              </div>
            </div>

            {/* NEW PAD GRID */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-8">
              <Pad label="KICK" type={InstrumentType.KICK} activeType={activeTrigger} />
              <Pad label="REV KICK" type={InstrumentType.KICK_ALT} activeType={activeTrigger} />
              <Pad label="SNARE" type={InstrumentType.SNARE} activeType={activeTrigger} />
              <Pad label="HIHAT" type={InstrumentType.HIHAT} activeType={activeTrigger} />
              <Pad label="SHAKER" type={InstrumentType.SHAKER} activeType={activeTrigger} />
              <Pad label="BASS" type={InstrumentType.BASS} activeType={activeTrigger} />
              <Pad label="CHORDS" type={InstrumentType.CHORDS} activeType={activeTrigger} />
              <div className="aspect-square bg-white/5 rounded border border-white/5 opacity-10" />
            </div>

            <div className="mb-6">
              <AnimatePresence mode="wait">
                <motion.h2 
                  key={state.currentBeatName}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  className="text-4xl md:text-6xl font-bold italic tracking-tighter mb-2 overflow-hidden whitespace-nowrap text-ellipsis"
                >
                  {state.currentBeatName}
                </motion.h2>
              </AnimatePresence>
            </div>

            {/* Frequency Visualizer */}
            <div className="mb-6 bg-[#151515] p-1 rounded-sm border border-white/5">
              <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-white/5 justify-between">
                <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Waveform Analysis
                </span>
                <span className="text-[9px] font-mono opacity-40 uppercase tracking-widest">
                  Frequencies: Normalized
                </span>
              </div>
              <Visualizer isPlaying={state.isPlaying} />
            </div>

            <div className="flex gap-4 md:gap-8 opacity-60 font-mono text-[9px] md:text-xs uppercase tracking-widest mt-4 items-center flex-wrap">
              <span>BPM {state.tempo}</span>
              <span>SWING {Math.round(state.swing * 100)}%</span>
              <span className="text-[#D42A2A]">{currentPattern?.swingMode?.replace('_', ' ')}</span>
              <span>{currentPattern?.steps} STEPS</span>
              <span className="flex-1 text-right hidden sm:inline">QUANTIZATION: OFF</span>
            </div>

            {/* Step Sequencer Visualization */}
            <div className="h-1 bg-[#151515] w-full relative mt-6">
              <motion.div 
                animate={{ left: `${(state.currentStep / (currentPattern?.steps || 15)) * 100}%` }}
                className="absolute top-0 h-1 w-8 bg-[#D42A2A] shadow-[0_0_15px_rgba(212,42,42,0.6)]"
              />
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="w-full lg:w-80 flex flex-col gap-8">
            <div className="border-l-2 border-[#D42A2A] pl-4 space-y-4">
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest opacity-40">Swing Factor</div>
                <input 
                  type="range" min="0" max="1" step="0.01" 
                  value={state.swing} 
                  onChange={handleSwingChange}
                  className="w-full accent-[#D42A2A] h-1 bg-white/10 appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest opacity-40">Tape Noise</div>
                <input 
                  type="range" min="0" max="1" step="0.01" 
                  value={state.noiseLevel} 
                  onChange={handleNoiseChange}
                  className="w-full accent-[#D42A2A] h-1 bg-white/10 appearance-none cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest opacity-40">Low Pass Filter</div>
                <input 
                  type="range" min="200" max="5000" step="10" 
                  value={filterVal} 
                  onChange={handleFilterChange}
                  className="w-full accent-[#F5F5DC] h-1 bg-white/10 appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={togglePlay}
                className={`flex-1 py-4 text-sm font-bold tracking-widest transition-all duration-300 border-2 ${
                  state.isPlaying 
                  ? 'bg-transparent border-[#D42A2A] text-[#D42A2A]' 
                  : 'bg-[#D42A2A] border-[#D42A2A] text-[#F5F5DC] hover:bg-transparent'
                }`}
              >
                {state.isPlaying ? 'PAUSE ENGINE' : 'START LOOP'}
              </button>
              <button 
                onClick={exportPattern}
                className="px-6 border-2 border-white/20 hover:bg-white hover:text-black transition-colors flex items-center gap-2"
                title="Export Pattern Data"
              >
                <Download className="w-4 h-4" />
                <span className="text-[10px] font-bold tracking-widest uppercase hidden md:inline">Export</span>
              </button>
              <button 
                onClick={nextBeat}
                className="px-6 border-2 border-white/20 hover:bg-white hover:text-black transition-colors"
                title="Next Tape"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-end border-t border-white/10 pt-8 mt-12 gap-8">
          <div className="text-[10px] md:text-xs leading-relaxed opacity-40 max-w-sm font-mono uppercase tracking-tight">
            This is a generative tribute to James Dewitt Yancey. Beats are synthesized using the rhythmic DNA of the legendary MPC-3000 swing algorithms. Rest in Peace to the King of Beats.
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="px-6 py-3 border border-white/20 text-[10px] font-bold hover:bg-white hover:text-black cursor-pointer transition-all tracking-widest">
              CRATE DIGGING
            </div>
            <div className="px-6 py-3 bg-[#D42A2A] text-[#F5F5DC] text-[10px] font-bold cursor-pointer hover:bg-red-700 transition-all tracking-widest">
              LOOP FOREVER
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
