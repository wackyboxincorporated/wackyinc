// Get the canvas and its 2D rendering context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game dimensions (matching Pygame's SCREEN_WIDTH/HEIGHT)
const SCREEN_WIDTH = 640;
const SCREEN_HEIGHT = 480;
canvas.width = SCREEN_WIDTH;
canvas.height = SCREEN_HEIGHT;

// Game constants
const TILE_SIZE = 32;
const GRAVITY = 0.5;
const PLAYER_SPEED = 4;
const JUMP_FORCE = -12; // Negative because Y-axis goes down

// Colors (JavaScript equivalent, often using hex or rgba)
const WHITE = 'rgb(255, 255, 255)';
const BLACK = 'rgb(0, 0, 0)';
const GREEN = 'rgb(0, 255, 0)';
const DARK_GREEN = 'rgb(0, 128, 0)';
const BLUE = 'rgb(0, 0, 128)';
const LIGHT_BLUE = 'rgb(0, 0, 160)';
const RED = 'rgb(255, 0, 0)';
const GOLD = 'rgb(255, 215, 0)';
const YELLOW = 'rgb(255, 255, 0)';
const GREY = 'rgb(192, 192, 192)';
const DARK_GREY = 'rgb(128, 128, 128)';
const TEAL = 'rgb(0, 128, 128)';
const BROWN = 'rgb(139, 69, 19)';
const PEACH = 'rgb(255, 218, 185)';

// Player object
const player = {
    x: TILE_SIZE * 2,
    y: SCREEN_HEIGHT - TILE_SIZE * 3,
    width: TILE_SIZE * 0.8,
    height: TILE_SIZE * 1.4,
    vx: 0,
    vy: 0,
    onGround: false,
    color: 'rgb(58, 95, 205)', // Merlin's robe blue
    hatColor: 'rgb(39, 64, 139)', // Darker blue for hat
    faceColor: PEACH,
    lives: 3,
    score: 0,
    invincible_timer: 0,
};

// Game state
let gameState = 'MENU';
let currentLevelIndex = 0;

// Keyboard input state
const keys = {
    left: false,
    right: false,
    up: false
};

// Message Overlay content
let messageTitleText = "";
let messageBodyText = "";
let messagePromptText = "";

// --- Level Definitions (Translated from Python) ---
const levelDefinitions = [
    { // Level 0: MS-DOS Prompt
        name: "MS-DOS Prompt",
        bgColor: BLACK,
        platformColor: GREEN,
        platformBorderColor: DARK_GREEN,
        textColor: GREEN,
        goalText: "Reach the Floppy Disk!",
        tiles: [
            "                    ",
            "                    ",
            "   BBBB             ",
            "                    ",
            "         BBBB       ",
            "                    ",
            " P                  ",
            "GGGGGGGGGGGGGGGGGGGG",
            "G                  G",
            "G  BBBB    O       G",
            "G                  G",
            "G      GGGG   E    G",
            "G                  G",
            "G O                G",
            "GGGGGGGGGGGGGGGGGGGG"
        ],
        themeObjects: [
            { type: 'text', content: 'C:\\>', x: 1, y: 1, color: GREEN, font: '16px "Press Start 2P", monospace' },
            { type: 'text', content: 'VER', x: 1, y: 13, color: GREEN, font: '16px "Press Start 2P", monospace' }
        ]
    },
    { // Level 1: Windows 3.1 - FIXED PATH TO EXIT
        name: "Windows 3.1 - Program Manager",
        bgColor: GREY,
        platformColor: BLUE,
        platformBorderColor: WHITE,
        textColor: BLACK,
        goalText: "Find the File Manager!",
        tiles: [
            "BBBBBBBBBBBBBBBBBBBB",
            "B P                B",
            "B    CCCC          B",
            "B  BBBBBB          B",
            "B                  B",
            "B          BBBB    B",
            "B                  B",
            "B  BBBB            B",
            "B                  B",
            "B O      BBBBBB    B",
            "B                  B",
            "B                  B",
            "B    BBBBBB     E  ",
            "B                  B",
            "BBBBBBBBBBBBBBBBBBBB"
        ],
        themeObjects: [
            { type: 'rect', x: 5, y: 5, w: 2, h: 1, color: BLUE, borderColor: WHITE, text: 'App', textColor: WHITE, font: '12px "Press Start 2P", monospace' },
            { type: 'rect', x: 12, y: 8, w: 3, h: 1, color: BLUE, borderColor: WHITE, text: 'Util', textColor: WHITE, font: '12px "Press Start 2P", monospace' }
        ]
    },
    { // Level 2: Windows 95
        name: "Windows 95 - The Start!",
        bgColor: TEAL,
        platformColor: GREY,
        platformBorderColor: DARK_GREY,
        textColor: WHITE,
        goalText: "Hit the Start Button!",
        tiles: [
            "                    ",
            "   BBBB             ",
            " P C                ",
            "GGGGGGGGGGGGGGGGGGGG",
            "G                  G",
            "G  BBBB    BBBB    G",
            "G                  G",
            "G        O         G",
            "G  BBBB    BBBB    G",
            "G                  G",
            "GGGGGGGGGGGGGGGGGGGG",
            "                    ",
            "        BBBB        ",
            "                   E",
            "GGGGGGGGGGGGGGGGGGGG"
        ],
        themeObjects: [
            { type: 'text', content: 'My Computer', x: 1, y: 1, color: WHITE, font: '12px "Press Start 2P", monospace' },
            { type: 'text', content: 'Recycle Bin', x: 15, y: 1, color: WHITE, font: '12px "Press Start 2P", monospace' }
        ]
    },
    // ... Placeholder levels (copied from Python)
    { name: "Windows 98", tiles: [], bgColor: 'rgb(100,100,150)', platformColor: GREY, platformBorderColor: DARK_GREY, textColor: BLACK, goalText: "Find the Internet Explorer!" },
    { name: "Windows ME", tiles: [], bgColor: 'rgb(150,150,150)', platformColor: GREY, platformBorderColor: DARK_GREY, textColor: BLACK, goalText: "Avoid the crashes!" },
    { name: "Windows XP", tiles: [], bgColor: 'rgb(50, 100, 200)', platformColor: GREY, platformBorderColor: DARK_GREY, textColor: BLACK, goalText: "Find the Bliss!" },
    { name: "Windows Vista", tiles: [], bgColor: 'rgb(100, 120, 180)', platformColor: GREY, platformBorderColor: DARK_GREY, textColor: BLACK, goalText: "Navigate the UAC!" },
    { name: "Windows 7", tiles: [], bgColor: 'rgb(80, 140, 220)', platformColor: GREY, platformBorderColor: DARK_GREY, textColor: BLACK, goalText: "Simplify your life!" },
    { name: "Windows 8", tiles: [], bgColor: 'rgb(0, 120, 215)', platformColor: GREY, platformBorderColor: DARK_GREY, textColor: WHITE, goalText: "Swipe to win!" },
    { name: "Windows 10", tiles: [], bgColor: 'rgb(0, 188, 242)', platformColor: GREY, platformBorderColor: DARK_GREY, textColor: BLACK, goalText: "Update or perish!" },
    { name: "Windows 11", tiles: [], bgColor: 'rgb(0, 100, 150)', platformColor: GREY, platformBorderColor: DARK_GREY, textColor: WHITE, goalText: "Center yourself!" },
    { name: "The Cloud", tiles: [], bgColor: 'rgb(150, 200, 255)', platformColor: GREY, platformBorderColor: DARK_GREY, textColor: BLACK, goalText: "Float to data!" },
    { name: "Mobile Age", tiles: [], bgColor: 'rgb(50, 50, 50)', platformColor: GREY, platformBorderColor: DARK_GREY, textColor: WHITE, goalText: "Tap and scroll!" },
    { name: "AI & Future", tiles: [], bgColor: 'rgb(0, 0, 0)', platformColor: 'rgb(50,200,50)', platformBorderColor: 'rgb(20,100,20)', textColor: 'rgb(0,255,0)', goalText: "Achieve singularity!" },
    { name: "Reality Check (End)", tiles: [], bgColor: 'rgb(200, 200, 200)', platformColor: GREY, platformBorderColor: DARK_GREY, textColor: BLACK, goalText: "Back to the real world!" }
];

// Populate placeholder levels
function createPlaceholderLevel() {
    const placeholder = [];
    const numRows = Math.floor(SCREEN_HEIGHT / TILE_SIZE);
    const numCols = Math.floor(SCREEN_WIDTH / TILE_SIZE);
    for (let r = 0; r < numRows; r++) {
        let rowStr = "";
        for (let c = 0; c < numCols; c++) {
            if (r === 0 || r === numRows - 1 || c === 0 || c === numCols - 1) {
                rowStr += "G";
            } else if (r === numRows - 2 && c === 2) {
                rowStr += "P";
            } else if (r === 2 && c === numCols - 3) {
                rowStr += "E";
            } else {
                rowStr += " ";
            }
        }
        placeholder.push(rowStr);
    }
    return placeholder;
}

for (let i = 3; i < levelDefinitions.length; i++) { // Start from Windows 98
    levelDefinitions[i].tiles = createPlaceholderLevel();
}

let currentLevelData = {};
let currentTiles = [];
let collectibles = [];
let lastTick = 0; // For blinking effects

function loadLevel(levelIndex) {
    if (levelIndex >= levelDefinitions.length) {
        gameState = 'GAME_WON';
        return;
    }

    currentLevelIndex = levelIndex;
    currentLevelData = levelDefinitions[levelIndex];
    // Convert string rows to arrays of characters for easier access
    currentTiles = currentLevelData.tiles.map(row => row.split(''));
    collectibles = []; // Reset collectibles

    // Find player start position 'P' and collectibles 'C'
    let playerPlaced = false;
    for (let r = 0; r < currentTiles.length; r++) {
        for (let c = 0; c < currentTiles[r].length; c++) {
            if (currentTiles[r][c] === 'P') {
                player.x = c * TILE_SIZE + (TILE_SIZE - player.width) / 2;
                player.y = r * TILE_SIZE + (TILE_SIZE - player.height);
                player.vx = 0;
                player.vy = 0;
                player.onGround = false;
                playerPlaced = true;
            } else if (currentTiles[r][c] === 'C') {
                let collectibleType = 'generic';
                if (currentLevelData.name.includes("Windows 3.1")) {
                    collectibleType = 'icon';
                } else if (currentLevelData.name.includes("Windows 95")) {
                    collectibleType = 'solitaire';
                }
                collectibles.push({
                    x: c * TILE_SIZE,
                    y: r * TILE_SIZE,
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    collected: false,
                    type: collectibleType
                });
            }
        }
    }
    if (!playerPlaced) { // Default placement if 'P' not found
        player.x = TILE_SIZE * 2;
        player.y = SCREEN_HEIGHT - TILE_SIZE * 3;
    }

    gameState = 'PLAYING';
    // No music equivalent for direct browser console for now
    // playMusic(); // Placeholder
}

function drawPlayer() {
    // Apply flicker effect if invincible
    if (player.invincible_timer > 0) {
        if (Math.floor(Date.now() / 100) % 2 === 0) { // Blink every 100ms
            return; // Don't draw if invisible for flicker
        }
    }

    const base_x = player.x;
    const base_y = player.y;
    const merlin_width = player.width;
    const merlin_height = player.height;

    // Robe
    ctx.fillStyle = player.color;
    ctx.fillRect(base_x, base_y + merlin_height * 0.3, merlin_width, merlin_height * 0.7);

    // Hat
    ctx.fillStyle = player.hatColor;
    ctx.beginPath();
    ctx.moveTo(base_x + merlin_width * 0.5, base_y); // Tip of hat
    ctx.lineTo(base_x, base_y + merlin_height * 0.4);
    ctx.lineTo(base_x + merlin_width, base_y + merlin_height * 0.4);
    ctx.closePath();
    ctx.fill();

    // Face
    ctx.fillStyle = player.faceColor;
    ctx.fillRect(base_x + merlin_width * 0.25, base_y + merlin_height * 0.2, merlin_width * 0.5, merlin_height * 0.15);

    // Staff (simple line)
    ctx.strokeStyle = BROWN;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(base_x + merlin_width * 0.9, base_y + merlin_height * 0.3);
    ctx.lineTo(base_x + merlin_width * 0.9, base_y + merlin_height * 0.9);
    ctx.stroke();
}

function lightenColor(color, amount) {
    const rgb = color.match(/\d+/g).map(Number);
    return `rgb(${Math.min(255, rgb[0] + amount)}, ${Math.min(255, rgb[1] + amount)}, ${Math.min(255, rgb[2] + amount)})`;
}

function darkenColor(color, amount) {
    const rgb = color.match(/\d+/g).map(Number);
    return `rgb(${Math.max(0, rgb[0] - amount)}, ${Math.max(0, rgb[1] - amount)}, ${Math.max(0, rgb[2] - amount)})`;
}

function drawLevel() {
    ctx.fillStyle = currentLevelData.bgColor || BLACK;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Draw theme objects (background elements)
    if (currentLevelData.themeObjects) {
        currentLevelData.themeObjects.forEach(obj => {
            if (obj.type === 'text') {
                ctx.font = obj.font;
                ctx.fillStyle = obj.color;
                // Measure text for proper positioning, though Pygame's rect logic was simpler
                const textMetrics = ctx.measureText(obj.content);
                const textHeight = parseInt(obj.font.match(/\d+/)[0], 10); // Extract font size
                ctx.fillText(obj.content, obj.x * TILE_SIZE, obj.y * TILE_SIZE + TILE_SIZE * 0.8 - textHeight * 0.7); // Approximation
            } else if (obj.type === 'rect') {
                ctx.fillStyle = obj.color;
                ctx.fillRect(obj.x * TILE_SIZE, obj.y * TILE_SIZE, obj.w * TILE_SIZE, obj.h * TILE_SIZE);
                if (obj.borderColor) {
                    ctx.strokeStyle = obj.borderColor;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(obj.x * TILE_SIZE, obj.y * TILE_SIZE, obj.w * TILE_SIZE, obj.h * TILE_SIZE);
                }
                if (obj.text) {
                    ctx.font = obj.font;
                    ctx.fillStyle = obj.textColor;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(obj.text, (obj.x + obj.w / 2) * TILE_SIZE, (obj.y + obj.h / 2 + 0.1) * TILE_SIZE);
                    ctx.textAlign = 'left'; // Reset
                    ctx.textBaseline = 'alphabetic'; // Reset
                }
            }
        });
    }

    for (let r = 0; r < currentTiles.length; r++) {
        for (let c = 0; c < currentTiles[r].length; c++) {
            const tile = currentTiles[r][c];
            const tile_x = c * TILE_SIZE;
            const tile_y = r * TILE_SIZE;

            if (tile === 'G' || tile === 'B') {
                ctx.fillStyle = currentLevelData.platformColor || 'rgb(136, 136, 136)';
                ctx.fillRect(tile_x, tile_y, TILE_SIZE, TILE_SIZE);
                if (currentLevelData.platformBorderColor) {
                    ctx.strokeStyle = currentLevelData.platformBorderColor;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(tile_x, tile_y, TILE_SIZE, TILE_SIZE);
                }
                // Simple 3D effect for 'B' blocks
                if (tile === 'B' && currentLevelData.platformBorderColor) {
                    ctx.fillStyle = lightenColor(currentLevelData.platformColor, 20);
                    ctx.fillRect(tile_x + 2, tile_y + 2, TILE_SIZE - 4, 2);
                    ctx.fillStyle = darkenColor(currentLevelData.platformColor, 20);
                    ctx.fillRect(tile_x + 2, tile_y + TILE_SIZE - 4, TILE_SIZE - 4, 2);
                }

            } else if (tile === 'E') {
                if (currentLevelData.name.includes("MS-DOS")) {
                    drawFloppyDisk(ctx, tile_x, tile_y);
                } else if (currentLevelData.name.includes("Windows 3.1")) {
                    drawFileManagerIcon(ctx, tile_x, tile_y);
                } else if (currentLevelData.name.includes("Windows 95")) {
                    drawStartButton(ctx, tile_x, tile_y);
                } else {
                    ctx.fillStyle = GOLD;
                    ctx.fillRect(tile_x, tile_y, TILE_SIZE, TILE_SIZE);
                    ctx.font = '16px "Press Start 2P", monospace';
                    ctx.fillStyle = BLACK;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText("E", tile_x + TILE_SIZE / 2, tile_y + TILE_SIZE * 0.75);
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'alphabetic';
                }

            } else if (tile === 'O') {
                if (currentLevelData.name.includes("MS-DOS")) {
                    if (Math.floor(Date.now() / 500) % 2 === 0) { // Blink
                        ctx.fillStyle = currentLevelData.textColor;
                        ctx.fillRect(tile_x, tile_y + TILE_SIZE * 0.8, TILE_SIZE, TILE_SIZE * 0.2);
                    }
                } else {
                    ctx.fillStyle = RED;
                    ctx.fillRect(tile_x + TILE_SIZE * 0.2, tile_y + TILE_SIZE * 0.2, TILE_SIZE * 0.6, TILE_SIZE * 0.6);
                    ctx.font = '16px "Press Start 2P", monospace';
                    ctx.fillStyle = WHITE;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText("!", tile_x + TILE_SIZE / 2, tile_y + TILE_SIZE * 0.75);
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'alphabetic';
                }
            }
        }
    }

    // Draw collectibles
    collectibles.forEach(collectible => {
        if (!collectible.collected) {
            if (collectible.type === 'icon') {
                drawProgmanIcon(ctx, collectible.x, collectible.y);
            } else if (collectible.type === 'solitaire') {
                drawSolitaireCard(ctx, collectible.x, collectible.y);
            } else {
                ctx.fillStyle = YELLOW;
                ctx.beginPath();
                ctx.arc(collectible.x + TILE_SIZE / 2, collectible.y + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });
}

// Helper drawing functions for themed items (Canvas API)
function drawFloppyDisk(ctx, x, y) {
    ctx.fillStyle = 'rgb(85, 85, 221)';
    ctx.fillRect(x + TILE_SIZE * 0.1, y + TILE_SIZE * 0.1, TILE_SIZE * 0.8, TILE_SIZE * 0.8);
    ctx.fillStyle = 'rgb(204, 204, 204)';
    ctx.fillRect(x + TILE_SIZE * 0.2, y + TILE_SIZE * 0.15, TILE_SIZE * 0.4, TILE_SIZE * 0.5);
    ctx.fillStyle = WHITE;
    ctx.fillRect(x + TILE_SIZE * 0.2, y + TILE_SIZE * 0.7, TILE_SIZE * 0.6, TILE_SIZE * 0.15);
}

function drawFileManagerIcon(ctx, x, y) {
    ctx.fillStyle = 'rgb(255, 223, 0)';
    ctx.fillRect(x + TILE_SIZE * 0.1, y + TILE_SIZE * 0.2, TILE_SIZE * 0.8, TILE_SIZE * 0.6);
    ctx.fillStyle = 'rgb(212, 176, 0)';
    ctx.fillRect(x + TILE_SIZE * 0.4, y + TILE_SIZE * 0.1, TILE_SIZE * 0.2, TILE_SIZE * 0.1);
    ctx.fillRect(x + TILE_SIZE * 0.2, y + TILE_SIZE * 0.4, TILE_SIZE * 0.6, TILE_SIZE * 0.05);
}

function drawStartButton(ctx, x, y) {
    ctx.fillStyle = GREY;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    // 3D effect
    ctx.beginPath();
    ctx.moveTo(x, y + TILE_SIZE);
    ctx.lineTo(x, y);
    ctx.lineTo(x + TILE_SIZE, y);
    ctx.lineTo(x + TILE_SIZE - 2, y + 2);
    ctx.lineTo(x + 2, y + 2);
    ctx.lineTo(x + 2, y + TILE_SIZE - 2);
    ctx.closePath();
    ctx.fillStyle = WHITE;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + TILE_SIZE, y);
    ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
    ctx.lineTo(x, y + TILE_SIZE);
    ctx.lineTo(x + 2, y + TILE_SIZE - 2);
    ctx.lineTo(x + TILE_SIZE - 2, y + TILE_SIZE - 2);
    ctx.lineTo(x + TILE_SIZE - 2, y + 2);
    ctx.closePath();
    ctx.fillStyle = DARK_GREY;
    ctx.fill();

    // Windows Flag (simplified)
    const flag_x = x + TILE_SIZE * 0.15;
    const flag_y = y + TILE_SIZE * 0.15;
    const flag_size = TILE_SIZE * 0.2;
    ctx.fillStyle = 'rgb(255, 0, 0)';
    ctx.fillRect(flag_x, flag_y, flag_size, flag_size);
    ctx.fillStyle = 'rgb(0, 255, 0)';
    ctx.fillRect(flag_x + flag_size + 1, flag_y, flag_size, flag_size);
    ctx.fillStyle = 'rgb(0, 0, 255)';
    ctx.fillRect(flag_x, flag_y + flag_size + 1, flag_size, flag_size);
    ctx.fillStyle = YELLOW;
    ctx.fillRect(flag_x + flag_size + 1, flag_y + flag_size + 1, flag_size, flag_size);

    ctx.font = '8px "Press Start 2P", monospace'; // font_pixel_tiny
    ctx.fillStyle = BLACK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText("Start", x + TILE_SIZE * 0.1, y + TILE_SIZE * 0.85);
    ctx.textAlign = 'left'; // Reset
    ctx.textBaseline = 'alphabetic'; // Reset
}

function drawProgmanIcon(ctx, x, y) {
    ctx.fillStyle = 'rgb(0, 0, 160)';
    ctx.fillRect(x + TILE_SIZE * 0.1, y + TILE_SIZE * 0.1, TILE_SIZE * 0.8, TILE_SIZE * 0.8);
    ctx.fillStyle = WHITE;
    ctx.fillRect(x + TILE_SIZE * 0.3, y + TILE_SIZE * 0.3, TILE_SIZE * 0.1, TILE_SIZE * 0.1);
    ctx.fillRect(x + TILE_SIZE * 0.6, y + TILE_SIZE * 0.3, TILE_SIZE * 0.1, TILE_SIZE * 0.1);
    ctx.fillRect(x + TILE_SIZE * 0.3, y + TILE_SIZE * 0.6, TILE_SIZE * 0.1, TILE_SIZE * 0.1);
    ctx.fillRect(x + TILE_SIZE * 0.6, y + TILE_SIZE * 0.6, TILE_SIZE * 0.1, TILE_SIZE * 0.1);
}

function drawSolitaireCard(ctx, x, y) {
    ctx.fillStyle = WHITE;
    ctx.fillRect(x + TILE_SIZE * 0.15, y + TILE_SIZE * 0.1, TILE_SIZE * 0.7, TILE_SIZE * 0.8);
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + TILE_SIZE * 0.15, y + TILE_SIZE * 0.1, TILE_SIZE * 0.7, TILE_SIZE * 0.8);
    
    // Simple red diamond
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.moveTo(x + TILE_SIZE * 0.5, y + TILE_SIZE * 0.3);
    ctx.lineTo(x + TILE_SIZE * 0.6, y + TILE_SIZE * 0.5);
    ctx.lineTo(x + TILE_SIZE * 0.5, y + TILE_SIZE * 0.7);
    ctx.lineTo(x + TILE_SIZE * 0.4, y + TILE_SIZE * 0.5);
    ctx.closePath();
    ctx.fill();
}


function isSolid(tileType) {
    return tileType === 'G' || tileType === 'B';
}

// Helper for AABB (Axis-Aligned Bounding Box) collision detection
function rectsCollide(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function updatePlayer() {
    // Handle invincibility
    if (player.invincible_timer > 0) {
        player.invincible_timer--;
    }

    // Apply horizontal movement based on input
    if (keys.left) {
        player.vx = -PLAYER_SPEED;
    } else if (keys.right) {
        player.vx = PLAYER_SPEED;
    } else {
        player.vx = 0;
    }

    // Apply gravity
    player.vy += GRAVITY;
    player.onGround = false; // Assume not on ground until proven otherwise

    // --- Horizontal Movement and Collision Resolution ---
    player.x += player.vx;
    let playerRect = { x: player.x, y: player.y, width: player.width, height: player.height };

    // Check for horizontal collisions with solid tiles
    for (let r = 0; r < currentTiles.length; r++) {
        for (let c = 0; c < currentTiles[r].length; c++) {
            const tileType = currentTiles[r][c];
            if (isSolid(tileType)) {
                const tileRect = { x: c * TILE_SIZE, y: r * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
                
                if (rectsCollide(playerRect, tileRect)) {
                    if (player.vx < 0) { // Moving left, hit right side of tile
                        player.x = tileRect.x + tileRect.width;
                    } else if (player.vx > 0) { // Moving right, hit left side of tile
                        player.x = tileRect.x - player.width;
                    }
                    player.vx = 0; // Stop horizontal movement
                    playerRect.x = player.x; // Update playerRect's x
                }
            }
        }
    }

    // --- Vertical Movement and Collision Resolution ---
    player.y += player.vy;
    playerRect.y = player.y; // Update playerRect's y

    // Check for vertical collisions with solid tiles
    for (let r = 0; r < currentTiles.length; r++) {
        for (let c = 0; c < currentTiles[r].length; c++) {
            const tileType = currentTiles[r][c];
            if (isSolid(tileType)) {
                const tileRect = { x: c * TILE_SIZE, y: r * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
                
                if (rectsCollide(playerRect, tileRect)) {
                    if (player.vy < 0) { // Moving up, hit bottom of tile
                        player.y = tileRect.y + tileRect.height;
                    } else if (player.vy > 0) { // Moving down, hit top of tile
                        player.y = tileRect.y - player.height;
                        player.onGround = true; // Landed on ground
                    }
                    player.vy = 0; // Stop vertical movement
                    playerRect.y = player.y; // Update playerRect's y
                }
            }
        }
    }

    // --- Boundary Checks (preventing player from going off-screen) ---
    if (player.y + player.height > SCREEN_HEIGHT) {
        player.y = SCREEN_HEIGHT - player.height;
        player.vy = 0;
        player.onGround = true;
        handlePlayerFall();
    }
    if (player.y < 0) {
        player.y = 0;
        player.vy = 0;
    }
    if (player.x < 0) {
        player.x = 0;
    }
    if (player.x + player.width > SCREEN_WIDTH) {
        player.x = SCREEN_WIDTH - player.width;
    }

    // --- Game Logic: Goal, Obstacle, and Collectible Interactions ---
    const goal_tile_x = Math.floor((player.x + player.width / 2) / TILE_SIZE);
    const goal_tile_y = Math.floor((player.y + player.height / 2) / TILE_SIZE);
    
    if (goal_tile_y >= 0 && goal_tile_y < currentTiles.length &&
        goal_tile_x >= 0 && goal_tile_x < currentTiles[0].length) {
        
        if (currentTiles[goal_tile_y][goal_tile_x] === 'E') {
            gameState = 'LEVEL_COMPLETE';
            // playSound('level_complete'); // Placeholder
        }

        if (currentTiles[goal_tile_y][goal_tile_x] === 'O' && player.invincible_timer <= 0) {
            handlePlayerHit();
        }
    }
        
    // Check for collectible collision
    const playerHitbox = { x: player.x, y: player.y, width: player.width, height: player.height };
    const collectiblesToRemove = [];
    collectibles.forEach((collectible, i) => {
        if (!collectible.collected) {
            const collectibleHitbox = { x: collectible.x, y: collectible.y, width: collectible.width, height: collectible.height };
            if (rectsCollide(playerHitbox, collectibleHitbox)) {
                collectiblesToRemove.push(i);
                player.score += 10;
                // playSound('collect'); // Placeholder
            }
        }
    });
    
    // Remove collected items
    collectiblesToRemove.sort((a, b) => b - a).forEach(i => {
        collectibles.splice(i, 1);
    });
}


function handlePlayerFall() {
    if (player.invincible_timer <= 0) {
        player.lives--;
        // playSound('hit'); // Placeholder
        if (player.lives <= 0) {
            gameState = 'GAME_OVER';
        } else {
            loadLevel(currentLevelIndex);
            player.invincible_timer = 120; // 2 seconds of invincibility at 60 FPS
        }
    }
}

function handlePlayerHit() {
    if (player.invincible_timer <= 0) {
        player.lives--;
        // playSound('hit'); // Placeholder
        if (player.lives <= 0) {
            gameState = 'GAME_OVER';
        } else {
            player.invincible_timer = 120; // 2 seconds of invincibility
        }
    }
}

function drawUI() {
    ctx.font = '12px "Press Start 2P", monospace'; // font_pixel_small
    ctx.fillStyle = WHITE;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillText(`Lives: ${player.lives}`, 10, 10);
    ctx.fillText(`Score: ${player.score}`, 10, 30);
    ctx.fillText(`Level: ${currentLevelIndex + 1} - ${currentLevelData.name || 'Unknown'}`, 10, 50);
}


function showMessageOverlay(title, text, prompt = "Press any key to continue") {
    messageTitleText = title;
    messageBodyText = text;
    messagePromptText = prompt;
}

function drawMessageOverlay() {
    // Semi-transparent black background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Calculate text dimensions and positioning for centering
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Render title
    ctx.font = '16px "Press Start 2P", monospace'; // font_pixel
    ctx.fillStyle = WHITE;
    const titleMetrics = ctx.measureText(messageTitleText);
    const titleHeight = 16; // Approximation for font size

    let renderedTextSurfaces = [];
    const textLines = messageBodyText.split('\n');
    textLines.forEach(line => {
        renderedTextSurfaces.push({
            text: line,
            font: '12px "Press Start 2P", monospace', // font_pixel_small
            height: 12 // Approximation for font size
        });
    });

    const promptTextHeight = 12; // Approximation for font size

    const totalTextHeight = renderedTextSurfaces.reduce((sum, s) => sum + s.height + 5, 0) - 5; // 5px line spacing
    const totalContentHeight = titleHeight + 15 + totalTextHeight + 15 + promptTextHeight;

    let currentY = (SCREEN_HEIGHT - totalContentHeight) / 2;

    // Draw title
    ctx.fillText(messageTitleText, SCREEN_WIDTH / 2, currentY + titleHeight / 2);
    currentY += titleHeight + 15; // Gap after title

    // Draw body text
    renderedTextSurfaces.forEach(textObj => {
        ctx.font = textObj.font;
        ctx.fillText(textObj.text, SCREEN_WIDTH / 2, currentY + textObj.height / 2);
        currentY += textObj.height + 5; // Line spacing
    });

    // Draw prompt
    ctx.font = '12px "Press Start 2P", monospace'; // font_pixel_small
    ctx.fillText(messagePromptText, SCREEN_WIDTH / 2, currentY + 15 + promptTextHeight / 2);

    ctx.textAlign = 'left'; // Reset
    ctx.textBaseline = 'alphabetic'; // Reset
}

// --- Game Loop (requestAnimationFrame) ---
let lastFrameTime = 0;
function gameLoop(currentTime) {
    // const deltaTime = currentTime - lastFrameTime; // For frame-rate independent movement if needed
    // lastFrameTime = currentTime;

    if (gameState === 'PLAYING') {
        updatePlayer();
    }

    // Drawing
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT); // Clear canvas
    drawLevel();
    drawPlayer();
    drawUI();

    if (gameState === 'MENU') {
        drawMessageOverlay();
    } else if (gameState === 'LEVEL_COMPLETE') {
        showMessageOverlay(
            `Level ${currentLevelIndex + 1} Complete!`,
            currentLevelData.goalText + `\nScore: ${player.score}`,
            "Press any key for next level"
        );
        drawMessageOverlay();
        // stopMusic(); // Placeholder
    } else if (gameState === 'GAME_OVER') {
        showMessageOverlay(
            "GAME OVER",
            `Merlin failed his journey!\nFinal Score: ${player.score}`,
            "Press any key to restart"
        );
        drawMessageOverlay();
        // stopMusic(); // Placeholder
    } else if (gameState === 'GAME_WON') {
        showMessageOverlay(
            "CONGRATULATIONS!",
            `Merlin has mastered the Windows Ages!\nFinal Score: ${player.score}`,
            "Press any key to play again"
        );
        drawMessageOverlay();
        // stopMusic(); // Placeholder
    }

    requestAnimationFrame(gameLoop); // Request next frame
}

// --- Event Listeners for Input ---
document.addEventListener('keydown', (event) => {
    if (gameState === 'MENU') {
        gameState = 'PLAYING';
        // playMusic(); // Placeholder
    } else if (gameState === 'LEVEL_COMPLETE') {
        currentLevelIndex++;
        loadLevel(currentLevelIndex);
    } else if (gameState === 'GAME_OVER' || gameState === 'GAME_WON') {
        player.lives = 3;
        player.score = 0;
        currentLevelIndex = 0;
        loadLevel(currentLevelIndex);
        gameState = 'MENU';
        showMessageOverlay(
            "Merlin's Windows Journey",
            "Help Merlin navigate through the ages of Windows! \nCollect items and reach the exit to progress.",
            "Press any key to start"
        );
    }

    if (gameState === 'PLAYING') {
        switch (event.key) {
            case 'ArrowLeft':
            case 'a':
                keys.left = true;
                break;
            case 'ArrowRight':
            case 'd':
                keys.right = true;
                break;
            case 'ArrowUp':
            case 'w':
            case ' ': // Spacebar for jump
                if (player.onGround) {
                    player.vy = JUMP_FORCE;
                    player.onGround = false;
                    // playSound('jump'); // Placeholder
                }
                break;
        }
    }
});

document.addEventListener('keyup', (event) => {
    if (gameState === 'PLAYING') {
        switch (event.key) {
            case 'ArrowLeft':
            case 'a':
                keys.left = false;
                break;
            case 'ArrowRight':
            case 'd':
                keys.right = false;
                break;
        }
    }
});

// Load the initial level and start the game loop
loadLevel(currentLevelIndex);
showMessageOverlay(
    "Merlin's Windows Journey",
    "Help Merlin navigate through the ages of Windows! \nCollect items and reach the exit to progress.",
    "Press any key to start"
);
requestAnimationFrame(gameLoop); // Start the loop!
