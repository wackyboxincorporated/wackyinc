// --- NETWORK MANAGER ---
const Network = {
    user: null,
    id: null,
    otherPlayers: {}, 
    unsubChunks: null,
    unsubPlayers: null,
    lastPosUpdate: 0,
    
    // Login / Register
    login: async function(username) {
        const storedId = localStorage.getItem('voxel_uid');
        let uid = storedId;
        
        if (uid) {
            const doc = await db.collection('players').doc(uid).get();
            if (doc.exists) {
                console.log("Resuming session for " + doc.data().username);
                this.user = doc.data();
            } else {
                uid = null; 
            }
        }

        if (!uid) {
            const ref = db.collection('players').doc();
            uid = ref.id;
            await ref.set({
                username: username,
                x: 0, y: 60, z: 0, ry: 0,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
            localStorage.setItem('voxel_uid', uid);
            console.log("Created new user: " + username);
        }

        this.id = uid;
        this.initWorld();
    },

    // World Init & Global Listeners
    initWorld: async function() {
        // 1. Get or Create Seed
        const metaRef = db.collection('world').doc('meta');
        let metaDoc = await metaRef.get();
        
        if (!metaDoc.exists) {
            const seed = Math.random() * 10000;
            await metaRef.set({ seed: seed });
            console.log("World created with seed: " + seed);
            WORLD_SEED = seed;
        } else {
            WORLD_SEED = metaDoc.data().seed;
            console.log("Loaded seed: " + WORLD_SEED);
        }

        // 2. Listen for Chunk Changes (Real-time Block Sync)
        this.unsubChunks = db.collection('chunks').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                // We care about added (initial load) and modified (real-time updates)
                if (change.type === "added" || change.type === "modified") {
                    const data = change.doc.data();
                    const [cx, cz] = change.doc.id.split(',').map(Number);
                    
                    // Iterate through all modifications in this chunk
                    if (data.mods) {
                        for (const key in data.mods) {
                            // key format: "lx,ly,lz"
                            const [lx, ly, lz] = key.split(',').map(Number);
                            const blockId = data.mods[key];
                            
                            // Calculate Global Coordinates
                            const gx = cx * CHUNK_SIZE + lx;
                            const gz = cz * CHUNK_SIZE + lz;

                            // Apply update (isRemote = true prevents sending it back to server)
                            // This uses the global function exposed in engine.js
                            if (typeof setBlockGlobal === "function") {
                                setBlockGlobal(gx, ly, gz, blockId, true);
                            }
                        }
                    }
                }
            });
        });

        // 3. Listen for Players
        this.unsubPlayers = db.collection('players').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const pid = change.doc.id;
                if (pid === this.id) return; // Ignore self

                if (change.type === "removed") {
                    if (this.otherPlayers[pid]) {
                        scene.remove(this.otherPlayers[pid].mesh);
                        delete this.otherPlayers[pid];
                    }
                } else {
                    const pData = change.doc.data();
                    if (!this.otherPlayers[pid]) {
                        // Create Mesh for other players
                        const geo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
                        const mat = new THREE.MeshLambertMaterial({ color: 0xff5555 }); 
                        const mesh = new THREE.Mesh(geo, mat);
                        
                        // Username Label
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        ctx.font = "Bold 20px Courier New"; 
                        ctx.fillStyle = "white"; 
                        ctx.fillText(pData.username, 0, 20);
                        const tex = new THREE.CanvasTexture(canvas);
                        const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
                        label.position.y = 1.4; 
                        label.scale.set(3,1.5,1);
                        mesh.add(label);

                        scene.add(mesh);
                        this.otherPlayers[pid] = { mesh: mesh };
                    }
                    
                    // Update Target (Interpolation handled in game loop)
                    const ref = this.otherPlayers[pid];
                    ref.targetPos = new THREE.Vector3(pData.x, pData.y, pData.z);
                    ref.targetRot = pData.ry;
                }
            });
        });

        // Start Game
        document.getElementById('login-screen').style.display = 'none';
        if(typeof startGame === "function") startGame();
    },

    // Send My Position (Throttled to save writes)
    updatePosition: function(pos, rotY) {
        const now = Date.now();
        if (now - this.lastPosUpdate > 100) { 
            db.collection('players').doc(this.id).update({
                x: pos.x, y: pos.y, z: pos.z, ry: rotY,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.lastPosUpdate = now;
        }
    },

    // Send Block Change
    sendBlockUpdate: function(cx, cz, lx, ly, lz, id) {
        const docId = `${cx},${cz}`;
        const key = `${lx},${ly},${lz}`;
        
        // FIX: Create a nested object structure for correct Map merging
        const payload = {
            mods: {
                [key]: id
            }
        };

        // 'merge: true' will deeply merge the 'mods' object, preserving other block changes
        db.collection('chunks').doc(docId).set(payload, { merge: true });
    }
};

// UI Handler
function attemptLogin() {
    const name = document.getElementById('username-input').value;
    if(name.length > 0) {
        document.getElementById('login-status').innerText = "Connecting...";
        Network.login(name);
    }
}