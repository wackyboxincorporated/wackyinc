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
function openTile(title, contentEl, opts = {}) {
    const defaultOpts = { float: false, width: 400, height: 300, icon: '' };
    const options = { ...defaultOpts, ...opts };
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
    let calcWidth = options.width;
    let calcHeight = options.height;
    if (window.innerWidth <= 600) {
        calcWidth = Math.min(options.width, window.innerWidth - 24);
        calcHeight = Math.min(options.height, window.innerHeight - 80);
    }
    const tile = {
        id: id,
        title: title,
        element: el,
        contentEl: contentEl,
        isFloat: options.float,
        icon: options.icon,
        x: Math.max(12, Math.floor(window.innerWidth / 2 - calcWidth / 2)),
        y: Math.max(42, Math.floor(window.innerHeight / 2 - calcHeight / 2)),
        width: calcWidth,
        height: calcHeight
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
    if (tile.isFloat) {
        el.classList.add('floating');
        el.style.width = `${tile.width}px`;
        el.style.height = `${tile.height}px`;
        el.style.left = `${tile.x}px`;
        el.style.top = `${tile.y}px`;
        el.style.position = 'absolute';
        document.body.appendChild(el);
    } else {
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
    retile();
    if (typeof renderTopBar === 'function') {
        renderTopBar();
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
    activeTileId = id;
    openTiles.forEach(tile => {
        if (tile.id == id) {
            tile.element.classList.add('focused');
            if (tile.isFloat) {
                tile.element.style.zIndex = 1000;
            }
        } else {
            tile.element.classList.remove('focused');
            if (tile.isFloat) {
                tile.element.style.zIndex = 100;
            }
        }
    });
    if (typeof renderTopBar === 'function') {
        renderTopBar();
    }
}
function retile() {
    const tiledTiles = openTiles.filter(t => !t.isFloat);
    const container = document.getElementById('tile-container');
    const topBar = document.getElementById('top-bar');
    if (!container) return;
    const gap = (typeof kSettings !== 'undefined' && kSettings.tileGap !== undefined) ? kSettings.tileGap : 10;
    container.style.gap = `${gap}px`;
    if (tiledTiles.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'grid';
    if (topBar) {
        topBar.style.display = 'flex';
    }
    tiledTiles.forEach(tile => {
        tile.element.style.gridRow = '';
        tile.element.style.gridColumn = '';
    });
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
}
function toggleFloat(id) {
    const tile = getTileById(id);
    if (!tile) return;
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
