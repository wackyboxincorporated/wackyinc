const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 64;
window.RENDER_DISTANCE = 5; 
const GRAVITY = 32.0;
const JUMP_FORCE = 11.0;
const MOVE_SPEED = 6.0;
const SPRINT_SPEED = 10.0;
const WATER_LEVEL = 8;

// --- GLOBAL STATE ---
var scene, camera, renderer;
window.chunks = {};
window.drops = []; 
window.mobs = []; 
window.WORLD_SEED = 1234;

// --- ITEMS & BLOCKS ---
window.ITEMS = {
    AIR: 0,
    GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, LEAVES: 5, BEDROCK: 6, COBBLESTONE: 7,
    SAND: 8, WATER: 9, SNOW: 10, TORCH: 11, GLASS: 13, TNT: 14, CACTUS: 15,
    DIAMOND_ORE: 16, GOLD_ORE: 17,
    PLANKS: 100, STICK: 101, APPLE: 102, DIAMOND: 103, GOLD_INGOT: 104,
    PICKAXE_WOOD: 200, AXE_WOOD: 201, SHOVEL_WOOD: 202, SWORD_WOOD: 203,
    PICKAXE_STONE: 210, AXE_STONE: 211, SHOVEL_STONE: 212, SWORD_STONE: 213,
    PICKAXE_DIAMOND: 220
};

window.BLOCK_PROPS = {
    [ITEMS.AIR]: { solid: false, transparent: true },
    [ITEMS.GRASS]: { solid: true, color: '#6aa84f', texture: 'grass', hardness: 0.8, drop: ITEMS.DIRT },
    [ITEMS.DIRT]: { solid: true, color: '#5b4033', texture: 'dirt', hardness: 0.6 },
    [ITEMS.STONE]: { solid: true, color: '#888888', texture: 'stone', hardness: 2.0, drop: ITEMS.COBBLESTONE }, 
    [ITEMS.WOOD]: { solid: true, color: '#5c4033', texture: 'wood', hardness: 1.5 },
    [ITEMS.LEAVES]: { solid: true, color: '#38761d', texture: 'leaves', transparent: true, hardness: 0.2, chanceDrop: {id:ITEMS.APPLE, chance: 0.05} },
    [ITEMS.BEDROCK]: { solid: true, color: '#111', texture: 'bedrock', hardness: 99999 },
    [ITEMS.PLANKS]: { solid: true, color: '#e0c090', texture: 'planks', hardness: 1.0 },
    [ITEMS.COBBLESTONE]: { solid: true, color: '#666', texture: 'cobble', hardness: 2.0 },
    [ITEMS.SAND]: { solid: true, color: '#f1c232', texture: 'sand', hardness: 0.5, gravity: true },
    [ITEMS.WATER]: { solid: false, color: '#2266cc', texture: 'water', transparent: true, liquid: true, opacity: 0.7 },
    [ITEMS.SNOW]: { solid: true, color: '#ffffff', texture: 'snow', hardness: 0.3 },
    [ITEMS.TORCH]: { solid: false, color: '#ffaa00', texture: 'torch', transparent: true, hardness: 0.01, light: 15 }, 
    [ITEMS.GLASS]: { solid: true, color: '#ffffff', texture: 'glass', transparent: true, opacity: 0.3, hardness: 0.3 },
    [ITEMS.TNT]: { solid: true, color: '#dd3333', texture: 'tnt', hardness: 0.0, explode: 5 },
    [ITEMS.CACTUS]: { solid: true, color: '#006600', texture: 'cactus', hardness: 0.4 },
    [ITEMS.DIAMOND_ORE]: { solid: true, color: '#00ffff', texture: 'diamond_ore', hardness: 3.0, drop: ITEMS.DIAMOND },
    [ITEMS.GOLD_ORE]: { solid: true, color: '#ffcc00', texture: 'gold_ore', hardness: 2.5, drop: ITEMS.GOLD_INGOT },
    [ITEMS.APPLE]: { food: 4 }
};

window.TOOLS = {
    [ITEMS.PICKAXE_WOOD]: { speed: 2.0, type: 'pick', dur: 60 }, [ITEMS.PICKAXE_STONE]: { speed: 4.0, type: 'pick', dur: 132 },
    [ITEMS.PICKAXE_DIAMOND]: { speed: 8.0, type: 'pick', dur: 1561 },
    [ITEMS.AXE_WOOD]: { speed: 2.0, type: 'axe', dur: 60 }, [ITEMS.AXE_STONE]: { speed: 4.0, type: 'axe', dur: 132 },
    [ITEMS.SHOVEL_WOOD]: { speed: 2.0, type: 'shovel', dur: 60 }, [ITEMS.SHOVEL_STONE]: { speed: 4.0, type: 'shovel', dur: 132 }
};

window.RECIPES = [
    { out: {id:ITEMS.PLANKS, count: 4}, in: [{id:ITEMS.WOOD, count:1}] },
    { out: {id:ITEMS.STICK, count: 4}, in: [{id:ITEMS.PLANKS, count:2}] },
    { out: {id:ITEMS.TORCH, count: 4}, in: [{id:ITEMS.STICK, count:1}, {id:ITEMS.COBBLESTONE, count:1}] },
    { out: {id:ITEMS.PICKAXE_WOOD, count: 1}, in: [{id:ITEMS.PLANKS, count:3}, {id:ITEMS.STICK, count:2}] },
    { out: {id:ITEMS.PICKAXE_STONE, count: 1}, in: [{id:ITEMS.COBBLESTONE, count:3}, {id:ITEMS.STICK, count:2}] },
    { out: {id:ITEMS.PICKAXE_DIAMOND, count: 1}, in: [{id:ITEMS.DIAMOND, count:3}, {id:ITEMS.STICK, count:2}] },
    { out: {id:ITEMS.TNT, count: 1}, in: [{id:ITEMS.SAND, count:4}] },
    { out: {id:ITEMS.GLASS, count: 1}, in: [{id:ITEMS.SAND, count:1}] }
];

// --- MOBS SYSTEM ---
class Mob {
    constructor(type, x, y, z) {
        this.type = type;
        this.pos = new THREE.Vector3(x, y, z);
        this.vel = new THREE.Vector3(0, 0, 0);
        this.yaw = 0; this.onGround = false; this.mesh = null;
        this.health = 10; this.timer = Math.random() * 100;
        
        if (type === 'gloom') { this.color = 0x111111; this.scale = {x:0.6, y:1.9, z:0.6}; this.speed = 6.0; } 
        else if (type === 'wisp') { this.color = 0xaaffff; this.scale = {x:0.4, y:0.4, z:0.4}; this.speed = 2.0; this.flying = true; } 
        else if (type === 'boulder') { this.color = 0x554433; this.scale = {x:0.9, y:0.9, z:0.9}; this.speed = 1.5; }
        else if (type === 'crawler') { this.color = 0x00aa00; this.scale = {x:0.9, y:0.4, z:0.9}; this.speed = 7.0; } 
        else if (type === 'yeti') { this.color = 0xeeeeff; this.scale = {x:1.4, y:2.6, z:1.4}; this.speed = 1.5; } 
        else if (type === 'phantom') { this.color = 0x440088; this.scale = {x:1.5, y:0.3, z:1.5}; this.speed = 5.0; this.flying = true; } 
        else if (type === 'imp') { this.color = 0xff4400; this.scale = {x:0.5, y:0.8, z:0.5}; this.speed = 6.0; } 
        else if (type === 'sentinel') { this.color = 0x555555; this.scale = {x:0.8, y:3.0, z:0.8}; this.speed = 10.0; } 
    }

    update(dt, playerPos, playerCamera) {
        this.timer += dt;
        const dist = this.pos.distanceTo(playerPos);
        const dir = new THREE.Vector3().subVectors(playerPos, this.pos).normalize();

        if (this.type === 'gloom') {
            const playDir = new THREE.Vector3(); playerCamera.getWorldDirection(playDir);
            const toMob = new THREE.Vector3().subVectors(this.pos, playerPos).normalize();
            const dot = playDir.dot(toMob);
            const isVisible = dot > 0.5 && dist < 30;
            if (!isVisible || dist > 30) {
                this.vel.x = dir.x * this.speed; this.vel.z = dir.z * this.speed;
                if(this.onGround && (getBlockGlobal(Math.floor(this.pos.x + dir.x), Math.floor(this.pos.y), Math.floor(this.pos.z + dir.z)) !== ITEMS.AIR)) this.vel.y = 8;
            } else { this.vel.x = 0; this.vel.z = 0; }
        } else if (this.type === 'wisp') {
            this.vel.x = (Math.sin(this.timer)*2 + (Math.random()-0.5)) * this.speed;
            this.vel.z = (Math.cos(this.timer*0.7)*2 + (Math.random()-0.5)) * this.speed;
            this.vel.y = Math.sin(this.timer * 2) * 1.5;
            if (getBlockGlobal(Math.floor(this.pos.x), Math.floor(this.pos.y - 1), Math.floor(this.pos.z)) !== ITEMS.AIR) this.vel.y += 2.0;
        } else if (this.type === 'boulder') {
             if (this.timer % 50 < 1) this.targetDir = new THREE.Vector3((Math.random()-0.5), 0, (Math.random()-0.5)).normalize();
            if (this.targetDir) { this.vel.x += (this.targetDir.x * this.speed - this.vel.x) * 0.1; this.vel.z += (this.targetDir.z * this.speed - this.vel.z) * 0.1; }
            if(this.onGround && Math.random() < 0.01) this.vel.y = 5;
        }
        else if (this.type === 'crawler') {
            if (Math.random() < 0.1) this.targetDir = new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize();
            if (this.targetDir) {
                this.vel.x += (this.targetDir.x * this.speed - this.vel.x) * 0.2;
                this.vel.z += (this.targetDir.z * this.speed - this.vel.z) * 0.2;
            }
            if (getBlockGlobal(Math.floor(this.pos.x + this.vel.x*dt), Math.floor(this.pos.y), Math.floor(this.pos.z + this.vel.z*dt)) !== ITEMS.AIR) this.vel.y = 6; 
        }
        else if (this.type === 'yeti') {
            if (dist < 20) {
                this.vel.x += (dir.x * this.speed - this.vel.x) * 0.05;
                this.vel.z += (dir.z * this.speed - this.vel.z) * 0.05;
                if (this.onGround && getBlockGlobal(Math.floor(this.pos.x + dir.x), Math.floor(this.pos.y), Math.floor(this.pos.z + dir.z)) !== ITEMS.AIR) this.vel.y = 6;
            } else { this.vel.x *= 0.9; this.vel.z *= 0.9; }
        }
        else if (this.type === 'phantom') {
            const targetX = playerPos.x + Math.sin(this.timer * 0.5) * 10;
            const targetZ = playerPos.z + Math.cos(this.timer * 0.5) * 10;
            const targetY = playerPos.y + 10 + Math.sin(this.timer) * 2;
            const toTarget = new THREE.Vector3(targetX - this.pos.x, targetY - this.pos.y, targetZ - this.pos.z).normalize();
            this.vel.add(toTarget.multiplyScalar(dt * 10));
            if(this.vel.length() > this.speed) this.vel.normalize().multiplyScalar(this.speed);
        }
        else if (this.type === 'imp') {
            if (this.onGround) { this.vel.y = 12; this.vel.x = (Math.random()-0.5) * 10; this.vel.z = (Math.random()-0.5) * 10; }
        }
        else if (this.type === 'sentinel') {
            if (dist < 8) { this.vel.x = dir.x * this.speed; this.vel.z = dir.z * this.speed; } else { this.vel.x = 0; this.vel.z = 0; }
        }

        if (!this.flying) this.vel.y -= GRAVITY * dt;
        this.pos.x += this.vel.x * dt;
        if(getCollidingBlocks(this.getBox()).length > 0) { this.pos.x -= this.vel.x * dt; this.vel.x *= -0.5; }
        this.pos.z += this.vel.z * dt;
        if(getCollidingBlocks(this.getBox()).length > 0) { this.pos.z -= this.vel.z * dt; this.vel.z *= -0.5; }
        this.pos.y += this.vel.y * dt;
        if(getCollidingBlocks(this.getBox()).length > 0) {
            this.pos.y -= this.vel.y * dt;
            if(this.vel.y < 0) this.onGround = true;
            this.vel.y = 0;
        } else { this.onGround = false; }
        if(this.pos.y < -10) this.pos.set(playerPos.x, playerPos.y + 10, playerPos.z);
    }
    getBox() { const w = this.scale.x/2; return new THREE.Box3(new THREE.Vector3(this.pos.x - w, this.pos.y, this.pos.z - w), new THREE.Vector3(this.pos.x + w, this.pos.y + this.scale.y, this.pos.z + w)); }
}

// --- TEXTURE GENERATION ---
const textureLoader = new THREE.TextureLoader();
const ATLAS_SIZE = 512; 
const TILE_SIZE = 64;   
const TILES_PER_ROW = 8;
const atlasCanvas = document.createElement('canvas');
atlasCanvas.width = ATLAS_SIZE; atlasCanvas.height = ATLAS_SIZE;
const atlasCtx = atlasCanvas.getContext('2d');

function generateNoiseTexture(ctx, x, y, colorStr, type) {
    ctx.fillStyle = colorStr; ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    const noise = (density, opacity) => { for(let i=0; i<density; i++) { ctx.fillStyle = Math.random()>0.5 ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`; ctx.fillRect(x+Math.random()*TILE_SIZE, y+Math.random()*TILE_SIZE, 2, 2); } };
    if(type === 'grass') { noise(200, 0.1); ctx.fillStyle = '#4a853a'; for(let i=0; i<20; i++) ctx.fillRect(x+Math.random()*60, y+Math.random()*60, 2, 6); }
    else if(type === 'dirt') { noise(300, 0.15); }
    else if(type === 'stone' || type === 'cobble' || type.includes('ore')) { ctx.fillStyle = '#777'; ctx.fillRect(x,y,TILE_SIZE,TILE_SIZE); ctx.fillStyle = '#666'; for(let r=0; r<4; r++) { let off = (r%2)*16; for(let c=0; c<4; c++) ctx.fillRect(x + c*32 + off + 2, y + r*16 + 2, 28, 12); } if (type === 'diamond_ore') { ctx.fillStyle = '#00ffff'; ctx.fillRect(x+20, y+20, 8, 8); ctx.fillRect(x+40, y+10, 6, 6); ctx.fillRect(x+10, y+45, 8, 8); } if (type === 'gold_ore') { ctx.fillStyle = '#ffcc00'; ctx.fillRect(x+20, y+20, 8, 8); ctx.fillRect(x+40, y+10, 6, 6); ctx.fillRect(x+10, y+45, 8, 8); } }
    else if(type === 'wood') { ctx.fillStyle = '#4a3728'; ctx.fillRect(x,y,TILE_SIZE,TILE_SIZE); ctx.fillStyle = '#3e2b1f'; for(let i=0; i<8; i++) ctx.fillRect(x + i*8 + 2, y, 4, TILE_SIZE); }
    else if(type === 'leaves') { ctx.fillStyle = '#2d4c1e'; ctx.fillRect(x,y,TILE_SIZE,TILE_SIZE); ctx.fillStyle = '#3a5f0b'; for(let i=0; i<30; i++) ctx.fillRect(x+Math.random()*50, y+Math.random()*50, 8, 8); }
    else if(type === 'glass') { ctx.clearRect(x,y,TILE_SIZE,TILE_SIZE); ctx.fillStyle = 'rgba(200,240,255,0.1)'; ctx.fillRect(x,y,TILE_SIZE,TILE_SIZE); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x,y,TILE_SIZE,TILE_SIZE); ctx.beginPath(); ctx.moveTo(x,y+TILE_SIZE); ctx.lineTo(x+TILE_SIZE,y); ctx.stroke(); }
    else if(type === 'torch') { ctx.clearRect(x,y,TILE_SIZE,TILE_SIZE); ctx.fillStyle = '#630'; ctx.fillRect(x+28, y+20, 8, 44); ctx.fillStyle = '#fb0'; ctx.fillRect(x+26, y+10, 12, 12); ctx.fillStyle = '#fff'; ctx.fillRect(x+30, y+14, 4, 4); }
    else if(type === 'water') { ctx.fillStyle = 'rgba(34, 100, 200, 0.6)'; ctx.fillRect(x,y,TILE_SIZE,TILE_SIZE); ctx.fillStyle = 'rgba(255,255,255,0.2)'; for(let i=0; i<5; i++) ctx.fillRect(x+Math.random()*60, y+Math.random()*60, 10, 2); }
    else { noise(100, 0.1); }
}

const TEXTURE_MAP = {};
let textureIndexCounter = 0;
function registerTexture(id, color, typeName) {
    const idx = textureIndexCounter++;
    const tx = (idx % TILES_PER_ROW) * TILE_SIZE;
    const ty = Math.floor(idx / TILES_PER_ROW) * TILE_SIZE;
    generateNoiseTexture(atlasCtx, tx, ty, color, typeName);
    TEXTURE_MAP[id] = { u0: tx/ATLAS_SIZE, v0: 1.0-((ty+TILE_SIZE)/ATLAS_SIZE), u1: (tx+TILE_SIZE)/ATLAS_SIZE, v1: 1.0-(ty/ATLAS_SIZE) };
}

Object.keys(ITEMS).forEach(key => {
    const id = ITEMS[key];
    if(BLOCK_PROPS[id]) registerTexture(id, BLOCK_PROPS[id].color, BLOCK_PROPS[id].texture || 'dirt');
});

const atlasTexture = new THREE.CanvasTexture(atlasCanvas);
atlasTexture.magFilter = THREE.NearestFilter; atlasTexture.minFilter = THREE.NearestFilter;
const solidMaterial = new THREE.MeshLambertMaterial({ map: atlasTexture, side: THREE.FrontSide, vertexColors: true });
const transMaterial = new THREE.MeshLambertMaterial({ map: atlasTexture, side: THREE.FrontSide, transparent: true, alphaTest: 0.1, vertexColors: true });
const torchMaterial = new THREE.MeshBasicMaterial({ map: atlasTexture, side: THREE.FrontSide, vertexColors: true }); 

window.crackTextures = [];
for(let i=0; i<10; i++) {
    const c = document.createElement('canvas'); c.width=64; c.height=64; const ctx=c.getContext('2d');
    ctx.strokeStyle = `rgba(0,0,0,${0.5+i*0.05})`; ctx.lineWidth=3; ctx.beginPath();
    for(let j=0; j<i*3; j++) { ctx.moveTo(32,32); ctx.lineTo(Math.random()*64, Math.random()*64); }
    ctx.stroke();
    const t = new THREE.CanvasTexture(c); t.magFilter=THREE.NearestFilter; window.crackTextures.push(t);
}

const itemIcons = {};
function createItemIcon(id, color, label) {
    const c = document.createElement('canvas'); c.width=64; c.height=64; const ctx=c.getContext('2d');
    const uv = TEXTURE_MAP[id];
    if (uv) ctx.drawImage(atlasCanvas, uv.u0*ATLAS_SIZE, (1-uv.v1)*ATLAS_SIZE, TILE_SIZE, TILE_SIZE, 0, 0, 64, 64);
    else { ctx.fillStyle=color||'#888'; ctx.fillRect(8,8,48,48); }
    itemIcons[id]=c.toDataURL();
}
Object.keys(ITEMS).forEach(k => {
    const id = ITEMS[k];
    if(BLOCK_PROPS[id]) createItemIcon(id, BLOCK_PROPS[id].color, k);
    else createItemIcon(id, '#664422', k.substr(0,4));
});

// --- WORLD & CHUNKS ---
class Chunk {
    constructor(cx, cz) {
        this.cx = cx; this.cz = cz;
        this.data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
        this.mesh = null; this.transMesh = null; this.torchMesh = null;
        this.lights = []; 
        this.isDirty = false; 
        this.generate();
    }
    getIndex(x, y, z) { return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE; }
    
    setBlockData(x, y, z, id) { 
        if(x>=0&&x<CHUNK_SIZE&&y>=0&&y<CHUNK_HEIGHT&&z>=0&&z<CHUNK_SIZE) {
            const idx = this.getIndex(x,y,z);
            const oldId = this.data[idx];
            if (oldId === id) return;
            this.data[idx] = id;
            if(BLOCK_PROPS[oldId]?.light) this.removeLight(x,y,z);
            if(BLOCK_PROPS[id]?.light) this.addLight(x,y,z, BLOCK_PROPS[id].light);
            this.isDirty = true;
        }
    }
    
    getBlock(x, y, z) { if(x>=0&&x<CHUNK_SIZE&&y>=0&&y<CHUNK_HEIGHT&&z>=0&&z<CHUNK_SIZE) return this.data[this.getIndex(x,y,z)]; return 0; }
    addLight(x, y, z, r) { this.lights.push({x, y, z, r}); }
    removeLight(x, y, z) { this.lights = this.lights.filter(l => l.x!==x || l.y!==y || l.z!==z); }

    generate() {
        const wx = this.cx * CHUNK_SIZE; const wz = this.cz * CHUNK_SIZE;
        const temp = Math.sin((wx + WORLD_SEED)*0.01) + Math.cos((wz + WORLD_SEED)*0.01); 
        
        for(let x=0; x<CHUNK_SIZE; x++) {
            for(let z=0; z<CHUNK_SIZE; z++) {
                const n = Math.sin((wx+x+WORLD_SEED)*0.05) + Math.cos((wz+z+WORLD_SEED)*0.05);
                const h = Math.floor(12 + n*5 + Math.sin((wx+x)*0.01+(wz+z)*0.02)*10);
                
                for(let y=0; y<CHUNK_HEIGHT; y++) {
                    let id = ITEMS.AIR;
                    if(y === 0) id = ITEMS.BEDROCK;
                    else if(y < h - 3) {
                        id = ITEMS.STONE; 
                        if(y < 12 && Math.random() < 0.005) id = ITEMS.DIAMOND_ORE;
                        else if(y < 32 && Math.random() < 0.008) id = ITEMS.GOLD_ORE;
                    }
                    else if(y < h) id = ITEMS.DIRT;
                    else if(y === h) {
                        if (temp > 1.0) id = ITEMS.SAND; 
                        else if (temp < -1.0 || h > 24) id = ITEMS.SNOW; 
                        else id = ITEMS.GRASS;
                    }
                    else if(y <= WATER_LEVEL) id = ITEMS.WATER;
                    
                    if(id !== ITEMS.AIR) {
                        this.data[this.getIndex(x,y,z)] = id;
                        if(BLOCK_PROPS[id]?.light) this.addLight(x,y,z, BLOCK_PROPS[id].light);
                    }
                }
                if(h > WATER_LEVEL && h < 24) {
                    if (temp > 1.0 && Math.random() > 0.99) { 
                        for(let i=0; i<3; i++) this.setBlockData(x, h+1+i, z, ITEMS.CACTUS);
                    } else if (temp <= 1.0 && temp >= -1.0 && Math.random() > 0.98) {
                        this.placeTree(x, h+1, z);
                    }
                }
            }
        }
    }
    
    placeTree(x, y, z) {
        const h = 4 + Math.floor(Math.random()*2);
        for(let i=0; i<h; i++) this.setBlockData(x, y+i, z, ITEMS.WOOD);
        for(let lx=x-2; lx<=x+2; lx++) for(let lz=z-2; lz<=z+2; lz++) for(let ly=y+h-2; ly<=y+h+1; ly++) {
            if(Math.abs(lx-x)+Math.abs(ly-(y+h))+Math.abs(lz-z)<=2 && this.getBlock(lx,ly,lz)===ITEMS.AIR) 
                this.setBlockData(lx, ly, lz, ITEMS.LEAVES);
        }
    }

    buildMesh(scene) {
        this.isDirty = false; 
        if(this.mesh) { scene.remove(this.mesh); this.mesh.geometry.dispose(); }
        if(this.transMesh) { scene.remove(this.transMesh); this.transMesh.geometry.dispose(); }
        if(this.torchMesh) { scene.remove(this.torchMesh); this.torchMesh.geometry.dispose(); }
        
        const verts=[], uvs=[], norms=[], cols=[];
        const tVerts=[], tUvs=[], tNorms=[], tCols=[];
        const eVerts=[], eUvs=[], eNorms=[], eCols=[]; 

        const relevantLights = [];
        for(let cx = -1; cx <= 1; cx++) {
            for(let cz = -1; cz <= 1; cz++) {
                const neighbor = chunks[`${this.cx + cx},${this.cz + cz}`];
                if(neighbor && neighbor.lights.length > 0) {
                    for(let l of neighbor.lights) {
                         relevantLights.push({ x: l.x + (cx * CHUNK_SIZE), y: l.y, z: l.z + (cz * CHUNK_SIZE), r: l.r });
                    }
                }
            }
        }
        
        const pushBox = (arrV, arrU, arrN, arrC, x, y, z, w, h, d, matId) => {
            const uv = TEXTURE_MAP[matId]; if(!uv) return;
            const x0 = x + (1-w)/2, x1 = x0 + w; const y0 = y, y1 = y + h; const z0 = z + (1-d)/2, z1 = z0 + d;
            const faces = [ { n:[1,0,0], v:[x1,y0,z1, x1,y0,z0, x1,y1,z0, x1,y1,z1] }, { n:[-1,0,0], v:[x0,y0,z0, x0,y0,z1, x0,y1,z1, x0,y1,z0] }, { n:[0,1,0], v:[x0,y1,z1, x1,y1,z1, x1,y1,z0, x0,y1,z0] }, { n:[0,-1,0], v:[x0,y0,z0, x1,y0,z0, x1,y0,z1, x0,y0,z1] }, { n:[0,0,1], v:[x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1] }, { n:[0,0,-1], v:[x1,y0,z0, x0,y0,z0, x0,y1,z0, x1,y1,z0] } ];
            for(let f of faces) {
                for(let i=0; i<12; i+=3) { arrV.push(f.v[i], f.v[i+1], f.v[i+2]); arrN.push(f.n[0], f.n[1], f.n[2]); arrC.push(1,1,1); }
                arrU.push(uv.u0,uv.v0, uv.u1,uv.v0, uv.u1,uv.v1, uv.u0,uv.v1);
            }
        };

        const push = (arrV, arrU, arrN, arrC, x, y, z, matId, face, baseLight) => {
            const uv = TEXTURE_MAP[matId]; if(!uv) return;
            let v, n;
            if(face==='px'){ v=[1,0,1, 1,0,0, 1,1,0, 1,1,1]; n=[1,0,0]; } else if(face==='nx'){ v=[0,0,0, 0,0,1, 0,1,1, 0,1,0]; n=[-1,0,0]; } else if(face==='py'){ v=[0,1,1, 1,1,1, 1,1,0, 0,1,0]; n=[0,1,0]; } else if(face==='ny'){ v=[0,0,0, 1,0,0, 1,0,1, 0,0,1]; n=[0,-1,0]; } else if(face==='pz'){ v=[0,0,1, 1,0,1, 1,1,1, 0,1,1]; n=[0,0,1]; } else if(face==='nz'){ v=[1,0,0, 0,0,0, 0,1,0, 1,1,0]; n=[0,0,-1]; }

            let addedLight = 0;
            for(let l of relevantLights) {
                const dx = x - l.x; const dy = y - l.y; const dz = z - l.z;
                if(Math.abs(dx) > l.r || Math.abs(dy) > l.r || Math.abs(dz) > l.r) continue;
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                if(dist < l.r) { 
                    const curve = 1.5 / (1.0 + dist * 0.3); 
                    const cutoff = Math.max(0, 1.0 - (dist / l.r)); 
                    addedLight += curve * cutoff; 
                }
            }
            const finalLight = Math.min(1.1, baseLight + addedLight); 
            const warmTint = Math.min(0.2, addedLight * 0.2); 

            for(let i=0; i<12; i+=3) { 
                arrV.push(v[i]+x, v[i+1]+y, v[i+2]+z); 
                arrN.push(n[0],n[1],n[2]); 
                arrC.push(finalLight + warmTint, finalLight + warmTint*0.5, finalLight); 
            }
            arrU.push(uv.u0,uv.v0, uv.u1,uv.v0, uv.u1,uv.v1, uv.u0,uv.v1);
        };

        for(let x=0; x<CHUNK_SIZE; x++) for(let y=0; y<CHUNK_HEIGHT; y++) for(let z=0; z<CHUNK_SIZE; z++) {
            const id = this.getBlock(x,y,z);
            if(id===ITEMS.AIR) continue;
            const def = BLOCK_PROPS[id];
            
            if(id === ITEMS.TORCH) { pushBox(eVerts, eUvs, eNorms, eCols, x, y, z, 0.125, 0.5, 0.125, id); pushBox(eVerts, eUvs, eNorms, eCols, x, y+0.4, z, 0.15, 0.15, 0.15, id); continue; }
            if(id === ITEMS.CACTUS) { pushBox(eVerts, eUvs, eNorms, eCols, x, y, z, 0.8, 1.0, 0.8, id); continue; }

            const isTrans = def.transparent;
            const light = Math.min(1.0, Math.max(0.4, y/40)); 
            const check = (nx,ny,nz) => {
                const nid = this.getBlock(nx,ny,nz);
                if(isTrans && nid === id) return false;
                return nid===ITEMS.AIR || (BLOCK_PROPS[nid] && BLOCK_PROPS[nid].transparent && !isTrans);
            };

            const tv = isTrans ? tVerts : verts; const tu = isTrans ? tUvs : uvs; const tn = isTrans ? tNorms : norms; const tc = isTrans ? tCols : cols;
            if(y===CHUNK_HEIGHT-1||check(x,y+1,z)) push(tv,tu,tn,tc,x,y,z,id,'py',light);
            if(y===0||check(x,y-1,z)) push(tv,tu,tn,tc,x,y,z,id,'ny',light*0.5);
            if(check(x+1,y,z)) push(tv,tu,tn,tc,x,y,z,id,'px',light*0.8);
            if(check(x-1,y,z)) push(tv,tu,tn,tc,x,y,z,id,'nx',light*0.8);
            if(check(x,y,z+1)) push(tv,tu,tn,tc,x,y,z,id,'pz',light*0.9);
            if(check(x,y,z-1)) push(tv,tu,tn,tc,x,y,z,id,'nz',light*0.9);
        }

        const makeMesh = (v, n, u, c, mat) => {
            if(v.length === 0) return null;
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
            g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2));
            g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
            const indices = []; for(let i=0; i<v.length/3; i+=4) indices.push(i,i+1,i+2, i,i+2,i+3); g.setIndex(indices);
            const m = new THREE.Mesh(g, mat);
            m.position.set(this.cx*CHUNK_SIZE, 0, this.cz*CHUNK_SIZE);
            m.castShadow = true; m.receiveShadow = true;
            scene.add(m); return m;
        };

        this.mesh = makeMesh(verts, norms, uvs, cols, solidMaterial);
        this.transMesh = makeMesh(tVerts, tNorms, tUvs, tCols, transMaterial);
        this.torchMesh = makeMesh(eVerts, eNorms, eUvs, eCols, torchMaterial);
    }
}

// --- GLOBAL HELPERS ---
window.getBlockGlobal = function(x, y, z) {
    const cx=Math.floor(x/CHUNK_SIZE), cz=Math.floor(z/CHUNK_SIZE);
    const lx=((x%CHUNK_SIZE)+CHUNK_SIZE)%CHUNK_SIZE, lz=((z%CHUNK_SIZE)+CHUNK_SIZE)%CHUNK_SIZE;
    const c=chunks[`${cx},${cz}`]; return c?c.getBlock(lx,y,lz):ITEMS.AIR;
}

// --- NETWORK AWARE SET BLOCK ---
window.setBlockGlobal = function(x, y, z, id, isRemote = false) {
    const cx=Math.floor(x/CHUNK_SIZE), cz=Math.floor(z/CHUNK_SIZE);
    const lx=((x%CHUNK_SIZE)+CHUNK_SIZE)%CHUNK_SIZE, lz=((z%CHUNK_SIZE)+CHUNK_SIZE)%CHUNK_SIZE;
    let c=chunks[`${cx},${cz}`];
    
    if(!c && id !== ITEMS.AIR) {
        c = new Chunk(cx, cz);
        chunks[`${cx},${cz}`] = c;
    }

    if(c) {
        c.setBlockData(lx,y,lz,id); 
        c.buildMesh(scene); 
        if(lx===0) chunks[`${cx-1},${cz}`]?.buildMesh(scene);
        if(lx===CHUNK_SIZE-1) chunks[`${cx+1},${cz}`]?.buildMesh(scene);
        if(lz===0) chunks[`${cx},${cz-1}`]?.buildMesh(scene);
        if(lz===CHUNK_SIZE-1) chunks[`${cx},${cz+1}`]?.buildMesh(scene);

        // Only send to network if this was a LOCAL action
        if (!isRemote && typeof Network !== 'undefined') {
            Network.sendBlockUpdate(cx, cz, lx, y, lz, id);
        }
    }
}

function getCollidingBlocks(box) {
    const blocks = [];
    for (let x=Math.floor(box.min.x); x<=Math.floor(box.max.x); x++)
    for (let y=Math.floor(box.min.y); y<=Math.floor(box.max.y); y++)
    for (let z=Math.floor(box.min.z); z<=Math.floor(box.max.z); z++)
    { const id = getBlockGlobal(x, y, z); if (id && BLOCK_PROPS[id].solid) blocks.push({x,y,z}); }
    return blocks;
}

function explode(x, y, z, power) {
    const r = power;
    for(let i=-r; i<=r; i++) for(let j=-r; j<=r; j++) for(let k=-r; k<=r; k++) {
        if(i*i + j*j + k*k < r*r) {
            const bx=x+i, by=y+j, bz=z+k;
            const id = getBlockGlobal(bx,by,bz);
            if(id !== ITEMS.BEDROCK && id !== ITEMS.AIR) {
                setBlockGlobal(bx,by,bz, ITEMS.AIR);
                spawnDrop(bx,by,bz, BLOCK_PROPS[id].drop || id);
            }
        }
    }
}

// --- PHYSICS SYSTEM (BATCHED) ---
function updateBlockPhysics() {
    for(let key in chunks) {
        const c = chunks[key];
        
        for(let i=0; i<8; i++) {
            const rx = Math.floor(Math.random()*CHUNK_SIZE);
            const rz = Math.floor(Math.random()*CHUNK_SIZE);
            const gx = c.cx * CHUNK_SIZE + rx;
            const gz = c.cz * CHUNK_SIZE + rz;
            
            for(let y=1; y<CHUNK_HEIGHT; y++) {
                const id = c.getBlock(rx, y, rz);
                
                if(BLOCK_PROPS[id] && BLOCK_PROPS[id].gravity) {
                    const below = getBlockGlobal(gx, y-1, gz);
                    if(below === ITEMS.AIR || BLOCK_PROPS[below].liquid) {
                        c.setBlockData(rx, y-1, rz, id);
                        c.setBlockData(rx, y, rz, ITEMS.AIR);
                    }
                }
                
                if(id === ITEMS.WATER) {
                    const below = getBlockGlobal(gx, y-1, gz);
                    if(below === ITEMS.AIR) {
                        c.setBlockData(rx, y-1, rz, ITEMS.WATER);
                    }
                    else if(below !== ITEMS.WATER && below !== ITEMS.AIR) {
                        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
                        const d = dirs[Math.floor(Math.random()*4)];
                        const nx = gx + d[0];
                        const nz = gz + d[1];
                        const target = getBlockGlobal(nx, y, nz);
                        if(target === ITEMS.AIR) {
                            const ncx = Math.floor(nx/CHUNK_SIZE), ncz = Math.floor(nz/CHUNK_SIZE);
                            const nlx = ((nx%CHUNK_SIZE)+CHUNK_SIZE)%CHUNK_SIZE;
                            const nlz = ((nz%CHUNK_SIZE)+CHUNK_SIZE)%CHUNK_SIZE;
                            const nc = chunks[`${ncx},${ncz}`];
                            if(nc) nc.setBlockData(nlx, y, nlz, ITEMS.WATER);
                        }
                    }
                }
            }
        }
    }

    // BATCH REBUILD
    for(let key in chunks) {
        if(chunks[key].isDirty) chunks[key].buildMesh(scene);
    }
}

function spawnDrop(x, y, z, itemId) {
    if(!itemId) return;
    const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const mat = new THREE.MeshBasicMaterial({ color: BLOCK_PROPS[itemId]?.color || '#888' });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    if(typeof scene !== 'undefined') scene.add(mesh);
    drops.push({ mesh, vel: new THREE.Vector3((Math.random()-0.5)*4, 3, (Math.random()-0.5)*4), itemId, life: 300 });
}