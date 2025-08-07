/**
 * This function runs immediately and checks for all required browser features.
 * It now includes a timeout to prevent getting stuck.
 */
async function runCompatibilityChecks() {
    checklist.innerHTML = ''; // Clear the list
    let allChecksPassed = true;

    // Check 1: Secure Context (HTTPS)
    if (window.isSecureContext) {
        checklist.innerHTML += '<li>✅ Secure Context (HTTPS): <strong>Supported</strong></li>';
    } else {
        checklist.innerHTML += '<li>❌ Secure Context (HTTPS): <strong>Required!</strong></li>';
        allChecksPassed = false;
    }

    // Check 2: Web Serial API
    if ('serial' in navigator) {
        checklist.innerHTML += '<li>✅ Web Serial API: <strong>Supported</strong></li>';
    } else {
        checklist.innerHTML += '<li>❌ Web Serial API: <strong>Not Supported</strong></li>';
        allChecksPassed = false;
    }

    // Check 3: Screen Capture API
    if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
        checklist.innerHTML += '<li>✅ Screen Capture API: <strong>Supported</strong></li>';
    } else {
        checklist.innerHTML += '<li>❌ Screen Capture API: <strong>Not Supported</strong></li>';
        allChecksPassed = false;
    }
    
    // Check 4: Screen Capture Permission Status (WITH TIMEOUT)
    if (navigator.permissions && 'query' in navigator.permissions) {
        try {
            // We race the permission query against a 2-second timeout.
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Permission query timed out')), 2000)
            );

            const permissionStatus = await Promise.race([
                navigator.permissions.query({ name: 'display-capture' }),
                timeoutPromise
            ]);
            
            checklist.innerHTML += `<li>ℹ️ Screen Capture Permission: <strong>${permissionStatus.state.toUpperCase()}</strong></li>`;
            if (permissionStatus.state === 'denied') {
                 statusDisplay.textContent = 'Permission was denied. Reset it in site settings.';
            }
        } catch (e) {
             checklist.innerHTML += `<li>⚠️ Screen Capture Permission: <strong>${e.message}</strong></li>`;
             // If permission is the problem, maybe don't block the whole app
             // but it indicates a deeper issue. For now, we just log it.
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
