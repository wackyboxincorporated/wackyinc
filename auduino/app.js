// app.js - UPDATED VERSION

streamButton.addEventListener('click', async () => {
  if (!writer) {
    statusDisplay.textContent = "Error: Arduino not connected.";
    return;
  }

  try {
    // UPDATED: Request video and audio together for better compatibility.
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: "never" // Don't capture the mouse cursor
      },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      }, 
    });

    // Check if the user actually granted audio permission.
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      throw new Error("No audio track was shared. Please ensure you check the 'Share tab audio' box.");
    }

    // Create a new Web Audio API context.
    const audioContext = new AudioContext();
    
    // Add our custom audio processor to the audio context.
    await audioContext.audioWorklet.addModule('processor.js');
    
    // Create a node for our custom processor.
    const processorNode = new AudioWorkletNode(audioContext, 'audio-sender-processor');

    // Create a source node from the captured audio stream.
    const sourceNode = audioContext.createMediaStreamSource(stream);

    // Connect the audio source to our processor.
    sourceNode.connect(processorNode);
    
    // When the processor sends us 8-bit audio data, send it to Arduino.
    processorNode.port.onmessage = (event) => {
      if (writer) {
        writer.write(event.data);
      }
    };
    
    statusDisplay.textContent = "🚀 Streaming audio! Make sure something is playing in the shared tab.";
    streamButton.disabled = true;

  } catch (error) {
    statusDisplay.textContent = `❌ Audio stream error: ${error.message}`;
    console.error('Audio stream error:', error);
  }
});
