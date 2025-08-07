// app.js - WITH FLOW CONTROL

// --- (Keep all the query selectors from the previous version) ---
const connectButton = document.getElementById('connectButton');
const streamButton = document.getElementById('streamButton');
const statusDisplay = document.getElementById('status');
const checklist = document.getElementById('checklist');

let port, writer, reader;
let audioContext;

// This queue will hold audio data from the processor, waiting to be sent.
let audioQueue = new Uint8Array(0);
const CHUNK_SIZE = 64; // Must match the Arduino sketch

// --- (Keep the runCompatibilityChecks() function exactly as it was) ---
async function runCompatibilityChecks() { /* ... same as before ... */ }

// This new function reads data FROM the Arduino
async function listenForSerialRequests() {
    try {
        const reader = port.readable.getReader();
        const textDecoder = new TextDecoder();
        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                reader.releaseLock();
                break;
            }
            // Check if we received the 'R' request character
            if (textDecoder.decode(value).includes('R')) {
                sendAudioChunk();
            }
        }
    } catch (error) {
        console.warn("Error reading from serial:", error);
    }
}

// This new function sends one chunk of audio TO the Arduino
function sendAudioChunk() {
    // Do we have enough data in our queue to send a full chunk?
    if (audioQueue.length >= CHUNK_SIZE) {
        const chunk = audioQueue.slice(0, CHUNK_SIZE);
        audioQueue = audioQueue.slice(CHUNK_SIZE); // Remove the chunk from the queue

        if (writer) {
            writer.write(chunk).catch(err => console.error("Serial write error:", err));
        }
    }
}

connectButton.addEventListener('click', async () => {
    try {
        statusDisplay.textContent = 'Please select your Arduino...';
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });
        writer = port.writable.getWriter();
        
        // Start listening for requests from the Arduino
        listenForSerialRequests(); 
        
        statusDisplay.textContent = '✅ Arduino Connected! Ready to stream.';
        streamButton.disabled = false;
    } catch (error) {
        statusDisplay.textContent = `Error: ${error.message}`;
    }
});

streamButton.addEventListener('click', async () => {
    try {
        if (audioContext && audioContext.state !== 'closed') {
            await audioContext.close();
        }
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        if (stream.getAudioTracks().length === 0) {
            throw new Error("NO AUDIO SHARED. You must check 'Share tab audio'.");
        }

        audioContext = new AudioContext({ sampleRate: 44100 }); // Try to request a specific sample rate
        await audioContext.audioWorklet.addModule('processor.js');
        const sourceNode = audioContext.createMediaStreamSource(stream);
        const processorNode = new AudioWorkletNode(audioContext, 'audio-sender-processor');

        sourceNode.connect(processorNode);
        
        // The processor now sends data to our queue, NOT directly to the writer.
        processorNode.port.onmessage = (event) => {
            const newQueue = new Uint8Array(audioQueue.length + event.data.length);
            newQueue.set(audioQueue);
            newQueue.set(event.data, audioQueue.length);
            audioQueue = newQueue;
        };

        statusDisplay.textContent = "🚀 Streaming audio! Waiting for Arduino's first request...";

    } catch (error) {
        statusDisplay.textContent = `❌ ERROR: ${error.message}`;
    }
});

document.addEventListener('DOMContentLoaded', runCompatibilityChecks);
