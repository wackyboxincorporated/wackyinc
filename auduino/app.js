// app.js - Self-Diagnosing Version

const connectButton = document.getElementById('connectButton');
const streamButton = document.getElementById('streamButton');
const statusDisplay = document.getElementById('status');
const checklist = document.getElementById('checklist');

let port;
let writer;
let audioContext;

/**
 * This function runs immediately and checks for all required browser features.
 * It updates the UI to tell you exactly what is supported and what isn't.
 */
async function runCompatibilityChecks() {
    checklist.innerHTML = ''; // Clear the list
    let allChecksPassed = true;

    // Check 1: Secure Context (HTTPS)
    if (window.isSecureContext) {
        checklist.innerHTML += '<li>✅ Secure Context (HTTPS): <strong>Supported</strong></li>';
    } else {
        checklist.innerHTML += '<li>❌ Secure Context (HTTPS): <strong>Required!</strong> Site must be on HTTPS or localhost.</li>';
        allChecksPassed = false;
    }

    // Check 2: Web Serial API
    if ('serial' in navigator) {
        checklist.innerHTML += '<li>✅ Web Serial API: <strong>Supported</strong></li>';
    } else {
        checklist.innerHTML += '<li>❌ Web Serial API: <strong>Not Supported</strong> by this browser.</li>';
        allChecksPassed = false;
    }

    // Check 3: Screen Capture API
    if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
        checklist.innerHTML += '<li>✅ Screen Capture API: <strong>Supported</strong></li>';
    } else {
        checklist.innerHTML += '<li>❌ Screen Capture API: <strong>Not Supported</strong> by this browser.</li>';
        allChecksPassed = false;
    }
    
    // Check 4: Screen Capture Permission Status
    if (navigator.permissions && 'query' in navigator.permissions) {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'display-capture' });
            checklist.innerHTML += `<li>ℹ️ Screen Capture Permission: <strong>${permissionStatus.state.toUpperCase()}</strong></li>`;
            if (permissionStatus.state === 'denied') {
                 statusDisplay.textContent = 'Permission was denied. Reset it in site settings.';
            }
        } catch (e) {
             checklist.innerHTML += '<li>⚠️ Could not query screen capture permission.</li>';
        }
    }

    // Final result
    if (allChecksPassed) {
        connectButton.disabled = false;
        statusDisplay.textContent = 'Ready to connect to Arduino.';
    } else {
        statusDisplay.textContent = 'Critical features missing. Please fix issues above.';
    }
}


// --- Event Listeners ---

connectButton.addEventListener('click', async () => {
    try {
        statusDisplay.textContent = 'Please select your Arduino from the list...';
        port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });
        writer = port.writable.getWriter();
        
        statusDisplay.textContent = '✅ Arduino Connected! Ready to stream.';
        streamButton.disabled = false;
    } catch (error) {
        // This specifically catches when the user closes the dialog
        if (error.name === 'NotFoundError') {
             statusDisplay.textContent = '⚠️ You didn\'t select a port. Try again.';
        } else {
             statusDisplay.textContent = `Error: ${error.message}`;
        }
    }
});


streamButton.addEventListener('click', async () => {
    try {
        // Stop any previous audio context to prevent issues
        if (audioContext && audioContext.state !== 'closed') {
            await audioContext.close();
        }

        statusDisplay.textContent = 'Waiting for you to select a tab to share...';
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });

        // CRITICAL CHECK: Did the user actually share audio?
        if (stream.getAudioTracks().length === 0) {
            throw new Error("NO AUDIO SHARED. You must check the 'Share tab audio' box.");
        }

        audioContext = new AudioContext();
        await audioContext.audioWorklet.addModule('processor.js');
        const sourceNode = audioContext.createMediaStreamSource(stream);
        const processorNode = new AudioWorkletNode(audioContext, 'audio-sender-processor');

        sourceNode.connect(processorNode);
        
        processorNode.port.onmessage = (event) => {
            if (writer) {
                writer.write(event.data).catch(err => console.error("Serial write error:", err));
            }
        };

        statusDisplay.textContent = "🚀 Streaming audio! Make sure something is playing.";

    } catch (error) {
        if (error.name === 'NotAllowedError') {
            statusDisplay.textContent = '⚠️ You cancelled the screen share or denied permission.';
        } else {
            statusDisplay.textContent = `❌ ERROR: ${error.message}`;
        }
        console.error('Stream Error:', error);
    }
});

// Run the checks as soon as the page loads
document.addEventListener('DOMContentLoaded', runCompatibilityChecks);
