// worker.js

// Global variables for the worker
let modFile = null;
let workerChannels = []; // This worker's assigned channels (subset of playerState.channels)
let audioContextSampleRate = 0;

// Constants replicated from main script
const PAL_CLOCK = 3546895;

// Note period table for PAL Amigas (replicated for worker's calculations)
const periodTable = {
    856: 'C-1', 808: 'C#1', 762: 'D-1', 720: 'D#1', 678: 'E-1', 640: 'F-1', 604: 'F#1', 570: 'G-1', 538: 'G#1', 508: 'A-1', 480: 'A#1', 453: 'B-1',
    428: 'C-2', 404: 'C#2', 381: 'D-2', 360: 'D#2', 339: 'E-2', 320: 'F-2', 302: 'F#2', 285: 'G-2', 269: 'G#2', 254: 'A-2', 240: 'A#2', 226: 'B-2',
    214: 'C-3', 202: 'C#3', 190: 'D-3', 180: 'D#3', 170: 'E-3', 160: 'F-3', 151: 'F#3', 142: 'G-3', 135: 'G#3', 127: 'A-3', 120: 'A#3', 113: 'B-3'
};

const MIN_PERIOD = 113;
const MAX_PERIOD = 856;

// Sorted periods for efficient lookup (replicated for worker's calculations)
let sortedPeriods = [];
for (const p in periodTable) {
    sortedPeriods.push(parseInt(p));
}
sortedPeriods.sort((a, b) => b - a); // Sort descending for getClosestPeriod logic

// --- Helper Functions (adapted for worker context) ---

/**
 * Finds the closest period in the periodTable to a given period.
 * @param {number} period The period to find the closest match for.
 * @returns {number} The closest period found in the sorted table.
 */
function getClosestPeriod(period) {
    let low = 0;
    let high = sortedPeriods.length - 1;
    let closest = sortedPeriods[0]; // Initialize with first element

    while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        let current = sortedPeriods[mid];

        if (Math.abs(current - period) < Math.abs(closest - period)) {
            closest = current;
        }

        if (current < period) {
            high = mid - 1;
        } else if (current > period) {
            low = mid + 1;
        } else {
            return current; // Exact match found
        }
    }
    return closest;
}

/**
 * Calculates a new period based on a base period and a semitone offset for arpeggio.
 * @param {number} basePeriod The base period to offset from.
 * @param {number} semitoneOffset The number of semitones to offset.
 * @returns {number} The new period after applying the semitone offset.
 */
function getPeriodForNote(basePeriod, semitoneOffset) {
    const baseIndex = sortedPeriods.indexOf(getClosestPeriod(basePeriod));
    const newIndex = baseIndex - semitoneOffset; // Decreasing index for increasing pitch
    if (newIndex >= 0 && newIndex < sortedPeriods.length) {
        return sortedPeriods[newIndex];
    }
    return basePeriod; // Return original if outside bounds
}

/**
 * Updates the period for portamento effects.
 * @param {object} channel The channel object to update.
 */
function updatePortamento(channel) {
    if (channel.portamentoTarget > 0) {
        if (channel.period < channel.portamentoTarget) {
            channel.period += channel.portamentoSpeed;
            if (channel.period > channel.portamentoTarget) channel.period = channel.portamentoTarget;
        } else if (channel.period > channel.portamentoTarget) {
            channel.period -= channel.portamentoSpeed;
            if (channel.period < channel.portamentoTarget) channel.period = channel.portamentoTarget;
        }
    }
}

/**
 * Updates the period for vibrato effects.
 * @param {object} channel The channel object to update.
 */
function updateVibrato(channel) {
    // Sine wave for vibrato
    const wave = Math.sin(channel.vibratoPos * 2 * Math.PI);
    const delta = wave * channel.vibratoDepth / 4; // vibratoDepth is 0-F (15), so divide by 4 for reasonable range
    channel.periodAdjust = delta; // Store adjustment, will be applied by main thread

    // Update vibrato position for next tick
    channel.vibratoPos = (channel.vibratoPos + channel.vibratoSpeed / 64) % 1; // vibratoSpeed is 0-F (15)
}

/**
 * Updates the volume for volume slide effects.
 * @param {object} channel The channel object to update.
 */
function updateVolumeSlide(channel) {
    const speed = channel.volumeSlideSpeed;
    const up = speed >> 4;
    const down = speed & 0x0F;
    channel.volume = Math.max(0, Math.min(64, channel.volume + up - down));
}

/**
 * Handles effects that apply on tick 0 (the first tick of a row).
 * @param {object} channel The channel object to apply effects to.
 */
function handleTick0Effects(channel) {
    const cmd = channel.effect.command;
    const val = channel.effect.value;

    switch (cmd) {
        case 0x0: // Arpeggio
            if (val > 0) {
                const x = val >> 4;
                const y = val & 0x0F;
                channel.arpeggioCache[0] = channel.period;
                channel.arpeggioCache[1] = getPeriodForNote(channel.period, x);
                channel.arpeggioCache[2] = getPeriodForNote(channel.period, y);
            }
            break;
        case 0x3: case 0x5: // Porta to note / Porta + Vol slide
            if (val !== 0) channel.portamentoSpeed = val;
            break;
        case 0x4: case 0x6: // Vibrato / Vibrato + Vol slide
            if ((val & 0xF0) > 0) channel.vibratoSpeed = (val & 0xF0) >> 4;
            if ((val & 0x0F) > 0) channel.vibratoDepth = (val & 0x0F);
            // Vibrato is applied every tick, so just update settings here
            break;
        case 0xA: // Volume slide
            if (val !== 0) channel.volumeSlideSpeed = val;
            break;
        case 0xC: // Set volume
            channel.volume = val > 64 ? 64 : val;
            break;
        case 0xE: // Extended effects
            const subCmd = val >> 4;
            const subVal = val & 0x0F;
            if (subCmd === 0xA) { // Fine volume slide up
                channel.volume += subVal;
                if (channel.volume > 64) channel.volume = 64;
            } else if (subCmd === 0xB) { // Fine volume slide down
                channel.volume -= subVal;
                if (channel.volume < 0) channel.volume = 0;
            }
            break;
    }
}

/**
 * Processes a single row for the worker's assigned channels.
 * @param {number} currentPosition The current song position.
 * @param {number} currentRow The current row in the pattern.
 * @param {number} channelIndexOffset The starting global channel index for this worker.
 */
function processRowWorker(currentPosition, currentRow, channelIndexOffset) {
    const patternIndex = modFile.patternTable[currentPosition];
    if (patternIndex >= modFile.patterns.length) return;

    const pattern = modFile.patterns[patternIndex];
    if (!pattern) return;

    const rowData = pattern[currentRow];
    if (!rowData) return;

    for (let i = 0; i < workerChannels.length; i++) {
        const globalChannelIndex = channelIndexOffset + i;
        const note = rowData[globalChannelIndex];
        const channel = workerChannels[i];

        // Reset per-note flags/states
        channel.triggerNote = false;
        channel.startOffset = 0;

        if (note.sampleNum > 0) {
            channel.sampleNum = note.sampleNum - 1; // 0-indexed sample number
            // Only set volume from sample if not overridden by 0xC effect
            if (note.effect.command !== 0xC) {
               channel.volume = modFile.samples[channel.sampleNum].volume;
            }
        }

        if (note.period > 0) {
            // If not portamento, set new period and trigger note
            if (note.effect.command !== 0x3 && note.effect.command !== 0x5) {
                 channel.period = note.period;
                 channel.triggerNote = true; // Flag for main thread to play sample
                 channel.vibratoPos = 0; // Reset vibrato phase
            }
            channel.portamentoTarget = note.period;
        }

        channel.effect = note.effect;
        handleTick0Effects(channel); // Apply tick 0 effects
        
        // Handle 0x9 (Sample Offset) here, but signal to main thread
        if (note.effect.command === 0x9) {
            // Only trigger sample if there's a sample number (from this row or previous)
            if (channel.sampleNum !== null && modFile.samples[channel.sampleNum]) {
                const offsetInFrames = note.effect.value * 256;
                channel.startOffset = offsetInFrames;
                channel.triggerNote = true; // Trigger note with offset
            }
        }
    }
}

/**
 * Updates effects that apply on subsequent ticks of a row.
 * @param {number} currentTick The current tick within the row.
 */
function updateEffectsWorker(currentTick) {
    for (let i = 0; i < workerChannels.length; i++) {
        const channel = workerChannels[i];
        if (!channel) continue;

        const cmd = channel.effect.command;
        const val = channel.effect.value;

        // Reset adjustment from vibrato for this tick
        channel.periodAdjust = 0;

        switch (cmd) {
            case 0x0: // Arpeggio
                if (val > 0) {
                    const arpIndex = currentTick % 3;
                    const arpPeriod = channel.arpeggioCache[arpIndex];
                    if (arpPeriod > 0) channel.period = arpPeriod;
                }
                break;
            case 0x1: // Porta up
                 channel.period -= val;
                 if(channel.period < MIN_PERIOD) channel.period = MIN_PERIOD;
                 break;
            case 0x2: // Porta down
                 channel.period += val;
                 if(channel.period > MAX_PERIOD) channel.period = MAX_PERIOD;
                 break;
            case 0x3: // Porta to note
                updatePortamento(channel);
                break;
            case 0x4: // Vibrato
                updateVibrato(channel);
                break;
            case 0x5: // Porta to note + Volume slide
                updatePortamento(channel);
                updateVolumeSlide(channel);
                break;
            case 0x6: // Vibrato + Volume slide
                updateVibrato(channel);
                updateVolumeSlide(channel);
                break;
            case 0xA: // Volume slide
                updateVolumeSlide(channel);
                break;
        }
    }
}

/**
 * Parses a MOD file from an ArrayBuffer. This function is moved to the worker
 * to offload CPU-intensive parsing from the main thread.
 * @param {ArrayBuffer} arrayBuffer The MOD file data.
 * @returns {object|null} The parsed MOD file object, or null if parsing fails.
 */
function parseModFileWorker(arrayBuffer) {
    try {
        const dv = new DataView(arrayBuffer);
        const textDecoder = new TextDecoder('iso-8859-1');
        const identifier = textDecoder.decode(new Uint8Array(arrayBuffer, 1080, 4));
        const is31Sample = ['M.K.', 'M!K!', 'FLT4', '4CHN', 'M&K!'].includes(identifier);

        if (!is31Sample) console.warn(`Worker: MOD identifier is '${identifier}', not a standard 31-sample format.`);

        let mod = {
            title: textDecoder.decode(new Uint8Array(arrayBuffer, 0, 20)).replace(/\0/g, ''),
            samples: [],
            songLength: dv.getUint8(950),
            restartPosition: dv.getUint8(951),
            patternTable: [], patterns: [], identifier: identifier, numPatterns: 0
        };

        if (mod.restartPosition >= 127) mod.restartPosition = 0;

        let offset = 20;
        for (let i = 0; i < 31; i++) {
            let ft = dv.getUint8(offset + 24);
            if (ft > 7) ft = ft - 16;
            mod.samples.push({
                name: textDecoder.decode(new Uint8Array(arrayBuffer, offset, 22)).replace(/\0/g, ''),
                length: dv.getUint16(offset + 22) * 2, fineTune: ft, volume: dv.getUint8(offset + 25),
                repeatOffset: dv.getUint16(offset + 26) * 2, repeatLength: dv.getUint16(offset + 28) * 2,
                data: null // Will be populated later
            });
            offset += 30;
        }

        offset = 952;
        let maxPattern = 0;
        for (let i = 0; i < 128; i++) {
            const pNum = dv.getUint8(offset + i);
            mod.patternTable.push(pNum);
            if (pNum > maxPattern) maxPattern = pNum;
        }
        mod.numPatterns = maxPattern + 1;

        offset = 1084;
        for (let p = 0; p < mod.numPatterns; p++) {
            let pattern = Array.from({length: 64}, () => Array(4));
            for (let row = 0; row < 64; row++) {
                for (let ch = 0; ch < 4; ch++) {
                    const b1 = dv.getUint8(offset++), b2 = dv.getUint8(offset++), b3 = dv.getUint8(offset++), b4 = dv.getUint8(offset++);
                    pattern[row][ch] = {
                        sampleNum: (b1 & 0xF0) | (b3 >> 4),
                        period: ((b1 & 0x0F) << 8) | b2,
                        effect: { command: b3 & 0x0F, value: b4 }
                    };
                }
            }
            mod.patterns.push(pattern);
        }

        // Extract sample data
        for (let i = 0; i < 31; i++) {
            if(mod.samples[i].length > 0) {
                // Create a copy of the Int8Array data to ensure it's transferable
                mod.samples[i].data = new Int8Array(arrayBuffer.slice(offset, offset + mod.samples[i].length));
                offset += mod.samples[i].length;
            }
        }
        return mod;
    } catch (error) {
        console.error("Worker: Error parsing MOD file:", error);
        return null;
    }
}

// --- Message Handler for Worker ---
self.onmessage = function(event) {
    const { type, data } = event.data;

    switch (type) {
        case 'parse_mod_file':
            // Main thread sends the ArrayBuffer for parsing
            modFile = parseModFileWorker(data.arrayBuffer);
            if (modFile) {
                // Send back the parsed MOD data, transferring sample data for efficiency
                const transferableSamples = modFile.samples
                    .filter(s => s.data)
                    .map(s => s.data.buffer); // Get ArrayBuffer of Int8Array

                self.postMessage({
                    type: 'mod_parsed',
                    modFile: modFile
                }, transferableSamples);
            } else {
                self.postMessage({ type: 'mod_parse_error', message: 'Failed to parse MOD file in worker.' });
            }
            break;

        case 'init_playback':
            // Initialize worker's channels and other playback parameters
            workerChannels = data.initialChannelStates.map(ch => ({ ...ch })); // Deep copy channels
            audioContextSampleRate = data.sampleRate;
            break;

        case 'process_tick':
            // data contains: { position, row, tick, speed, bpm, isPlaying, channelIndexOffset }
            const { position, row, tick, speed, bpm, isPlaying, channelIndexOffset } = data;

            // Update worker's local state for global player state
            // (These are needed for effect calculations that might depend on player speed/bpm, though currently they don't directly)
            // playerState.speed = speed;
            // playerState.bpm = bpm;

            if (tick === 0) {
                processRowWorker(position, row, channelIndexOffset);
            } else {
                updateEffectsWorker(tick);
            }

            // Prepare updated channel data to send back to the main thread
            const updatedChannelData = workerChannels.map(ch => ({
                sampleNum: ch.sampleNum,
                period: ch.period,
                volume: ch.volume,
                triggerNote: ch.triggerNote, // Flag to indicate if main thread should play note
                startOffset: ch.startOffset, // For effect 0x9 (sample offset)
                periodAdjust: ch.periodAdjust || 0, // For vibrato, applied on main thread
                portamentoTarget: ch.portamentoTarget, // Keep for ongoing portamento
                portamentoSpeed: ch.portamentoSpeed,   // Keep for ongoing portamento
                volumeSlideSpeed: ch.volumeSlideSpeed, // Keep for ongoing volume slide
                vibratoSpeed: ch.vibratoSpeed,         // Keep for ongoing vibrato
                vibratoDepth: ch.vibratoDepth,         // Keep for ongoing vibrato
                vibratoPos: ch.vibratoPos,             // Keep for ongoing vibrato
                arpeggioCache: ch.arpeggioCache,       // Keep for ongoing arpeggio
                effect: ch.effect                      // Keep current effect for multi-tick effects
            }));

            // Send back the calculated state and the offset for which channels these are
            self.postMessage({
                type: 'channel_update',
                channelIndexOffset: channelIndexOffset,
                data: updatedChannelData
            });
            break;
    }
};
