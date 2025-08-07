// processor.js

class AudioSenderProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    // Get the audio data from the first input channel.
    const input = inputs[0];
    const inputChannel = input[0];

    // If there's no audio, do nothing.
    if (!inputChannel) {
      return true;
    }
    
    // The audio data is an array of 32-bit floating-point numbers
    // from -1.0 to 1.0. We need to convert it to 8-bit unsigned
    // integers (0-255) for the Arduino.
    const byteStream = new Uint8Array(inputChannel.length);
    for (let i = 0; i < inputChannel.length; i++) {
      // Map the [-1.0, 1.0] range to [0, 255]
      byteStream[i] = (inputChannel[i] + 1.0) * 127.5;
    }

    // Send the converted audio data back to the main thread.
    this.port.postMessage(byteStream);
    
    // Return true to keep the processor alive.
    return true;
  }
}

registerProcessor('audio-sender-processor', AudioSenderProcessor);
