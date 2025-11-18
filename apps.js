function openCalculatorApp() {
    const calcHTML = `
        <div id="calculator">
            <input type="text" id="calc-display" value="0" readonly>
            <div id="calc-buttons">
                <button class="calc-btn func" data-key="clear">AC</button>
                <button class="calc-btn func" data-key="sign">+/-</button>
                <button class="calc-btn func" data-key="percent">%</button>
                <button class="calc-btn op" data-key="divide">&divide;</button>
                <button class="calc-btn" data-key="7">7</button>
                <button class="calc-btn" data-key="8">8</button>
                <button class="calc-btn" data-key="9">9</button>
                <button class="calc-btn op" data-key="multiply">&times;</button>
                <button class="calc-btn" data-key="4">4</button>
                <button class="calc-btn" data-key="5">5</button>
                <button class="calc-btn" data-key="6">6</button>
                <button class="calc-btn op" data-key="subtract">&minus;</button>
                <button class="calc-btn" data-key="1">1</button>
                <button class="calc-btn" data-key="2">2</button>
                <button class="calc-btn" data-key="3">3</button>
                <button class="calc-btn op" data-key="add">+</button>
                <button class="calc-btn zero" data-key="0">0</button>
                <button class="calc-btn" data-key="decimal">.</button>
                <button class="calc-btn op" data-key="equals">=</button>
            </div>
        </div>
    `;
    const win = openWindow('Calculator', calcHTML, {width: '300px', height: '450px', minWidth: '250px', minHeight: '350px'});
    const contentArea = win.querySelector('.window-content, .mobile-app-content');
    if (contentArea) contentArea.style.padding = '0';
    
    const calculator = win.querySelector('#calculator');
    if (!calculator) return;
    
    const display = calculator.querySelector('#calc-display');
    const buttons = calculator.querySelector('#calc-buttons');
    
    let state = {
        displayValue: '0',
        firstOperand: null,
        operator: null,
        waitingForSecondOperand: false,
    };

    function performCalculation(a, b, op) {
        if (op === 'add') return a + b;
        if (op === 'subtract') return a - b;
        if (op === 'multiply') return a * b;
        if (op === 'divide') {
            if (b === 0) return 'Error';
            return a / b;
        }
        return b;
    }

    buttons.addEventListener('click', (e) => {
        const key = e.target.dataset.key;
        if (!key || e.target.tagName !== 'BUTTON') return;

        if (/\d/.test(key)) {
            if (state.displayValue === 'Error') state.displayValue = '0';
            if (state.waitingForSecondOperand) {
                state.displayValue = key;
                state.waitingForSecondOperand = false;
            } else {
                state.displayValue = state.displayValue === '0' ? key : state.displayValue + key;
            }
        } else if (key === 'decimal') {
            if (state.displayValue === 'Error') state.displayValue = '0';
            if (state.waitingForSecondOperand) {
                state.displayValue = '0.';
                state.waitingForSecondOperand = false;
            } else if (!state.displayValue.includes('.')) {
                state.displayValue += '.';
            }
        } else if (key === 'clear') {
            state = { displayValue: '0', firstOperand: null, operator: null, waitingForSecondOperand: false };
        } else if (key === 'sign') {
            if (state.displayValue === 'Error' || state.displayValue === '0') return;
            state.displayValue = (parseFloat(state.displayValue) * -1).toString();
        } else if (key === 'percent') {
            if (state.displayValue === 'Error') return;
            state.displayValue = (parseFloat(state.displayValue) / 100).toString();
        } else if (key === 'equals') {
            if (state.operator && state.firstOperand !== null) {
                const result = performCalculation(state.firstOperand, parseFloat(state.displayValue), state.operator);
                state.displayValue = String(result);
                state.firstOperand = null; 
                state.operator = null;
                state.waitingForSecondOperand = true;
            }
        } else if (['add', 'subtract', 'multiply', 'divide'].includes(key)) {
            if (state.displayValue === 'Error') return;
            const inputValue = parseFloat(state.displayValue);
            
            if (state.operator && !state.waitingForSecondOperand) {
                const result = performCalculation(state.firstOperand, inputValue, state.operator);
                state.displayValue = String(result);
                state.firstOperand = result;
            } else {
                state.firstOperand = inputValue;
            }
            
            state.operator = key;
            state.waitingForSecondOperand = true;
        }
        
        display.value = state.displayValue.length > 14 ? parseFloat(state.displayValue).toExponential(9) : state.displayValue;
    });
}

function openClockApp() {
    const clockHTML = `
        <div id="clock-app">
            <div id="clock-time"></div>
            <div id="clock-date"></div>
        </div>
    `;
    const win = openWindow('Clock', clockHTML, {width: '400px', height: '250px', minWidth: '300px', minHeight: '200px'});
    const contentArea = win.querySelector('.window-content, .mobile-app-content');
    if (contentArea) contentArea.style.padding = '0';
    
    const timeEl = win.querySelector('#clock-time');
    const dateEl = win.querySelector('#clock-date');
    let clockInterval;
    
    function updateAppClock() {
        if (!document.body.contains(win)) {
            clearInterval(clockInterval);
            return;
        }
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    updateAppClock();
    clockInterval = setInterval(updateAppClock, 1000);
}

function openNotepadApp() {
    const notepadHTML = `
        <div id="notepad-app">
            <textarea id="notepad-textarea" placeholder="Start typing..."></textarea>
        </div>
    `;
    const win = openWindow('Notepad', notepadHTML, {width: '500px', height: '400px'});
    const contentArea = win.querySelector('.window-content, .mobile-app-content');
    if (contentArea) contentArea.style.padding = '0';
}

function openSettingsApp() {
    const settingsHTML = `
        <div id="settings-app">
            <div class="setting-header">Appearance & Graphics</div>
            
            <div class="setting-group">
                <label>Visual Effects</label>
                <div class="setting-group-row">
                    <input type="checkbox" id="graphics-glass-check">
                    <label for="graphics-glass-check">Enable Glass (Aero) Effects</label>
                </div>
                <div class="setting-group-row">
                    <input type="checkbox" id="graphics-3d-check">
                    <label for="graphics-3d-check">Enable 3D Background (WebGL)</label>
                </div>
                <small>Toggle these separately. Glass adds transparency to windows; 3D adds an interactive wallpaper.</small>
            </div>

            <div class="setting-group">
                <label>Theme Studio</label>
                <small>Change colors, wallpapers, and window tinting.</small>
                <button id="open-theme-app-btn" style="margin-top: 5px;">Open Theme Studio</button>
            </div>

            <div class="setting-header">Layout</div>
            
            <div class="setting-group">
                <label for="taskbar-select">Taskbar Position</label>
                <select id="taskbar-select">
                    <option value="bottom">Bottom</option>
                    <option value="top">Top</option>
                    <option value="left">Left</option>
                </select>
            </div>

            <div class="setting-group">
                <label for="taskbar-mode-select">Taskbar Mode</label>
                <select id="taskbar-mode-select">
                    <option value="standard">Standard (Text & Icon)</option>
                    <option value="compact">Compact (Icon Only)</option>
                </select>
            </div>
            
            <div class="setting-group">
                 <div class="setting-group-row">
                    <input type="checkbox" id="taskbar-autohide-check">
                    <label for="taskbar-autohide-check">Auto-hide taskbar</label>
                </div>
            </div>

            <div class="setting-group">
                <label for="icon-size-select">Icon Size</label>
                <select id="icon-size-select">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                </select>
            </div>
            
            <div class="setting-header">System</div>

            <div class="setting-group">
                <button id="open-sound-settings-btn">Configure UI Sounds</button>
            </div>
            
            <div class="setting-group">
                <label>Web App Integration</label>
                <div class="setting-group-row">
                    <input type="checkbox" id="always-open-in-window-check">
                    <label for="always-open-in-window-check">Always open web apps in-window</label>
                </div>
            </div>
            
            <div class="setting-group">
                <label>Add Custom Web App</label>
                <div id="add-custom-app-form">
                    <input type="text" id="custom-app-name" placeholder="App Name">
                    <input type="text" id="custom-app-url" placeholder="https://example.com">
                    <button id="add-custom-app-btn">Add</button>
                </div>
            </div>

            <div class="setting-group">
                <label>Manage Custom Apps</label>
                <div id="custom-apps-list"></div>
            </div>
        </div>
    `;
    const win = openWindow('Settings', settingsHTML, {width: '500px', height: '650px', minWidth: '400px'});
    
    const glassCheck = win.querySelector('#graphics-glass-check');
    const threeDCheck = win.querySelector('#graphics-3d-check');
    const taskbarSelect = win.querySelector('#taskbar-select');
    const taskbarModeSelect = win.querySelector('#taskbar-mode-select'); // New
    const taskbarAutohideCheck = win.querySelector('#taskbar-autohide-check'); 
    const iconSizeSelect = win.querySelector('#icon-size-select');
    const alwaysOpenCheck = win.querySelector('#always-open-in-window-check');
    
    glassCheck.checked = appSettings.graphicsGlass;
    threeDCheck.checked = appSettings.graphics3d;
    taskbarSelect.value = appSettings.taskbarPosition;
    taskbarModeSelect.value = appSettings.taskbarMode || 'standard';
    taskbarAutohideCheck.checked = appSettings.taskbarAutohide; 
    iconSizeSelect.value = appSettings.iconSize;
    alwaysOpenCheck.checked = appSettings.alwaysOpenInWindow;
    
    glassCheck.addEventListener('change', (e) => {
        appSettings.graphicsGlass = e.target.checked;
        applySettings();
        saveSettings();
    });
    
    threeDCheck.addEventListener('change', (e) => {
        appSettings.graphics3d = e.target.checked;
        applySettings();
        saveSettings();
    });
    
    taskbarSelect.addEventListener('change', (e) => {
        appSettings.taskbarPosition = e.target.value;
        applySettings();
        saveSettings();
    });

    taskbarModeSelect.addEventListener('change', (e) => {
        appSettings.taskbarMode = e.target.value;
        applySettings();
        saveSettings();
    });
    
    taskbarAutohideCheck.addEventListener('change', (e) => {
        appSettings.taskbarAutohide = e.target.checked;
        applySettings();
        saveSettings();
    });
    
    iconSizeSelect.addEventListener('change', (e) => {
        appSettings.iconSize = e.target.value;
        applySettings();
        saveSettings();
    });
    
    alwaysOpenCheck.addEventListener('change', (e) => {
        appSettings.alwaysOpenInWindow = e.target.checked;
        saveSettings();
    });
    
    win.querySelector('#open-sound-settings-btn').addEventListener('click', openSoundSettings);
    win.querySelector('#open-theme-app-btn').addEventListener('click', openThemeApp);

    const customAppListDiv = win.querySelector('#custom-apps-list');

    function renderCustomAppList() {
        customAppListDiv.innerHTML = '';
        if (customDesktopItems.length === 0) {
            customAppListDiv.innerHTML = '<div style="padding: 10px; text-align: center; color: var(--theme-text-secondary);">No custom apps added.</div>';
            return;
        }
        
        customDesktopItems.forEach((app, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'custom-app-item';
            itemDiv.innerHTML = `
                <span class="custom-app-item-name">${app.name}</span>
                <span class="custom-app-item-url">${app.url}</span>
                <button class="custom-app-item-remove" data-index="${index}" title="Remove App">&times;</button>
            `;
            
            itemDiv.querySelector('.custom-app-item-remove').addEventListener('click', (e) => {
                const appIndex = parseInt(e.target.dataset.index);
                customDesktopItems.splice(appIndex, 1); 
                saveCustomApps(); 
                renderCustomAppList(); 
                
                const systemApps = desktopItems.filter(i => i.type === 'system_app');
                const builtInItems = desktopItems.filter(i => i.type !== 'system_app' && i.type !== 'webapp');
                desktopItems = [...builtInItems, ...systemApps, ...customDesktopItems];
                
                renderUI();
                setupStartMenu();
            });
            
            customAppListDiv.appendChild(itemDiv);
        });
    }
    
    renderCustomAppList();
    
    win.querySelector('#add-custom-app-btn').addEventListener('click', () => {
        const nameInput = win.querySelector('#custom-app-name');
        const urlInput = win.querySelector('#custom-app-url');
        const name = nameInput.value;
        let url = urlInput.value;
        
        if (!name || !url) {
            alert('Please enter both a name and a URL.');
            return;
        }
        
        if (!url.startsWith('http')) {
            url = `https://${url}`;
        }
        
        const newApp = {
            name: name,
            type: 'webapp',
            class: 'webapp-browser', 
            url: url
        };
        
        customDesktopItems.push(newApp);
        saveCustomApps();
        
        desktopItems.push(newApp);
        
        renderUI(); 
        setupStartMenu(); 
        renderCustomAppList(); 
        
        nameInput.value = '';
        urlInput.value = '';
    });
}

function openBrowserApp() {
    const browserHTML = `
        <div id="browser-app">
            <div id="browser-nav">
                <button id="browser-back" disabled>&#8249;</button>
                <button id="browser-forward" disabled>&#8250;</button>
                <button id="browser-reload">&#8635;</button>
                <input type="text" id="browser-url" placeholder="Enter URL">
                <button id="browser-go">Go</button>
            </div>
            <iframe id="browser-frame" src="about:blank" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
        </div>
    `;
    const win = openWindow('Browser', browserHTML, {width: '800px', height: '600px'});
    const contentArea = win.querySelector('.window-content, .mobile-app-content');
    if (contentArea) contentArea.style.padding = '0';

    const iframe = win.querySelector('#browser-frame');
    const urlInput = win.querySelector('#browser-url');
    const goBtn = win.querySelector('#browser-go');
    const reloadBtn = win.querySelector('#browser-reload');
    
    const loadUrl = () => {
        let url = urlInput.value.trim();
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
        }
        iframe.src = url;
        urlInput.value = url;
    };
    
    goBtn.addEventListener('click', loadUrl);
    urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loadUrl();
    });
    reloadBtn.addEventListener('click', () => {
        if (iframe.src !== 'about:blank') iframe.src = iframe.src;
    });
}

function openExplorerApp() {
    const explorerHTML = `<div id="explorer-app"></div>`;
    const win = openWindow('File Explorer', explorerHTML, {width: '500px', height: '400px'});
    const contentArea = win.querySelector('#explorer-app');
    
    desktopItems.forEach(item => {
        const iconDiv = createIconElement(item);
        iconDiv.addEventListener('dblclick', () => {
            launchItem(item);
            if (item.type !== 'system_app' && item.type !== 'webapp') {
                closeWindow(win.id); 
            }
        });
        contentArea.appendChild(iconDiv);
    });
}

function openAboutApp() {
    const aboutHTML = `
        <div id="about-app">
            <div class="icon-img webapp-space" style="filter: hue-rotate(180deg);"></div>
            <h2>wbOS! v3</h2>
            <p>welcome to this particular nonsense!</p>
            <p>wackybox incorporated. technology of tomorrow, on the technology of today <3</p>
            <p>Version 3.0 - massive UI overhaul</p>
        </div>
    `;
    openWindow('About wbOS', aboutHTML, {width: '400px', height: '450px', hideMaximize: true, hideMinimize: true});
}

function openTerminalApp() {
    const terminalHTML = `
        <div id="terminal-app">
            <div id="terminal-output">Welcome to wbOS Terminal v1.0. Type 'help' for commands.</div>
            <div id="terminal-input-line">
                <span id="terminal-prompt">user@wackybox:~$ </span>
                <input type="text" id="terminal-input" autofocus>
            </div>
        </div>
    `;
    const win = openWindow('Terminal', terminalHTML, {width: '500px', height: '350px'});
    const contentArea = win.querySelector('.window-content, .mobile-app-content');
    if (contentArea) contentArea.style.padding = '0';
    
    const output = win.querySelector('#terminal-output');
    const input = win.querySelector('#terminal-input');
    
    win.addEventListener('click', () => input.focus());
    
    input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        
        const command = input.value.trim();
        output.textContent += `\nuser@wackybox:~$ ${command}\n`;
        
        handleTerminalCommand(command, output);
        
        input.value = '';
        output.parentElement.scrollTop = output.parentElement.scrollHeight;
    });
}

function handleTerminalCommand(cmd, output) {
    const args = cmd.split(' ');
    const command = args[0].toLowerCase();
    
    switch(command) {
        case 'help':
            output.textContent += "Available commands:\n  help    - Shows this message\n  ls      - Lists items on the desktop\n  date    - Shows the current date and time\n  clear   - Clears the terminal screen\n  echo    - Prints text to the terminal\n  poo    - Stinks\n  theme   - Change theme. Usage: theme [light|dark|retro|neon|soft]";
            break;
        case 'ls':
            output.textContent += "Desktop Items:\n" + desktopItems.map(item => `  - ${item.name} (${item.type})`).join('\n');
            break;
        case 'poo':
            output.textContent += "💩\n";
            break;
        case 'date':
            output.textContent += new Date().toString();
            break;
        case 'clear':
            output.textContent = "Welcome to wbOS Terminal v1.0. Type 'help' for commands.";
            break;
        case 'echo':
            output.textContent += args.slice(1).join(' ');
            break;
        case 'theme':
            const newTheme = args[1];
            if (['light', 'dark', 'retro', 'neon', 'soft'].includes(newTheme)) {
                appSettings.theme = newTheme;
                applySettings();
                saveSettings();
                output.textContent += `Theme set to ${newTheme}.`;
            } else {
                output.textContent += "Usage: theme [light|dark|retro|neon|soft]";
            }
            break;
        case '':
            break;
        default:
            output.textContent += `Command not found: ${command}`;
    }
}

function openThemeApp() {
    const wallpapers = [
        { id: 'default', name: 'Wacky Green' },
        { id: 'ocean', name: 'Ocean Blue' },
        { id: 'solid', name: 'Solid Gray' },
        { id: 'sunset', name: 'Sunset' },
        { id: 'forest', name: 'Forest' },
        { id: 'nebula', name: 'Nebula' },
    ];
    
    const themeHTML = `
        <div id="theme-app">
            <div class="setting-group">
                <label>Color Theme</label>
                <div id="theme-mode-toggle">
                    <button class="theme-mode-btn light" data-theme="light">Light</button>
                    <button class="theme-mode-btn dark" data-theme="dark">Dark</button>
                    <button class="theme-mode-btn retro" data-theme="wnt">WNT</button>
                    <button class="theme-mode-btn neon" data-theme="neon">Neon</button>
                    <button class="theme-mode-btn soft" data-theme="cameron">Cameron's Theme</button>
                </div>
            </div>
            
            <div class="setting-group">
                <label>Window Title Text</label>
                <small>Customize the color of the text in window titlebars.</small>
                <div class="setting-group-row">
                    <input type="color" id="title-text-picker" value="#333333">
                    <div style="display:flex; align-items:center; gap:5px; margin-left:10px;">
                         <input type="checkbox" id="auto-contrast-check">
                         <label for="auto-contrast-check">Auto-Contrast</label>
                    </div>
                </div>
                <small>Auto-contrast makes text black or white depending on the tint darkness.</small>
            </div>

            <div class="setting-group">
                <label>Window Tint (Glass Mode)</label>
                <small>Controls the glass color of windows and taskbar.</small>
                <div class="setting-group-row">
                    <input type="color" id="glass-tint-picker" value="#ffffff">
                    <button id="reset-tint-btn">Reset to White</button>
                </div>
            </div>

            <div class="setting-group">
                <label>Window Transparency</label>
                <small>Adjust how transparent the background and title bars are.</small>
                <div class="setting-group-row" style="margin-top: 5px;">
                    <input type="range" id="window-opacity-slider" min="0.1" max="1.0" step="0.05" style="flex-grow: 1;">
                    <span id="window-opacity-value" style="min-width: 40px; text-align: right;">60%</span>
                </div>
            </div>

            <div class="setting-group">
                <label>Wallpaper</label>
                <div id="wallpaper-grid">
                    ${wallpapers.map(wp => `
                        <div class="wallpaper-preview ${appSettings.wallpaper === wp.id ? 'active' : ''}" data-wallpaper-id="${wp.id}">
                            <span class="name">${wp.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="setting-group">
                <label>Custom Wallpaper</label>
                <div class="setting-group-row" style="gap: 5px; margin-top: 5px;">
                    <input type="file" id="wallpaper-upload" accept="image/*">
                    <button id="wallpaper-upload-btn">&#10514; Upload</button>
                </div>
            </div>
            
            <div class="setting-group">
                <div id="custom-gradient-creator">
                    <label>Or create a custom gradient:</label>
                    <div class="setting-group-row">
                        <input type="color" id="gradient-color1" value="#f3904f">
                        <input type="color" id="gradient-color2" value="#3b4371">
                        <select id="gradient-direction">
                            <option value="to top">To Top</option>
                            <option value="to bottom">To Bottom</option>
                            <option value="to left">To Left</option>
                            <option value="to right">To Right</option>
                            <option value="45deg">Diagonal (45°)</option>
                            <option value="radial-gradient">Radial</option>
                        </select>
                    </div>
                    <button id="gradient-apply-btn">Apply Gradient</button>
                </div>
            </div>
        </div>
    `;
    const win = openWindow('Theme Studio', themeHTML, {width: '450px', height: '650px'});
    
    const wpStyles = {
        'default': 'radial-gradient(circle at 10% 90%, #6ec25d 0%, #3a8542 50%, #2e7141 100%)',
        'ocean': 'radial-gradient(circle at 80% 80%, #a2d2ff 0%, #3a86ff 50%, #003566 100%)',
        'solid': '#4a5759',
        'sunset': 'linear-gradient(to top, #f3904f, #3b4371)',
        'forest': 'linear-gradient(to bottom, #134e5e, #71b280)',
        'nebula': 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)'
    };
    win.querySelectorAll('.wallpaper-preview').forEach(div => {
        div.style.background = wpStyles[div.dataset.wallpaperId];
    });
    
    win.querySelectorAll('.theme-mode-btn').forEach(btn => {
        if(btn.dataset.theme === appSettings.theme) btn.classList.add('active');
        btn.addEventListener('click', () => {
            appSettings.theme = btn.dataset.theme;
            applySettings();
            saveSettings();
            
            win.querySelectorAll('.theme-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Window Title Color Logic
    const titlePicker = win.querySelector('#title-text-picker');
    const contrastCheck = win.querySelector('#auto-contrast-check');
    
    contrastCheck.checked = appSettings.autoContrastTitle;
    titlePicker.value = (appSettings.titleColor && appSettings.titleColor !== 'auto') ? appSettings.titleColor : '#333333';
    titlePicker.disabled = appSettings.autoContrastTitle;

    contrastCheck.addEventListener('change', (e) => {
        appSettings.autoContrastTitle = e.target.checked;
        titlePicker.disabled = e.target.checked;
        applySettings();
        saveSettings();
    });

    titlePicker.addEventListener('input', (e) => {
        appSettings.titleColor = e.target.value;
        applySettings();
        saveSettings();
    });

    // Glass Tint Logic
    const tintPicker = win.querySelector('#glass-tint-picker');
    if (appSettings.glassTint && appSettings.glassTint.startsWith('#')) {
        tintPicker.value = appSettings.glassTint;
    } else {
        tintPicker.value = '#ffffff';
    }

    tintPicker.addEventListener('input', (e) => {
        appSettings.glassTint = e.target.value;
        applySettings();
        saveSettings();
    });
    
    win.querySelector('#reset-tint-btn').addEventListener('click', () => {
        appSettings.glassTint = '#ffffff';
        tintPicker.value = '#ffffff';
        applySettings();
        saveSettings();
    });

    // Window Transparency (Opacity) Logic
    const opacitySlider = win.querySelector('#window-opacity-slider');
    const opacityDisplay = win.querySelector('#window-opacity-value');
    
    // Set initial value (default to 0.6 if undefined)
    const currentOpacity = appSettings.windowOpacity !== undefined ? appSettings.windowOpacity : 0.6;
    opacitySlider.value = currentOpacity;
    opacityDisplay.textContent = Math.round(currentOpacity * 100) + '%';
    
    opacitySlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        appSettings.windowOpacity = val;
        opacityDisplay.textContent = Math.round(val * 100) + '%';
        applySettings();
        saveSettings();
    });
    
    // Wallpaper Logic
    win.querySelectorAll('.wallpaper-preview').forEach(div => {
        div.addEventListener('click', () => {
            appSettings.wallpaper = div.dataset.wallpaperId;
            appSettings.wallpaperCustom = null; 
            applySettings();
            saveSettings();
            
            win.querySelectorAll('.wallpaper-preview').forEach(d => d.classList.remove('active'));
            div.classList.add('active');
        });
    });
    
    win.querySelector('#wallpaper-upload-btn').addEventListener('click', () => {
        const fileInput = win.querySelector('#wallpaper-upload');
        const file = fileInput.files[0];
        if (!file) {
            alert('Please select a file first.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) { 
            alert('File is too large (Max 5MB). Please choose a smaller image.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            appSettings.wallpaperCustom = e.target.result; 
            appSettings.wallpaper = 'custom'; 
            applySettings();
            saveSettings();
            win.querySelectorAll('.wallpaper-preview.active').forEach(d => d.classList.remove('active'));
        };
        reader.readAsDataURL(file);
    });
    
    win.querySelector('#gradient-apply-btn').addEventListener('click', () => {
        const c1 = win.querySelector('#gradient-color1').value;
        const c2 = win.querySelector('#gradient-color2').value;
        const dir = win.querySelector('#gradient-direction').value;
        
        let gradient;
        if (dir === 'radial-gradient') {
            gradient = `radial-gradient(circle, ${c1}, ${c2})`;
        } else {
            gradient = `linear-gradient(${dir}, ${c1}, ${c2})`;
        }
        
        appSettings.wallpaperCustom = gradient; 
        appSettings.wallpaper = 'custom'; 
        applySettings();
        saveSettings();
        win.querySelectorAll('.wallpaper-preview.active').forEach(d => d.classList.remove('active'));
    });
}

function openSoundSettings() {
    const soundSettingsHTML = `
        <div id="settings-app" style="padding: 15px;"> <div class="setting-group">
                <div class="setting-group-row">
                    <input type="checkbox" id="sounds-enabled-check">
                    <label for="sounds-enabled-check"><strong>Enable UI Sounds</strong></label>
                </div>
            </div>
            
            <div class="setting-group">
                <label for="sounds-volume-slider">Volume</label>
                <input type="range" id="sounds-volume-slider" min="0" max="1" step="0.1" style="width: 100%;">
            </div>
            
            <div class="setting-group">
                <label>Sound URLs</label>
                <small>Provide direct links to .mp3, .wav, or .ogg files.</small>
                
                <label for="sound-url-click" style="font-size: 13px; margin-top: 10px;">General Click</label>
                <input type="text" id="sound-url-click" class="sound-url-input" placeholder="https://example.com/click.mp3">
                
                <label for="sound-url-windowOpen" style="font-size: 13px; margin-top: 10px;">Window Open</label>
                <input type="text" id="sound-url-windowOpen" class="sound-url-input" placeholder="https://example.com/open.wav">
                
                <label for="sound-url-windowClose" style="font-size: 13px; margin-top: 10px;">Window Close</label>
                <input type="text" id="sound-url-windowClose" class="sound-url-input" placeholder="https://example.com/close.ogg">
                
                <label for="sound-url-error" style="font-size: 13px; margin-top: 10px;">Error</label>
                <input type="text" id="sound-url-error" class="sound-url-input" placeholder="https://example.com/error.mp3">
            </div>
            
            <button id="save-sounds-btn" style="padding: 10px; background: var(--theme-accent-primary); color: var(--theme-accent-text); width: 100%; border: none; border-radius: 4px; cursor: pointer;">Save and Preload Sounds</button>
        </div>
    `;
    const win = openWindow('UI Sound Settings', soundSettingsHTML, {width: '400px', height: '520px', minWidth: '350px'});
    
    const enabledCheck = win.querySelector('#sounds-enabled-check');
    const volumeSlider = win.querySelector('#sounds-volume-slider');
    const clickInput = win.querySelector('#sound-url-click');
    const openInput = win.querySelector('#sound-url-windowOpen');
    const closeInput = win.querySelector('#sound-url-windowClose');
    const errorInput = win.querySelector('#sound-url-error');
    
    enabledCheck.checked = appSettings.uiSounds.enabled;
    volumeSlider.value = appSettings.uiSounds.volume;
    clickInput.value = appSettings.uiSounds.click;
    openInput.value = appSettings.uiSounds.windowOpen;
    closeInput.value = appSettings.uiSounds.windowClose;
    errorInput.value = appSettings.uiSounds.error;
    
    win.querySelector('#save-sounds-btn').addEventListener('click', () => {
        appSettings.uiSounds.enabled = enabledCheck.checked;
        appSettings.uiSounds.volume = parseFloat(volumeSlider.value);
        appSettings.uiSounds.click = clickInput.value.trim();
        appSettings.uiSounds.windowOpen = openInput.value.trim();
        appSettings.uiSounds.windowClose = closeInput.value.trim();
        appSettings.uiSounds.error = errorInput.value.trim();
        
        preloadUISounds(); 
        saveSettings();
        closeWindow(win.id);
    });
}

function openIframeWindow(title, url) {
    const content = `<iframe src="${url}" style="width:100%; height:100%; border:none;" title="${title}" sandbox="allow-scripts allow-same-origin"></iframe>`;
    const win = openWindow(title, content, { width: '80vw', height: '75vh' });
    
    const contentArea = win.querySelector('.window-content, .mobile-app-content');
    if (contentArea) contentArea.style.padding = '0';
}

function openWebAppPrompt(item) {
    const promptContent = `
        <div class="app-launch-prompt">
            <p>How would you like to open <strong>${item.name}</strong>?</p>
            <div class="app-launch-prompt-buttons">
                <button id="open-in-tab">New Tab</button>
                <button id="open-in-window">In App</button>
            </div>
        </div>
    `;
    const modalWin = openWindow(`Launch App`, promptContent, {
        width: '350px',
        height: '160px',
        minWidth: '300px',
        minHeight: '150px',
        hideMaximize: true,
        hideMinimize: true
    });

    modalWin.querySelector('#open-in-tab').addEventListener('click', () => {
        window.open(item.url, '_blank');
        closeWindow(modalWin.id);
    });

    modalWin.querySelector('#open-in-window').addEventListener('click', () => {
        openIframeWindow(item.name, item.url);
        closeWindow(modalWin.id);
    });
}

function openPasswordModal(folderName, expectedPassword, onSuccessCallback) {
    const modalContent = `
        <div class="password-modal">
            <p>Enter password to unlock <strong>${folderName}</strong>:</p>
            <input type="password" id="password-input" placeholder="Password" autofocus>
            <div id="password-error" class="error-message"></div>
            <button id="submit-password">Unlock</button>
        </div>
    `;

    const modalWin = openWindow('Security', modalContent, {
        width: '300px',
        height: '180px',
        minWidth: '250px',
        minHeight: '150px',
        hideMaximize: true,
        hideMinimize: true
    });

    const input = modalWin.querySelector('#password-input');
    const submitBtn = modalWin.querySelector('#submit-password');
    const errorDiv = modalWin.querySelector('#password-error');

    const checkPassword = () => {
        if (input.value === expectedPassword) {
            closeWindow(modalWin.id);
            onSuccessCallback();
        } else {
            playUISound('error'); 
            errorDiv.textContent = 'Incorrect password.';
            input.value = '';
            input.focus();
            modalWin.style.transition = 'transform 0.1s ease-in-out';
            modalWin.style.transform = 'translateX(10px)';
            setTimeout(() => modalWin.style.transform = 'translateX(-10px)', 100);
            setTimeout(() => modalWin.style.transform = 'translateX(0px)', 200);
        }
    };

    submitBtn.addEventListener('click', checkPassword);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') checkPassword();
    });
    
    setTimeout(() => input.focus(), 100);
}

function openLockedFolderWindow(folderName, contents) {
    const folderGridDiv = document.createElement('div');
    folderGridDiv.className = 'folder-grid';
    
    contents.forEach(item => {
        const iconDiv = createIconElement(item);
        const eventType = isMobile() ? 'click' : 'dblclick';
        iconDiv.addEventListener(eventType, (e) => {
            e.stopPropagation();
            launchItem(item);
        });
        folderGridDiv.appendChild(iconDiv);
    });
    
    const win = openWindow(`${folderName} - Explorer`, '', {width: '400px', height: '300px'});
    const contentArea = win.querySelector('.window-content, .mobile-app-content');
    contentArea.style.padding = '5px';
    contentArea.appendChild(folderGridDiv);
}

function openVideoPlayerApp(fileName = null) {
    const playerHTML = `
        <div id="video-player-app">
            <div id="video-container">
                <video id="video-element" controls>
                    Your browser does not support the video tag.
                </video>
            </div>
            <div id="video-controls">
                <button id="video-open-btn">Open...</button>
                <input type="text" id="video-url-input" placeholder="Or enter URL" style="flex-grow: 1; padding: 5px; border-radius: 4px; border: 1px solid #444; background: #222; color: white;">
                <button id="video-load-btn">Load</button>
            </div>
            <input type="file" id="video-file-input" accept="video/*" style="display:none;">
        </div>
    `;
    const win = openWindow(fileName ? `Video - ${fileName}` : 'Video Player', playerHTML, {width: '600px', height: '400px'});
    const contentArea = win.querySelector('.window-content, .mobile-app-content');
    if (contentArea) contentArea.style.padding = '0';
    
    const video = win.querySelector('#video-element');
    const openBtn = win.querySelector('#video-open-btn');
    const loadBtn = win.querySelector('#video-load-btn');
    const urlInput = win.querySelector('#video-url-input');
    const fileInput = win.querySelector('#video-file-input');
    
    openBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            video.src = url;
            video.play();
            win.querySelector('.window-title').textContent = `Video - ${file.name}`;
        }
    });
    
    loadBtn.addEventListener('click', () => {
        if(urlInput.value) {
            video.src = urlInput.value;
            video.play();
        }
    });
    
    if (fileName) {
        const videoUrl = `${BASE_URL}${encodeURIComponent(fileName)}`;
        video.src = videoUrl;
        video.play();
    }
}

function openMediaPlayerWindow(fileName) {
    const mediaFileUrl = `${BASE_URL}${encodeURIComponent(fileName)}`;
    const playerLink = `${MEDIA_PLAYER_APP_URL}%22${mediaFileUrl}%22`;
    const content = `<iframe src="${playerLink}" style="width:100%; height:100%; border:none;" title="Media Player"></iframe>`;
    const win = openWindow(`Media Player - ${fileName}`, content, {width: '350px', height: '200px'});
    const contentArea = win.querySelector('.window-content, .mobile-app-content');
    if (contentArea) contentArea.style.padding = '0';
}

function openImageViewWindow(fileName) { 
    const imageUrl = `${BASE_URL}${encodeURIComponent(fileName)}`; 
    const isHdr = fileName.toLowerCase().endsWith('.hdr'); 
    const content = isHdr 
        ? `<div id="hdr-container-${Date.now()}" style="width:100%; height:100%; background:#000;"></div>` 
        : `<img src="${imageUrl}" style="width:100%; height:100%; object-fit:contain; display:block; margin:auto; background:var(--theme-bg-tertiary);" alt="${fileName}">`; 
    
    const win = openWindow(`Image Viewer - ${fileName}`, content, {width: '70vw', height: '70vh'}); 
    const contentArea = win.querySelector('.window-content, .mobile-app-content');
    if (contentArea) contentArea.style.padding = '0';
    
    if (isHdr) { 
        setTimeout(() => {
            const containerId = win.querySelector('div[id^="hdr-container"]').id; 
            initHdrViewer(containerId, imageUrl); 
        }, 10);
    } 
}

function initHdrViewer(containerId, imageUrl) { 
    const container = document.getElementById(containerId);
    if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(() => initHdrViewer(containerId, imageUrl), 50);
        return;
    }
    const width = container.clientWidth;
    const height = container.clientHeight;
    const scene = new THREE.Scene(); 
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000); 
    camera.position.set(0, 0, 0.1);
    const renderer = new THREE.WebGLRenderer({ antialias: true }); 
    renderer.setSize(width, height); 
    renderer.toneMapping = THREE.ACESFilmicToneMapping; 
    renderer.toneMappingExposure = 1.5;
    container.innerHTML = '';
    container.appendChild(renderer.domElement); 
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.target.set(0, 0, 0);
    new THREE.RGBELoader().load(imageUrl, function (texture) { 
        texture.mapping = THREE.EquirectangularReflectionMapping; 
        scene.background = texture; 
        scene.environment = texture; 
        renderer.render(scene, camera); 
        animate(); 
    },
    undefined,
    (error) => {
        console.error('An error occurred while loading the HDR file:', error);
        container.innerHTML = '<div style="color:white; padding: 20px;">Error loading HDR file. Check console for details.</div>';
    });
    const resizeHandler = (entries) => {
        const entry = entries[0];
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
    };
    new ResizeObserver(resizeHandler).observe(container);
    function animate() {
        if(!document.getElementById(containerId)) return; 
        requestAnimationFrame(animate);
        controls.update(); 
        renderer.render(scene, camera);
    }
}

async function openTextViewWindow(fileName) { 
    const content = `<textarea style="width: 100%; height: 100%; box-sizing: border-box; border: none; padding: 5px; font-family: 'Lucida Console', monospace; resize: none; background: var(--theme-bg-primary); color: var(--theme-text-primary);" readonly>Loading content for ${fileName}...</textarea>`; 
    const win = openWindow(`Viewer - ${fileName}`, content); 
    const textarea = win.querySelector('textarea'); 
    const contentArea = win.querySelector('.window-content, .mobile-app-content');
    if (contentArea) contentArea.style.padding = '0';
    try { 
        const response = await fetch(`${BASE_URL}${encodeURIComponent(fileName)}`); 
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); 
        const text = await response.text(); 
        textarea.value = text; 
    } catch (error) { 
        textarea.value = `--- ERROR ---\n\nCould not fetch file content for "${fileName}".\n\nReason: ${error.message}`; 
    } 
}

function openFileInNewTab(fileName) { window.open(`${BASE_URL}${fileName}`, '_blank'); }

function openErrorWindow(fileName, message) { 
    playUISound('error'); 
    const content = `<div style="padding:10px;"><h3 style="color: red;">Error</h3><p><strong>File:</strong> ${fileName}</p><p><strong>Reason:</strong> ${message}</p></div>`; 
    openWindow('System Error', content); 
}