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
    wallpaper: 'default',
    wallpaperCustom: null, 
    theme: 'light',
    graphics3d: false, 
    graphicsGlass: false, 
    glassTint: '#ffffff', // Store as HEX now for stability
    windowOpacity: 0.6, // NEW: Default opacity
    titleColor: 'auto', // 'auto' or hex
    autoContrastTitle: true,
    taskbarPosition: 'bottom',
    taskbarMode: 'standard', // 'standard' or 'compact'
    iconSize: 'medium',
    alwaysOpenInWindow: false,
    taskbarAutohide: false, 
    uiSounds: { 
        enabled: false,
        volume: 0.5,
        click: '',
        windowOpen: '',
        windowClose: '',
        error: ''
    }
};
const SETTINGS_KEY = 'wackybox_settings_v5'; // Version bumped
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
            appSettings = { ...appSettings, ...JSON.parse(savedSettings) }; 
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

    body.classList.remove('theme-light', 'theme-dark', 'theme-retro', 'theme-neon', 'theme-soft', 'theme-cameron', 'theme-wnt');
    
    // Rename mapping logic
    let themeClass = `theme-${appSettings.theme}`;
    if (appSettings.theme === 'soft') themeClass = 'theme-soft'; // Keep CSS class same, just label changed
    if (appSettings.theme === 'cameron') themeClass = 'theme-soft'; // Use soft CSS for Cameron
    if (appSettings.theme === 'wnt') themeClass = 'theme-retro'; // Use retro CSS for WNT
    
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

    // NEW: Apply Opacity Variable
    // Ensure there is a fallback if setting is missing
    const opacity = appSettings.windowOpacity !== undefined ? appSettings.windowOpacity : 0.6;
    document.documentElement.style.setProperty('--window-opacity', opacity);

    // Improved Tint Logic
    if (appSettings.glassTint) {
        const rgb = hexToRgb(appSettings.glassTint);
        if (rgb) {
            document.documentElement.style.setProperty('--glass-tint', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
            
            // Handle Title Text Color
            let titleColor = appSettings.titleColor;
            if (appSettings.autoContrastTitle) {
                // Logic: If glass mode is on, check tint. If not, check theme (simplified here to just check tint/white)
                if (appSettings.graphicsGlass) {
                    titleColor = getContrastColor(appSettings.glassTint);
                } else {
                    // In non-glass mode, titles are usually based on theme. 
                    // This overrides it if specific.
                    titleColor = getContrastColor('#ffffff'); // Default header bg assumption
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
            styleTag.textContent = `.window-header { color: ${titleColor} !important; } .window-controls button { color: ${titleColor} !important; }`;
        }
    }
    
    const wallpaperCanvas = document.getElementById('fancy-wallpaper-canvas');
    switch(appSettings.wallpaper) {
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
                desktop.style.background = 'radial-gradient(circle at 10% 90%, #6ec25d 0%, #3a8542 50%, #2e7141 100%)';
            }
            break;
        case 'default':
        default:
            desktop.style.background = 'radial-gradient(circle at 10% 90%, #6ec25d 0%, #3a8542 50%, #2e7141 100%)';
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
    scene: null, camera: null, renderer: null, particles: null,
    animationFrameId: null, container: null
};

function initFancyWallpaper() {
    if (fancyWallpaper.renderer || !appSettings.graphics3d) return; 

    fancyWallpaper.container = document.getElementById('fancy-wallpaper-canvas');
    if (!fancyWallpaper.container) return;
    
    fancyWallpaper.container.classList.add('visible');
    fancyWallpaper.container.style.zIndex = '0';
    fancyWallpaper.scene = new THREE.Scene();
    fancyWallpaper.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    fancyWallpaper.renderer = new THREE.WebGLRenderer({ canvas: fancyWallpaper.container, alpha: true });
    fancyWallpaper.renderer.setSize(window.innerWidth, window.innerHeight);
    fancyWallpaper.renderer.setClearColor(0x000000, 0); 

    const particleCount = 5000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const color = new THREE.Color();

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
        
        color.setHSL(Math.random(), 0.7, 0.7);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.75
    });
    
    fancyWallpaper.particles = new THREE.Points(particles, material);
    fancyWallpaper.scene.add(fancyWallpaper.particles);
    fancyWallpaper.camera.position.z = 5;

    const onWindowResize = () => {
        if (!fancyWallpaper.renderer) return;
        fancyWallpaper.camera.aspect = window.innerWidth / window.innerHeight;
        fancyWallpaper.camera.updateProjectionMatrix();
        fancyWallpaper.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize, false);

    const animate = () => {
        fancyWallpaper.animationFrameId = requestAnimationFrame(animate);
        const time = Date.now() * 0.0001;
        fancyWallpaper.particles.rotation.x = time * 0.25;
        fancyWallpaper.particles.rotation.y = time * 0.5;
        fancyWallpaper.renderer.render(fancyWallpaper.scene, fancyWallpaper.camera);
    };
    animate();
}

function destroyFancyWallpaper() {
    if (fancyWallpaper.animationFrameId) {
        cancelAnimationFrame(fancyWallpaper.animationFrameId);
    }
    if (fancyWallpaper.renderer) {
        fancyWallpaper.renderer.dispose();
        fancyWallpaper.renderer.domElement.remove();
        fancyWallpaper.renderer = null;
    }
    if (fancyWallpaper.container) {
        fancyWallpaper.container.classList.remove('visible');
    }
    fancyWallpaper = { scene: null, camera: null, renderer: null, particles: null, animationFrameId: null, container: fancyWallpaper.container };
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
            { "name": "19-4.flac", "type": "file", "class": "audio" },
            { "name": "Confusion.mp3", "type": "file", "class": "audio" },
            { "name": "Grain (1).mp3", "type": "file", "class": "audio" },
            { "name": "dawn comes ever closer.mp3", "type": "file", "class": "audio" },
            { "name": "diamond in your soul.ogg", "type": "file", "class": "audio" },
            { "name": "headlock.ogg", "type": "file", "class": "audio" },
            { "name": "horn.wav", "type": "file", "class": "audio" },
            { "name": "me when i'm an orange.flac", "type": "file", "class": "audio" },
            { "name": "minecraft.ogg", "type": "file", "class": "audio" },
            { "name": "smile sower.ogg", "type": "file", "class": "audio" },
            { "name": "spitting images.ogg", "type": "file", "class": "audio" },
            { "name": "the brown lane.ogg", "type": "file", "class": "audio" },
            { "name": "wii all feel the same.ogg", "type": "file", "class": "audio" },
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
        { name: 'Theme Studio', type: 'system_app', class: 'webapp-themes', action: 'openThemeApp' },
        { name: 'Video Player', type: 'system_app', class: 'webapp-browser', action: 'openVideoPlayer' }, 
    ];

    desktopItems = [...filteredDesktopItems, LOCKED_FOLDER, ...systemApps, ...customDesktopItems];

    renderUI();
    setupStartMenu(); 
    setupMobileControls(); 

    setupGlobalDragSelect();
    setupMobileGestures();
    
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('button, .icon, .menu-item, .task-item, .sidebar-button, .dot')) {
            playUISound('click');
        }
    }, true); 
}

function playUISound(soundName) {
    if (!appSettings.uiSounds.enabled) return;
    
    const url = appSettings.uiSounds[soundName];
    if (!url) return; 
    
    try {
        let audio = audioCache[soundName];
        if (audio) {
            audio.currentTime = 0;
            audio.volume = appSettings.uiSounds.volume;
            audio.play().catch(e => {
                console.warn(`Audio play failed for '${soundName}'.`, e.message);
            });
        }
    } catch (e) {
        console.error(`Error playing sound '${soundName}':`, e);
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