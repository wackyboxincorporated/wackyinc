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
    header.addEventListener('mousedown', (e) => {
        if (!tile.isFloat) return;
        if (e.target.closest('.tile-controls')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = tile.element.offsetLeft;
        initialY = tile.element.offsetTop;
        focusTile(tile.id);
        e.preventDefault();
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    function getViewportBounds() {
        const scale = (typeof kSettings !== 'undefined' && kSettings.contentScale) ? kSettings.contentScale : 1.0;
        return {
            w: window.innerWidth / scale,
            h: window.innerHeight / scale,
            scale: scale
        };
    }
    function onMouseMove(e) {
        if (!isDragging) return;
        const bounds = getViewportBounds();
        const dx = (e.clientX - startX) / bounds.scale;
        const dy = (e.clientY - startY) / bounds.scale;
        tile.x = Math.max(0, Math.min(initialX + dx, bounds.w - 50));
        tile.y = Math.max(32, Math.min(initialY + dy, bounds.h - 32));
        tile.element.style.left = `${tile.x}px`;
        tile.element.style.top = `${tile.y}px`;
    }
    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
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
                <button class="tile-control-btn float" title="toggle float">⊡</button>
                <button class="tile-control-btn close" title="close">✕</button>
            </div>
        </div>
        <div class="tile-content"></div>
    `;
    const contentContainer = el.querySelector('.tile-content');
    if (contentEl) {
        contentContainer.appendChild(contentEl);
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
        lastFocused: Date.now()
    };
    const closeBtn = el.querySelector('.tile-control-btn.close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTile(id);
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
        tile.lastFocused = Date.now();
    }
    const isMobile = isMobilePhone();
    const isPortrait = isPortraitMode();
    if (isMobile && isPortrait) {
        openTiles.forEach(t => t.visible = false);
        const focused = getTileById(activeTileId);
        if (focused) focused.visible = true;
        const otherTiles = openTiles.filter(t => t.id != activeTileId);
        if (otherTiles.length > 0) {
            otherTiles.sort((a, b) => (b.lastFocused || 0) - (a.lastFocused || 0));
            otherTiles[0].visible = true;
        }
    } else {
        openTiles.forEach(t => t.visible = true);
    }
    openTiles.forEach(t => {
        if (t.visible === false) {
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
    const tiledTiles = openTiles.filter(t => !t.isFloat && t.visible !== false);
    const container = document.getElementById('tile-container');
    const topBar = document.getElementById('top-bar');
    if (!container) return;
    const isMobile = isMobilePhone();
    const isPortrait = isPortraitMode();
    if (!isMobile) {
        let autoGap = 8;
        if (tiledTiles.length === 1) autoGap = 0;
        else if (tiledTiles.length === 2) autoGap = 8;
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
    tiledTiles.forEach(tile => {
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
        container.style.gridTemplateRows = '1fr 1fr';
    } else {
        container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
        container.style.gridTemplateRows = 'auto';
    }
    renderSplitHandle(container, tiledTiles);
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
                <button class="split-popup-btn" id="split-btn-change">⇇ change app</button>
            </div>
        `;
        document.body.appendChild(handle);
        const trigger = handle.querySelector('#split-handle-trigger');
        const popup = handle.querySelector('#split-popup-menu');
        const swapBtn = handle.querySelector('#split-btn-swap');
        const changeBtn = handle.querySelector('#split-btn-change');
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            popup.style.display = popup.style.display === 'none' ? 'flex' : 'none';
        });
        document.addEventListener('click', (e) => {
            if (!handle.contains(e.target)) {
                popup.style.display = 'none';
            }
        });
        swapBtn.addEventListener('click', () => {
            popup.style.display = 'none';
            if (openTiles.length >= 2 && visibleTiles.length === 2) {
                const idx0 = openTiles.indexOf(visibleTiles[0]);
                const idx1 = openTiles.indexOf(visibleTiles[1]);
                if (idx0 !== -1 && idx1 !== -1) {
                    const temp = openTiles[idx0];
                    openTiles[idx0] = openTiles[idx1];
                    openTiles[idx1] = temp;
                    retile();
                }
            }
        });
        changeBtn.addEventListener('click', () => {
            popup.style.display = 'none';
            showAppSelectorModal(visibleTiles);
        });
    }
    if (visibleTiles.length === 2) {
        handle.style.display = 'flex';
        const rect0 = visibleTiles[0].element.getBoundingClientRect();
        const rect1 = visibleTiles[1].element.getBoundingClientRect();
        const isVert = Math.abs(rect0.top - rect1.top) > 50;
        if (isVert) {
            const midY = (rect0.bottom + rect1.top) / 2;
            const midX = (rect0.left + rect0.right) / 2;
            handle.style.top = `${midY - 14}px`;
            handle.style.left = `${midX - 14}px`;
        } else {
            const midX = (rect0.right + rect1.left) / 2;
            const midY = (rect0.top + rect0.bottom) / 2;
            handle.style.left = `${midX - 14}px`;
            handle.style.top = `${midY - 14}px`;
        }
    } else {
        handle.style.display = 'none';
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
            <div class="change-app-item" data-id="${tile.id}" style="display:flex; justify-space-between; align-items:center; padding:10px; border-bottom:1px solid #111; cursor:pointer; color:${isVisible ? '#888' : '#fff'};">
                <span>${tile.icon || '■'} ${tile.title.toLowerCase()}</span>
                <span style="font-size:10px; color:${isVisible ? '#666' : '#3399ff'};">${isVisible ? '[visible]' : '[background]'}</span>
            </div>
        `;
    });
    overlay.innerHTML = `
        <div style="background:#000; border:1px solid #333; padding:20px; width:340px; max-width:90vw; max-height:80vh; display:flex; flex-direction:column; box-sizing:border-box;">
            <div style="font-size:14px; color:#fff; margin-bottom:12px;">select app to display:</div>
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
    const appItems = overlay.querySelectorAll('.change-app-item');
    appItems.forEach(item => {
        item.onclick = () => {
            const chosenId = item.dataset.id;
            const chosenTile = getTileById(chosenId);
            if (chosenTile && visibleTiles[selectedTargetIdx]) {
                const oldTile = visibleTiles[selectedTargetIdx];
                oldTile.visible = false;
                chosenTile.visible = true;
                focusTile(chosenTile.id);
            }
            overlay.style.display = 'none';
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
document.addEventListener('keydown', (e) => {
    if ((e.altKey && e.key.toLowerCase() === 'q') || (e.ctrlKey && e.key.toLowerCase() === 'w')) {
        if (activeTileId !== null) {
            closeTile(activeTileId);
            e.preventDefault();
        }
    }
    if (e.altKey && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (index >= 0 && index < openTiles.length) {
            focusTile(openTiles[index].id);
            e.preventDefault();
        }
    }
    if (e.altKey && e.key.toLowerCase() === 'f') {
        if (activeTileId !== null) {
            toggleFloat(activeTileId);
            e.preventDefault();
        }
    }
    if (e.altKey && e.key.toLowerCase() === 'm') {
        const menu = document.getElementById('main-menu');
        if (menu) {
            if (menu.classList.contains('collapsed')) {
                if (typeof expandMenu === 'function') expandMenu();
            } else {
                if (typeof collapseMenu === 'function') collapseMenu();
            }
        }
        e.preventDefault();
    }
});
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
