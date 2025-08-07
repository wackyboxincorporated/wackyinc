// processor.js

class AudioSenderProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const inputChannel = inputs[0]?.[0];
    if (!inputChannel) {
      return true;
    }
    
    const byteStream = new Uint8Array(inputChannel.length);
    for (let i = 0; i < inputChannel.length; i++) {
      byteStream[i] = (inputChannel[i] + 1.0) * 127.5;
    }

    this.port.postMessage(byteStream);
    return true;
  }
}

registerProcessor('audio-sender-processor', AudioSenderProcessor);
