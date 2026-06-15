/**
 * Code_Cemetery: Vitt's Journey - Audio Module
 * 
 * Exports global `window.GameAudio` for Web Audio API sound synthesis.
 */

let ctx = null;
let noiseBuffer = null;

let bgmOsc1 = null;
let bgmOsc2 = null;
let bgmLfo = null;
let bgmFilter = null;
let bgmGain = null;

function initContext() {
    if (!ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            ctx = new AudioContextClass();
        }
    }
    return ctx;
}

function getNoiseBuffer(c) {
    if (noiseBuffer) return noiseBuffer;
    if (!c) return null;
    const bufferSize = c.sampleRate * 2; // 2 seconds of noise
    noiseBuffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
}

window.GameAudio = {
    // Initializer
    init() {
        console.log("Audio Engine Initialized");
        try {
            initContext();
            
            // Listen to document events to resume audio context if suspended
            const resumeAudio = () => {
                if (ctx && ctx.state === 'suspended') {
                    ctx.resume().then(() => {
                        console.log("AudioContext resumed via user interaction");
                        cleanupEvents();
                    });
                } else if (ctx) {
                    cleanupEvents();
                }
            };
            const cleanupEvents = () => {
                document.removeEventListener('click', resumeAudio);
                document.removeEventListener('keydown', resumeAudio);
                document.removeEventListener('touchstart', resumeAudio);
            };
            document.addEventListener('click', resumeAudio);
            document.addEventListener('keydown', resumeAudio);
            document.addEventListener('touchstart', resumeAudio);
        } catch (e) {
            console.warn("Failed to initialize AudioContext in init:", e);
        }
    },

    playCodeBeep() {
        const c = initContext();
        if (!c || c.state === 'suspended') return;
        const now = c.currentTime;
        try {
            const osc = c.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800 + Math.random() * 600, now);
            const gain = c.createGain();
            gain.gain.setValueAtTime(0.015, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
            osc.connect(gain);
            gain.connect(c.destination);
            osc.start(now);
            osc.stop(now + 0.03);
        } catch (e) {
            console.error(e);
        }
    },

    // Background Music (Hum drone)
    playBGM() {
        const c = initContext();
        if (!c) return;
        if (bgmOsc1) return; // Already playing BGM

        try {
            bgmGain = c.createGain();
            bgmGain.gain.setValueAtTime(0, c.currentTime);
            bgmGain.gain.linearRampToValueAtTime(0.25, c.currentTime + 2.0); // Smooth fade-in

            bgmFilter = c.createBiquadFilter();
            bgmFilter.type = 'lowpass';
            bgmFilter.frequency.setValueAtTime(120, c.currentTime);
            bgmFilter.Q.setValueAtTime(4, c.currentTime);

            bgmOsc1 = c.createOscillator();
            bgmOsc1.type = 'sawtooth';
            bgmOsc1.frequency.setValueAtTime(55, c.currentTime);

            bgmOsc2 = c.createOscillator();
            bgmOsc2.type = 'sawtooth';
            bgmOsc2.frequency.setValueAtTime(55.3, c.currentTime);

            bgmLfo = c.createOscillator();
            bgmLfo.type = 'sine';
            bgmLfo.frequency.setValueAtTime(0.2, c.currentTime); // slow LFO (0.2 Hz)

            const lfoGain = c.createGain();
            lfoGain.gain.setValueAtTime(50, c.currentTime); // sweep range +/- 50Hz

            // Connect LFO -> LfoGain -> filter.frequency
            bgmLfo.connect(lfoGain);
            lfoGain.connect(bgmFilter.frequency);

            // Connect oscillators -> filter -> gain -> destination
            bgmOsc1.connect(bgmFilter);
            bgmOsc2.connect(bgmFilter);
            bgmFilter.connect(bgmGain);
            bgmGain.connect(c.destination);

            bgmOsc1.start();
            bgmOsc2.start();
            bgmLfo.start();
        } catch (e) {
            console.error("Error playing BGM:", e);
        }
    },

    stopBGM() {
        const c = initContext();
        if (!c) return;
        if (!bgmOsc1) return;

        const osc1 = bgmOsc1;
        const osc2 = bgmOsc2;
        const lfo = bgmLfo;
        const gain = bgmGain;

        bgmOsc1 = null;
        bgmOsc2 = null;
        bgmLfo = null;
        bgmGain = null;
        bgmFilter = null;

        if (gain) {
            const fadeTime = 0.5;
            try {
                const currentVal = gain.gain.value > 0 ? gain.gain.value : 0.001;
                gain.gain.setValueAtTime(currentVal, c.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + fadeTime);
            } catch (e) {
                try {
                    gain.gain.linearRampToValueAtTime(0.0, c.currentTime + fadeTime);
                } catch (err) {}
            }
            setTimeout(() => {
                try {
                    osc1.stop();
                    osc2.stop();
                    lfo.stop();
                    osc1.disconnect();
                    osc2.disconnect();
                    lfo.disconnect();
                    gain.disconnect();
                } catch (e) {
                    // Ignore already stopped/disconnected errors
                }
            }, fadeTime * 1000 + 50);
        }
    },

    // Action SFX
    playSlash() {
        const c = initContext();
        if (!c) return;

        const duration = 0.15;
        const now = c.currentTime;

        try {
            // Sawtooth oscillator for pitch sweep
            const osc = c.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + duration);

            const oscGain = c.createGain();
            oscGain.gain.setValueAtTime(0.2, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Noise source
            const noise = c.createBufferSource();
            const nBuf = getNoiseBuffer(c);
            if (nBuf) {
                noise.buffer = nBuf;
            }

            const noiseFilter = c.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(2000, now);
            noiseFilter.frequency.exponentialRampToValueAtTime(200, now + duration);

            const noiseGain = c.createGain();
            noiseGain.gain.setValueAtTime(0.15, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Connect and start
            osc.connect(oscGain);
            oscGain.connect(c.destination);

            if (nBuf) {
                noise.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(c.destination);
                noise.start(now);
                noise.stop(now + duration + 0.05);
            }

            osc.start(now);
            osc.stop(now + duration + 0.05);

            setTimeout(() => {
                try {
                    osc.disconnect();
                    oscGain.disconnect();
                    if (nBuf) {
                        noise.disconnect();
                        noiseFilter.disconnect();
                        noiseGain.disconnect();
                    }
                } catch (e) {}
            }, duration * 1000 + 100);
        } catch (e) {
            console.error("Error playing Slash SFX:", e);
        }
    },

    playParry() {
        const c = initContext();
        if (!c) return;

        const now = c.currentTime;
        const duration = 0.35;

        try {
            const osc1 = c.createOscillator();
            osc1.type = 'square';
            osc1.frequency.setValueAtTime(800, now);
            osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.08); // quick upward sweep

            const osc2 = c.createOscillator();
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(1200, now); // perfect fifth above osc1
            osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.08);

            // High pass filter to make it chime-like
            const hpFilter = c.createBiquadFilter();
            hpFilter.type = 'highpass';
            hpFilter.frequency.setValueAtTime(1000, now);

            const mainGain = c.createGain();
            mainGain.gain.setValueAtTime(0.12, now);
            mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Delay effect for long echo
            const delayNode = c.createDelay(1.0);
            delayNode.delayTime.setValueAtTime(0.15, now);
            const delayFeedback = c.createGain();
            delayFeedback.gain.setValueAtTime(0.4, now);

            // Connect Delay loop
            delayNode.connect(delayFeedback);
            delayFeedback.connect(delayNode);

            // Connect oscillators to filter
            osc1.connect(hpFilter);
            osc2.connect(hpFilter);

            // Filter to main gain
            hpFilter.connect(mainGain);

            // Main gain to output and delay
            mainGain.connect(c.destination);
            mainGain.connect(delayNode);

            // Delay to destination
            delayNode.connect(c.destination);

            osc1.start(now);
            osc2.start(now);

            osc1.stop(now + duration + 0.05);
            osc2.stop(now + duration + 0.05);

            setTimeout(() => {
                try {
                    osc1.disconnect();
                    osc2.disconnect();
                    hpFilter.disconnect();
                    mainGain.disconnect();
                    delayNode.disconnect();
                    delayFeedback.disconnect();
                } catch(e) {}
            }, 2000);
        } catch (e) {
            console.error("Error playing Parry SFX:", e);
        }
    },

    playHit() {
        const c = initContext();
        if (!c) return;

        const now = c.currentTime;
        const duration = 0.3;

        try {
            // Carrier: Sawtooth
            const carrier = c.createOscillator();
            carrier.type = 'sawtooth';
            carrier.frequency.setValueAtTime(150, now);
            carrier.frequency.setValueAtTime(90, now + 0.1); // pitch step

            // Modulator: Sawtooth (ring modulation)
            const modulator = c.createOscillator();
            modulator.type = 'sawtooth';
            modulator.frequency.setValueAtTime(220, now);
            modulator.frequency.setValueAtTime(60, now + 0.08);

            const modGain = c.createGain();
            modGain.gain.setValueAtTime(0, now);

            // Connect modulator to carrier's gain node parameter
            modulator.connect(modGain.gain);
            carrier.connect(modGain);

            // White Noise
            const noise = c.createBufferSource();
            const nBuf = getNoiseBuffer(c);
            if (nBuf) {
                noise.buffer = nBuf;
            }

            const noiseGain = c.createGain();
            noiseGain.gain.setValueAtTime(0.3, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            const ringGain = c.createGain();
            ringGain.gain.setValueAtTime(0.25, now);
            ringGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Bandpass filter for a crash-like resonance
            const filter = c.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, now);
            filter.Q.setValueAtTime(2, now);

            modGain.connect(ringGain);
            ringGain.connect(filter);
            
            if (nBuf) {
                noise.connect(filter);
            }

            const masterGain = c.createGain();
            masterGain.gain.setValueAtTime(0.35, now);
            masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            filter.connect(masterGain);
            masterGain.connect(c.destination);

            carrier.start(now);
            modulator.start(now);
            if (nBuf) {
                noise.start(now);
                noise.stop(now + duration + 0.05);
            }

            carrier.stop(now + duration + 0.05);
            modulator.stop(now + duration + 0.05);

            setTimeout(() => {
                try {
                    carrier.disconnect();
                    modulator.disconnect();
                    modGain.disconnect();
                    ringGain.disconnect();
                    if (nBuf) {
                        noise.disconnect();
                    }
                    filter.disconnect();
                    masterGain.disconnect();
                } catch(e) {}
            }, duration * 1000 + 100);
        } catch (e) {
            console.error("Error playing Hit SFX:", e);
        }
    },

    playAlarm(intensity) {
        const c = initContext();
        if (!c) return;

        const clampedIntensity = Math.max(0, Math.min(1, intensity !== undefined ? intensity : 0.5));
        const now = c.currentTime;
        
        // Scale duration based on intensity (shorter, faster beeps)
        const duration = 0.5 - clampedIntensity * 0.3; // 0.5s to 0.2s
        
        try {
            const osc = c.createOscillator();
            osc.type = 'square';
            
            // Pitch scales with intensity
            const baseFreq = 600 + clampedIntensity * 600; // 600Hz to 1200Hz
            osc.frequency.setValueAtTime(baseFreq, now);

            // Fast pitch modulation (siren warble)
            const modLfo = c.createOscillator();
            modLfo.type = 'sine';
            const lfoSpeed = 5 + clampedIntensity * 15; // 5Hz to 20Hz
            modLfo.frequency.setValueAtTime(lfoSpeed, now);

            const lfoGain = c.createGain();
            const modDepth = 50 + clampedIntensity * 150; // 50Hz to 200Hz
            lfoGain.gain.setValueAtTime(modDepth, now);

            const alarmGain = c.createGain();
            const volume = 0.03 + clampedIntensity * 0.2; // 0.03 to 0.23 (not too loud)
            alarmGain.gain.setValueAtTime(volume, now);
            alarmGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Connect LFO to oscillator frequency
            modLfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);

            osc.connect(alarmGain);
            alarmGain.connect(c.destination);

            osc.start(now);
            modLfo.start(now);

            osc.stop(now + duration + 0.05);
            modLfo.stop(now + duration + 0.05);

            setTimeout(() => {
                try {
                    osc.disconnect();
                    modLfo.disconnect();
                    lfoGain.disconnect();
                    alarmGain.disconnect();
                } catch(e) {}
            }, duration * 1000 + 100);
        } catch (e) {
            console.error("Error playing Alarm SFX:", e);
        }
    },

    playDeath() {
        const c = initContext();
        if (!c) return;

        const now = c.currentTime;
        const duration = 1.8;

        try {
            // Downward sweep oscillator
            const osc = c.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 1.2);

            const oscGain = c.createGain();
            oscGain.gain.setValueAtTime(0.25, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

            // Noise crackle
            const noise = c.createBufferSource();
            const nBuf = getNoiseBuffer(c);
            if (nBuf) {
                noise.buffer = nBuf;
            }

            const noiseFilter = c.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(400, now);
            noiseFilter.Q.setValueAtTime(3, now);

            const noiseGain = c.createGain();
            noiseGain.gain.setValueAtTime(0.001, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.2, now + 0.8);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Modulator to make the noise "crackle" (rapid gain modulation)
            const crackleMod = c.createOscillator();
            crackleMod.type = 'square';
            crackleMod.frequency.setValueAtTime(18, now); // 18Hz pulse

            const crackleGain = c.createGain();
            crackleGain.gain.setValueAtTime(0.5, now);

            crackleMod.connect(crackleGain.gain);
            
            osc.connect(oscGain);
            oscGain.connect(c.destination);

            if (nBuf) {
                noise.connect(crackleGain);
                crackleGain.connect(noiseFilter);
                noiseFilter.connect(noiseGain);
                noiseGain.connect(c.destination);
                noise.start(now + 0.4);
                noise.stop(now + duration + 0.05);
            }

            osc.start(now);
            crackleMod.start(now + 0.4);

            osc.stop(now + 1.3);
            crackleMod.stop(now + duration + 0.05);

            setTimeout(() => {
                try {
                    osc.disconnect();
                    oscGain.disconnect();
                    if (nBuf) {
                        noise.disconnect();
                    }
                    crackleMod.disconnect();
                    crackleGain.disconnect();
                    noiseFilter.disconnect();
                    noiseGain.disconnect();
                } catch(e) {}
            }, duration * 1000 + 200);
        } catch (e) {
            console.error("Error playing Death SFX:", e);
        }
    },

    playExplosion() {
        const c = initContext();
        if (!c) return;

        const now = c.currentTime;
        const duration = 1.5;

        try {
            // Deep sub oscillator
            const subOsc = c.createOscillator();
            subOsc.type = 'triangle';
            subOsc.frequency.setValueAtTime(90, now);
            subOsc.frequency.exponentialRampToValueAtTime(20, now + duration);

            const subGain = c.createGain();
            subGain.gain.setValueAtTime(0.5, now);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Low rumble noise
            const noise = c.createBufferSource();
            const nBuf = getNoiseBuffer(c);
            if (nBuf) {
                noise.buffer = nBuf;
            }

            const lpFilter = c.createBiquadFilter();
            lpFilter.type = 'lowpass';
            lpFilter.frequency.setValueAtTime(150, now);
            lpFilter.frequency.exponentialRampToValueAtTime(30, now + duration);

            const noiseGain = c.createGain();
            noiseGain.gain.setValueAtTime(0.35, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            subOsc.connect(subGain);
            subGain.connect(c.destination);

            if (nBuf) {
                noise.connect(lpFilter);
                lpFilter.connect(noiseGain);
                noiseGain.connect(c.destination);
                noise.start(now);
                noise.stop(now + duration + 0.05);
            }

            subOsc.start(now);
            subOsc.stop(now + duration + 0.05);

            setTimeout(() => {
                try {
                    subOsc.disconnect();
                    subGain.disconnect();
                    if (nBuf) {
                        noise.disconnect();
                    }
                    lpFilter.disconnect();
                    noiseGain.disconnect();
                } catch(e) {}
            }, duration * 1000 + 100);
        } catch (e) {
            console.error("Error playing Explosion SFX:", e);
        }
    },

    playDash() {
        const c = initContext();
        if (!c) return;

        const now = c.currentTime;
        const duration = 0.25;

        try {
            const noise = c.createBufferSource();
            const nBuf = getNoiseBuffer(c);
            if (nBuf) {
                noise.buffer = nBuf;
            }

            const bpFilter = c.createBiquadFilter();
            bpFilter.type = 'bandpass';
            bpFilter.frequency.setValueAtTime(4000, now);
            bpFilter.frequency.exponentialRampToValueAtTime(300, now + duration);
            bpFilter.Q.setValueAtTime(2, now);

            const gainNode = c.createGain();
            gainNode.gain.setValueAtTime(0.25, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

            if (nBuf) {
                noise.connect(bpFilter);
                bpFilter.connect(gainNode);
                gainNode.connect(c.destination);
                noise.start(now);
                noise.stop(now + duration + 0.05);
            }

            setTimeout(() => {
                try {
                    if (nBuf) {
                        noise.disconnect();
                    }
                    bpFilter.disconnect();
                    gainNode.disconnect();
                } catch(e) {}
            }, duration * 1000 + 100);
        } catch (e) {
            console.error("Error playing Dash SFX:", e);
        }
    },

    playLevelUp() {
        const c = initContext();
        if (!c) return;

        const now = c.currentTime;
        const duration = 1.5;
        const freqs = [261.63, 329.63, 392.00, 523.25, 659.25]; // C Major chord (C4, E4, G4, C5, E5)

        try {
            const filter = c.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, now);
            filter.frequency.exponentialRampToValueAtTime(3000, now + 0.4);
            filter.Q.setValueAtTime(4, now);

            const masterGain = c.createGain();
            masterGain.gain.setValueAtTime(0, now);
            masterGain.gain.linearRampToValueAtTime(0.22, now + 0.1); // quick fade in
            masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            filter.connect(masterGain);
            masterGain.connect(c.destination);

            const oscs = [];
            freqs.forEach((freq, i) => {
                const osc = c.createOscillator();
                osc.type = (i % 2 === 0) ? 'triangle' : 'sine';
                const detuneAmt = (Math.random() - 0.5) * 1.5;
                osc.frequency.setValueAtTime(freq + detuneAmt, now);
                
                osc.connect(filter);
                osc.start(now);
                osc.stop(now + duration);
                oscs.push(osc);
            });

            setTimeout(() => {
                try {
                    oscs.forEach(osc => osc.disconnect());
                    filter.disconnect();
                    masterGain.disconnect();
                } catch(e) {}
            }, duration * 1000 + 100);
        } catch (e) {
            console.error("Error playing LevelUp SFX:", e);
        }
    },

    // Tick sync alarms for boss warnings
    playTick(isUrgent = false) {
        const c = initContext();
        if (!c) return;
        
        const now = c.currentTime;
        const duration = 0.05;
        
        try {
            const osc = c.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(isUrgent ? 1600 : 1000, now);
            
            const gainNode = c.createGain();
            gainNode.gain.setValueAtTime(isUrgent ? 0.22 : 0.12, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            osc.connect(gainNode);
            gainNode.connect(c.destination);
            
            osc.start(now);
            osc.stop(now + duration + 0.01);
            
            setTimeout(() => {
                try {
                    osc.disconnect();
                    gainNode.disconnect();
                } catch(e) {}
            }, duration * 1000 + 50);
        } catch (e) {
            console.error("Error playing Tick SFX:", e);
        }
    },

    playTickSync(isUrgent = false) {
        this.playTick(isUrgent);
    },

    // Synthesized dialogue click sounds (organic retro feel)
    playDialogueClick() {
        const c = initContext();
        if (!c) return;

        const now = c.currentTime;
        const duration = 0.03;
        
        try {
            const osc = c.createOscillator();
            osc.type = 'triangle';
            
            // Randomize pitch slightly to make text scroll sound natural
            const pitch = 650 + Math.random() * 150;
            osc.frequency.setValueAtTime(pitch, now);
            
            const gainNode = c.createGain();
            gainNode.gain.setValueAtTime(0.06, now); // Subtle tick
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            osc.connect(gainNode);
            gainNode.connect(c.destination);
            
            osc.start(now);
            osc.stop(now + duration + 0.01);
            
            setTimeout(() => {
                try {
                    osc.disconnect();
                    gainNode.disconnect();
                } catch(e) {}
            }, duration * 1000 + 50);
        } catch (e) {
            console.error("Error playing DialogueClick SFX:", e);
        }
    },

    playTextClick() {
        this.playDialogueClick();
    }
};
