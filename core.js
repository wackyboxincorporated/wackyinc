const BASE_URL = 'https://wackybox.org/';
const MEDIA_PLAYER_APP_URL = `${BASE_URL}media?=`;

let desktopItems = [];
let customDesktopItems = []; 
let LOCKED_FOLDER = {};
let highestZIndex = 1000;
let openWindows = {}; 
let openMobileAppOrder = []; 

let audioCache = {}; 

const isMobile = () => window.matchMedia("(max-width: 768px), (max-height: 500px) and (orientation: landscape)").matches;

let appSettings = {
    wallpaper: 'glassy-gradient',
    wallpaperCustom: null, 
    theme: 'mts-new',
    graphics3d: false, 
    graphicsGlass: true, 
    glassTint: '#ffffff', // Store as HEX now for stability
    windowOpacity: 0.1, // NEW: Default opacity
    titleColor: 'auto', // 'auto' or hex
    autoContrastTitle: true,
    taskbarPosition: 'bottom',
    taskbarMode: 'standard', // 'standard' or 'compact'
    iconSize: 'medium',
    alwaysOpenInWindow: false,
    taskbarAutohide: false, 
    lightDirection: 'top-left', // Default light direction
    windowBackground: '', // Default window background
    textPrimary: '', // Mts new custom colors
    accentPrimary: '',
    textSecondary: '',
    borderColor: '',
    uiSounds: { 
        enabled: true,
        volume: 0.5,
        click: '',
        windowOpen: '',
        windowClose: '',
        error: ''
    }
};
const SETTINGS_KEY = 'wackybox_settings_v7'; // Version bumped
const CUSTOM_APPS_KEY = 'wackybox_custom_apps_v1'; 

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
    } catch (e) {
        console.error("Failed to save settings:", e);
    }
}

function saveCustomApps() {
    try {
        localStorage.setItem(CUSTOM_APPS_KEY, JSON.stringify(customDesktopItems));
    } catch (e) {
        console.error("Failed to save custom apps:", e);
    }
}

function loadSettings() {
    try {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            if (parsed && parsed.uiSounds) {
                parsed.uiSounds = { ...appSettings.uiSounds, ...parsed.uiSounds };
            }
            appSettings = { ...appSettings, ...parsed }; 
        }
    } catch (e) {
        console.error("Failed to load settings:", e);
    }
    
    try {
        const savedCustomApps = localStorage.getItem(CUSTOM_APPS_KEY);
        if (savedCustomApps) {
            customDesktopItems = JSON.parse(savedCustomApps);
        }
    } catch (e) {
        console.error("Failed to load custom apps:", e);
        customDesktopItems = [];
    }
    
    preloadUISounds();
    applySettings();
}

function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Calculate luminance to determine if text should be black or white
function getContrastColor(hexColor) {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return '#000000';
    
    // SRP calculation
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

function applySettings() {
    const desktop = document.getElementById('desktop-root');
    const body = document.body;

    body.classList.remove('theme-light', 'theme-dark', 'theme-retro', 'theme-neon', 'theme-soft', 'theme-cameron', 'theme-wnt', 'theme-mts-new');
    
    let themeClass = `theme-${appSettings.theme}`;
    
    body.classList.add(themeClass);
    
    if (appSettings.graphicsGlass) {
        body.classList.add('graphics-glass');
    } else {
        body.classList.remove('graphics-glass');
    }
    
    if (appSettings.graphics3d) {
        body.classList.add('graphics-3d');
        initFancyWallpaper();
    } else {
        body.classList.remove('graphics-3d');
        destroyFancyWallpaper();
    }

    // Window background override (independent of theme)
    if (appSettings.windowBackground) {
        document.body.style.setProperty('--window-bg-override', appSettings.windowBackground);
    } else {
        document.body.style.removeProperty('--window-bg-override');
    }

    // Mts new custom theme colors overrides
    if (appSettings.theme === 'mts-new') {
        if (appSettings.textPrimary) document.body.style.setProperty('--theme-text-primary', appSettings.textPrimary);
        else document.body.style.removeProperty('--theme-text-primary');
        
        if (appSettings.accentPrimary) document.body.style.setProperty('--theme-accent-primary', appSettings.accentPrimary);
        else document.body.style.removeProperty('--theme-accent-primary');
        
        if (appSettings.textSecondary) document.body.style.setProperty('--theme-text-secondary', appSettings.textSecondary);
        else document.body.style.removeProperty('--theme-text-secondary');
        
        if (appSettings.borderColor) document.body.style.setProperty('--theme-border-color', appSettings.borderColor);
        else document.body.style.removeProperty('--theme-border-color');
    } else {
        document.body.style.removeProperty('--theme-text-primary');
        document.body.style.removeProperty('--theme-accent-primary');
        document.body.style.removeProperty('--theme-text-secondary');
        document.body.style.removeProperty('--theme-border-color');
    }

    // Light direction configuration
    body.classList.remove('light-top-left', 'light-top-right', 'light-top', 'light-none');
    const lightDir = appSettings.lightDirection || 'top-left';
    body.classList.add(`light-${lightDir}`);
    
    const overlay = document.getElementById('desktop-reflection-overlay');
    if (overlay) {
        if (lightDir === 'top-left') {
            overlay.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 25%, transparent 25.1%, transparent 100%)';
            overlay.style.opacity = '1';
        } else if (lightDir === 'top-right') {
            overlay.style.background = 'linear-gradient(225deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 25%, transparent 25.1%, transparent 100%)';
            overlay.style.opacity = '1';
        } else if (lightDir === 'top') {
            overlay.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 25%, transparent 25.1%, transparent 100%)';
            overlay.style.opacity = '1';
        } else {
            overlay.style.background = 'none';
            overlay.style.opacity = '0';
        }
    }

    // NEW: Apply Opacity Variable
    // Ensure there is a fallback if setting is missing
    const opacity = appSettings.windowOpacity !== undefined ? appSettings.windowOpacity : 0.1;
    document.body.style.setProperty('--window-opacity', opacity);
    document.documentElement.style.setProperty('--window-opacity', opacity);

    // Improved Tint Logic
    if (appSettings.glassTint) {
        const rgb = hexToRgb(appSettings.glassTint);
        if (rgb) {
            document.body.style.setProperty('--glass-tint', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
            document.documentElement.style.setProperty('--glass-tint', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
            
            // Handle Title Text Color
            let titleColor = appSettings.titleColor;
            if (appSettings.autoContrastTitle) {
                if (appSettings.graphicsGlass) {
                    titleColor = getContrastColor(appSettings.glassTint);
                } else {
                    // In non-glass mode, titles are based on the theme's titlebar background.
                    const darkThemes = ['cameron', 'mts-new'];
                    if (darkThemes.includes(appSettings.theme)) {
                        titleColor = getContrastColor('#000000'); // Yields #ffffff
                    } else {
                        titleColor = getContrastColor('#ffffff'); // Yields #000000
                    }
                }
            } else if (titleColor === 'auto') {
                 titleColor = 'var(--theme-text-secondary)';
            }
            
            // We inject a style rule for window title specifically
            // Check if style tag exists
            let styleTag = document.getElementById('dynamic-theme-styles');
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = 'dynamic-theme-styles';
                document.head.appendChild(styleTag);
            }
            styleTag.textContent = `
                .window-header { color: ${titleColor} !important; }
                .window-controls button { color: ${titleColor} !important; }
                .mobile-app-header { color: ${titleColor} !important; }
                .mobile-app-back-btn, .mobile-app-close-btn { color: ${titleColor} !important; }
                #mobile-top-bar { color: ${titleColor} !important; }
                #mobile-sidebar { color: ${titleColor} !important; }
            `;
        }
    }
    
    const wallpaperCanvas = document.getElementById('fancy-wallpaper-canvas');
    switch(appSettings.wallpaper) {
        case 'glassy-gradient':
            desktop.style.background = 'radial-gradient(ellipse at top left, #2b4c7e 0%, #152238 60%, #0a0f1d 100%)';
            break;
        case 'ocean':
            desktop.style.background = 'radial-gradient(circle at 80% 80%, #a2d2ff 0%, #3a86ff 50%, #003566 100%)';
            break;
        case 'solid':
            desktop.style.background = '#4a5759';
            break;
        case 'sunset':
            desktop.style.background = 'linear-gradient(to top, #f3904f, #3b4371)';
            break;
        case 'forest':
            desktop.style.background = 'linear-gradient(to bottom, #134e5e, #71b280)';
            break;
        case 'nebula':
            desktop.style.background = 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)';
            break;
        case 'custom':
            if (appSettings.wallpaperCustom) {
                if (appSettings.wallpaperCustom.startsWith('data:image')) {
                    desktop.style.background = `url(${appSettings.wallpaperCustom})`;
                    desktop.style.backgroundSize = 'cover';
                    desktop.style.backgroundPosition = 'center';
                } else {
                    desktop.style.background = appSettings.wallpaperCustom;
                }
            } else {
                desktop.style.background = 'radial-gradient(circle at center, #000030 0%, #00000e 100%)';
            }
            break;
        case 'default':
        default:
            desktop.style.background = 'radial-gradient(circle at center, #000030 0%, #00000e 100%)';
            break;
    }

    const taskbar = document.querySelector('.taskbar');
    const container = document.getElementById('desktop-icon-container');
    
    taskbar.className = 'taskbar';
    container.style.top = ''; container.style.left = ''; container.style.width = ''; container.style.height = '';
    body.classList.remove('taskbar-top', 'taskbar-left', 'taskbar-bottom', 'taskbar-autohide'); 
    
    taskbar.classList.add(`taskbar-${appSettings.taskbarPosition}`);
    body.classList.add(`taskbar-${appSettings.taskbarPosition}`); 
    
    if (appSettings.taskbarAutohide) {
        body.classList.add('taskbar-autohide');
    }
    
    // Update icons size
    const iconContainers = [container, document.getElementById('mobile-icon-pages')];
    iconContainers.forEach(cont => {
        if (!cont) return;
        cont.classList.remove('icon-size-small', 'icon-size-medium', 'icon-size-large');
        cont.classList.add(`icon-size-${appSettings.iconSize}`);
    });

    // Refresh UI rendering for pagination/grid changes
    if (isMobile()) {
        renderMobileIcons();
    } else {
        renderDesktopIcons(); // Also re-render desktop to handle pagination updates
    }
    
    // Update taskbar items style based on mode
    document.querySelectorAll('.task-item').forEach(item => {
        // Force re-render of text/style
        const title = item.getAttribute('title') || item.textContent;
        if (appSettings.taskbarMode === 'compact') {
            item.textContent = ''; // Clear text
            item.title = title; // Add tooltip
            item.style.width = '40px'; // Square-ish
            item.style.justifyContent = 'center';
        } else {
            item.textContent = title; // Restore text
            item.removeAttribute('title');
            item.style.width = ''; // Reset width
            item.style.justifyContent = '';
        }
    });
}

let fancyWallpaper = {
    scene: null, camera: null, renderer: null, cube: null,
    animationFrameId: null, container: null, onMouseMove: null, onWindowResize: null
};

function initFancyWallpaper() {
    if (fancyWallpaper.renderer || !appSettings.graphics3d) return; 

    fancyWallpaper.container = document.getElementById('fancy-wallpaper-canvas');
    if (!fancyWallpaper.container) return;
    
    fancyWallpaper.container.classList.add('visible');
    fancyWallpaper.container.style.zIndex = '0';
    fancyWallpaper.scene = new THREE.Scene();
    fancyWallpaper.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    fancyWallpaper.renderer = new THREE.WebGLRenderer({ canvas: fancyWallpaper.container, alpha: true, antialias: true });
    fancyWallpaper.renderer.setSize(window.innerWidth, window.innerHeight);
    fancyWallpaper.renderer.setPixelRatio(window.devicePixelRatio);
    fancyWallpaper.renderer.setClearColor(0x000000, 0); 

    // Create multi-color materials for the cube
    const materials = [
        new THREE.MeshBasicMaterial({ color: 0xff4757 }), // Right: Red
        new THREE.MeshBasicMaterial({ color: 0x2ed573 }), // Left: Green
        new THREE.MeshBasicMaterial({ color: 0x1e90ff }), // Top: Blue
        new THREE.MeshBasicMaterial({ color: 0xffa502 }), // Bottom: Yellow
        new THREE.MeshBasicMaterial({ color: 0xff00ff }), // Front: Pink
        new THREE.MeshBasicMaterial({ color: 0x00ffff })  // Back: Cyan
    ];

    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    fancyWallpaper.cube = new THREE.Mesh(geometry, materials);
    fancyWallpaper.scene.add(fancyWallpaper.cube);

    fancyWallpaper.camera.position.z = 5;

    let mouse = { x: 0, y: 0 };
    fancyWallpaper.onMouseMove = (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', fancyWallpaper.onMouseMove, { passive: true });

    fancyWallpaper.onWindowResize = () => {
        if (!fancyWallpaper.renderer) return;
        fancyWallpaper.camera.aspect = window.innerWidth / window.innerHeight;
        fancyWallpaper.camera.updateProjectionMatrix();
        fancyWallpaper.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', fancyWallpaper.onWindowResize, false);

    const animate = () => {
        fancyWallpaper.animationFrameId = requestAnimationFrame(animate);
        
        if (fancyWallpaper.cube) {
            fancyWallpaper.cube.rotation.x += 0.01;
            fancyWallpaper.cube.rotation.y += 0.015;
            
            const targetX = mouse.x * 3.8;
            const targetY = mouse.y * 2.8;
            
            fancyWallpaper.cube.position.x += (targetX - fancyWallpaper.cube.position.x) * 0.08;
            fancyWallpaper.cube.position.y += (targetY - fancyWallpaper.cube.position.y) * 0.08;
        }
        
        fancyWallpaper.renderer.render(fancyWallpaper.scene, fancyWallpaper.camera);
    };
    animate();
}

function destroyFancyWallpaper() {
    if (fancyWallpaper.animationFrameId) {
        cancelAnimationFrame(fancyWallpaper.animationFrameId);
    }
    if (fancyWallpaper.onMouseMove) {
        window.removeEventListener('mousemove', fancyWallpaper.onMouseMove);
    }
    if (fancyWallpaper.onWindowResize) {
        window.removeEventListener('resize', fancyWallpaper.onWindowResize);
    }
    if (fancyWallpaper.renderer) {
        fancyWallpaper.renderer.dispose();
        fancyWallpaper.renderer = null;
    }
    if (fancyWallpaper.container) {
        fancyWallpaper.container.classList.remove('visible');
    }
    fancyWallpaper = { 
        scene: null, camera: null, renderer: null, cube: null, 
        animationFrameId: null, container: fancyWallpaper.container,
        onMouseMove: null, onWindowResize: null
    };
}

async function initializeDesktop() {
    loadSettings();
    
    let rawDesktopItems = [];

    try {
        const response = await fetch('desktop-items.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        rawDesktopItems = await response.json();
    } catch (e) {
        console.error("Failed to load desktop items:", e);
        openErrorWindow('desktop-items.json', 'Could not load desktop items. ' + e.message);
    }
    
    const filteredDesktopItems = rawDesktopItems;
    
    LOCKED_FOLDER = {
        name: "Wackycom media vault",
        type: "locked_folder",
        class: "locked-folder",
        password: "wackycom600",
        contents: [
            { "name": "Bliss_(Windows_XP).png", "type": "file", "class": "image" },
            { "name": "Caligula.webm", "type": "file", "class": "video" },
            { "name": "Grain (1).mp3", "type": "file", "class": "audio" },
            { "name": "Really joke m.mp3", "type": "file", "class": "audio" },
            { "name": "Your'e Note Reale.mp3", "type": "file", "class": "audio" },
            { "name": "craft.mp4", "type": "file", "class": "video" },
            { "name": "gONEW.mp3", "type": "file", "class": "audio" },
            { "name": "minecraft.ogg", "type": "file", "class": "audio" },
            { "name": "smile sower.ogg", "type": "file", "class": "audio" },
            { "name": "sunflowers_puresky_4k.hdr", "type": "file", "class": "image" },
            { "name": "the brown lane.ogg", "type": "file", "class": "audio" },
        ]
    };

    const systemApps = [
        { name: 'Calculator', type: 'system_app', class: 'webapp-computer', action: 'openCalculator' },
        { name: 'Clock', type: 'system_app', class: 'webapp-globe', action: 'openClock' },
        { name: 'About', type: 'system_app', class: 'webapp-about', action: 'openAbout' },
        { name: 'Notepad', type: 'system_app', class: 'webapp-notepad', action: 'openNotepad' },
        { name: 'Settings', type: 'system_app', class: 'webapp-settings', action: 'openSettings' },
        { name: 'Browser', type: 'system_app', class: 'webapp-browser', action: 'openBrowser' },
        { name: 'File Explorer', type: 'system_app', class: 'webapp-explorer', action: 'openExplorer' },
        { name: 'Terminal', type: 'system_app', class: 'webapp-terminal', action: 'openTerminal' },
        { name: 'Theme studio', type: 'system_app', class: 'webapp-themes', action: 'openThemeApp' },
        { name: 'Video Player', type: 'system_app', class: 'webapp-browser', action: 'openVideoPlayer' }, 
    ];

    desktopItems = [...filteredDesktopItems, LOCKED_FOLDER, ...systemApps, ...customDesktopItems];

    renderUI();
    setupStartMenu(); 
    setupMobileControls(); 

    setupGlobalDragSelect();
    setupMobileGestures();
    
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('button, .icon, .menu-item, .task-item, .sidebar-button, .dot, .start-button')) {
            playUISound('click');
        }
    }, true); 

    // Play startup chime on first user interaction
    const playStartupOnFirstClick = () => {
        playUISound('startup');
        document.removeEventListener('click', playStartupOnFirstClick, true);
    };
    document.addEventListener('click', playStartupOnFirstClick, true);
}

let synthAudioContext = null;
let synthMasterGain = null;

function getSynthAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    
    if (!synthAudioContext) {
        try {
            synthAudioContext = new AudioContextClass();
            synthMasterGain = synthAudioContext.createGain();
            synthMasterGain.connect(synthAudioContext.destination);
        } catch (e) {
            console.error("Failed to initialize synth AudioContext:", e);
            return null;
        }
    }
    
    if (synthAudioContext.state === 'suspended') {
        synthAudioContext.resume().catch(e => console.warn("Failed to resume AudioContext:", e));
    }
    
    const volume = appSettings.uiSounds.volume !== undefined ? appSettings.uiSounds.volume : 0.5;
    if (synthMasterGain) {
        synthMasterGain.gain.setValueAtTime(volume, synthAudioContext.currentTime);
    }
    
    return synthAudioContext;
}

function playSynthSound(type) {
    if (!appSettings.uiSounds || !appSettings.uiSounds.enabled) return;
    try {
        const ctx = getSynthAudioContext();
        if (!ctx || !synthMasterGain) return;

        const now = ctx.currentTime;

        if (type === 'click') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            
            osc.connect(gain);
            gain.connect(synthMasterGain);
            osc.start(now);
            osc.stop(now + 0.05);

            setTimeout(() => {
                try {
                    osc.disconnect();
                    gain.disconnect();
                } catch (e) {}
            }, 100);
        } else if (type === 'windowOpen') {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.05);
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.05 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);
                
                osc.connect(gain);
                gain.connect(synthMasterGain);
                osc.start(now + idx * 0.05);
                osc.stop(now + idx * 0.05 + 0.2);

                setTimeout(() => {
                    try {
                        osc.disconnect();
                        gain.disconnect();
                    } catch (e) {}
                }, (idx * 0.05 + 0.2) * 1000 + 100);
            });
        } else if (type === 'windowClose') {
            const notes = [1046.50, 783.99, 659.25, 523.25]; // C6, G5, E5, C5
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.04);
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.04 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.18);
                
                osc.connect(gain);
                gain.connect(synthMasterGain);
                osc.start(now + idx * 0.04);
                osc.stop(now + idx * 0.04 + 0.18);

                setTimeout(() => {
                    try {
                        osc.disconnect();
                        gain.disconnect();
                    } catch (e) {}
                }, (idx * 0.04 + 0.18) * 1000 + 100);
            });
        } else if (type === 'error') {
            const freqs = [150, 153];
            freqs.forEach(freq => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now);
                
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(600, now);
                filter.frequency.exponentialRampToValueAtTime(200, now + 0.35);
                
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(synthMasterGain);
                osc.start(now);
                osc.stop(now + 0.4);

                setTimeout(() => {
                    try {
                        osc.disconnect();
                        filter.disconnect();
                        gain.disconnect();
                    } catch (e) {}
                }, 500);
            });
        } else if (type === 'startup') {
            const freqs = [164.81, 246.94, 329.63, 440.00, 493.88, 659.25]; // E3, B3, E4, A4, B4, E5
            const startTimes = [0, 0.1, 0.2, 0.35, 0.5, 0.65];
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + startTimes[idx]);
                
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.1, now + startTimes[idx] + 0.5);
                gain.gain.exponentialRampToValueAtTime(0.001, now + startTimes[idx] + 2.0);
                
                osc.connect(gain);
                gain.connect(synthMasterGain);
                osc.start(now + startTimes[idx]);
                osc.stop(now + startTimes[idx] + 2.0);

                setTimeout(() => {
                    try {
                        osc.disconnect();
                        gain.disconnect();
                    } catch (e) {}
                }, (startTimes[idx] + 2.0) * 1000 + 100);
            });
        }
    } catch (e) {
        console.error("Synthesizer error:", e);
    }
}

function playUISound(soundName) {
    if (!appSettings.uiSounds.enabled) return;
    
    const url = appSettings.uiSounds[soundName];
    if (!url) {
        playSynthSound(soundName);
        return;
    }
    
    try {
        let audio = audioCache[soundName];
        if (audio) {
            audio.currentTime = 0;
            audio.volume = appSettings.uiSounds.volume;
            audio.play().catch(e => {
                console.warn(`Audio play failed for '${soundName}'. Falling back to synth.`, e.message);
                playSynthSound(soundName);
            });
        } else {
            playSynthSound(soundName);
        }
    } catch (e) {
        console.error(`Error playing sound '${soundName}':`, e);
        playSynthSound(soundName);
    }
}

function preloadUISounds() {
    if (!appSettings.uiSounds.enabled) return;
    
    const soundsToLoad = ['click', 'windowOpen', 'windowClose', 'error'];
    audioCache = {}; 
    
    soundsToLoad.forEach(soundName => {
        const url = appSettings.uiSounds[soundName];
        if (url) {
            try {
                const audio = new Audio(url);
                audio.preload = 'auto';
                audio.load(); 
                audioCache[soundName] = audio;
            } catch (e) {
                console.error(`Failed to create audio for ${soundName}`, e);
            }
        }
    });
}

window.onload = initializeDesktop;
const resizeObserver = new ResizeObserver(() => {
    if (isMobile()) {
        renderMobileIcons();
    } else {
        // Add debounce to prevent massive lag on resize
        if (window.desktopResizeTimeout) clearTimeout(window.desktopResizeTimeout);
        window.desktopResizeTimeout = setTimeout(renderDesktopIcons, 200);
    }
});
resizeObserver.observe(document.body);