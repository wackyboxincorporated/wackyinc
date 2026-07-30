let openTiles = [];
let activeTileId = null;
let tileIdCounter = 0;
function getTileById(id) {
    return openTiles.find(t => t.id == id);
}
function makeDraggable(tile) {
    const header = tile.element.querySelector('.tile-header');
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;
    let currentTargetTile = null;
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.tile-controls')) return;
        if (tile.isFloat) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = tile.element.offsetLeft;
            initialY = tile.element.offsetTop;
            focusTile(tile.id);
            e.preventDefault();
            document.addEventListener('mousemove', onMouseMoveFloat);
            document.addEventListener('mouseup', onMouseUpFloat);
        } else if (!isMobilePhone()) {
            isDragging = true;
            currentTargetTile = null;
            focusTile(tile.id);
            tile.element.style.opacity = '0.75';
            tile.element.style.transform = 'scale(0.98)';
            tile.element.style.zIndex = '5000';
            tile.element.style.transition = 'transform 0.1s ease, opacity 0.1s ease';
            e.preventDefault();
            document.addEventListener('mousemove', onMouseMoveTiled);
            document.addEventListener('mouseup', onMouseUpTiled);
        }
    });
    function getScaleFactor() {
        return (typeof kSettings !== 'undefined' && kSettings.contentScale) ? kSettings.contentScale : 1.0;
    }
    function onMouseMoveFloat(e) {
        if (!isDragging) return;
        const scale = getScaleFactor();
        const dx = (e.clientX - startX) / scale;
        const dy = (e.clientY - startY) / scale;
        const boundsW = window.innerWidth / scale;
        const boundsH = window.innerHeight / scale;
        tile.x = Math.max(0, Math.min(initialX + dx, boundsW - 50));
        tile.y = Math.max(32 / scale, Math.min(initialY + dy, boundsH - 32));
        tile.element.style.left = `${tile.x}px`;
        tile.element.style.top = `${tile.y}px`;
    }
    function onMouseUpFloat() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMoveFloat);
        document.removeEventListener('mouseup', onMouseUpFloat);
    }
    function getOrCreateDropIndicator() {
        let indicator = document.getElementById('tile-drop-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'tile-drop-indicator';
            indicator.style.position = 'fixed';
            indicator.style.pointerEvents = 'none';
            indicator.style.border = '2px dashed #ffffff';
            indicator.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
            indicator.style.zIndex = '9000';
            indicator.style.boxShadow = '0 0 16px rgba(255, 255, 255, 0.25)';
            indicator.style.transition = 'all 0.1s ease';
            indicator.style.display = 'none';
            document.body.appendChild(indicator);
        }
        return indicator;
    }
    function onMouseMoveTiled(e) {
        if (!isDragging) return;
        const activeTiled = openTiles.filter(t => !t.isFloat && !t.minimized && t.visible !== false);
        const indicator = getOrCreateDropIndicator();
        let foundTarget = null;
        for (const other of activeTiled) {
            if (other.id === tile.id) continue;
            const rect = other.element.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                foundTarget = other;
                break;
            }
        }
        currentTargetTile = foundTarget;
        if (currentTargetTile) {
            const scale = getScaleFactor();
            const rect = currentTargetTile.element.getBoundingClientRect();
            indicator.style.display = 'block';
            indicator.style.left = `${rect.left / scale}px`;
            indicator.style.top = `${rect.top / scale}px`;
            indicator.style.width = `${rect.width / scale}px`;
            indicator.style.height = `${rect.height / scale}px`;
        } else {
            indicator.style.display = 'none';
        }
    }
    function onMouseUpTiled() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMoveTiled);
        document.removeEventListener('mouseup', onMouseUpTiled);
        const indicator = document.getElementById('tile-drop-indicator');
        if (indicator) indicator.style.display = 'none';
        tile.element.style.opacity = '';
        tile.element.style.transform = '';
        tile.element.style.zIndex = '';
        tile.element.style.transition = '';
        if (currentTargetTile && currentTargetTile.id !== tile.id) {
            const idx0 = openTiles.indexOf(tile);
            const idx1 = openTiles.indexOf(currentTargetTile);
            if (idx0 !== -1 && idx1 !== -1) {
                openTiles[idx0] = currentTargetTile;
                openTiles[idx1] = tile;
            }
            retile();
            if (typeof renderTopBar === 'function') renderTopBar();
        }
        currentTargetTile = null;
    }
    header.addEventListener('touchstart', (e) => {
        if (!tile.isFloat) return;
        if (e.target.closest('.tile-controls')) return;
        if (e.touches.length !== 1) return;
        isDragging = true;
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        initialX = tile.element.offsetLeft;
        initialY = tile.element.offsetTop;
        focusTile(tile.id);
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
        document.addEventListener('touchcancel', onTouchEnd);
    });
    function onTouchMove(e) {
        if (!isDragging || e.touches.length !== 1) return;
        const bounds = getViewportBounds();
        const touch = e.touches[0];
        const dx = (touch.clientX - startX) / bounds.scale;
        const dy = (touch.clientY - startY) / bounds.scale;
        tile.x = Math.max(0, Math.min(initialX + dx, bounds.w - 50));
        tile.y = Math.max(32, Math.min(initialY + dy, bounds.h - 32));
        tile.element.style.left = `${tile.x}px`;
        tile.element.style.top = `${tile.y}px`;
        e.preventDefault();
    }
    function onTouchEnd() {
        isDragging = false;
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        document.removeEventListener('touchcancel', onTouchEnd);
    }
}
function isMobilePhone() {
    return window.innerWidth <= 600 || window.matchMedia('(max-width: 600px)').matches || ('ontouchstart' in window && window.innerWidth <= 768);
}
function isPortraitMode() {
    return window.matchMedia('(orientation: portrait)').matches || (window.innerHeight > window.innerWidth && window.innerWidth <= 800);
}
function openTile(title, contentEl, opts = {}) {
    const defaultOpts = { float: false, width: 400, height: 300, icon: '' };
    const options = { ...defaultOpts, ...opts };
    if (isMobilePhone()) {
        options.float = false;
    }
    const id = ++tileIdCounter;
    const el = document.createElement('div');
    el.className = 'tile-window';
    el.dataset.tileId = id;
    el.innerHTML = `
        <div class="tile-header">
            <span class="tile-title">${title}</span>
            <div class="tile-controls">
                <button class="tile-control-btn minimize" title="minimize">_</button>
                <button class="tile-control-btn float" title="toggle float">⊡</button>
                <button class="tile-control-btn close" title="close">✕</button>
            </div>
        </div>
        <div class="tile-content"></div>
    `;
    const contentContainer = el.querySelector('.tile-content');
    if (contentEl) {
        contentContainer.appendChild(contentEl);
        const iframes = contentContainer.querySelectorAll('iframe');
        iframes.forEach(iframe => bindIframeShortcutListener(iframe));
        if (contentEl.tagName === 'IFRAME') {
            bindIframeShortcutListener(contentEl);
        }
    }
    const tile = {
        id,
        title,
        element: el,
        isFloat: options.float,
        width: options.width,
        height: options.height,
        x: options.x || 50,
        y: options.y || 50,
        icon: options.icon || '',
        visible: true,
        minimized: false,
        lastFocused: Date.now()
    };
    const closeBtn = el.querySelector('.tile-control-btn.close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTile(id);
    });
    const minBtn = el.querySelector('.tile-control-btn.minimize');
    minBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        minimizeTile(id);
    });
    const floatBtn = el.querySelector('.tile-control-btn.float');
    floatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFloat(id);
    });
    const header = el.querySelector('.tile-header');
    header.addEventListener('mousedown', () => {
        focusTile(id);
    });
    makeDraggable(tile);
    if (tile.isFloat && !isMobilePhone()) {
        el.classList.add('floating');
        el.style.width = `${tile.width}px`;
        el.style.height = `${tile.height}px`;
        el.style.left = `${tile.x}px`;
        el.style.top = `${tile.y}px`;
        el.style.position = 'absolute';
        document.body.appendChild(el);
    } else {
        tile.isFloat = false;
        const container = document.getElementById('tile-container');
        if (container) {
            container.appendChild(el);
        }
    }
    openTiles.push(tile);
    focusTile(id);
    if (typeof collapseMenu === 'function') {
        collapseMenu();
    }
    return id;
}
function minimizeTile(id) {
    const tile = getTileById(id);
    if (!tile) return;
    tile.minimized = true;
    tile.visible = false;
    tile.element.style.display = 'none';
    if (activeTileId == id) {
        const remainingVisible = openTiles.filter(t => t.id != id && !t.minimized && t.visible !== false);
        if (remainingVisible.length > 0) {
            activeTileId = remainingVisible[remainingVisible.length - 1].id;
        } else {
            activeTileId = null;
        }
    }
    retile();
    if (typeof renderTopBar === 'function') renderTopBar();
    if (openTiles.filter(t => !t.minimized).length === 0 && typeof expandMenu === 'function') {
        expandMenu();
    }
}
function closeTile(id) {
    const tileIndex = openTiles.findIndex(t => t.id == id);
    if (tileIndex === -1) return;
    const tile = openTiles[tileIndex];
    if (tile.element.parentNode) {
        tile.element.parentNode.removeChild(tile.element);
    }
    openTiles.splice(tileIndex, 1);
    if (activeTileId == id) {
        if (openTiles.length > 0) {
            focusTile(openTiles[openTiles.length - 1].id);
        } else {
            activeTileId = null;
        }
    } else {
        focusTile(activeTileId || (openTiles[0] ? openTiles[0].id : null));
    }
    retile();
    if (typeof renderTopBar === 'function') {
        renderTopBar();
    }
    if (openTiles.length === 0 && typeof expandMenu === 'function') {
        expandMenu();
    }
}
function focusTile(id) {
    if (!id) return;
    activeTileId = id;
    const tile = getTileById(id);
    if (tile) {
        tile.minimized = false;
        tile.visible = true;
        tile.lastFocused = Date.now();
    }
    const isMobile = isMobilePhone();
    const isPortrait = isPortraitMode();
    if (isMobile && isPortrait) {
        openTiles.forEach(t => {
            if (t.id != activeTileId) t.visible = false;
        });
        const focused = getTileById(activeTileId);
        if (focused) {
            focused.visible = true;
            focused.minimized = false;
        }
        const otherTiles = openTiles.filter(t => t.id != activeTileId && !t.minimized);
        if (otherTiles.length > 0) {
            otherTiles.sort((a, b) => (b.lastFocused || 0) - (a.lastFocused || 0));
            otherTiles[0].visible = true;
        }
    } else {
        openTiles.forEach(t => {
            if (t.id == activeTileId) {
                t.visible = true;
                t.minimized = false;
            }
        });
    }
    openTiles.forEach(t => {
        if (t.minimized || t.visible === false) {
            t.element.style.display = 'none';
        } else {
            t.element.style.display = t.isFloat ? 'block' : 'flex';
        }
        if (t.id == id) {
            t.element.classList.add('focused');
            if (t.isFloat) t.element.style.zIndex = 1000;
        } else {
            t.element.classList.remove('focused');
            if (t.isFloat) t.element.style.zIndex = 100;
        }
    });
    if (typeof renderTopBar === 'function') {
        renderTopBar();
    }
    retile();
}
function retile() {
    const tiledTiles = openTiles.filter(t => !t.isFloat && !t.minimized && t.visible !== false);
    const container = document.getElementById('tile-container');
    const topBar = document.getElementById('top-bar');
    if (!container) return;
    const isMobile = isMobilePhone();
    const isPortrait = isPortraitMode();
    if (tiledTiles.length === 2) {
        container.style.gap = '16px';
    } else if (!isMobile) {
        let autoGap = 8;
        if (tiledTiles.length === 1) autoGap = 0;
        else if (tiledTiles.length === 3) autoGap = 4;
        else if (tiledTiles.length === 4) autoGap = 2;
        else if (tiledTiles.length >= 5) autoGap = 1;
        container.style.gap = `${autoGap}px`;
    } else {
        const gap = (typeof kSettings !== 'undefined' && kSettings.tileGap !== undefined) ? kSettings.tileGap : 6;
        container.style.gap = `${gap}px`;
    }
    if (tiledTiles.length === 0) {
        container.style.display = 'none';
        renderSplitHandle(container, []);
        return;
    }
    container.style.display = 'grid';
    if (topBar) {
        topBar.style.display = 'flex';
    }
    tiledTiles.forEach((tile, index) => {
        tile.element.style.order = index;
        tile.element.style.gridRow = '';
        tile.element.style.gridColumn = '';
        tile.element.style.display = 'flex';
    });
    if (isMobile) {
        if (isPortrait) {
            container.style.gridTemplateColumns = '1fr';
            if (tiledTiles.length === 1) {
                container.style.gridTemplateRows = '1fr';
            } else {
                container.style.gridTemplateRows = 'repeat(' + tiledTiles.length + ', 1fr)';
            }
        } else {
            container.style.gridTemplateRows = '1fr';
            container.style.gridTemplateColumns = 'repeat(' + tiledTiles.length + ', 1fr)';
        }
        renderSplitHandle(container, tiledTiles);
        return;
    }
    if (tiledTiles.length === 1) {
        container.style.gridTemplateColumns = '1fr';
        container.style.gridTemplateRows = '1fr';
    } else if (tiledTiles.length === 2) {
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr';
    } else if (tiledTiles.length === 3) {
        container.style.gridTemplateColumns = '1fr 1fr';
        container.style.gridTemplateRows = '1fr 1fr';
        tiledTiles[0].element.style.gridRow = '1 / 3';
    } else if (tiledTiles.length === 4) {
        container.style.gridTemplateColumns = '1fr 1fr';
    } else {
        container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
        container.style.gridTemplateRows = 'auto';
    }
    renderSplitHandle(container, tiledTiles);
    if (typeof checkWanderingBtnState === 'function') checkWanderingBtnState();
}
function getScaleFactor() {
    return (typeof kSettings !== 'undefined' && kSettings.contentScale) ? kSettings.contentScale : 1.0;
}
function makeHandleDraggable(handle) {
    const trigger = handle.querySelector('#split-handle-trigger');
    const popup = handle.querySelector('#split-popup-menu');
    let isDragging = false;
    let hasMoved = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;
    const onStart = (clientX, clientY) => {
        isDragging = true;
        hasMoved = false;
        startX = clientX;
        startY = clientY;
        initialLeft = handle.offsetLeft;
        initialTop = handle.offsetTop;
    };
    const onMove = (clientX, clientY) => {
        if (!isDragging) return;
        const scale = getScaleFactor();
        const dx = (clientX - startX) / scale;
        const dy = (clientY - startY) / scale;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            hasMoved = true;
            handle.dataset.userMoved = 'true';
        }
        const boundsW = window.innerWidth / scale;
        const boundsH = window.innerHeight / scale;
        const newLeft = Math.max(0, Math.min(boundsW - 36, initialLeft + dx));
        const newTop = Math.max(32 / scale, Math.min(boundsH - 36, initialTop + dy));
        handle.style.left = `${newLeft}px`;
        handle.style.top = `${newTop}px`;
    };
    const onEnd = () => {
        isDragging = false;
    };
    trigger.addEventListener('mousedown', (e) => {
        onStart(e.clientX, e.clientY);
        const moveHandler = (ev) => onMove(ev.clientX, ev.clientY);
        const upHandler = () => {
            onEnd();
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
        };
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    });
    trigger.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        onStart(e.touches[0].clientX, e.touches[0].clientY);
        const touchMoveHandler = (ev) => {
            if (ev.touches.length === 1) {
                onMove(ev.touches[0].clientX, ev.touches[0].clientY);
                ev.preventDefault();
            }
        };
        const touchEndHandler = () => {
            onEnd();
            document.removeEventListener('touchmove', touchMoveHandler);
            document.removeEventListener('touchend', touchEndHandler);
        };
        document.addEventListener('touchmove', touchMoveHandler, { passive: false });
        document.addEventListener('touchend', touchEndHandler);
    });
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hasMoved) return;
        popup.style.display = popup.style.display === 'none' ? 'flex' : 'none';
    });
}
function renderSplitHandle(container, visibleTiles) {
    let handle = document.getElementById('split-handle-overlay');
    if (!handle) {
        handle = document.createElement('div');
        handle.id = 'split-handle-overlay';
        handle.innerHTML = `
            <button id="split-handle-trigger" title="split options">⋮</button>
            <div id="split-popup-menu" style="display:none;">
                <button class="split-popup-btn" id="split-btn-swap">⇄ swap tiles</button>
                <button class="split-popup-btn" id="split-btn-change">quickL</button>
            </div>
        `;
        document.body.appendChild(handle);
        makeHandleDraggable(handle);
        const popup = handle.querySelector('#split-popup-menu');
        document.addEventListener('click', (e) => {
            if (!handle.contains(e.target)) {
                popup.style.display = 'none';
            }
        });
    }
    const popup = handle.querySelector('#split-popup-menu');
    const swapBtn = handle.querySelector('#split-btn-swap');
    const changeBtn = handle.querySelector('#split-btn-change');
    swapBtn.onclick = (e) => {
        e.stopPropagation();
        popup.style.display = 'none';
        const currentVisible = openTiles.filter(t => !t.isFloat && t.visible !== false);
        if (currentVisible.length === 2) {
            const t0 = currentVisible[0];
            const t1 = currentVisible[1];
            const idx0 = openTiles.indexOf(t0);
            const idx1 = openTiles.indexOf(t1);
            if (idx0 !== -1 && idx1 !== -1) {
                openTiles[idx0] = t1;
                openTiles[idx1] = t0;
            }
            delete handle.dataset.userMoved;
            retile();
            if (typeof renderTopBar === 'function') renderTopBar();
        }
    };
    changeBtn.onclick = (e) => {
        e.stopPropagation();
        popup.style.display = 'none';
        const currentVisible = openTiles.filter(t => !t.isFloat && t.visible !== false);
        showAppSelectorModal(currentVisible);
    };
    if (isMobilePhone() && visibleTiles.length === 2) {
        handle.style.display = 'flex';
        if (!handle.dataset.userMoved) {
            const scale = getScaleFactor();
            const rect0 = visibleTiles[0].element.getBoundingClientRect();
            const rect1 = visibleTiles[1].element.getBoundingClientRect();
            const isVert = Math.abs(rect0.top - rect1.top) > 50;
            let midX, midY;
            if (isVert) {
                midY = ((rect0.bottom + rect1.top) / 2) / scale;
                midX = ((rect0.left + rect0.right) / 2) / scale;
            } else {
                midX = ((rect0.right + rect1.left) / 2) / scale;
                midY = ((rect0.top + rect0.bottom) / 2) / scale;
            }
            handle.style.left = `${midX - 16}px`;
            handle.style.top = `${midY - 16}px`;
        }
    } else {
        handle.style.display = 'none';
        delete handle.dataset.userMoved;
    }
}
function showAppSelectorModal(visibleTiles) {
    let overlay = document.getElementById('change-app-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'change-app-overlay';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.zIndex = '10000';
        overlay.style.background = 'rgba(0,0,0,0.85)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.fontFamily = "'Share Tech Mono', monospace";
        overlay.style.textTransform = 'lowercase';
        document.body.appendChild(overlay);
    }
    const tile0Title = visibleTiles[0] ? visibleTiles[0].title.toLowerCase() : 'tile 1';
    const tile1Title = visibleTiles[1] ? visibleTiles[1].title.toLowerCase() : 'tile 2';
    let selectedTargetIdx = 0;
    let appListHTML = '';
    openTiles.forEach(tile => {
        const isVisible = visibleTiles.includes(tile);
        appListHTML += `
            <div class="change-app-item" data-id="${tile.id}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #111; cursor:pointer; color:${isVisible ? '#888' : '#fff'};">
                <span>${tile.icon || '■'} ${tile.title.toLowerCase()}</span>
                <span style="font-size:10px; color:${isVisible ? '#666' : '#3399ff'};">${isVisible ? '[visible]' : '[open background]'}</span>
            </div>
        `;
    });
    if (typeof systemApps !== 'undefined' && Array.isArray(systemApps)) {
        systemApps.forEach(sysApp => {
            const alreadyOpen = openTiles.some(t => t.title.toLowerCase() === sysApp.name.toLowerCase());
            if (!alreadyOpen) {
                appListHTML += `
                    <div class="change-app-system-item" data-appname="${sysApp.name}" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid #111; cursor:pointer; color:#fff;">
                        <span>${sysApp.icon || '⊞'} ${sysApp.name.toLowerCase()}</span>
                        <span style="font-size:10px; color:#888;">[launch new]</span>
                    </div>
                `;
            }
        });
    }
    overlay.innerHTML = `
        <div style="background:#000; border:1px solid #333; padding:20px; width:340px; max-width:90vw; max-height:80vh; display:flex; flex-direction:column; box-sizing:border-box;">
            <div style="font-size:14px; color:#fff; margin-bottom:12px;">quickL - select app to display:</div>
            <div style="font-size:11px; color:#888; margin-bottom:10px;">replace target tile slot:</div>
            <div style="display:flex; gap:8px; margin-bottom:14px;">
                <button class="target-slot-btn" data-slot="0" style="flex:1; padding:6px; border:1px solid #fff; background:#111; color:#fff; cursor:pointer; font-family:inherit;">1: ${tile0Title}</button>
                <button class="target-slot-btn" data-slot="1" style="flex:1; padding:6px; border:1px solid #333; background:none; color:#888; cursor:pointer; font-family:inherit;">2: ${tile1Title}</button>
            </div>
            <div class="app-list-container" style="flex:1; overflow-y:auto; scrollbar-width:none; border:1px solid #222; margin-bottom:14px;">
                ${appListHTML}
            </div>
            <button id="close-change-app-btn" style="width:100%; padding:8px; border:1px solid #333; background:none; color:#888; cursor:pointer; font-family:inherit;">cancel</button>
        </div>
    `;
    overlay.style.display = 'flex';
    const slotBtns = overlay.querySelectorAll('.target-slot-btn');
    slotBtns.forEach(btn => {
        btn.onclick = () => {
            slotBtns.forEach(b => {
                b.style.borderColor = '#333';
                b.style.color = '#888';
                b.style.background = 'none';
            });
            btn.style.borderColor = '#fff';
            btn.style.color = '#fff';
            btn.style.background = '#111';
            selectedTargetIdx = parseInt(btn.dataset.slot, 10);
        };
    });
    const handleTileReplace = (chosenTile) => {
        if (!chosenTile || !visibleTiles[selectedTargetIdx]) return;
        const targetOldTile = visibleTiles[selectedTargetIdx];
        targetOldTile.visible = false;
        targetOldTile.lastFocused = 0;
        chosenTile.visible = true;
        chosenTile.lastFocused = Date.now();
        const idxOld = openTiles.indexOf(targetOldTile);
        const idxChosen = openTiles.indexOf(chosenTile);
        if (idxOld !== -1 && idxChosen !== -1) {
            openTiles[idxOld] = chosenTile;
            openTiles[idxChosen] = targetOldTile;
        }
        const handle = document.getElementById('split-handle-overlay');
        if (handle) delete handle.dataset.userMoved;
        focusTile(chosenTile.id);
        retile();
        if (typeof renderTopBar === 'function') renderTopBar();
    };
    const appItems = overlay.querySelectorAll('.change-app-item');
    appItems.forEach(item => {
        item.onclick = () => {
            const chosenId = item.dataset.id;
            const chosenTile = getTileById(chosenId);
            handleTileReplace(chosenTile);
            overlay.style.display = 'none';
        };
    });
    const sysItems = overlay.querySelectorAll('.change-app-system-item');
    sysItems.forEach(item => {
        item.onclick = () => {
            const appName = item.dataset.appname;
            overlay.style.display = 'none';
            if (typeof launchApp === 'function') {
                const newId = launchApp(appName);
                const newTile = getTileById(newId);
                if (newTile) {
                    handleTileReplace(newTile);
                }
            }
        };
    });
    overlay.querySelector('#close-change-app-btn').onclick = () => {
        overlay.style.display = 'none';
    };
}
function toggleFloat(id) {
    const tile = getTileById(id);
    if (!tile) return;
    if (isMobilePhone()) {
        tile.isFloat = false;
        tile.element.classList.remove('floating');
        retile();
        return;
    }
    tile.isFloat = !tile.isFloat;
    if (tile.isFloat) {
        if (tile.element.parentNode) {
            tile.element.parentNode.removeChild(tile.element);
        }
        document.body.appendChild(tile.element);
        tile.element.classList.add('floating');
        tile.element.style.position = 'absolute';
        if (!tile.x || !tile.y) {
            tile.x = window.innerWidth / 2 - tile.width / 2;
            tile.y = window.innerHeight / 2 - tile.height / 2;
        }
        tile.element.style.left = `${tile.x}px`;
        tile.element.style.top = `${tile.y}px`;
        tile.element.style.width = `${tile.width}px`;
        tile.element.style.height = `${tile.height}px`;
        tile.element.style.gridRow = '';
        tile.element.style.gridColumn = '';
        focusTile(id);
    } else {
        if (tile.element.parentNode) {
            tile.element.parentNode.removeChild(tile.element);
        }
        const container = document.getElementById('tile-container');
        if (container) {
            container.appendChild(tile.element);
        }
        tile.element.classList.remove('floating');
        tile.element.style.position = '';
        tile.element.style.left = '';
        tile.element.style.top = '';
        tile.element.style.width = '';
        tile.element.style.height = '';
        tile.element.style.zIndex = '';
    }
    retile();
}
function bindIframeShortcutListener(iframe) {
    if (!iframe) return;
    const bind = () => {
        try {
            const win = iframe.contentWindow;
            if (win) {
                win.addEventListener('keydown', (e) => {
                    if (e.altKey) {
                        const key = e.key ? e.key.toLowerCase() : '';
                        if (['m', 'q', 'f', 's', 't', 'a', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
                            window.dispatchEvent(new KeyboardEvent('keydown', {
                                key: e.key,
                                altKey: true,
                                ctrlKey: e.ctrlKey,
                                shiftKey: e.shiftKey,
                                bubbles: true
                            }));
                            e.preventDefault();
                        }
                    }
                }, true);
            }
        } catch (err) {}
    };
    iframe.addEventListener('load', bind);
    bind();
}
window.addEventListener('keydown', (e) => {
    if (!e.altKey) return;
    const key = e.key ? e.key.toLowerCase() : '';
    if (key === 'q') {
        if (activeTileId !== null) {
            closeTile(activeTileId);
            e.preventDefault();
            e.stopPropagation();
        }
    }
    if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (index >= 0 && index < openTiles.length) {
            focusTile(openTiles[index].id);
            e.preventDefault();
            e.stopPropagation();
        }
    }
    if (key === 'f') {
        if (activeTileId !== null) {
            toggleFloat(activeTileId);
            e.preventDefault();
            e.stopPropagation();
        }
    }
    if (key === 'm') {
        const menu = document.getElementById('main-menu');
        if (menu) {
            if (menu.classList.contains('collapsed')) {
                if (typeof expandMenu === 'function') expandMenu();
            } else {
                if (typeof collapseMenu === 'function') collapseMenu();
            }
        }
        e.preventDefault();
        e.stopPropagation();
    }
    if (key === 's') {
        if (typeof expandMenu === 'function') expandMenu();
        const searchTab = document.querySelector('.menu-tab[data-tab="search"]');
        if (searchTab) searchTab.click();
        e.preventDefault();
        e.stopPropagation();
    }
    if (key === 't') {
        if (typeof expandMenu === 'function') expandMenu();
        const toolsTab = document.querySelector('.menu-tab[data-tab="tools"]');
        if (toolsTab) toolsTab.click();
        e.preventDefault();
        e.stopPropagation();
    }
    if (key === 'a') {
        if (typeof expandMenu === 'function') expandMenu();
        const appsTab = document.querySelector('.menu-tab[data-tab="apps"]');
        if (appsTab) appsTab.click();
        e.preventDefault();
        e.stopPropagation();
    }
}, true);
window.addEventListener('resize', () => {
    retile();
    if (typeof renderTopBar === 'function') renderTopBar();
});
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        retile();
        if (typeof renderTopBar === 'function') renderTopBar();
    }, 100);
});
