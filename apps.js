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
    const win = openWindow('Calculator', calcHTML, { width: '300px', height: '450px', minWidth: '250px', minHeight: '350px' });
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
    const win = openWindow('Clock', clockHTML, { width: '400px', height: '250px', minWidth: '300px', minHeight: '200px' });
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

function findFileInSystem(fileName) {
    function search(items) {
        for (const item of items) {
            if (item.name === fileName) return item;
            if (item.type === 'folder' && item.contents) {
                const found = search(item.contents);
                if (found) return found;
            }
        }
        return null;
    }
    return search(desktopItems);
}

async function getVirtualFileContent(fileName) {
    const override = localStorage.getItem(`wacky_file_override_${fileName}`);
    if (override !== null) {
        return override;
    }
    try {
        const response = await fetch(`${BASE_URL}${encodeURIComponent(fileName)}`);
        if (!response.ok) {
            if (findFileInSystem(fileName)) {
                return '';
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (e) {
        if (findFileInSystem(fileName)) {
            return '';
        }
        throw e;
    }
}

async function openNotepadApp(fileName = null) {
    const notepadHTML = `
        <div id="notepad-app">
            <div class="notepad-toolbar">
                <button id="notepad-save-btn">Save</button>
                <span id="notepad-status" style="margin-left: 10px; font-size: 11px; opacity: 0.7;"></span>
            </div>
            <textarea id="notepad-textarea" placeholder="Start typing..."></textarea>
        </div>
    `;
    const title = fileName ? `Notepad - ${fileName}` : 'Notepad';
    const win = openWindow(title, notepadHTML, { width: '500px', height: '400px' });
    const contentArea = win.querySelector('.window-content, .mobile-app-content');
    if (contentArea) contentArea.style.padding = '0';

    const textarea = win.querySelector('#notepad-textarea');
    const saveBtn = win.querySelector('#notepad-save-btn');
    const statusSpan = win.querySelector('#notepad-status');

    let currentFileName = fileName;

    if (currentFileName) {
        statusSpan.textContent = 'Loading...';
        try {
            const content = await getVirtualFileContent(currentFileName);
            textarea.value = content;
            statusSpan.textContent = '';
        } catch (error) {
            textarea.value = `Error loading file: ${error.message}`;
            statusSpan.textContent = 'Error';
        }
    }

    saveBtn.addEventListener('click', () => {
        if (!currentFileName) {
            const newName = prompt('Enter a filename to save as:', 'untitled.txt');
            if (!newName) return;
            currentFileName = newName;


            const titleElem = win.querySelector('.window-title');
            if (titleElem) titleElem.textContent = `Notepad - ${currentFileName}`;


            const newItem = { name: currentFileName, type: 'file', class: 'document' };
            desktopItems.push(newItem);
            renderUI();
        }

        try {
            localStorage.setItem(`wacky_file_override_${currentFileName}`, textarea.value);
            statusSpan.textContent = 'Saved successfully';
            setTimeout(() => {
                if (statusSpan.textContent === 'Saved successfully') {
                    statusSpan.textContent = '';
                }
            }, 2000);
        } catch (e) {
            statusSpan.textContent = 'Failed to save';
        }
    });
}

function openSettingsApp() {
    const settingsHTML = `
        <div id="settings-app">
            <div class="setting-header">Appearance & Graphics</div>
            
            <div class="setting-group">
                <label>Visual Effects</label>
                <div class="setting-group-row">
                    <input type="checkbox" id="graphics-glass-check">
                    <label for="graphics-glass-check">Enable glass aero bs effects</label>
                </div>
                <div class="setting-group-row">
                    <input type="checkbox" id="graphics-3d-check">
                    <label for="graphics-3d-check">Enable 3D Background (WebGL)</label>
                </div>
                <small>Toggle these separately. Glass adds transparency to windows; 3D adds an interactive wallpaper.</small>
            </div>

            <div class="setting-group">
                <label>Theme studio</label>
                <small>Change colors, wallpapers, and window tinting.</small>
                <button id="open-theme-app-btn" style="margin-top: 5px;">Open Theme studio</button>
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
                <label>Add custom web app</label>
                <div id="add-custom-app-form">
                    <input type="text" id="custom-app-name" placeholder="App name">
                    <input type="text" id="custom-app-url" placeholder="https://example.com">
                    <button id="add-custom-app-btn">Add</button>
                </div>
            </div>

            <div class="setting-group">
                <label>Manage custom apps</label>
                <div id="custom-apps-list"></div>
            </div>
        </div>
    `;
    const win = openWindow('Settings', settingsHTML, { width: '500px', height: '650px', minWidth: '400px' });

    const glassCheck = win.querySelector('#graphics-glass-check');
    const threeDCheck = win.querySelector('#graphics-3d-check');
    const taskbarSelect = win.querySelector('#taskbar-select');
    const taskbarModeSelect = win.querySelector('#taskbar-mode-select');
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
    const win = openWindow('Browser', browserHTML, { width: '800px', height: '600px' });
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

function openExplorerApp(options = {}) {
    if (typeof options === 'string') {
        options = { startFolder: options };
    }


    let currentPath = ['Computer'];
    if (options.startFolder) {

        const validFolder = desktopItems.find(item => item.name === options.startFolder && (item.type === 'folder' || item.type === 'locked_folder'));
        if (validFolder) {
            currentPath = ['Computer', options.startFolder];
        }
    }

    let history = [[...currentPath]];
    let historyIndex = 0;
    let query = '';


    const explorerHTML = `
        <div id="explorer-app-wrapper">
            <div class="explorer-toolbar">
                <button class="explorer-nav-btn explorer-back-btn" title="Back" disabled>&larr;</button>
                <button class="explorer-nav-btn explorer-forward-btn" title="Forward" disabled>&rarr;</button>
                <div class="explorer-address-bar">
                    <span class="explorer-address-icon">&#128193;</span>
                    <input type="text" class="explorer-address-input" readonly value="">
                </div>
                <div class="explorer-search-bar">
                    <span class="explorer-search-icon">&#128269;</span>
                    <input type="text" class="explorer-search-input" placeholder="Search folder...">
                </div>
            </div>
            <div class="explorer-body">
                <div class="explorer-sidebar">
                    <div class="explorer-sidebar-section">
                        <div class="explorer-sidebar-header">Shortcuts</div>
                        <div class="explorer-sidebar-item" data-path="Computer">
                            <span class="sidebar-icon-img computer"></span>
                            <span>Computer</span>
                        </div>
                        <div class="explorer-sidebar-item" data-path="Games">
                            <span class="sidebar-icon-img games"></span>
                            <span>Games</span>
                        </div>
                        <div class="explorer-sidebar-item" data-path="Websites & Projects">
                            <span class="sidebar-icon-img websites"></span>
                            <span>Websites</span>
                        </div>
                        <div class="explorer-sidebar-item" data-path="Documents & Code">
                            <span class="sidebar-icon-img docs"></span>
                            <span>Documents</span>
                        </div>
                        <div class="explorer-sidebar-item" data-path="Media & Files">
                            <span class="sidebar-icon-img media"></span>
                            <span>Media</span>
                        </div>
                    </div>
                </div>
                <div class="explorer-content"></div>
            </div>
        </div>
    `;

    const win = openWindow('File Explorer', explorerHTML, { width: '650px', height: '450px' });
    const wrapper = win.querySelector('#explorer-app-wrapper');
    if (!wrapper) return;

    const backBtn = wrapper.querySelector('.explorer-back-btn');
    const forwardBtn = wrapper.querySelector('.explorer-forward-btn');
    const addressInput = wrapper.querySelector('.explorer-address-input');
    const searchInput = wrapper.querySelector('.explorer-search-input');
    const sidebarItems = wrapper.querySelectorAll('.explorer-sidebar-item');
    const contentArea = wrapper.querySelector('.explorer-content');


    function resolvePath(path) {
        if (path.length === 0 || path[0] !== 'Computer') {
            return { name: 'Computer', contents: getRootContents() };
        }

        let currentContents = getRootContents();
        let folderName = 'Computer';

        for (let i = 1; i < path.length; i++) {
            const nextSegment = path[i];
            const found = currentContents.find(item => item.name === nextSegment && (item.type === 'folder' || item.type === 'locked_folder'));
            if (found) {
                folderName = found.name;
                currentContents = found.contents || [];
            } else {
                return { name: 'Computer', contents: getRootContents() };
            }
        }

        return { name: folderName, contents: currentContents };
    }

    function getRootContents() {
        return desktopItems.filter(item => item.type === 'folder' || item.type === 'locked_folder');
    }

    function navigateTo(targetPath) {

        history = history.slice(0, historyIndex + 1);
        history.push([...targetPath]);
        historyIndex = history.length - 1;
        render();
    }

    function render() {
        currentPath = history[historyIndex];


        addressInput.value = currentPath.join(' \u25B8 ');


        backBtn.disabled = (historyIndex === 0);
        forwardBtn.disabled = (historyIndex === history.length - 1);


        sidebarItems.forEach(item => {
            const pathName = item.getAttribute('data-path');
            if (pathName === 'Computer' && currentPath.length === 1) {
                item.classList.add('active');
            } else if (currentPath.length > 1 && currentPath[1] === pathName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });


        const folder = resolvePath(currentPath);
        let contents = folder.contents;


        if (query) {
            contents = contents.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
        }


        contentArea.innerHTML = '';

        if (contents.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'explorer-empty-message';
            emptyMsg.textContent = query ? 'No search results found.' : 'This folder is empty.';
            contentArea.appendChild(emptyMsg);
            return;
        }

        contents.forEach(item => {
            const iconDiv = createIconElement(item);
            const eventType = isMobile() ? 'click' : 'dblclick';

            iconDiv.addEventListener(eventType, (e) => {
                e.stopPropagation();
                if (item.type === 'folder' && item.contents) {
                    navigateTo([...currentPath, item.name]);
                } else {
                    launchItem(item);
                    if (item.type !== 'system_app' && item.type !== 'webapp' && item.type !== 'folder') {
                        closeWindow(win.id);
                    }
                }
            });

            contentArea.appendChild(iconDiv);
        });
    }


    addressInput.addEventListener('click', () => {
        addressInput.select();
    });


    backBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (historyIndex > 0) {
            historyIndex--;
            render();
        }
    });

    forwardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (historyIndex < history.length - 1) {
            historyIndex++;
            render();
        }
    });


    searchInput.addEventListener('input', (e) => {
        query = e.target.value.trim();
        render();
    });


    sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = item.getAttribute('data-path');
            if (target === 'Computer') {
                navigateTo(['Computer']);
            } else {
                navigateTo(['Computer', target]);
            }
        });
    });


    render();
}

function openAboutApp() {
    const aboutHTML = `
        <div id="about-app">
            <div class="icon-img webapp-space" style="filter: hue-rotate(180deg);"></div>
            <h2>wbOS! v5.1</h2>
            <p>welcome to this particular nonsense!</p>
            <p>wackybox incorporated. technology of tomorrow, on the technology of today <3</p>
            <p>Version 5.1 - Would you look at that? More... more UI changes. Of course</p>
        </div>
    `;
    openWindow('About wbOS', aboutHTML, { width: '400px', height: '450px', hideMaximize: true, hideMinimize: true });
}

const terminalHistory = [];

function openTerminalApp() {
    let historyIdx = terminalHistory.length;

    const terminalState = {
        currentFolder: null,
        currentFolderName: 'Desktop'
    };

    const terminalHTML = `
        <div id="terminal-app">
            <div id="terminal-output">Welcome to wbOS Terminal v5.1. Type 'help' for commands.</div>
            <div id="terminal-input-line">
                <span id="terminal-prompt">user@wackybox:~/Desktop$ </span>
                <input type="text" id="terminal-input" autofocus autocomplete="off" spellcheck="false">
            </div>
        </div>
    `;
    const win = openWindow('Terminal', terminalHTML, { width: '600px', height: '400px' });
    const contentArea = win.querySelector('.window-content, .mobile-app-content');
    if (contentArea) contentArea.style.padding = '0';

    const output = win.querySelector('#terminal-output');
    const input = win.querySelector('#terminal-input');
    const prompt = win.querySelector('#terminal-prompt');

    win.addEventListener('click', () => input.focus());

    function updatePrompt() {
        const pathStr = terminalState.currentFolder ? `~/Desktop/${terminalState.currentFolderName}` : `~/Desktop`;
        prompt.textContent = `user@wackybox:${pathStr}$ `;
    }

    function findItemInCurrent(name) {
        const items = terminalState.currentFolder ? (terminalState.currentFolder.contents || []) : desktopItems;
        return items.find(item => item.name === name);
    }

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const command = input.value.trim();
            output.textContent += `\n${prompt.textContent}${input.value}\n`;

            if (command) {
                terminalHistory.push(command);
                historyIdx = terminalHistory.length;
                await runCommand(command);
            }

            input.value = '';
            output.parentElement.scrollTop = output.parentElement.scrollHeight;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (terminalHistory.length === 0) return;
            if (historyIdx > 0) {
                historyIdx--;
            }
            input.value = terminalHistory[historyIdx];
            setTimeout(() => { input.selectionStart = input.selectionEnd = input.value.length; }, 0);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIdx < terminalHistory.length - 1) {
                historyIdx++;
                input.value = terminalHistory[historyIdx];
            } else {
                historyIdx = terminalHistory.length;
                input.value = '';
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const val = input.value;
            const parts = val.split(' ');
            if (parts.length === 1) {
                const prefix = parts[0].toLowerCase();
                const commands = ['help', 'ls', 'date', 'clear', 'echo', 'poo', 'theme', 'cat', 'rm', 'touch', 'open', 'pwd', 'cd', 'sysinfo'];
                const matches = commands.filter(c => c.startsWith(prefix));
                if (matches.length === 1) {
                    input.value = matches[0] + ' ';
                } else if (matches.length > 1) {
                    output.textContent += `\n${matches.join('  ')}\n`;
                    updatePrompt();
                    output.textContent += input.value;
                    output.parentElement.scrollTop = output.parentElement.scrollHeight;
                }
            } else if (parts.length > 1) {
                const cmd = parts[0].toLowerCase();
                if (['cat', 'rm', 'open', 'cd'].includes(cmd)) {
                    const prefix = parts.slice(1).join(' ').toLowerCase();
                    const items = terminalState.currentFolder ? (terminalState.currentFolder.contents || []) : desktopItems;
                    const matches = items
                        .filter(item => {
                            if (cmd === 'cd') return item.type === 'folder';
                            return true;
                        })
                        .map(item => item.name)
                        .filter(name => name.toLowerCase().startsWith(prefix));

                    if (matches.length === 1) {
                        input.value = `${cmd} ${matches[0]}`;
                    } else if (matches.length > 1) {
                        output.textContent += `\n${matches.join('  ')}\n`;
                        updatePrompt();
                        output.textContent += input.value;
                        output.parentElement.scrollTop = output.parentElement.scrollHeight;
                    }
                }
            }
        }
    });

    async function runCommand(cmdLine) {
        const args = cmdLine.split(' ');
        const command = args[0].toLowerCase();

        switch (command) {
            case 'help':
                output.textContent += "Available commands:\n" +
                    "  help    - Shows this message\n" +
                    "  ls      - Lists items in the current directory\n" +
                    "  cd [dir]- Changes current directory (e.g. cd Games, cd ..)\n" +
                    "  pwd     - Prints current working directory\n" +
                    "  cat [f] - Displays contents of a desktop file\n" +
                    "  touch[f]- Creates an empty file on the desktop\n" +
                    "  rm [f]  - Removes a file/folder from the desktop\n" +
                    "  open [f]- Launches a file or application\n" +
                    "  sysinfo - Displays system details and stats\n" +
                    "  date    - Shows current date and time\n" +
                    "  clear   - Clears the terminal screen\n" +
                    "  echo    - Prints text to the terminal\n" +
                    "  theme   - Sets theme (e.g. theme light|dark|retro|neon|soft|wnt|cameron|mts-new)\n" +
                    "  poo     - Stinks\n";
                break;
            case 'ls':
                const items = terminalState.currentFolder ? (terminalState.currentFolder.contents || []) : desktopItems;
                if (items.length === 0) {
                    output.textContent += "(empty directory)\n";
                } else {
                    output.textContent += items.map(item => `  ${item.name} (${item.type === 'folder' ? 'dir' : item.class || 'file'})`).join('\n') + "\n";
                }
                break;
            case 'pwd':
                const pathStr = terminalState.currentFolder ? `~/Desktop/${terminalState.currentFolderName}` : `~/Desktop`;
                output.textContent += `${pathStr}\n`;
                break;
            case 'cd':
                if (args.length < 2) {
                    terminalState.currentFolder = null;
                    terminalState.currentFolderName = 'Desktop';
                    updatePrompt();
                } else {
                    const targetDir = args.slice(1).join(' ');
                    if (targetDir === '..') {
                        terminalState.currentFolder = null;
                        terminalState.currentFolderName = 'Desktop';
                        updatePrompt();
                    } else {
                        const found = findItemInCurrent(targetDir);
                        if (found && found.type === 'folder') {
                            terminalState.currentFolder = found;
                            terminalState.currentFolderName = found.name;
                            updatePrompt();
                        } else {
                            output.textContent += `cd: no such directory: ${targetDir}\n`;
                        }
                    }
                }
                break;
            case 'cat':
                if (args.length < 2) {
                    output.textContent += "Usage: cat [filename]\n";
                } else {
                    const filename = args.slice(1).join(' ');
                    const item = findItemInCurrent(filename);
                    if (!item) {
                        output.textContent += `cat: ${filename}: file not found\n`;
                    } else if (item.type === 'folder') {
                        output.textContent += `cat: ${filename}: is a directory\n`;
                    } else {
                        try {
                            const text = await getVirtualFileContent(item.name);
                            output.textContent += text + "\n";
                        } catch (err) {
                            output.textContent += `cat: error reading ${filename}: ${err.message}\n`;
                        }
                    }
                }
                break;
            case 'touch':
                if (args.length < 2) {
                    output.textContent += "Usage: touch [filename]\n";
                } else {
                    const filename = args.slice(1).join(' ');
                    if (findItemInCurrent(filename)) {
                        output.textContent += `touch: ${filename} already exists\n`;
                    } else {
                        const newItem = { name: filename, type: 'file', class: 'document' };
                        if (terminalState.currentFolder) {
                            if (!terminalState.currentFolder.contents) terminalState.currentFolder.contents = [];
                            terminalState.currentFolder.contents.push(newItem);
                        } else {
                            desktopItems.push(newItem);
                        }
                        renderUI();
                        output.textContent += `Created file ${filename}.\n`;
                    }
                }
                break;
            case 'rm':
                if (args.length < 2) {
                    output.textContent += "Usage: rm [filename]\n";
                } else {
                    const filename = args.slice(1).join(' ');
                    const itemsList = terminalState.currentFolder ? (terminalState.currentFolder.contents || []) : desktopItems;
                    const index = itemsList.findIndex(item => item.name === filename);
                    if (index !== -1) {
                        itemsList.splice(index, 1);
                        renderUI();
                        output.textContent += `Removed ${filename}.\n`;
                    } else {
                        output.textContent += `rm: ${filename}: file or directory not found\n`;
                    }
                }
                break;
            case 'open':
                if (args.length < 2) {
                    output.textContent += "Usage: open [filename_or_app]\n";
                } else {
                    const targetName = args.slice(1).join(' ');
                    const item = findItemInCurrent(targetName);
                    if (item) {
                        launchItem(item);
                        output.textContent += `Opening ${targetName}...\n`;
                    } else {
                        output.textContent += `open: ${targetName}: not found\n`;
                    }
                }
                break;
            case 'sysinfo':
                output.textContent += "System Information:\n" +
                    `  OS Name       - wbOS\n` +
                    `  Version       - v5.1\n` +
                    `  Resolution    - ${window.innerWidth}x${window.innerHeight}\n` +
                    `  Language      - ${navigator.language}\n` +
                    `  Theme         - ${appSettings.theme}\n` +
                    `  Light Angle   - ${appSettings.lightAngle}°\n` +
                    `  Light Int.    - ${appSettings.lightIntensity}\n` +
                    `  Uptime (OS)   - ${Math.round(performance.now() / 1000)}s\n` +
                    `  User Agent    - ${navigator.userAgent.split(' ')[0]}\n`;
                break;
            case 'date':
                output.textContent += new Date().toString() + "\n";
                break;
            case 'clear':
                output.textContent = "";
                break;
            case 'echo':
                output.textContent += args.slice(1).join(' ') + "\n";
                break;
            case 'theme':
                const newTheme = args[1];
                if (['light', 'dark', 'retro', 'neon', 'soft', 'wnt', 'cameron', 'mts-new'].includes(newTheme)) {
                    appSettings.theme = newTheme;
                    applySettings();
                    saveSettings();
                    output.textContent += `Theme set to ${newTheme}.\n`;
                } else {
                    output.textContent += "Usage: theme [light|dark|retro|neon|soft|wnt|cameron|mts-new]\n";
                }
                break;
            case 'poo':
                output.textContent += "💩 Stinky!\n";
                break;
            default:
                output.textContent += `Command not found: ${command}. Type 'help' for info.\n`;
        }
    }
}

function openThemeApp() {
    const wallpapers = [
        { id: 'default', name: 'Northern Aurora' },
        { id: 'glassy-gradient', name: 'Midnight glass' },
        { id: 'ocean', name: 'Vibrant aqua' },
        { id: 'solid', name: 'Muted slate' },
        { id: 'sunset', name: 'Dusk twilight' },
        { id: 'forest', name: 'Teal forest' },
        { id: 'nebula', name: 'Deep space' },
    ];

    const themeHTML = `
        <div id="theme-app">
            <div class="setting-group">
                <label>Color theme</label>
                <div id="theme-mode-toggle">
                    <button class="theme-mode-btn mts-new" data-theme="mts-new">Mts new</button>
                    <button class="theme-mode-btn cameron" data-theme="cameron">Cameron's theme</button>
                </div>
            </div>
            
            <div id="mts-new-customizers" class="setting-group" style="display: none;">
                <label>Mts new colors</label>
                <small>Customize the default colors for the Mts new theme.</small>
                <div class="setting-group-row" style="margin-top: 5px; gap: 10px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="color" id="color-text-primary" value="#8daef2">
                        <label for="color-text-primary" style="font-size: 11px;">Primary text</label>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="color" id="color-text-secondary" value="#a0c0ff">
                        <label for="color-text-secondary" style="font-size: 11px;">Secondary text</label>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="color" id="color-accent" value="#3a7bd5">
                        <label for="color-accent" style="font-size: 11px;">Accent</label>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <input type="color" id="color-border" value="#3a7bd5">
                        <label for="color-border" style="font-size: 11px;">Border</label>
                    </div>
                </div>
                <button id="reset-mts-colors-btn" style="margin-top: 10px;">Reset Mts colors</button>
            </div>

            <div class="setting-group">
                <label>Window background</label>
                <small>Override window content backgrounds independent of theme.</small>
                <div class="setting-group-row" style="margin-top: 5px; flex-wrap: wrap; gap: 8px;">
                    <select id="window-bg-type-select" style="padding: 6px; font-size: 13px;">
                        <option value="default">Theme default</option>
                        <option value="solid">Solid color</option>
                        <option value="gradient">Gradient</option>
                    </select>
                    <div id="window-bg-solid-ctrl" style="display: none; align-items: center; gap: 5px;">
                        <input type="color" id="window-bg-picker" value="#00000e">
                    </div>
                    <div id="window-bg-gradient-ctrl" style="display: none; align-items: center; gap: 5px;">
                        <input type="color" id="window-bg-grad1" value="#f3904f">
                        <input type="color" id="window-bg-grad2" value="#3b4371">
                        <select id="window-bg-grad-dir" style="padding: 6px; font-size: 13px;">
                            <option value="to top">To top</option>
                            <option value="to bottom">To bottom</option>
                            <option value="to left">To left</option>
                            <option value="to right">To right</option>
                            <option value="45deg">Diagonal (45°)</option>
                            <option value="radial-gradient">Radial</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="setting-group">
                <label>Content sector background</label>
                <small>Override inner backgrounds (like Settings sectors or Calculator body).</small>
                <div class="setting-group-row" style="margin-top: 5px; flex-wrap: wrap; gap: 8px;">
                    <select id="content-bg-type-select" style="padding: 6px; font-size: 13px;">
                        <option value="default">Theme default</option>
                        <option value="solid">Solid color</option>
                        <option value="gradient">Gradient</option>
                    </select>
                    <div id="content-bg-solid-ctrl" style="display: none; align-items: center; gap: 5px;">
                        <input type="color" id="content-bg-picker" value="#000000">
                    </div>
                    <div id="content-bg-gradient-ctrl" style="display: none; align-items: center; gap: 5px;">
                        <input type="color" id="content-bg-grad1" value="#2b4c7e">
                        <input type="color" id="content-bg-grad2" value="#0a0f1d">
                        <select id="content-bg-grad-dir" style="padding: 6px; font-size: 13px;">
                            <option value="to top">To top</option>
                            <option value="to bottom">To bottom</option>
                            <option value="to left">To left</option>
                            <option value="to right">To right</option>
                            <option value="45deg">Diagonal (45°)</option>
                            <option value="radial-gradient">Radial</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="setting-group">
                <label>Light angle (direction)</label>
                <small>Simulate light source angle from 0 to 360 degrees.</small>
                <div class="setting-group-row" style="margin-top: 5px;">
                    <input type="range" id="light-angle-slider" min="0" max="360" step="1" style="flex-grow: 1;">
                    <span id="light-angle-value" style="min-width: 45px; text-align: right;">135°</span>
                </div>
            </div>
            <div class="setting-group">
                <label>Light intensity</label>
                <small>Adjust the brightness of reflection overlays.</small>
                <div class="setting-group-row" style="margin-top: 5px;">
                    <input type="range" id="light-intensity-slider" min="0" max="1" step="0.05" style="flex-grow: 1;">
                    <span id="light-intensity-value" style="min-width: 45px; text-align: right;">25%</span>
                </div>
            </div>
            
            <div class="setting-group">
                <label>Window title text</label>
                <small>Customize the color of the text in window titlebars.</small>
                <div class="setting-group-row">
                    <input type="color" id="title-text-picker" value="#333333">
                    <div style="display:flex; align-items:center; gap:5px; margin-left:10px;">
                         <input type="checkbox" id="auto-contrast-check">
                         <label for="auto-contrast-check">Auto-contrast</label>
                    </div>
                </div>
                <small>Auto-contrast makes text black or white depending on the tint darkness.</small>
            </div>

            <div class="setting-group">
                <label>Window tint (glass mode)</label>
                <small>Controls the glass color of windows and taskbar.</small>
                <div class="setting-group-row">
                    <input type="color" id="glass-tint-picker" value="#ffffff">
                    <button id="reset-tint-btn">Reset to white</button>
                </div>
            </div>

            <div class="setting-group">
                <label>Window transparency</label>
                <small>Adjust how transparent the background and title bars are.</small>
                <div class="setting-group-row" style="margin-top: 5px;">
                    <input type="range" id="window-opacity-slider" min="0.1" max="1.0" step="0.05" style="flex-grow: 1;">
                    <span id="window-opacity-value" style="min-width: 40px; text-align: right;">25%</span>
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
                <label>Custom wallpaper</label>
                <div class="setting-group-row" style="gap: 5px; margin-top: 5px;">
                    <input type="file" id="wallpaper-upload" accept="image/*">
                    <button id="wallpaper-upload-btn">&#10514; Upload</button>
                </div>
            </div>

            <div class="setting-group" id="wallpaper-style-group">
                <label>Wallpaper style</label>
                <small>Select how the background image is scaled and positioned.</small>
                <select id="wallpaper-style-select" style="width: 100%; margin-top: 5px; background: rgba(0,0,0,0.2); color: var(--theme-text-primary); border: 1px solid var(--theme-border-color); padding: 5px; border-radius: 4px; outline: none; font-family: var(--theme-font-body);">
                    <option value="cover" ${appSettings.wallpaperStyle === 'cover' ? 'selected' : ''}>Fill (Cover)</option>
                    <option value="contain" ${appSettings.wallpaperStyle === 'contain' ? 'selected' : ''}>Fit (Contain)</option>
                    <option value="stretch" ${appSettings.wallpaperStyle === 'stretch' ? 'selected' : ''}>Stretch</option>
                    <option value="tile" ${appSettings.wallpaperStyle === 'tile' ? 'selected' : ''}>Tile</option>
                    <option value="center" ${appSettings.wallpaperStyle === 'center' ? 'selected' : ''}>Center</option>
                </select>
            </div>
            
            <div class="setting-group">
                <div id="custom-gradient-creator">
                    <label>Or create a custom gradient:</label>
                    <div class="setting-group-row">
                        <input type="color" id="gradient-color1" value="#f3904f">
                        <input type="color" id="gradient-color2" value="#3b4371">
                        <select id="gradient-direction">
                            <option value="to top">To top</option>
                            <option value="to bottom">To bottom</option>
                            <option value="to left">To left</option>
                            <option value="to right">To right</option>
                            <option value="45deg">Diagonal (45°)</option>
                            <option value="radial-gradient">Radial</option>
                        </select>
                    </div>
                    <button id="gradient-apply-btn">Apply gradient</button>
                </div>
            </div>
        </div>
    `;
    const win = openWindow('Theme studio', themeHTML, { width: '450px', height: '650px' });

    const wpStyles = {
        'default': 'url("windows_vista_49.jpg") center/cover no-repeat',
        'glassy-gradient': 'radial-gradient(ellipse at top left, #2b4c7e 0%, #152238 60%, #0a0f1d 100%)',
        'ocean': 'radial-gradient(circle at 80% 80%, #a2d2ff 0%, #3a86ff 50%, #003566 100%)',
        'solid': '#4a5759',
        'sunset': 'linear-gradient(to top, #f3904f, #3b4371)',
        'forest': 'linear-gradient(to bottom, #134e5e, #71b280)',
        'nebula': 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)'
    };
    win.querySelectorAll('.wallpaper-preview').forEach(div => {
        div.style.background = wpStyles[div.dataset.wallpaperId];
    });

    const mtsCustomizers = win.querySelector('#mts-new-customizers');
    const txtPrimaryPicker = win.querySelector('#color-text-primary');
    const txtSecondaryPicker = win.querySelector('#color-text-secondary');
    const accentPicker = win.querySelector('#color-accent');
    const borderPicker = win.querySelector('#color-border');
    const resetMtsBtn = win.querySelector('#reset-mts-colors-btn');

    function updateMtsPickerVisibility() {
        if (appSettings.theme === 'mts-new') {
            mtsCustomizers.style.display = 'block';
        } else {
            mtsCustomizers.style.display = 'none';
        }
    }
    updateMtsPickerVisibility();

    txtPrimaryPicker.value = appSettings.textPrimary || '#bafcd9';
    txtSecondaryPicker.value = appSettings.textSecondary || '#dfffea';
    accentPicker.value = appSettings.accentPrimary || '#2be19b';
    borderPicker.value = appSettings.borderColor || '#127b50';

    txtPrimaryPicker.addEventListener('input', (e) => {
        appSettings.textPrimary = e.target.value;
        applySettings();
        saveSettings();
    });
    txtSecondaryPicker.addEventListener('input', (e) => {
        appSettings.textSecondary = e.target.value;
        applySettings();
        saveSettings();
    });
    accentPicker.addEventListener('input', (e) => {
        appSettings.accentPrimary = e.target.value;
        applySettings();
        saveSettings();
    });
    borderPicker.addEventListener('input', (e) => {
        appSettings.borderColor = e.target.value;
        applySettings();
        saveSettings();
    });
    resetMtsBtn.addEventListener('click', () => {
        appSettings.textPrimary = '';
        appSettings.textSecondary = '';
        appSettings.accentPrimary = '';
        appSettings.borderColor = '';
        txtPrimaryPicker.value = '#bafcd9';
        txtSecondaryPicker.value = '#dfffea';
        accentPicker.value = '#2be19b';
        borderPicker.value = '#127b50';
        applySettings();
        saveSettings();
    });


    const windowBgTypeSelect = win.querySelector('#window-bg-type-select');
    const windowBgSolidCtrl = win.querySelector('#window-bg-solid-ctrl');
    const windowBgPicker = win.querySelector('#window-bg-picker');
    const windowBgGradientCtrl = win.querySelector('#window-bg-gradient-ctrl');
    const windowBgGrad1 = win.querySelector('#window-bg-grad1');
    const windowBgGrad2 = win.querySelector('#window-bg-grad2');
    const windowBgGradDir = win.querySelector('#window-bg-grad-dir');


    const contentBgTypeSelect = win.querySelector('#content-bg-type-select');
    const contentBgSolidCtrl = win.querySelector('#content-bg-solid-ctrl');
    const contentBgPicker = win.querySelector('#content-bg-picker');
    const contentBgGradientCtrl = win.querySelector('#content-bg-gradient-ctrl');
    const contentBgGrad1 = win.querySelector('#content-bg-grad1');
    const contentBgGrad2 = win.querySelector('#content-bg-grad2');
    const contentBgGradDir = win.querySelector('#content-bg-grad-dir');


    windowBgTypeSelect.value = appSettings.windowBgType || 'default';
    windowBgPicker.value = appSettings.windowBgSolid || '#00000e';
    windowBgGrad1.value = appSettings.windowBgGrad1 || '#f3904f';
    windowBgGrad2.value = appSettings.windowBgGrad2 || '#3b4371';
    windowBgGradDir.value = appSettings.windowBgGradDir || 'to top';

    contentBgTypeSelect.value = appSettings.contentBgType || 'default';
    contentBgPicker.value = appSettings.contentBgSolid || '#000000';
    contentBgGrad1.value = appSettings.contentBgGrad1 || '#2b4c7e';
    contentBgGrad2.value = appSettings.contentBgGrad2 || '#0a0f1d';
    contentBgGradDir.value = appSettings.contentBgGradDir || 'to top';

    function updateWindowBgCtrlVisibility() {
        const type = windowBgTypeSelect.value;
        if (type === 'solid') {
            windowBgSolidCtrl.style.display = 'flex';
            windowBgGradientCtrl.style.display = 'none';
        } else if (type === 'gradient') {
            windowBgSolidCtrl.style.display = 'none';
            windowBgGradientCtrl.style.display = 'flex';
        } else {
            windowBgSolidCtrl.style.display = 'none';
            windowBgGradientCtrl.style.display = 'none';
        }
    }

    function updateContentBgCtrlVisibility() {
        const type = contentBgTypeSelect.value;
        if (type === 'solid') {
            contentBgSolidCtrl.style.display = 'flex';
            contentBgGradientCtrl.style.display = 'none';
        } else if (type === 'gradient') {
            contentBgSolidCtrl.style.display = 'none';
            contentBgGradientCtrl.style.display = 'flex';
        } else {
            contentBgSolidCtrl.style.display = 'none';
            contentBgGradientCtrl.style.display = 'none';
        }
    }

    updateWindowBgCtrlVisibility();
    updateContentBgCtrlVisibility();


    windowBgTypeSelect.addEventListener('change', () => {
        appSettings.windowBgType = windowBgTypeSelect.value;
        updateWindowBgCtrlVisibility();
        applySettings();
        saveSettings();
    });
    windowBgPicker.addEventListener('input', (e) => {
        appSettings.windowBgSolid = e.target.value;
        applySettings();
        saveSettings();
    });
    const onWindowBgGradChange = () => {
        appSettings.windowBgGrad1 = windowBgGrad1.value;
        appSettings.windowBgGrad2 = windowBgGrad2.value;
        appSettings.windowBgGradDir = windowBgGradDir.value;
        applySettings();
        saveSettings();
    };
    windowBgGrad1.addEventListener('input', onWindowBgGradChange);
    windowBgGrad2.addEventListener('input', onWindowBgGradChange);
    windowBgGradDir.addEventListener('change', onWindowBgGradChange);

    contentBgTypeSelect.addEventListener('change', () => {
        appSettings.contentBgType = contentBgTypeSelect.value;
        updateContentBgCtrlVisibility();
        applySettings();
        saveSettings();
    });
    contentBgPicker.addEventListener('input', (e) => {
        appSettings.contentBgSolid = e.target.value;
        applySettings();
        saveSettings();
    });
    const onContentBgGradChange = () => {
        appSettings.contentBgGrad1 = contentBgGrad1.value;
        appSettings.contentBgGrad2 = contentBgGrad2.value;
        appSettings.contentBgGradDir = contentBgGradDir.value;
        applySettings();
        saveSettings();
    };
    contentBgGrad1.addEventListener('input', onContentBgGradChange);
    contentBgGrad2.addEventListener('input', onContentBgGradChange);
    contentBgGradDir.addEventListener('change', onContentBgGradChange);


    const lightAngleSlider = win.querySelector('#light-angle-slider');
    const lightAngleValue = win.querySelector('#light-angle-value');
    const lightIntensitySlider = win.querySelector('#light-intensity-slider');
    const lightIntensityValue = win.querySelector('#light-intensity-value');

    const angle = appSettings.lightAngle !== undefined ? appSettings.lightAngle : 135;
    const intensity = appSettings.lightIntensity !== undefined ? appSettings.lightIntensity : 0.25;

    lightAngleSlider.value = angle;
    lightAngleValue.textContent = `${angle}°`;
    lightIntensitySlider.value = intensity;
    lightIntensityValue.textContent = `${Math.round(intensity * 100)}%`;

    lightAngleSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        appSettings.lightAngle = val;
        lightAngleValue.textContent = `${val}°`;
        applySettings();
        saveSettings();
    });

    lightIntensitySlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        appSettings.lightIntensity = val;
        lightIntensityValue.textContent = `${Math.round(val * 100)}%`;
        applySettings();
        saveSettings();
    });

    win.querySelectorAll('.theme-mode-btn').forEach(btn => {
        if (btn.dataset.theme === appSettings.theme) btn.classList.add('active');
        btn.addEventListener('click', () => {
            appSettings.theme = btn.dataset.theme;
            applySettings();
            saveSettings();

            win.querySelectorAll('.theme-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateMtsPickerVisibility();
        });
    });


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


    const opacitySlider = win.querySelector('#window-opacity-slider');
    const opacityDisplay = win.querySelector('#window-opacity-value');


    const currentOpacity = appSettings.windowOpacity !== undefined ? appSettings.windowOpacity : 0.25;
    opacitySlider.value = currentOpacity;
    opacityDisplay.textContent = Math.round(currentOpacity * 100) + '%';

    opacitySlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        appSettings.windowOpacity = val;
        opacityDisplay.textContent = Math.round(val * 100) + '%';
        applySettings();
        saveSettings();
    });


    const styleGroup = win.querySelector('#wallpaper-style-group');
    const styleSelect = win.querySelector('#wallpaper-style-select');
    function updateStyleGroupVisibility() {
        const isImg = appSettings.wallpaper === 'default' || 
                      (appSettings.wallpaper === 'custom' && appSettings.wallpaperCustom && appSettings.wallpaperCustom.startsWith('data:image'));
        styleGroup.style.display = isImg ? 'block' : 'none';
    }
    updateStyleGroupVisibility();

    styleSelect.addEventListener('change', (e) => {
        appSettings.wallpaperStyle = e.target.value;
        applySettings();
        saveSettings();
    });

    win.querySelectorAll('.wallpaper-preview').forEach(div => {
        div.addEventListener('click', () => {
            appSettings.wallpaper = div.dataset.wallpaperId;
            appSettings.wallpaperCustom = null;
            applySettings();
            saveSettings();

            win.querySelectorAll('.wallpaper-preview').forEach(d => d.classList.remove('active'));
            div.classList.add('active');
            updateStyleGroupVisibility();
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
            updateStyleGroupVisibility();
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
        updateStyleGroupVisibility();
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
    const win = openWindow('UI Sound Settings', soundSettingsHTML, { width: '400px', height: '520px', minWidth: '350px' });

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

    const win = openWindow(`${folderName} - Explorer`, '', { width: '400px', height: '300px' });
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
    const win = openWindow(fileName ? `Video - ${fileName}` : 'Video Player', playerHTML, { width: '600px', height: '400px' });
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
        if (urlInput.value) {
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
    let playerLink = MEDIA_PLAYER_APP_URL;
    let title = 'Meaty Player';
    let width = '600px';
    let height = '450px';
    if (fileName) {
        const mediaFileUrl = `${BASE_URL}${encodeURIComponent(fileName)}`;
        playerLink = `${MEDIA_PLAYER_APP_URL}%22${mediaFileUrl}%22`;
        title = `Meaty Player - ${fileName}`;
        width = '350px';
        height = '200px';
    }
    const content = `<iframe src="${playerLink}" style="width:100%; height:100%; border:none;" title="Meaty Player"></iframe>`;
    const win = openWindow(title, content, { width: width, height: height });
    const contentArea = win.querySelector('.window-content, .mobile-app-content');
    if (contentArea) contentArea.style.padding = '0';
}

function openImageViewWindow(fileName) {
    const imageUrl = `${BASE_URL}${encodeURIComponent(fileName)}`;
    const isHdr = fileName.toLowerCase().endsWith('.hdr');
    const content = isHdr
        ? `<div id="hdr-container-${Date.now()}" style="width:100%; height:100%; background:#000;"></div>`
        : `<img src="${imageUrl}" style="width:100%; height:100%; object-fit:contain; display:block; margin:auto; background:var(--theme-bg-tertiary);" alt="${fileName}">`;

    const win = openWindow(`Image Viewer - ${fileName}`, content, { width: '70vw', height: '70vh' });
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
        if (!document.getElementById(containerId)) return;
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
}

async function openTextViewWindow(fileName) {
    openNotepadApp(fileName);
}

function openFileInNewTab(fileName) { window.open(`${BASE_URL}${fileName}`, '_blank'); }

function openErrorWindow(fileName, message) {
    playUISound('error');
    const content = `<div style="padding:10px;"><h3 style="color: red;">Error</h3><p><strong>File:</strong> ${fileName}</p><p><strong>Reason:</strong> ${message}</p></div>`;
    openWindow('System Error', content);
}