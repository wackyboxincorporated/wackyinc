/**
 * JB32 Engine - Revision 12
 * Integrated 4x anisotropic filtering, updated resolution mapping, and custom biome palettes.
 */

let scene, camera, renderer;
let player, goal, water;
let platforms = [];
let clouds = [];
let materials = {};

let enemies = [];
let projectiles = [];

let camOffsetYaw = 0;
let camOffsetPitch = 0;
let camOffsetYawVelo = 0;
let camOffsetPitchVelo = 0;
let isCameraResetting = false;
let camMovingUp = false, camMovingDown = false, camMovingLeft = false, camMovingRight = false;

let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let isGroundPounding = false;
let isShooting = false;
let isRightMouseDown = false;
let mousePos = new THREE.Vector2(0, 0);
let shadowsEnabled = true;
let motionBlurEnabled = false;

let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

// Physics history for acceleration calculation
let prevVelocity = new THREE.Vector3();
let prevRotationY = 0;

// Soft-body physics state (Harmonic Oscillator)
let scaleVelocity = new THREE.Vector3(0, 0, 0);

// Combat state
let playerHealth = 100;
let gunPitch = 0;
let adjustPitch = 0;
let lastShotTime = 0;
let lastDamageTime = 0;

let currentLevel = 1;
let gameState = 'INIT'; 
let jumpCoyoteTimer = 0;
const COYOTE_TIME = 0.15;
let renderScale = 1.0;
let dirLight;
let deathPlaneY = -15.0;
let playerScore = 0;
let playerLives = 4;
let extraLivesEarned = 0;
let worldSeed = Math.random().toString(36).substring(7);

// Mulberry32 PRNG for deterministic level generation
function xmur3(str) {
    for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 13 | h >>> 19;
    } return function() {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}
function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}
let prng;
function seededRandom() {
    return prng ? prng() : Math.random();
}

const addScore = (amount) => {
    playerScore += amount;
    if (Math.floor(playerScore / 10000) > extraLivesEarned) {
        playerLives++;
        extraLivesEarned++;
    }
};

// User defined track pool (now fetched dynamically)
let tracks = [];
let currentTrackIndex = 0;
let player_audio;
let audioInitialized = false;

const biomes = [
    { sky: 0x87CEEB, ground1: '#1b4332', ground2: '#2d6a4f', plat1: '#2b2b2b', plat2: '#dddddd', water: 0x1ca3ec }, // Plains
    { sky: 0xE08E36, ground1: '#582f0e', ground2: '#7f4f24', plat1: '#3e2723', plat2: '#ffb703', water: 0x228b22 }, // Desert
    { sky: 0xB0E0E6, ground1: '#adb5bd', ground2: '#f8f9fa', plat1: '#003049', plat2: '#e0fbfc', water: 0x00008b }  // Arctic
];

const createProceduralTexture = (type, color1, color2) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (type === 'checker') {
        const grad = ctx.createLinearGradient(0, 0, 256, 256);
        grad.addColorStop(0, color1);
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = color2;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        for (let i = 0; i < 256; i += 64) {
            for (let j = 0; j < 256; j += 64) {
                if ((i / 64 + j / 64) % 2 === 0) {
                    ctx.fillRect(i, j, 64, 64);
                }
            }
        }
        ctx.shadowBlur = 0;
    } else if (type === 'noise') {
        const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 200);
        grad.addColorStop(0, color1);
        grad.addColorStop(1, '#222222');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        
        ctx.fillStyle = color2;
        ctx.beginPath();
        for (let i = 0; i < 4000; i++) {
            const size = Math.random() * 3 + 1;
            ctx.rect(Math.random() * 256, Math.random() * 256, size, size);
        }
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        for (let i = 0; i < 4000; i++) {
            const size = Math.random() * 3 + 1;
            ctx.rect(Math.random() * 256, Math.random() * 256, size, size);
        }
        ctx.fill();
    } else if (type === 'stripe') {
        const grad = ctx.createLinearGradient(0, 0, 256, 0);
        grad.addColorStop(0, color1);
        grad.addColorStop(1, '#111');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = color2;
        ctx.shadowColor = 'rgba(255,255,255,0.2)';
        ctx.shadowBlur = 10;
        for (let i = 0; i < 256; i += 32) ctx.fillRect(i, 0, 16, 256);
        ctx.shadowBlur = 0;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    
    // Extends texture reduction distance 4x for distant geometry rendering
    texture.anisotropy = 4;
    
    return texture;
};

const buildEnvironmentAssets = (biomeIndex) => {
    const b = biomes[biomeIndex];
    
    scene.background = new THREE.Color(b.sky);
    scene.fog.color = new THREE.Color(b.sky);
    
    if (window.blurMaterial) {
        window.blurMaterial.color = new THREE.Color(b.sky);
    }

    materials.ground.map = createProceduralTexture('checker', b.ground1, b.ground2);
    materials.ground.needsUpdate = true;

    materials.platform.map = createProceduralTexture('noise', b.plat1, b.plat2);
    materials.platform.needsUpdate = true;

    materials.water.color = new THREE.Color(b.water);
    materials.water.needsUpdate = true;
};

const createClouds = () => {
    clouds.forEach(c => scene.remove(c));
    clouds = [];

    const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.8 });
    
    for (let i = 0; i < 20; i++) {
        const cloudGroup = new THREE.Group();
        const parts = Math.floor(Math.random() * 3) + 3;
        
        for (let j = 0; j < parts; j++) {
            const size = Math.random() * 2 + 2;
            const geo = new THREE.IcosahedronGeometry(size, 0); 
            const mesh = new THREE.Mesh(geo, cloudMaterial);
            mesh.position.set(Math.random() * 4 - 2, Math.random() * 2 - 1, Math.random() * 4 - 2);
            cloudGroup.add(mesh);
        }

        cloudGroup.position.set(
            Math.random() * 200 - 100,
            Math.random() * 20 + 15, 
            Math.random() * -200 + 50 
        );
        
        scene.add(cloudGroup);
        clouds.push(cloudGroup);
    }
};

const init = () => {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.012);

    camera = new THREE.PerspectiveCamera(70, 1366 / 700, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true }); 
    renderer.setSize(1366, 700, false); 
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    window.blurScene = new THREE.Scene();
    window.blurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    window.blurMaterial = new THREE.MeshBasicMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.3, depthTest: false, depthWrite: false });
    window.blurScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), window.blurMaterial));

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    scene.add(hemiLight);

    dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);
    scene.add(dirLight.target);

    materials.player = new THREE.MeshStandardMaterial({ color: 0xff3366, roughness: 0.2, metalness: 0.1 });
    materials.ground = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    materials.platform = new THREE.MeshStandardMaterial({ roughness: 0.6 });
    materials.goal = new THREE.MeshStandardMaterial({ map: createProceduralTexture('stripe', '#ffd500', '#ffaa00'), roughness: 0.1, metalness: 0.8 });
    materials.water = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.1 });

    const playerGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    playerGeo.translate(0, 0.6, 0); 
    player = new THREE.Mesh(playerGeo, materials.player);
    player.castShadow = true;
    player.receiveShadow = true;
    scene.add(player);

    const goalGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 16);
    goalGeo.translate(0, 0.25, 0);
    goal = new THREE.Mesh(goalGeo, materials.goal);
    goal.castShadow = true;
    goal.receiveShadow = true;
    scene.add(goal);

    const waterGeo = new THREE.PlaneGeometry(1000, 1000);
    water = new THREE.Mesh(waterGeo, materials.water);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -10;
    scene.add(water);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('contextmenu', e => e.preventDefault());

    buildLevel(currentLevel);
    createClouds();
    initAudio();

    document.getElementById('overlay-msg').style.display = 'none';
    document.getElementById('sys-status').innerText = 'Active';
    gameState = 'PLAYING';
    
    animate();
};

const clearLevel = () => {
    platforms.forEach(p => { scene.remove(p.mesh); p.mesh.geometry.dispose(); });
    platforms = [];
    
    enemies.forEach(e => { scene.remove(e.mesh); e.mesh.geometry.dispose(); });
    enemies = [];

    projectiles.forEach(p => { scene.remove(p.mesh); p.mesh.geometry.dispose(); });
    projectiles = [];
};

const buildLevel = (levelIndex) => {
    clearLevel();
    document.getElementById('current-level').innerText = levelIndex;

    const seedGen = xmur3(worldSeed + "_LEVEL_" + levelIndex);
    prng = mulberry32(seedGen());

    const biomeIndex = (levelIndex - 1) % biomes.length;
    buildEnvironmentAssets(biomeIndex);

    const startGeo = new THREE.BoxGeometry(10, 1, 10);
    startGeo.translate(0, 0.5, 0);
    const startPlat = new THREE.Mesh(startGeo, materials.ground);
    startPlat.position.set(0, -1, 0);
    startPlat.receiveShadow = true;
    scene.add(startPlat);
    platforms.push({ mesh: startPlat, type: 'static' });

    player.position.set(0, 5, 0);
    player.rotation.set(0, 0, 0);
    
    velocity.set(0, 0, 0);
    prevVelocity.set(0, 0, 0);
    prevRotationY = 0;
    
    player.scale.set(1, 1, 1);
    scaleVelocity.set(0, 0, 0);

    const difficultyScaling = Math.min(levelIndex * 0.15, 100000000000000000000000000000000000000.0);
    const numPlatforms = 12 + Math.floor(difficultyScaling * 6);
    
    let currentPos = new THREE.Vector3(0, 0, 0);
    let genDir = new THREE.Vector3(0, 0, -1);
    let mustAscend = false;
    
    for (let i = 0; i < numPlatforms; i++) {
        if (i > 1 && seededRandom() < 0.3) {
            const pivotSign = seededRandom() < 0.5 ? 1 : -1;
            genDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), pivotSign * Math.PI / 2);
            genDir.x = Math.round(genDir.x);
            genDir.z = Math.round(genDir.z);
        }

        let overlap = true;
        let attempts = 0;
        let jumpDist;
        
        while (overlap && attempts < 5) {
            overlap = false;
            jumpDist = 3.5 + seededRandom() * 2.5; 
            const clampedJump = Math.min(jumpDist, 6.0); 
            
            const perpDir = new THREE.Vector3(-genDir.z, 0, genDir.x);
            const latOffset = (seededRandom() - 0.5) * clampedJump * 0.7;

            const testPos = currentPos.clone();
            testPos.x += genDir.x * clampedJump + perpDir.x * latOffset;
            testPos.z += genDir.z * clampedJump + perpDir.z * latOffset;
            
            for (let plat of platforms) {
                if (testPos.distanceTo(plat.mesh.position) < 4.0) {
                    overlap = true;
                    currentPos.add(genDir.clone().multiplyScalar(2.0)); 
                    break;
                }
            }
            attempts++;
        }

        const clampedJumpAmount = Math.min(jumpDist, 6.0);
        const perpDirFinal = new THREE.Vector3(-genDir.z, 0, genDir.x);
        const latOffsetFinal = (seededRandom() - 0.5) * clampedJumpAmount * 0.7;

        currentPos.x += genDir.x * clampedJumpAmount + perpDirFinal.x * latOffsetFinal;
        currentPos.z += genDir.z * clampedJumpAmount + perpDirFinal.z * latOffsetFinal;

        let jumpY = 0;
        if (mustAscend) {
            jumpY = (seededRandom() * 1.5); 
            mustAscend = false;
        } else {
            if (seededRandom() < 0.5) {
                jumpY = -(seededRandom() * 10.0);
                mustAscend = true;
            } else {
                jumpY = (seededRandom() * 1.5);
            }
        }
        currentPos.y += jumpY;

        const platSizeX = Math.max(5 - difficultyScaling + (seededRandom() * 2), 2.0);
        const platSizeZ = Math.max(5 - difficultyScaling + (seededRandom() * 2), 2.0);

        const pGeo = new THREE.BoxGeometry(platSizeX, 1, platSizeZ);
        pGeo.translate(0, 0.5, 0); 
        const p = new THREE.Mesh(pGeo, materials.platform);
        p.position.copy(currentPos);
        p.castShadow = true;
        p.receiveShadow = true;
        scene.add(p);

        const randBehav = seededRandom();
        let pType = 'static';
        let moveAxis = seededRandom() < 0.5 ? 'x' : 'z';
        let amplitude = 3.0;

        if (randBehav < (0.1 + difficultyScaling * 0.05)) {
            pType = 'moving';
        } else if (randBehav < (0.2 + difficultyScaling * 0.05)) {
            pType = 'rotating';
        } else if (randBehav < (0.35 + difficultyScaling * 0.05)) {
            pType = 'moving';
            moveAxis = 'y';
            amplitude = 4.0 + seededRandom() * 3.0; 
        }

        platforms.push({ 
            mesh: p, 
            type: pType,
            originX: currentPos.x,
            originY: currentPos.y,
            originZ: currentPos.z,
            timeOffset: seededRandom() * 100,
            moveAxis: moveAxis,
            amplitude: amplitude,
            rotSpeed: (seededRandom() - 0.5) * 2.0
        });

        if (moveAxis === 'y' && pType === 'moving') {
            let startsAtTop = seededRandom() < 0.5;
            if (startsAtTop) {
                currentPos.y -= amplitude;
                platforms[platforms.length - 1].originY = currentPos.y;
                p.position.y = currentPos.y;
                currentPos.y -= amplitude;
            } else {
                currentPos.y += amplitude;
                platforms[platforms.length - 1].originY = currentPos.y;
                p.position.y = currentPos.y;
                currentPos.y += amplitude;
            }
            mustAscend = false;
        }

        if (i > 1 && seededRandom() < (0.2 + difficultyScaling * 0.1)) {
            let slimeGeo = new THREE.SphereGeometry(0.6, 12, 12);
            slimeGeo.translate(0, 0.6, 0); 
            let slimeMat = new THREE.MeshStandardMaterial({ color: seededRandom() * 0xffffff, roughness: 0.4 });
            let slime = new THREE.Mesh(slimeGeo, slimeMat);
            slime.position.copy(currentPos);
            slime.position.y += 1.5;
            scene.add(slime);
            
            enemies.push({
                type: 'slime',
                mesh: slime,
                velocity: new THREE.Vector3(0, 0, 0),
                scaleVelocity: new THREE.Vector3(0, 0, 0),
                onGround: false,
                lastHop: 0
            });
        } else if (i > 2 && seededRandom() < (0.15 + difficultyScaling * 0.1)) {
            let turretGeo = new THREE.BoxGeometry(1, 1.5, 1);
            turretGeo.translate(0, 0.75, 0);
            let turretMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
            let turret = new THREE.Mesh(turretGeo, turretMat);
            turret.position.copy(currentPos);
            turret.position.y += 1.0;
            scene.add(turret);
            
            enemies.push({
                type: 'turret',
                mesh: turret,
                lastShot: 0
            });
        }
    }

    goal.position.set(currentPos.x, currentPos.y + 1, currentPos.z);
    
    let minPlatformY = Infinity;
    platforms.forEach(plat => {
        let bottomMost = plat.originY !== undefined ? plat.originY : plat.mesh.position.y;
        if (plat.type === 'moving' && plat.moveAxis === 'y') bottomMost -= (plat.amplitude || 3.0);
        if (bottomMost < minPlatformY) minPlatformY = bottomMost;
    });
    deathPlaneY = minPlatformY - 15.0;
};

const initAudio = async () => {
    const audioUI = document.getElementById('audio-track');

    if (window.audioSystemReady) {
        try {
            player_audio = new ChiptuneJsPlayer(new ChiptuneJsConfig(-1, 200, 3));
            audioInitialized = true;
            
            audioUI.innerText = 'Fetching soundtracks...';
            let response = await fetch('Soundtrack/');
            let html = await response.text();
            
            // Regex to find href pointing to music files in the directory listing
            const regex = /href="([^"]+\.(?:xm|mod|it|s3m|mptm))"/gi;
            const matches = [...html.matchAll(regex)];
            tracks = matches.map(m => decodeURIComponent(m[1]).replace(/^.*[\\\/]/, ''));
            
            // Fallback for static hosts (like GitHub Pages) that don't support directory listing
            if (tracks.length === 0) {
                try {
                    const jsonResponse = await fetch('Soundtrack/index.json');
                    if (jsonResponse.ok) {
                        tracks = await jsonResponse.json();
                    }
                } catch(e) {
                    console.warn('Fallback to index.json failed', e);
                }
            }
            
            if (tracks.length > 0) {
                playTrack(currentTrackIndex);
            } else {
                audioUI.innerText = 'No tracks found in Soundtrack/';
            }
        } catch (e) {
            audioUI.innerText = 'Engine crashed or fetch failed';
            console.error(e);
        }
    } else {
        audioUI.innerText = 'Engine unlinked';
    }
};

const playTrack = (index) => {
    if (!audioInitialized || tracks.length === 0) return;
    
    const trackName = tracks[index];
    const trackPath = 'Soundtrack/' + trackName;
    const audioUI = document.getElementById('audio-track');
    audioUI.innerText = `Caching ${trackName}...`;
    
    player_audio.load(trackPath, (buffer) => {
        try {
            player_audio.play(buffer);
            audioUI.innerText = trackName;
        } catch(e) {
            audioUI.innerText = 'Playback fault';
            console.error(e);
        }
    });
};

function spawnProjectile(pos, dir, isPlayer) {
    let geo = new THREE.BoxGeometry(0.3, 0.3, 0.8);
    let mat = new THREE.MeshBasicMaterial({ color: isPlayer ? 0x00ff00 : 0xff0000 });
    let mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.lookAt(pos.clone().add(dir));
    scene.add(mesh);
    
    projectiles.push({
        mesh: mesh,
        velocity: dir.multiplyScalar(isPlayer ? 60.0 : 25.0),
        isPlayer: isPlayer,
        life: 0
    });
}

function onKeyDown(event) {
    if (event.code === 'KeyP') {
        if (gameState === 'PLAYING') {
            gameState = 'PAUSED';
            document.getElementById('pause-menu').classList.remove('hidden');
        } else if (gameState === 'PAUSED') {
            gameState = 'PLAYING';
            document.getElementById('pause-menu').classList.add('hidden');
            lastTime = performance.now();
        }
        return;
    }
    
    if (gameState !== 'PLAYING') return;
    switch (event.code) {
        case 'ArrowUp': camMovingUp = true; isCameraResetting = false; break;
        case 'ArrowDown': camMovingDown = true; isCameraResetting = false; break;
        case 'ArrowLeft': camMovingLeft = true; isCameraResetting = false; break;
        case 'ArrowRight': camMovingRight = true; isCameraResetting = false; break;
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Enter': isCameraResetting = true; break;
        case 'Tab': 
            event.preventDefault();
            const panel = document.querySelector('.status-panel');
            if (panel) panel.classList.toggle('hidden');
            break;
        case 'Space': 
            if ((canJump || jumpCoyoteTimer > 0) && !isGroundPounding) { 
                velocity.y = 12.0; 
                canJump = false;
                jumpCoyoteTimer = 0;
                scaleVelocity.y += 25.0;   
                scaleVelocity.x -= 12.0;    
                scaleVelocity.z -= 12.0;
            }
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            if (!canJump && !isGroundPounding) {
                isGroundPounding = true;
                velocity.y = -60.0;
                velocity.x = 0;
                velocity.z = 0;
                
                scaleVelocity.y += 40.0;
                scaleVelocity.x -= 20.0;
                scaleVelocity.z -= 20.0;
            }
            break;
        case 'KeyK': isShooting = true; break;
        case 'KeyQ': adjustPitch = 0.1; break;
        case 'KeyE': adjustPitch = -0.1; break;
        case 'KeyN': 
            if (audioInitialized) {
                currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
                playTrack(currentTrackIndex);
            }
            break;
        case 'BracketLeft':
            renderScale = Math.max(0.1, renderScale - 0.1);
            renderer.setSize(1366 * renderScale, 700 * renderScale, false);
            document.getElementById('res-scale').innerText = renderScale.toFixed(1) + 'x';
            break;
        case 'BracketRight':
            renderScale = Math.min(2.0, renderScale + 0.1);
            renderer.setSize(1366 * renderScale, 700 * renderScale, false);
            document.getElementById('res-scale').innerText = renderScale.toFixed(1) + 'x';
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp': camMovingUp = false; break;
        case 'ArrowDown': camMovingDown = false; break;
        case 'ArrowLeft': camMovingLeft = false; break;
        case 'ArrowRight': camMovingRight = false; break;
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
        case 'KeyK': isShooting = false; break;
        case 'KeyQ': 
        case 'KeyE': adjustPitch = 0; break;
    }
}

function onMouseDown(event) {
    if (gameState !== 'PLAYING') return;
    if (event.button === 2) {
        isRightMouseDown = true;
        const crosshair = document.getElementById('crosshair');
        if (crosshair) crosshair.style.display = 'none';
    } else if (event.button === 0 && !isRightMouseDown) {
        isShooting = true;
    }
}

function onMouseUp(event) {
    if (event.button === 2) {
        isRightMouseDown = false;
        const crosshair = document.getElementById('crosshair');
        if (crosshair) crosshair.style.display = 'block';
    } else if (event.button === 0) {
        isShooting = false;
    }
}

function onMouseMove(event) {
    if (gameState !== 'PLAYING') return;
    
    // For raycasting
    mousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePos.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        crosshair.style.left = event.clientX + 'px';
        crosshair.style.top = event.clientY + 'px';
    }

    if (isRightMouseDown) {
        const dx = event.movementX || 0;
        const dy = event.movementY || 0;
        const camSpeed = 0.005;
        camOffsetYaw -= dx * camSpeed;
        camOffsetPitch -= dy * camSpeed;
        camOffsetPitch = Math.max(-1.2, Math.min(1.2, camOffsetPitch));
        isCameraResetting = false;
    }
}

const updateProjectiles = (delta) => {
    let pBox = new THREE.Box3().setFromObject(player);
    
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let proj = projectiles[i];
        proj.mesh.position.addScaledVector(proj.velocity, delta);
        proj.life += delta;
        
        let projBox = new THREE.Box3().setFromObject(proj.mesh);
        let removed = false;
        
        for (let plat of platforms) {
            let platBox = new THREE.Box3().setFromObject(plat.mesh);
            if (projBox.intersectsBox(platBox)) {
                scene.remove(proj.mesh);
                projectiles.splice(i, 1);
                removed = true;
                break;
            }
        }
        if (removed) continue;
        
        if (proj.isPlayer) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                let enemy = enemies[j];
                let eBox = new THREE.Box3().setFromObject(enemy.mesh);
                if (projBox.intersectsBox(eBox)) {
                    scene.remove(enemy.mesh);
                    enemies.splice(j, 1);
                    scene.remove(proj.mesh);
                    projectiles.splice(i, 1);
                    removed = true;
                    addScore(100);
                    break;
                }
            }
        } else {
            if (projBox.intersectsBox(pBox)) {
                playerHealth -= 15;
                scene.remove(proj.mesh);
                projectiles.splice(i, 1);
                removed = true;
            }
        }
        if (removed) continue;
        
        if (proj.life > 3.0) {
            scene.remove(proj.mesh);
            projectiles.splice(i, 1);
        }
    }
};

const updateEnemies = (delta, time) => {
    let pBox = new THREE.Box3().setFromObject(player);
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        
        if (enemy.type === 'turret') {
            if (enemy.mesh.position.distanceTo(player.position) < 40) {
                enemy.mesh.lookAt(player.position);
                if (time - enemy.lastShot > 2000) {
                    let dir = new THREE.Vector3().subVectors(player.position, enemy.mesh.position).normalize();
                    spawnProjectile(enemy.mesh.position.clone().add(new THREE.Vector3(0, 0.75, 0)).add(dir), dir, false);
                    enemy.lastShot = time;
                }
            }
            continue;
        }

        if (enemy.type === 'slime') {
            enemy.velocity.y -= 30.0 * delta;

            if (enemy.onGround && time - enemy.lastHop > 1500 && enemy.mesh.position.distanceTo(player.position) < 30) {
                enemy.velocity.y = 8.0;
                let dir = new THREE.Vector3().subVectors(player.position, enemy.mesh.position);
                dir.y = 0;
                dir.normalize();
                enemy.velocity.x = dir.x * 6.0;
                enemy.velocity.z = dir.z * 6.0;
                enemy.onGround = false;
                enemy.lastHop = time;
                
                enemy.scaleVelocity.y += 15.0;
                enemy.scaleVelocity.x -= 7.0;
                enemy.scaleVelocity.z -= 7.0;
            }

            enemy.mesh.position.addScaledVector(enemy.velocity, delta);

            enemy.onGround = false;
            let enemyBox = new THREE.Box3().setFromObject(enemy.mesh);
            
            for (let plat of platforms) {
                let platBox = new THREE.Box3().setFromObject(plat.mesh);
                if (enemyBox.intersectsBox(platBox)) {
                    if (enemy.velocity.y < 0 && (enemy.mesh.position.y - enemy.velocity.y * delta) >= platBox.max.y - 0.5) {
                        let impact = Math.abs(enemy.velocity.y);
                        enemy.velocity.y = 0;
                        enemy.mesh.position.y = platBox.max.y; 
                        enemy.onGround = true;
                        
                        if (impact > 5) {
                            enemy.scaleVelocity.y -= impact * 0.8;
                            enemy.scaleVelocity.x += impact * 0.4;
                            enemy.scaleVelocity.z += impact * 0.4;
                        }
                    } else {
                        enemy.velocity.x = 0;
                        enemy.velocity.z = 0;
                    }
                }
            }

            const stiffness = 150.0;
            const damping = 10.0;
            enemy.scaleVelocity.x += (-stiffness * (enemy.mesh.scale.x - 1.0) - damping * enemy.scaleVelocity.x) * delta;
            enemy.scaleVelocity.y += (-stiffness * (enemy.mesh.scale.y - 1.0) - damping * enemy.scaleVelocity.y) * delta;
            enemy.scaleVelocity.z += (-stiffness * (enemy.mesh.scale.z - 1.0) - damping * enemy.scaleVelocity.z) * delta;
            
            enemy.mesh.scale.addScaledVector(enemy.scaleVelocity, delta);

            enemyBox.setFromObject(enemy.mesh);
            
            if (pBox.intersectsBox(enemyBox)) {
                if (isGroundPounding && player.position.y > enemy.mesh.position.y + 0.5) {
                    scene.remove(enemy.mesh);
                    enemies.splice(i, 1);
                    velocity.y = 15.0;
                    isGroundPounding = false;
                    addScore(100);
                    continue;
                } else {
                    if (time - lastDamageTime > 1000) {
                        playerHealth -= 10;
                        lastDamageTime = time;
                    }
                }
            }
            
            if (enemy.mesh.position.y < -20) {
                scene.remove(enemy.mesh);
                enemies.splice(i, 1);
            }
        }
    }
};

const updatePhysics = (delta, time) => {
    const wasOnObject = canJump;

    const moveX = Number(moveRight) - Number(moveLeft);
    const moveZ = Number(moveBackward) - Number(moveForward);

    if (moveX !== 0 || moveZ !== 0) {
        direction.set(moveX, 0, moveZ).normalize();
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), camOffsetYaw);
        
        const targetRotationY = Math.atan2(-direction.x, -direction.z);
        let diff = targetRotationY - player.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        player.rotation.y += diff * 15.0 * delta;
    } else {
        direction.set(0, 0, -1);
        direction.applyEuler(player.rotation);
        direction.normalize();
    }

    gunPitch += adjustPitch * 2.0 * delta;
    gunPitch = Math.max(-Math.PI/3, Math.min(Math.PI/3, gunPitch));

    if (isShooting && time - lastShotTime > 150) {
        let raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mousePos, camera);
        let targetPoint = raycaster.ray.origin.clone().add(raycaster.ray.direction.multiplyScalar(100));
        let spawnPos = player.position.clone().add(new THREE.Vector3(0, 0.6, 0));
        let shootDir = targetPoint.sub(spawnPos).normalize();
        
        spawnProjectile(spawnPos, shootDir, true);
        lastShotTime = time;
    }

    if (!isGroundPounding) {
        velocity.x -= velocity.x * 8.0 * delta;
        velocity.z -= velocity.z * 8.0 * delta;

        const speed = 110.0;
        if (moveX !== 0 || moveZ !== 0) {
            velocity.x += direction.x * speed * delta;
            velocity.z += direction.z * speed * delta;
        }
    }

    velocity.y -= 30.0 * delta;

    player.position.x += velocity.x * delta;
    player.position.y += velocity.y * delta;
    player.position.z += velocity.z * delta;

    let onObject = false;
    
    const playerBox = new THREE.Box3().setFromObject(player);
    playerBox.min.x += 0.1; playerBox.max.x -= 0.1;
    playerBox.min.z += 0.1; playerBox.max.z -= 0.1;

    for (let i = 0; i < platforms.length; i++) {
        const plat = platforms[i];
        
        if (plat.type === 'moving') {
            const amp = plat.amplitude !== undefined ? plat.amplitude : 3.0;
            const offset = Math.sin((time + plat.timeOffset) * 0.002) * amp;
            if (plat.moveAxis === 'x') plat.mesh.position.x = plat.originX + offset;
            else if (plat.moveAxis === 'y') plat.mesh.position.y = plat.originY + offset;
            else plat.mesh.position.z = plat.originZ + offset;
        } else if (plat.type === 'rotating') {
            plat.mesh.rotation.y += plat.rotSpeed * delta;
        }

        const objBox = new THREE.Box3().setFromObject(plat.mesh);

        if (playerBox.intersectsBox(objBox)) {
            if (velocity.y <= 0 && (player.position.y - velocity.y * delta) >= objBox.max.y - 0.5) {
                velocity.y = 0;
                player.position.y = objBox.max.y; 
                onObject = true;

                if (plat.type === 'moving') {
                    const amp = plat.amplitude !== undefined ? plat.amplitude : 3.0;
                    const instVelocity = Math.cos((time + plat.timeOffset) * 0.002) * amp * 0.002 * 1000;
                    if (plat.moveAxis === 'x') player.position.x += instVelocity * delta;
                    else if (plat.moveAxis === 'y') player.position.y += instVelocity * delta;
                    else player.position.z += instVelocity * delta;
                }
                
                playerBox.setFromObject(player);
                playerBox.min.x += 0.1; playerBox.max.x -= 0.1;
                playerBox.min.z += 0.1; playerBox.max.z -= 0.1;
            } else {
                player.position.x -= velocity.x * delta;
                player.position.z -= velocity.z * delta;
                velocity.x = 0;
                velocity.z = 0;
                
                playerBox.setFromObject(player);
                playerBox.min.x += 0.1; playerBox.max.x -= 0.1;
                playerBox.min.z += 0.1; playerBox.max.z -= 0.1;
            }
        }
    }

    canJump = onObject;
    if (onObject) {
        jumpCoyoteTimer = COYOTE_TIME;
    } else {
        jumpCoyoteTimer -= delta;
    }

    // Soft Body Jiggle Amplification
    const justLanded = !wasOnObject && onObject;

    if (justLanded && isGroundPounding) {
        isGroundPounding = false;
        scaleVelocity.y -= 80.0;
        scaleVelocity.x += 40.0;
        scaleVelocity.z += 40.0;
    } else if (justLanded && prevVelocity.y < -5) {
        const impact = Math.min(Math.abs(prevVelocity.y), 60.0);
        scaleVelocity.y -= impact * 0.9;  
        scaleVelocity.x += impact * 0.5;  
        scaleVelocity.z += impact * 0.5;
    }

    const angularVelocity = (player.rotation.y - prevRotationY) / delta;
    if (Math.abs(angularVelocity) > 0.1) {
        const turnForce = Math.min(Math.abs(angularVelocity) * 8.0, 30.0); 
        scaleVelocity.x += turnForce * delta;       
        scaleVelocity.y -= turnForce * 0.5 * delta; 
        scaleVelocity.z -= turnForce * 0.5 * delta;
    }

    const worldAccelX = (velocity.x - prevVelocity.x) / delta;
    const worldAccelZ = (velocity.z - prevVelocity.z) / delta;
    const horizontalAccel = new THREE.Vector3(worldAccelX, 0, worldAccelZ);
    const localAccel = horizontalAccel.applyEuler(new THREE.Euler(0, -player.rotation.y, 0));
    
    if (Math.abs(localAccel.z) > 10.0) {
        const stretchForce = Math.min(Math.abs(localAccel.z) * 0.25, 30.0); 
        scaleVelocity.z += stretchForce * delta;       
        scaleVelocity.x -= stretchForce * 0.5 * delta; 
        scaleVelocity.y -= stretchForce * 0.5 * delta;
    }

    const stiffness = 130.0; 
    const damping = 8.0;    
    
    const forceX = -stiffness * (player.scale.x - 1.0) - damping * scaleVelocity.x;
    const forceY = -stiffness * (player.scale.y - 1.0) - damping * scaleVelocity.y;
    const forceZ = -stiffness * (player.scale.z - 1.0) - damping * scaleVelocity.z;

    scaleVelocity.x += forceX * delta;
    scaleVelocity.y += forceY * delta;
    scaleVelocity.z += forceZ * delta;

    player.scale.x += scaleVelocity.x * delta;
    player.scale.y += scaleVelocity.y * delta;
    player.scale.z += scaleVelocity.z * delta;

    player.scale.x = Math.max(0.1, Math.min(player.scale.x, 4.0));
    player.scale.y = Math.max(0.1, Math.min(player.scale.y, 4.0));
    player.scale.z = Math.max(0.1, Math.min(player.scale.z, 4.0));

    prevVelocity.copy(velocity);
    prevRotationY = player.rotation.y;

    if (player.position.y < deathPlaneY || playerHealth <= 0) {
        playerLives--;
        if (playerLives >= 0) {
            velocity.set(0,0,0);
            playerHealth = 100;
            buildLevel(currentLevel);
        } else {
            gameState = 'GAME_OVER';
            document.getElementById('overlay-msg').style.display = 'block';
            document.getElementById('overlay-msg').innerHTML = '<h2>GAME OVER</h2><p>Click to Restart</p>';
        }
    }

    const goalBox = new THREE.Box3().setFromObject(goal);
    if (playerBox.intersectsBox(goalBox)) {
        const diffScale = Math.min(currentLevel * 0.15, 2.0);
        addScore(Math.floor(1000 * (1.0 + diffScale)));
        currentLevel++;
        buildLevel(currentLevel);
    }

    document.getElementById('player-score').innerText = playerScore;
    document.getElementById('player-lives').innerText = Math.max(0, playerLives);
    document.getElementById('player-health').innerText = Math.max(0, playerHealth) + '%';
    document.getElementById('gun-angle').innerText = (gunPitch * (180/Math.PI)).toFixed(1) + '°';
    document.getElementById('player-pos').innerText = 
        `${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}`;
};

let lastTime = performance.now();

const animate = () => {
    requestAnimationFrame(animate);

    const time = performance.now();
    const delta = Math.min((time - lastTime) / 1000, 0.05); 
    lastTime = time;

    if (gameState === 'PLAYING') {
        updateProjectiles(delta);
        updateEnemies(delta, time);
        updatePhysics(delta, time);
    }

    if (goal) {
        goal.rotation.y += 2 * delta;
        goal.rotation.x += 1 * delta;
    }

    if (water) water.position.y = -10 + Math.sin(time * 0.001) * 0.5;

    clouds.forEach(c => {
        c.position.x += 1.0 * delta;
        if (c.position.x > 100) c.position.x = -100;
    });

    if (isCameraResetting) {
        const stiffness = 120.0;
        const damping = 12.0;

        let yawDiff = player.rotation.y - camOffsetYaw;
        yawDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff));
        
        const fYaw = stiffness * yawDiff - damping * camOffsetYawVelo;
        const fPitch = -stiffness * camOffsetPitch - damping * camOffsetPitchVelo;
        
        camOffsetYawVelo += fYaw * delta;
        camOffsetPitchVelo += fPitch * delta;
        
        camOffsetYaw += camOffsetYawVelo * delta;
        camOffsetPitch += camOffsetPitchVelo * delta;
        
        if (Math.abs(yawDiff) < 0.005 && Math.abs(camOffsetPitch) < 0.005 && 
            Math.abs(camOffsetYawVelo) < 0.005 && Math.abs(camOffsetPitchVelo) < 0.005) {
            camOffsetYaw = player.rotation.y; camOffsetPitch = 0;
            camOffsetYawVelo = 0; camOffsetPitchVelo = 0;
            isCameraResetting = false;
        }
    } else {
        const camSpeed = 1.8;
        if (camMovingUp) camOffsetPitch -= camSpeed * delta;
        if (camMovingDown) camOffsetPitch += camSpeed * delta;
        if (camMovingLeft) camOffsetYaw += camSpeed * delta;
        if (camMovingRight) camOffsetYaw -= camSpeed * delta;
        camOffsetPitch = Math.max(-1.2, Math.min(1.2, camOffsetPitch)); 
    }

    const idealOffset = new THREE.Vector3(0, 4, 10);
    
    // Orbit camera based on offsets
    const orbitMatrix = new THREE.Matrix4();
    const camEuler = new THREE.Euler(camOffsetPitch, camOffsetYaw, 0, 'YXZ');
    orbitMatrix.makeRotationFromEuler(camEuler);
    idealOffset.applyMatrix4(orbitMatrix);

    idealOffset.add(player.position);
    camera.position.lerp(idealOffset, 0.2);
    
    const lookAtTarget = new THREE.Vector3(0, 0, -5);
    lookAtTarget.applyMatrix4(orbitMatrix); // Rotate look target as well for consistent framing
    lookAtTarget.add(player.position);
    camera.lookAt(lookAtTarget);

    if (dirLight) {
        dirLight.position.set(player.position.x + 20, player.position.y + 40, player.position.z + 20);
        dirLight.target.position.copy(player.position);
        dirLight.target.updateMatrixWorld();
    }

    if (motionBlurEnabled) {
        renderer.autoClearColor = false;
        scene.background = null;
        renderer.clearDepth();
        if (window.blurScene) renderer.render(window.blurScene, window.blurCamera);
        renderer.render(scene, camera);
    } else {
        renderer.autoClearColor = true;
        if (!scene.background && window.blurMaterial) scene.background = window.blurMaterial.color;
        renderer.render(scene, camera);
    }
};

document.getElementById('opt-vol').addEventListener('input', (e) => {
    if (player_audio && player_audio.gainNode) {
        player_audio.gainNode.gain.value = e.target.value / 100;
    }
});

document.getElementById('opt-shadows').addEventListener('change', (e) => {
    shadowsEnabled = e.target.checked;
    if (renderer) {
        renderer.shadowMap.enabled = shadowsEnabled;
        scene.traverse(child => {
            if (child.material) child.material.needsUpdate = true;
        });
    }
});

document.getElementById('opt-blur').addEventListener('change', (e) => {
    motionBlurEnabled = e.target.checked;
});

const startNewGame = () => {
    gameState = 'PLAYING';
    worldSeed = Math.random().toString(36).substring(7);
    document.getElementById('overlay-msg').style.display = 'none';
    document.getElementById('pause-menu').classList.add('hidden');
    playerLives = 4;
    playerScore = 0;
    extraLivesEarned = 0;
    currentLevel = 1;
    playerHealth = 100;
    buildLevel(currentLevel);
    lastTime = performance.now();
};

document.getElementById('btn-new-game').addEventListener('click', startNewGame);

document.getElementById('overlay-msg').addEventListener('click', () => {
    if (gameState === 'INIT') {
        init();
    } else if (gameState === 'GAME_OVER') {
        startNewGame();
    }
});