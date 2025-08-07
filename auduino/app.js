// app.js

const connectButton = document.getElementById('connectButton');
const streamButton = document.getElementById('streamButton');
const statusDisplay = document.getElementById('status');

let port;
let writer;

// Step 1: Handle the serial connection
connectButton.addEventListener('click', async () => {
  try {
    // Request the user to select a serial port.
    port = await navigator.serial.requestPort();
    // Open the port with the baud rate matching the Arduino sketch.
    await port.open({ baudRate: 115200 }); 

    writer = port.writable.getWriter();
    
    statusDisplay.textContent = "✅ Arduino Connected! Ready to stream.";
    connectButton.disabled = true;
    streamButton.disabled = false;
  } catch (error) {
    statusDisplay.textContent = `Error: ${error.message}`;
    console.error('Serial connection error:', error);
  }
});

// Step 2: Handle the audio streaming
streamButton.addEventListener('click', async () => {
  if (!writer) {
    statusDisplay.textContent = "Error: Arduino not connected.";
    return;
  }

  try {
    // Request to capture screen audio.
    // We set video:false because we only care about the audio track.
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: false,
      audio: true, 
    });

    // Create a new Web Audio API context.
    const audioContext = new AudioContext();
    
    // Add our custom audio processor to the audio context.
    await audioContext.audioWorklet.addModule('processor.js');
    
    // Create a node for our custom processor.
    const processorNode = new AudioWorkletNode(audioContext, 'audio-sender-processor');

    // Create a source node from the captured audio stream.
    const sourceNode = audioContext.createMediaStreamSource(stream);

    // Connect the audio source to our processor.
    // Audio Flow: Captured Stream -> Source Node -> Processor Node
    sourceNode.connect(processorNode);
    
    // When the processor sends us 8-bit audio data, we send it to the Arduino.
    processorNode.port.onmessage = (event) => {
      if (writer) {
        writer.write(event.data);
      }
    };
    
    statusDisplay.textContent = "🚀 Streaming audio! Make sure something is playing in the shared tab.";
    streamButton.disabled = true;

  } catch (error) {
    statusDisplay.textContent = `Error: ${error.message}`;
    console.error('Audio stream error:', error);
  }
});
