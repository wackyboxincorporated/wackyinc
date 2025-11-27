// --- PLAYER STATE ---
const player = {
    pos: new THREE.Vector3(0, 60, 0),
    vel: new THREE.Vector3(),
    hotbar: [
        ITEMS.PICKAXE_STONE, ITEMS.TORCH, ITEMS.SAND, ITEMS.WOOD, ITEMS.COBBLESTONE, ITEMS.TNT, ITEMS.WATER, ITEMS.GLASS
    ].map(id => ({ id: id, count: 64, dur: TOOLS[id]?.dur || 0 })),
    inventory: Array(27).fill(0).map(() => ({ id: 0, count: 0 })),
    selectedSlot: 0,
    onGround: false, health: 20, maxHealth: 20, hunger: 20, maxHunger: 20, oxygen: 20, maxOxygen: 20,
    dragSource: null, lastSprintTime: 0, isSprinting: false, isCrouching: false,
    
    addItem: function(id, count) {
        for(let slot of this.hotbar) { if(slot.id === id) { slot.count += count; updateInventoryUI(); return true; } }
        for(let slot of this.inventory) { if(slot.id === id) { slot.count += count; updateInventoryUI(); return true; } }
        for(let slot of this.hotbar) { if(slot.id === 0) { slot.id = id; slot.count = count; updateInventoryUI(); return true; } }
        for(let slot of this.inventory) { if(slot.id === 0) { slot.id = id; slot.count = count; updateInventoryUI(); return true; } }
        return false; 
    },
    handleSlotClick: function(listType, index) {
        const list = listType === 'hotbar' ? this.hotbar : this.inventory;
        if(this.dragSource) {
            const sourceList = this.dragSource.list === 'hotbar' ? this.hotbar : this.inventory;
            const sItem = sourceList[this.dragSource.index];
            const tItem = list[index];
            
            const temp = { id: sItem.id, count: sItem.count, dur: sItem.dur };
            sItem.id = tItem.id; sItem.count = tItem.count; sItem.dur = tItem.dur;
            tItem.id = temp.id; tItem.count = temp.count; tItem.dur = temp.dur;
            
            this.dragSource = null;
        } else { 
            this.dragSource = { list: listType, index: index }; 
        }
        updateInventoryUI();
    },
    hasItems: function(reqs) {
        const all = [...this.hotbar, ...this.inventory];
        for(let r of reqs) {
            let found = 0;
            for(let s of all) if(s.id === r.id) found += s.count;
            if(found < r.count) return false;
        }
        return true;
    },
    consumeItems: function(reqs) {
        const all = [...this.hotbar, ...this.inventory];
        for(let r of reqs) {
            let needed = r.count;
            for(let s of all) {
                if(s.id === r.id) {
                    const take = Math.min(needed, s.count);
                    s.count -= take; needed -= take;
                    if(s.count <= 0) s.id = 0;
                    if(needed <= 0) break;
                }
            }
        }
        updateInventoryUI();
    },
    eat: function() {
        const slot = this.hotbar[this.selectedSlot];
        if(slot.id === ITEMS.APPLE && this.hunger < 20) {
            this.hunger = Math.min(20, this.hunger + BLOCK_PROPS[ITEMS.APPLE].food);
            this.health = Math.min(20, this.health + 2);
            slot.count--; if(slot.count<=0) slot.id=0;
            updateInventoryUI();
            updateHud();
        }
    }
};

window.playerRef = player; 

function updateInventoryUI() {
    const hotbarEl = document.getElementById('hotbar');
    if (!hotbarEl) return;
    hotbarEl.innerHTML = '';
    player.hotbar.forEach((slot, i) => {
        const div = document.createElement('div');
        div.className = 'slot' + (i === player.selectedSlot ? ' active' : '') + (player.dragSource?.list==='hotbar'&&player.dragSource.index===i ? ' moving' : '');
        if(slot.id !== 0) {
            div.innerHTML = `<img src="${itemIcons[slot.id] || ''}"><span class="count">${slot.count}</span>`;
            if(TOOLS[slot.id]) {
                const max = TOOLS[slot.id].dur;
                const pct = (slot.dur / max) * 100;
                div.innerHTML += `<div class="durability" style="width:${pct}%"></div>`;
            }
        }
        div.onclick = (e) => { if(isInvOpen) player.handleSlotClick('hotbar', i); else { player.selectedSlot = i; updateInventoryUI(); } e.stopPropagation(); };
        hotbarEl.appendChild(div);
    });
    const invGrid = document.getElementById('inv-grid');
    if(invGrid) {
        invGrid.innerHTML = '';
        player.inventory.forEach((slot, i) => {
            const div = document.createElement('div');
            div.className = 'slot' + (player.dragSource?.list==='inventory'&&player.dragSource.index===i ? ' moving' : '');
            if(slot.id !== 0) div.innerHTML = `<img src="${itemIcons[slot.id] || ''}"><span class="count">${slot.count}</span>`;
            div.onclick = (e) => { player.handleSlotClick('inventory', i); e.stopPropagation(); };
            invGrid.appendChild(div);
        });
    }
    updateCraftingUI();
}

function updateCraftingUI() {
    const list = document.getElementById('crafting-list');
    if(!list) return;
    list.innerHTML = '';
    RECIPES.forEach(r => {
        const btn = document.createElement('div');
        btn.className = 'craft-btn';
        const canCraft = player.hasItems(r.in);
        btn.style.opacity = canCraft ? '1' : '0.4';
        const outName = Object.keys(ITEMS).find(k=>ITEMS[k]===r.out.id);
        btn.innerHTML = `<img src="${itemIcons[r.out.id]}"> <span>${outName} x${r.out.count}</span>`;
        if(canCraft) {
            btn.onclick = () => {
                player.consumeItems(r.in);
                player.addItem(r.out.id, r.out.count);
                updateInventoryUI(); // Refresh
            };
        }
        list.appendChild(btn);
    });
}

// --- GAME LOOP ---
let lastTime = performance.now();
let worldTime = 0; 
let breakingMesh, breakingState = { active: false, time: 0 };
let selectMesh;
const keys = { w:false, a:false, s:false, d:false, space:false, shift:false, crouch:false, leftClick:false, rightClick:false };
let isInvOpen = false;
let dirLight, hemiLight;
const particles = [];

let frameCount = 0;
let lastFpsTime = 0;
let currentFps = 60;
let lastChunkUpdate = 0;

// --- GRAPHICS SETTINGS ---
const graphicsSettings = {
    fov: 70,
    shadows: true,
    resolution: 1.0,
    distance: RENDER_DISTANCE
};

window.applyGraphicsSettings = function(newSettings) {
    if(newSettings.fov) graphicsSettings.fov = parseInt(newSettings.fov);
    if(newSettings.resolution) graphicsSettings.resolution = parseFloat(newSettings.resolution);
    if(newSettings.distance) {
        graphicsSettings.distance = parseInt(newSettings.distance);
        window.RENDER_DISTANCE = graphicsSettings.distance;
    }
    if(typeof newSettings.shadows !== 'undefined') graphicsSettings.shadows = newSettings.shadows;

    if(camera) {
        camera.fov = graphicsSettings.fov;
        camera.updateProjectionMatrix();
    }
    if(renderer) {
        renderer.setPixelRatio(window.devicePixelRatio * graphicsSettings.resolution);
    }
    if(dirLight) {
        dirLight.castShadow = graphicsSettings.shadows;
    }
    if(scene && scene.fog) {
        scene.fog.far = RENDER_DISTANCE * CHUNK_SIZE - 2;
    }
    // Force refresh chunks if distance reduced
    updateChunks();
}

// --- BIOME LOGIC ---
function getBiome(x, z, y) {
    if (y < 8) return 'Ocean';
    if (y > 40) return 'Mountain';
    // Use the same math as Engine.js generation
    const temp = Math.sin((x + WORLD_SEED)*0.01) + Math.cos((z + WORLD_SEED)*0.01); 
    if (temp > 1.0) return 'Desert';
    if (temp < -1.0) return 'Tundra';
    return 'Forest';
}

// --- SPAWNER ---
function spawnWorldMobs() {
    // Clear existing local mobs (optional, if restarting)
    // mobs.length = 0; 

    const MOB_COUNT = 600;
    const SPAWN_RANGE = 500; // -80 to 80

    for(let i=0; i<MOB_COUNT; i++) {
        // Random position
        const x = (Math.random() - 0.5) * SPAWN_RANGE * 2;
        const z = (Math.random() - 0.5) * SPAWN_RANGE * 2;
        
        // Find surface Y
        let y = 64;
        let foundGround = false;
        // Scan down from sky to find ground
        for(let scanY = 64; scanY > 0; scanY--) {
            const block = getBlockGlobal(Math.floor(x), scanY, Math.floor(z));
            if(block !== ITEMS.AIR && block !== ITEMS.WATER) {
                y = scanY + 1;
                foundGround = true;
                break;
            }
        }

        if (!foundGround) continue; // Don't spawn in void

        const biome = getBiome(x, z, y);
        let type = 'wisp'; // Default fallback

        if (biome === 'Desert') {
            type = Math.random() > 0.6 ? 'crawler' : 'boulder'; // Crawlers common in desert
        } 
        else if (biome === 'Tundra') {
            type = 'yeti'; // Yetis in snow
        } 
        else if (biome === 'Mountain') {
            type = Math.random() > 0.5 ? 'phantom' : 'sentinel'; // Dangerous high altitude
        } 
        else if (biome === 'Forest' || biome === 'Plains') {
            const r = Math.random();
            if (r < 0.4) type = 'gloom';
            else if (r < 0.7) type = 'imp';
            else type = 'wisp';
        }
        else if (biome === 'Ocean') {
            continue; // Skip ocean for now
        }

        // Add to global mobs array
        mobs.push(new Mob(type, x, y, z));
    }
}

// --- INITIALIZATION CALLED BY NETWORK ---
function startGame() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 10, RENDER_DISTANCE * CHUNK_SIZE - 2); 
    camera = new THREE.PerspectiveCamera(graphicsSettings.fov, window.innerWidth/window.innerHeight, 0.1, 1000);
    
    hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    scene.add(hemiLight);
    dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.castShadow = graphicsSettings.shadows; 
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.camera.left = -60; dirLight.shadow.camera.right = 60; 
    dirLight.shadow.camera.top = 60; dirLight.shadow.camera.bottom = -60;
    scene.add(dirLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio * graphicsSettings.resolution);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    updateInventoryUI();

    const breakGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const breakMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, map: crackTextures[0], depthTest: false, depthWrite: false });
    breakingMesh = new THREE.Mesh(breakGeo, breakMat); breakingMesh.visible = false; breakingMesh.renderOrder = 999; scene.add(breakingMesh);

    const selGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01,1.01,1.01));
    selectMesh = new THREE.LineSegments(selGeo, new THREE.LineBasicMaterial({color:0x000000}));
    selectMesh.visible = false; scene.add(selectMesh);

    document.addEventListener('keydown', onKeyDown); document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown); document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
    
    // Initial Load
    updateChunks();
    
    // Load stored pos if available
    if (Network.user && Network.user.x) {
        player.pos.set(Network.user.x, Network.user.y, Network.user.z);
    } else {
        let spawnY = 60; for(let y=60; y>0; y--) { if(getBlockGlobal(0, y, 0) !== ITEMS.AIR) { spawnY = y + 2; break; } }
        player.pos.set(0, spawnY, 0);
    }

    // --- TRIGGER SPAWN ---
    spawnWorldMobs();

    animate();
}

function onKeyDown(e) {
    if(e.code === 'KeyE') {
        isInvOpen = !isInvOpen;
        document.getElementById('inventory-screen').style.display = isInvOpen ? 'flex' : 'none';
        if(isInvOpen) document.exitPointerLock(); else document.body.requestPointerLock();
        return;
    }

    if(isInvOpen && player.dragSource && e.code.startsWith('Digit')) {
        const num = parseInt(e.code.replace('Digit',''));
        if(num >=1 && num <= 8) {
            const targetIndex = num - 1;
            const sourceList = player.dragSource.list === 'hotbar' ? player.hotbar : player.inventory;
            const sItem = sourceList[player.dragSource.index];
            const tItem = player.hotbar[targetIndex];

            const temp = { id: sItem.id, count: sItem.count, dur: sItem.dur };
            sItem.id = tItem.id; sItem.count = tItem.count; sItem.dur = tItem.dur;
            tItem.id = temp.id; tItem.count = temp.count; tItem.dur = temp.dur;

            player.dragSource = null; 
            updateInventoryUI();
            return; 
        }
    }

    if(isInvOpen) return;

    if(e.code.startsWith('Digit') && e.code !== 'Digit9' && e.code !== 'Digit0') {
        const num = parseInt(e.code.replace('Digit','')); if(num >=1 && num <=8) { player.selectedSlot = num-1; updateInventoryUI(); }
    }
    if(e.code === 'KeyW') { const now = performance.now(); if(now - player.lastSprintTime < 300) player.isSprinting = true; player.lastSprintTime = now; keys.w = true; }
    switch(e.code) { case 'KeyA': keys.a = true; break; case 'KeyS': keys.s = true; break; case 'KeyD': keys.d = true; break; case 'Space': keys.space = true; break; case 'ShiftLeft': keys.shift = true; player.isSprinting = true; break; case 'KeyC': keys.crouch = true; player.isCrouching = true; break; }
}

function onKeyUp(e) {
    switch(e.code) { case 'KeyW': keys.w = false; player.isSprinting = false; break; case 'KeyA': keys.a = false; break; case 'KeyS': keys.s = false; break; case 'KeyD': keys.d = false; break; case 'Space': keys.space = false; break; case 'ShiftLeft': keys.shift = false; player.isSprinting = false; break; case 'KeyC': keys.crouch = false; player.isCrouching = false; break; }
}

function onMouseMove(e) {
    if(document.pointerLockElement === document.body && !isInvOpen) {
        camera.rotation.order = 'YXZ'; camera.rotation.y -= e.movementX * 0.002; camera.rotation.x -= e.movementY * 0.002;
        camera.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, camera.rotation.x));
    }
}

function onMouseDown(e) {
    if(isInvOpen) return;
    if(document.pointerLockElement !== document.body) { document.body.requestPointerLock(); return; }
    if(e.button === 0) keys.leftClick = true; 
    if(e.button === 2) {
        player.eat(); 
        const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(0,0), camera); ray.far = 6;
        const meshes = Object.values(chunks).map(c=>c.mesh).filter(m=>m);
        const hits = ray.intersectObjects(meshes);
        if(hits.length > 0) {
            const hit = hits[0];
            const bx = Math.floor(hit.point.x - hit.face.normal.x * 0.1);
            const by = Math.floor(hit.point.y - hit.face.normal.y * 0.1);
            const bz = Math.floor(hit.point.z - hit.face.normal.z * 0.1);
            const clickedId = getBlockGlobal(bx,by,bz);

            if(clickedId === ITEMS.TNT) { // Ignite
                explode(bx, by, bz, 4);
                return;
            }

            const p2 = hit.point.clone().add(hit.face.normal.clone().multiplyScalar(0.1));
            const ax = Math.floor(p2.x), ay = Math.floor(p2.y), az = Math.floor(p2.z);
            const pMin = new THREE.Vector3(player.pos.x-0.3, player.pos.y, player.pos.z-0.3);
            const pMax = new THREE.Vector3(player.pos.x+0.3, player.pos.y+1.8, player.pos.z+0.3);
            if(!(pMax.x < ax || pMin.x > ax+1 || pMax.y < ay || pMin.y > ay+1 || pMax.z < az || pMin.z > az+1)) return;

            const slot = player.hotbar[player.selectedSlot];
            if(slot.id && slot.count > 0 && BLOCK_PROPS[slot.id]) {
                setBlockGlobal(ax, ay, az, slot.id); // This will auto-sync to network inside engine.js
                if(slot.id !== 11) slot.count--; 
                updateInventoryUI();
            }
        }
    }
}
function onMouseUp(e) { if(e.button === 0) { keys.leftClick = false; breakingState.active = false; breakingMesh.visible = false; } }

function spawnParticles(x, y, z, color) {
    for(let i=0; i<5; i++) {
        const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x + Math.random(), y + Math.random(), z + Math.random());
        scene.add(mesh);
        particles.push({ mesh, vel: new THREE.Vector3((Math.random()-0.5)*5, Math.random()*5, (Math.random()-0.5)*5), life: 60 });
    }
}

function updateChunks() {
    const pcx = Math.floor(player.pos.x / CHUNK_SIZE), pcz = Math.floor(player.pos.z / CHUNK_SIZE);
    
    // Add New
    for(let x=-RENDER_DISTANCE; x<=RENDER_DISTANCE; x++)
    for(let z=-RENDER_DISTANCE; z<=RENDER_DISTANCE; z++) {
        const k = `${pcx+x},${pcz+z}`;
        if(!chunks[k]) { chunks[k] = new Chunk(pcx+x, pcz+z); chunks[k].buildMesh(scene); }
    }

    // Unload Old (Using Manhattan distance/Box check for speed instead of sqrt)
    for(let k in chunks) {
        const c = chunks[k];
        if (Math.abs(c.cx - pcx) > RENDER_DISTANCE || Math.abs(c.cz - pcz) > RENDER_DISTANCE) {
            if(c.mesh) { scene.remove(c.mesh); c.mesh.geometry.dispose(); c.mesh=null; }
            if(c.transMesh) { scene.remove(c.transMesh); c.transMesh.geometry.dispose(); c.transMesh=null; }
            if(c.torchMesh) { scene.remove(c.torchMesh); c.torchMesh.geometry.dispose(); c.torchMesh=null; }
            delete chunks[k];
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const dt = Math.min((time - lastTime)/1000, 0.1);
    lastTime = time;

    worldTime += dt * 0.01; 
    const sunAngle = worldTime * Math.PI * 2;
    dirLight.position.set(Math.sin(sunAngle)*100, Math.cos(sunAngle)*100, 50).add(player.pos); 
    
    const skyColor = new THREE.Color();
    const noon = new THREE.Color(0x87CEEB); const sunset = new THREE.Color(0xfd5e53); const night = new THREE.Color(0x000022);
    const cosTime = Math.cos(sunAngle);
    if(cosTime > 0.5) skyColor.copy(noon); else if(cosTime > 0) skyColor.lerpColors(sunset, noon, cosTime*2); else if(cosTime > -0.5) skyColor.lerpColors(night, sunset, (cosTime+0.5)*2); else skyColor.copy(night);
    scene.background = skyColor; 
    scene.fog.color = skyColor;
    // Dynamic Fog Distance
    scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, RENDER_DISTANCE * CHUNK_SIZE - 2, 0.1); 
    
    dirLight.intensity = Math.max(0, cosTime);

    // Network: Sync Other Players
    for(let pid in Network.otherPlayers) {
        const p = Network.otherPlayers[pid];
        if(p.targetPos) p.mesh.position.lerp(p.targetPos, 0.2);
    }

    if(!isInvOpen) {
        // --- PERFORMANCE FIX: THROTTLED CHUNK UPDATES ---
        // Only run chunk logic every 500ms, not every frame
        if (time - lastChunkUpdate > 500) {
            updateChunks();
            lastChunkUpdate = time;
        }

        // Network: Send My Position
        Network.updatePosition(player.pos, camera.rotation.y);

        // Selection Wireframe
        const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(0,0), camera); ray.far = 5;
        const meshes = Object.values(chunks).map(c=>c.mesh).filter(m=>m);
        const hits = ray.intersectObjects(meshes);
        if(hits.length > 0) {
            const hit = hits[0];
            const p = hit.point.clone().sub(hit.face.normal.clone().multiplyScalar(0.1));
            const bx=Math.floor(p.x), by=Math.floor(p.y), bz=Math.floor(p.z);
            selectMesh.position.set(bx+0.5, by+0.5, bz+0.5); selectMesh.visible = true;

            if(keys.leftClick) {
                const id = getBlockGlobal(bx, by, bz);
                if(id !== ITEMS.BEDROCK && id !== ITEMS.AIR) {
                    if(!breakingState.active || breakingState.x!==bx || breakingState.y!==by || breakingState.z!==bz) {
                        let speed = 1.0;
                        const tool = player.hotbar[player.selectedSlot];
                        if(tool && TOOLS[tool.id]) speed = TOOLS[tool.id].speed;
                        breakingState = { active: true, x: bx, y: by, z: bz, time: 0, maxTime: (BLOCK_PROPS[id].hardness)/speed };
                        breakingMesh.position.set(bx+0.5, by+0.5, bz+0.5); breakingMesh.visible = true;
                    }
                    breakingState.time += dt;
                    if(breakingState.time >= breakingState.maxTime) {
                        setBlockGlobal(bx, by, bz, ITEMS.AIR); // Auto-syncs to network
                        spawnDrop(bx, by, bz, BLOCK_PROPS[id].drop || id);
                        spawnParticles(bx, by, bz, BLOCK_PROPS[id].color);
                        if(BLOCK_PROPS[id].chanceDrop && Math.random() < BLOCK_PROPS[id].chanceDrop.chance) spawnDrop(bx,by,bz, BLOCK_PROPS[id].chanceDrop.id);
                        
                        breakingState.active = false; breakingMesh.visible = false;
                        player.hunger = Math.max(0, player.hunger - 0.1);
                        
                        const tool = player.hotbar[player.selectedSlot];
                        if(tool && TOOLS[tool.id]) {
                            tool.dur--; 
                            if(tool.dur <= 0) { tool.id = 0; tool.count = 0; }
                            updateInventoryUI();
                        }
                    }
                    breakingMesh.material.map = crackTextures[Math.floor((breakingState.time/breakingState.maxTime)*9)];
                }
            } else { breakingState.active = false; breakingMesh.visible = false; }
        } else { breakingState.active = false; breakingMesh.visible = false; selectMesh.visible = false; }

        const headBlock = getBlockGlobal(Math.floor(player.pos.x), Math.floor(player.pos.y + 1.6), Math.floor(player.pos.z));
        const inWater = (headBlock === ITEMS.WATER);
        const friction = inWater ? 2.0 : (player.onGround ? 10.0 : 1.0);
        const speed = (player.isSprinting && !inWater && !player.isCrouching) ? SPRINT_SPEED : (player.isCrouching ? 2.0 : MOVE_SPEED);
        
        if(inWater) {
            player.vel.y -= 5.0 * dt; if(keys.space) player.vel.y += 15.0 * dt; 
            player.oxygen -= dt * 2; if(player.oxygen <= 0) { player.health -= dt; updateHud(); }
        } else {
            player.vel.y -= GRAVITY * dt; player.oxygen = Math.min(20, player.oxygen + dt * 5);
            if(player.onGround && keys.space) { player.vel.y = JUMP_FORCE; player.onGround = false; player.hunger -= 0.2; }
        }
        if(player.hunger > 18 && player.health < 20) player.health += dt * 0.5;
        
        const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
        const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0,1,0)).normalize();
        const input = new THREE.Vector3();
        if(keys.w) input.add(fwd); if(keys.s) input.sub(fwd); if(keys.d) input.add(right); if(keys.a) input.sub(right);
        const isMoving = input.length() > 0;
        if(isMoving) { input.normalize().multiplyScalar(speed); if(player.isSprinting) player.hunger -= dt * 0.5; }
        
        player.vel.x += (input.x - player.vel.x) * friction * dt; player.vel.z += (input.z - player.vel.z) * friction * dt;
        player.pos.x += player.vel.x * dt;
        let box = new THREE.Box3(new THREE.Vector3(player.pos.x-0.3, player.pos.y, player.pos.z-0.3), new THREE.Vector3(player.pos.x+0.3, player.pos.y+1.8, player.pos.z+0.3));
        if(getCollidingBlocks(box).length > 0) { player.pos.x -= player.vel.x * dt; player.vel.x = 0; }
        player.pos.z += player.vel.z * dt;
        box.set(new THREE.Vector3(player.pos.x-0.3, player.pos.y, player.pos.z-0.3), new THREE.Vector3(player.pos.x+0.3, player.pos.y+1.8, player.pos.z+0.3));
        if(getCollidingBlocks(box).length > 0) { player.pos.z -= player.vel.z * dt; player.vel.z = 0; }
        player.pos.y += player.vel.y * dt;
        box.set(new THREE.Vector3(player.pos.x-0.3, player.pos.y, player.pos.z-0.3), new THREE.Vector3(player.pos.x+0.3, player.pos.y+1.8, player.pos.z+0.3));
        if(getCollidingBlocks(box).length > 0) {
            player.pos.y -= player.vel.y * dt;
            // Fall Damage
            if(player.vel.y < -16 && !inWater) { 
                player.health -= (Math.abs(player.vel.y) - 13); 
                document.getElementById('vignette').style.background = 'radial-gradient(circle, transparent 20%, rgba(255,0,0,0.5) 100%)'; 
                setTimeout(()=>document.getElementById('vignette').style.background='radial-gradient(circle, transparent 50%, rgba(255,0,0,0) 100%)', 200); 
            }
            if(player.vel.y < 0) player.onGround = true; 
            player.vel.y = 0;
        } else { player.onGround = false; }
        if(player.pos.y < -10) { player.health = 0; player.pos.set(0, 50, 0); }
        
        const targetEye = player.isCrouching ? 1.2 : 1.6;
        camera.position.x = player.pos.x; camera.position.z = player.pos.z;
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, player.pos.y + targetEye, 0.2);

        // View Bobbing
        if(isMoving && player.onGround) {
            camera.position.y += Math.sin(time*0.015) * 0.05;
            camera.rotation.z = Math.sin(time*0.01) * 0.002;
        } else { camera.rotation.z = 0; }

        // Dynamic FOV (Respects Base FOV)
        const targetFov = player.isSprinting ? graphicsSettings.fov + 15 : graphicsSettings.fov;
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1);
        camera.updateProjectionMatrix();

        updateHud(); updateBlockPhysics(); 
        
        mobs.forEach(mob => {
            mob.update(dt, player.pos, camera);
            if (!mob.mesh) {
                const geo = new THREE.BoxGeometry(mob.scale.x, mob.scale.y, mob.scale.z);
                const mat = new THREE.MeshLambertMaterial({ color: mob.color });
                mob.mesh = new THREE.Mesh(geo, mat); scene.add(mob.mesh);
            }
            mob.mesh.position.copy(mob.pos);
            if(mob.type === 'wisp') mob.mesh.position.y += Math.sin(worldTime * 5) * 0.2;
        });
    }
    // REMOVED updateChunks() from here. It is now inside the throttled block above.
    
    // Particles
    for(let i=particles.length-1; i>=0; i--) {
        const p = particles[i]; p.life--;
        p.vel.y -= GRAVITY * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        if(p.mesh.position.y < player.pos.y - 10 || p.life <= 0) { scene.remove(p.mesh); particles.splice(i,1); }
        else {
            if(getBlockGlobal(Math.floor(p.mesh.position.x), Math.floor(p.mesh.position.y), Math.floor(p.mesh.position.z))) {
                p.vel.y *= -0.5; p.vel.x*=0.8; p.vel.z*=0.8;
            }
        }
    }

    // Drops Magnetism
    for(let i=drops.length-1; i>=0; i--) {
        const d = drops[i]; d.life -= dt;
        d.vel.y -= GRAVITY * dt;
        
        const distToPlayer = d.mesh.position.distanceTo(player.pos);
        if(distToPlayer < 3) {
            const dir = new THREE.Vector3().subVectors(player.pos, d.mesh.position).normalize();
            d.vel.add(dir.multiplyScalar(20 * dt));
        }

        d.mesh.position.addScaledVector(d.vel, dt);
        const by = Math.floor(d.mesh.position.y);
        if(getBlockGlobal(Math.floor(d.mesh.position.x), by, Math.floor(d.mesh.position.z))) {
            d.mesh.position.y = by + 0.6; d.vel.y = 0; d.vel.x *= 0.9; d.vel.z *= 0.9;
        }
        if(distToPlayer < 1.0) { player.addItem(d.itemId, 1); scene.remove(d.mesh); drops.splice(i,1); }
        else { d.mesh.rotation.y += dt; }
    }
    renderer.render(scene, camera);
}

function updateHud() {
    document.getElementById('health-bar').style.width = (player.health / 20 * 100) + '%';
    document.getElementById('hunger-bar').style.width = (player.hunger / 20 * 100) + '%';
    document.getElementById('oxygen-bar').style.width = (player.oxygen / 20 * 100) + '%';
    
    // --- FPS & BIOME FIX ---
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        lastFpsTime = now;
    }

    const biome = getBiome(player.pos.x, player.pos.z, player.pos.y); // Unified logic

    document.getElementById('debug').innerHTML = `Pos: ${Math.round(player.pos.x)},${Math.round(player.pos.y)},${Math.round(player.pos.z)} | Biome: ${biome} | FPS: ${currentFps}`;
}