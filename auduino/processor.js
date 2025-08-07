// processor.js - WITH DOWNSAMPLING

class AudioSenderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // This will keep track of which sample to grab next.
    this.nextSample = 0.0;
  }

  process(inputs, outputs, parameters) {
    const inputChannel = inputs[0]?.[0];
    if (!inputChannel) {
      return true;
    }

    // --- NEW DOWNSAMPLING LOGIC ---

    // Define our target sample rate. It must be less than our serial
    // baud rate (e.g., 115200 baud -> max 11,520 bytes/sec). 11025 is a standard rate.
    const targetSampleRate = 11025;
    
    // The browser's actual sample rate (e.g., 48000).
    // The 'sampleRate' variable is built into the AudioWorkletProcessor.
    const sourceSampleRate = sampleRate;

    // Calculate the ratio of samples to keep vs. throw away.
    // e.g., 48000 / 11025 ≈ 4.35. We'll keep one sample for every ~4.35 we receive.
    const ratio = sourceSampleRate / targetSampleRate;

    const outputSamples = [];

    // Instead of processing every sample, we step through the input array
    // using our calculated ratio.
    while (this.nextSample < inputChannel.length) {
      const sampleIndex = Math.floor(this.nextSample);
      const sampleValue = inputChannel[sampleIndex];
      
      // Convert the floating point sample [-1.0, 1.0] to an 8-bit byte [0, 255].
      const byteValue = (sampleValue + 1.0) * 127.5;
      outputSamples.push(byteValue);

      this.nextSample += ratio;
    }

    // We've processed this block of 128 samples. Reset our counter
    // for the next block, preserving the fractional part.
    this.nextSample -= inputChannel.length;
    
    // --- END OF NEW LOGIC ---

    // If we have samples to send, create a byte array and post it.
    if (outputSamples.length > 0) {
      this.port.postMessage(new Uint8Array(outputSamples));
    }
    
    return true; // Keep the processor alive
  }
}

registerProcessor('audio-sender-processor', AudioSenderProcessor);
