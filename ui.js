function renderUI() {
    renderDesktopIcons();
    renderMobileIcons();
}

function renderDesktopIcons() {
    const container = document.getElementById('desktop-icon-container');
    if (!container) return;

    // Ensure container has dimensions before calculating grid
    if (container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(renderDesktopIcons, 100);
        return;
    }

    container.innerHTML = '';

    // Create Wrapper and Dots container dynamically
    // Use JS styling to ensure it works without style.css modifications
    const wrapper = document.createElement('div');
    wrapper.id = 'desktop-pages-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'row';
    wrapper.style.overflowX = 'auto';
    wrapper.style.scrollSnapType = 'x mandatory';
    wrapper.style.height = '100%';
    wrapper.style.width = '100%';
    wrapper.style.scrollbarWidth = 'none'; // Firefox
    container.appendChild(wrapper);

    // Hide scrollbar Webkit
    const style = document.createElement('style');
    style.innerHTML = `#desktop-pages-wrapper::-webkit-scrollbar { display: none; }`;
    container.appendChild(style);

    const dotsContainer = document.createElement('div');
    dotsContainer.id = 'desktop-page-dots';
    dotsContainer.style.position = 'absolute';
    dotsContainer.style.bottom = '5px';
    dotsContainer.style.left = '0';
    dotsContainer.style.width = '100%';
    dotsContainer.style.display = 'flex';
    dotsContainer.style.justifyContent = 'center';
    dotsContainer.style.gap = '8px';
    dotsContainer.style.zIndex = '20';
    container.appendChild(dotsContainer);

    // Create a temporary icon to measure dimensions
    const tempIcon = createIconElement({ name: 'Temp', class: 'folder' });
    // We need to put it in a temp page to get correct spacing
    const tempPage = document.createElement('div');
    tempPage.style.position = 'absolute';
    tempPage.style.visibility = 'hidden';
    tempPage.appendChild(tempIcon);
    wrapper.appendChild(tempPage);

    const iconStyle = window.getComputedStyle(tempIcon);
    const iconWidth = tempIcon.offsetWidth + parseFloat(iconStyle.marginLeft) + parseFloat(iconStyle.marginRight);
    const iconHeight = tempIcon.offsetHeight + parseFloat(iconStyle.marginTop) + parseFloat(iconStyle.marginBottom);
    
    wrapper.removeChild(tempPage); // Clean up

    // Calculate capacity
    // Subtract space for dots at bottom (approx 40px)
    const availableHeight = container.clientHeight - 40; 
    const availableWidth = container.clientWidth;

    const cols = Math.floor(availableWidth / (iconWidth + 10)); // +10 for gap
    const rows = Math.floor(availableHeight / (iconHeight + 10));
    
    // Ensure at least 1 item per page to avoid infinity loops
    const iconsPerPage = Math.max(1, cols * rows);
    const totalPages = Math.ceil(desktopItems.length / iconsPerPage);

    // Generate Pages
    for (let i = 0; i < totalPages; i++) {
        const page = document.createElement('div');
        page.className = 'desktop-page';
        page.style.minWidth = '100%';
        page.style.height = '100%';
        page.style.scrollSnapAlign = 'start';
        page.style.display = 'flex';
        page.style.flexDirection = 'column';
        page.style.flexWrap = 'wrap';
        page.style.alignContent = 'flex-start';
        page.style.gap = '10px';
        page.style.padding = '10px';
        page.style.boxSizing = 'border-box';
        wrapper.appendChild(page);

        const dot = document.createElement('div');
        dot.className = 'dot';
        if (i === 0) dot.classList.add('active');
        dot.onclick = () => {
            wrapper.scrollTo({ left: wrapper.clientWidth * i, behavior: 'smooth' });
        };
        dotsContainer.appendChild(dot);
    }

    // Handle Scroll Updates for Dots
    wrapper.addEventListener('scroll', () => {
        const pageIndex = Math.round(wrapper.scrollLeft / wrapper.clientWidth);
        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((d, idx) => {
            d.classList.toggle('active', idx === pageIndex);
        });
    });

    // Place Icons
    desktopItems.forEach((item, index) => {
        const pageIndex = Math.floor(index / iconsPerPage);
        const page = wrapper.children[pageIndex];
        
        if (page) {
            const iconDiv = createIconElement(item);
            iconDiv.addEventListener('dblclick', () => launchItem(item));
            iconDiv.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.icon.selected').forEach(i => i.classList.remove('selected'));
                iconDiv.classList.add('selected');
            });
            // Dragging inside pagination is complex, simplified for now
            // dragElement(iconDiv); 
            page.appendChild(iconDiv);
        }
    });
}

function renderMobileIcons() {
    const pagesContainer = document.getElementById('mobile-icon-pages');
    const dotsContainer = document.getElementById('mobile-page-dots');
    if (!pagesContainer || !dotsContainer) return;

    if (pagesContainer.clientWidth === 0) {
        setTimeout(renderMobileIcons, 100);
        return;
    }

    pagesContainer.innerHTML = '';
    dotsContainer.innerHTML = '';

    const page = document.createElement('div');
    page.className = 'mobile-page';
    page.style.visibility = 'hidden'; 
    pagesContainer.appendChild(page);
    
    const style = window.getComputedStyle(page);
    const gridRowHeight = parseFloat(style.getPropertyValue('grid-auto-rows')) || 95;
    const gridGap = parseFloat(style.getPropertyValue('gap')) || 10;
    const paddingTop = parseFloat(style.getPropertyValue('padding-top')) || 15;
    
    const pageHeight = pagesContainer.clientHeight - (paddingTop * 2);
    const gridCols = style.getPropertyValue('grid-template-columns').split(' ').length || 3;
    
    let iconsPerCol = Math.floor(pageHeight / (gridRowHeight + gridGap));
    if (iconsPerCol < 1) iconsPerCol = 4; 

    const iconsPerPage = Math.max(1, iconsPerCol * gridCols);
    
    pagesContainer.innerHTML = ''; 
    
    const numPages = Math.ceil(desktopItems.length / iconsPerPage);

    for (let i = 0; i < numPages; i++) {
        const page = document.createElement('div');
        page.className = 'mobile-page';
        pagesContainer.appendChild(page);

        const dot = document.createElement('span');
        dot.className = 'dot';
        dotsContainer.appendChild(dot);
    }
    
    if (dotsContainer.firstChild) {
        dotsContainer.firstChild.classList.add('active');
    }

    pagesContainer.onscroll = () => {
        const pageIndex = Math.round(pagesContainer.scrollLeft / pagesContainer.clientWidth);
        document.querySelectorAll('.dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === pageIndex);
        });
    };

    desktopItems.forEach((item, index) => {
        const pageIndex = Math.floor(index / iconsPerPage);
        const currentPage = pagesContainer.children[pageIndex];
        if (currentPage) {
            const iconDiv = createIconElement(item);
            iconDiv.addEventListener('click', () => launchItem(item));
            currentPage.appendChild(iconDiv);
        }
    });
}

function createIconElement(item) {
    const iconDiv = document.createElement('div');
    iconDiv.className = 'icon';
    iconDiv.innerHTML = `<div class="icon-img ${item.class || 'folder'}"></div><div class="icon-name">${item.name}</div>`;
    iconDiv.setAttribute('data-item-name', item.name); 
    return iconDiv;
}

function setupGlobalDragSelect() {
    const container = document.getElementById('desktop-icon-container');
    if (!container) return;
    
    // Note: Drag select logic might conflict with pagination scrolling/swiping
    // Keeping it basic for now, mostly effective on the visible page
    
    let selectionBox = document.createElement('div');
    selectionBox.style.position = 'absolute';
    selectionBox.style.border = '1px dotted #fff';
    selectionBox.style.background = 'rgba(255, 255, 255, 0.2)';
    selectionBox.style.zIndex = '999';
    selectionBox.style.display = 'none';
    document.getElementById('window-area').appendChild(selectionBox);
    
    let startX, startY;
    
    container.addEventListener('mousedown', (e) => {
        if (e.target !== container && e.target.id !== 'desktop-pages-wrapper') return; 
        
        document.querySelectorAll('.icon.selected').forEach(i => i.classList.remove('selected'));
        
        startX = e.clientX;
        startY = e.clientY;
        
        selectionBox.style.left = `${startX}px`;
        selectionBox.style.top = `${startY}px`;
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.style.display = 'block';
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    
    function onMouseMove(e) {
        let x = Math.min(e.clientX, startX);
        let y = Math.min(e.clientY, startY);
        let w = Math.abs(e.clientX - startX);
        let h = Math.abs(e.clientY - startY);
        
        selectionBox.style.left = `${x}px`;
        selectionBox.style.top = `${y}px`;
        selectionBox.style.width = `${w}px`;
        selectionBox.style.height = `${h}px`;
        
        const icons = container.querySelectorAll('.icon');
        const boxRect = selectionBox.getBoundingClientRect();
        icons.forEach(icon => {
            const iconRect = icon.getBoundingClientRect();
            // Only select visible icons
            if (icon.offsetParent === null) return;

            const isIntersecting = !(
                iconRect.right < boxRect.left ||
                iconRect.left > boxRect.right ||
                iconRect.bottom < boxRect.top ||
                iconRect.top > boxRect.bottom
            );
            icon.classList.toggle('selected', isIntersecting);
        });
    }
    
    function onMouseUp() {
        selectionBox.style.display = 'none';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

function launchItem(item) {
    if (isMobile()) closeMobileSidebar();

    if (item.type === 'folder') {
        if (appSettings.alwaysOpenInWindow) {
            openIframeWindow(item.name, item.url);
        } else {
            openWebAppPrompt(item);
        }
        return;
    }
    
    if (item.type === 'locked_folder') {
        openPasswordModal(item.name, item.password, () => {
            openLockedFolderWindow(item.name, item.contents);
        });
        return;
    }

    if (item.type === 'system_app') {
        if (item.action === 'openCalculator') openCalculatorApp();
        if (item.action === 'openClock') openClockApp();
        if (item.action === 'openNotepad') openNotepadApp();
        if (item.action === 'openSettings') openSettingsApp();
        if (item.action === 'openBrowser') openBrowserApp();
        if (item.action === 'openExplorer') openExplorerApp();
        if (item.action === 'openTerminal') openTerminalApp();
        if (item.action === 'openThemeApp') openThemeApp();
        if (item.action === 'openAbout') openAboutApp();
        if (item.action === 'openVideoPlayer') openVideoPlayerApp();
        return;
    }

    if (item.action === 'newTab') { openFileInNewTab(item.name); return; }

    switch (item.class) {
        case 'audio': openMediaPlayerWindow(item.name); break;
        case 'webapp-browser': openIframeWindow(item.name, item.url); break;
        case 'video': openVideoPlayerApp(item.name); break;
        case 'image': openImageViewWindow(item.name); break;
        case 'document': case 'code': case 'unknown': openTextViewWindow(item.name); break;
        case 'zip': default: openErrorWindow(item.name, 'Zip processing support will be added in the near future.'); break;
    }
}

function openWindow(title, contentHTML, options = {}) {
    const windowId = `win-${Date.now()}`;
    
    if (isMobile()) {
        return openMobileWindow(windowId, title, contentHTML, options);
    } else {
        return openDesktopWindow(windowId, title, contentHTML, options);
    }
}

function openDesktopWindow(windowId, title, contentHTML, options = {}) {
    playUISound('windowOpen');
    highestZIndex++;
    const windowDiv = document.createElement('div');
    windowDiv.className = 'window opening';
    windowDiv.style.zIndex = highestZIndex;
    windowDiv.id = windowId;

    if (options.width) windowDiv.style.width = options.width;
    if (options.height) windowDiv.style.height = options.height;
    if (options.minWidth) windowDiv.style.minWidth = options.minWidth;
    if (options.minHeight) windowDiv.style.minHeight = options.minHeight;

    // UPDATED: Minimize icon is now an emdash '—'
    windowDiv.innerHTML = `
        <div class="window-header">
            <span class="window-title">${title}</span>
            <div class="window-controls">
                ${options.hideMinimize ? '' : '<button class="minimize-btn" title="Minimize">—</button>'}
                ${options.hideMaximize ? '' : '<button class="maximize-btn" title="Maximize">&#9633;</button>'}
                <button class="close-btn" title="Close">&#10006;</button>
            </div>
        </div>
        <div class="window-content">${contentHTML}</div>
    `;
    
    document.getElementById('window-area').appendChild(windowDiv);
    
    const winWidth = windowDiv.offsetWidth;
    const winHeight = windowDiv.offsetHeight;
    
    const taskbar = document.querySelector('.taskbar');
    const taskbarRect = taskbar.getBoundingClientRect();
    let viewWidth = window.innerWidth;
    let viewHeight = window.innerHeight;
    let viewTop = 0;
    let viewLeft = 0;
    
    if (appSettings.taskbarPosition === 'bottom') viewHeight -= taskbarRect.height;
    if (appSettings.taskbarPosition === 'top') { viewHeight -= taskbarRect.height; viewTop = taskbarRect.height; }
    if (appSettings.taskbarPosition === 'left') { viewWidth -= taskbarRect.width; viewLeft = taskbarRect.width; }

    windowDiv.style.left = `${viewLeft + Math.max(5, (viewWidth - winWidth) / 2)}px`;
    windowDiv.style.top = `${viewTop + Math.max(5, (viewHeight - winHeight) / 2)}px`;
    
    requestAnimationFrame(() => {
        windowDiv.classList.remove('opening');
    });
    
    const header = windowDiv.querySelector('.window-header');
    windowDiv.addEventListener('mousedown', () => bringWindowToFront(windowId));
    windowDiv.querySelector('.close-btn').addEventListener('click', () => closeWindow(windowId));
    
    if (!options.hideMinimize) { windowDiv.querySelector('.minimize-btn').addEventListener('click', () => minimizeWindow(windowId)); }
    if (!options.hideMaximize) { 
        const maximizeBtn = windowDiv.querySelector('.maximize-btn');
        maximizeBtn.addEventListener('click', () => maximizeWindow(windowId));
        header.addEventListener('dblclick', (e) => {
            if (e.target.closest('button')) return; 
            maximizeWindow(windowId);
        });
    }

    dragElement(windowDiv);
    add_taskbar_item(windowId, title);
    openWindows[windowId] = windowDiv;
    
    bringWindowToFront(windowId);
    
    return windowDiv;
}

function openMobileWindow(windowId, title, contentHTML, options = {}) {
    playUISound('windowOpen');
    const appPage = document.createElement('div');
    appPage.className = 'mobile-app-page opening';
    appPage.id = windowId;
    
    const hasBack = openMobileAppOrder.length > 0;
    
    appPage.innerHTML = `
        <div class="mobile-app-header">
            <span class="mobile-app-back-btn">${hasBack ? '&#8249;' : '&times;'}</span>
            <span class="mobile-app-title">${title}</span>
            <span class="mobile-app-close-btn">&times;</span>
        </div>
        <div class="mobile-app-content">${contentHTML}</div>
    `;
    
    if(hasBack) appPage.querySelector('.mobile-app-close-btn').style.display = 'none';
    
    document.getElementById('mobile-app-container').appendChild(appPage);
    appPage.querySelector('.mobile-app-back-btn').addEventListener('click', () => {
        if (hasBack) {
            closeWindow(windowId, true); 
        } else {
            closeWindow(windowId); 
        }
    });
    appPage.querySelector('.mobile-app-close-btn').addEventListener('click', () => closeWindow(windowId));
    
    openWindows[windowId] = appPage;
    
    bringWindowToFront(windowId);
    
    requestAnimationFrame(() => {
        appPage.classList.remove('opening');
    });

    return appPage;
}

function closeWindow(windowId, isMobileBack = false) {
    playUISound('windowClose');
    const win = openWindows[windowId];
    if (!win) return;
    
    if (isMobile()) {
        const appIndex = openMobileAppOrder.indexOf(windowId);
        if (appIndex > -1) {
            openMobileAppOrder.splice(appIndex, 1);
        }
        
        win.classList.add('closing');
        win.addEventListener('transitionend', () => {
            win.remove();
            delete openWindows[windowId];
            updateMobileTaskList();
        }, { once: true });
        
        const nextAppId = openMobileAppOrder[openMobileAppOrder.length - 1];
        if (nextAppId) {
            bringWindowToFront(nextAppId, true); 
        } else {
            showMobileHome(false);
        }
        
    } else {
        if (win.classList.contains('minimized') && appSettings.graphicsGlass) {
            win.classList.add('minimizing');
        } else {
            win.classList.add('closing');
        }
        
        win.addEventListener('transitionend', () => {
            win.remove();
            delete openWindows[windowId];
            remove_taskbar_item(windowId);
        }, { once: true });
    }
}

function minimizeWindow(windowId) {
    if (isMobile()) {
        showMobileHome(true); 
    } else {
        const win = document.getElementById(windowId);
        if (win) {
            if (appSettings.graphicsGlass) {
                win.classList.add('minimizing');
                win.addEventListener('transitionend', () => {
                    win.classList.add('minimized');
                    win.classList.remove('minimizing');
                }, { once: true });
            } else {
                win.classList.add('minimized');
            }
            document.querySelector(`.task-item[data-window-id="${windowId}"]`).classList.remove('active');
        }
    }
}

function maximizeWindow(windowId) {
    if (isMobile()) return;
    const win = document.getElementById(windowId);
    win?.classList.toggle('maximized');
}

function bringWindowToFront(windowId, skipMobileAnimation = false) {
    const win = openWindows[windowId];
    if (!win) return;
    
    if (isMobile()) {
        document.getElementById('mobile-homescreen').style.display = 'none';
        document.getElementById('mobile-app-container').style.display = 'block';
        
        const appIndex = openMobileAppOrder.indexOf(windowId);
        if (appIndex > -1) {
            openMobileAppOrder.splice(appIndex, 1);
        }
        openMobileAppOrder.push(windowId);
        
        Object.values(openWindows).forEach(appPage => {
            if (appPage.id === windowId) {
                appPage.classList.remove('inactive-behind');
                appPage.classList.add('active');
            } else {
                appPage.classList.remove('active');
                const justBehindId = openMobileAppOrder[openMobileAppOrder.length - 2];
                if (appPage.id === justBehindId) {
                    appPage.classList.add('inactive-behind');
                } else {
                    appPage.classList.remove('inactive-behind');
                }
            }
        });
        
        if (skipMobileAnimation) {
            win.classList.remove('opening');
        }
        
        updateMobileTaskList();

    } else {
        highestZIndex++;
        win.style.zIndex = highestZIndex;
        win.classList.remove('minimized', 'minimizing');
        
        document.querySelectorAll('.task-item').forEach(item => item.classList.remove('active'));
        const taskItem = document.querySelector(`.task-item[data-window-id="${windowId}"]`);
        if (taskItem) taskItem.classList.add('active');
    }
}

function dragElement(elmnt) { 
    if (isMobile()) return; 

    let pos1 = 0, pos2 = 0; 
    let header = elmnt.classList.contains('window') ? elmnt.querySelector('.window-header') : elmnt; 
    
    if (header) { header.onmousedown = dragMouseDown; } 
    
    function dragMouseDown(e) { 
        if (e.button !== 0 || (e.target.tagName === 'BUTTON')) return; 
        e.preventDefault(); 
        if (elmnt.classList.contains('window')) bringWindowToFront(elmnt.id); 
        
        pos1 = e.clientX - elmnt.offsetLeft;
        pos2 = e.clientY - elmnt.offsetTop;
        
        document.onmouseup = closeDragElement; 
        document.onmousemove = elementDrag; 
        elmnt.classList.add('dragging'); 

        elmnt.querySelectorAll('iframe, canvas').forEach(el => el.style.pointerEvents = 'none');
    } 
    
    function elementDrag(e) { 
        e.preventDefault(); 
        if (elmnt.classList.contains('maximized')) return; 
        
        let newTop = e.clientY - pos2;
        let newLeft = e.clientX - pos1;
        
        const taskbar = document.querySelector('.taskbar');
        const taskbarRect = taskbar.getBoundingClientRect();
        
        let minTop = 0;
        let minLeft = 0;
        let maxTop = window.innerHeight - elmnt.offsetHeight;
        let maxLeft = window.innerWidth - elmnt.offsetWidth;
        
        if (!appSettings.taskbarAutohide) {
            if (appSettings.taskbarPosition === 'top') minTop = taskbarRect.height;
            if (appSettings.taskbarPosition === 'bottom') maxTop = taskbarRect.top - elmnt.offsetHeight;
            if (appSettings.taskbarPosition === 'left') minLeft = taskbarRect.width;
        }
        
        if (elmnt.classList.contains('window')) {
            let headerHeight = header ? header.offsetHeight : 40;
            maxTop = window.innerHeight - headerHeight; 
        }
        
        elmnt.style.top = `${Math.max(minTop, Math.min(newTop, maxTop))}px`; 
        elmnt.style.left = `${Math.max(minLeft, Math.min(newLeft, maxLeft))}px`; 
    } 
    
    function closeDragElement() { 
        document.onmouseup = null; 
        document.onmousemove = null; 
        elmnt.classList.remove('dragging'); 
        
        elmnt.querySelectorAll('iframe, canvas').forEach(el => el.style.pointerEvents = 'auto');
    } 
}

function add_taskbar_item(windowId, title) { 
    if (isMobile()) return;
    const item = document.createElement('div'); 
    item.className = 'task-item'; 
    
    // Check taskbar mode
    if (appSettings.taskbarMode === 'compact') {
        item.title = title; // Tooltip
        item.style.width = '40px';
        item.style.justifyContent = 'center';
        // Note: Real implementation would use an app icon here, but we don't pass icon class to openWindow yet.
        // For now, just blank or first letter could work, but CSS background handles active state.
    } else {
        item.textContent = title; 
    }
    
    item.setAttribute('data-window-id', windowId); 
    item.onclick = () => {
        const win = document.getElementById(windowId);
        if (win.classList.contains('minimized') || !win.classList.contains('active')) {
            bringWindowToFront(windowId);
        } else {
            minimizeWindow(windowId);
        }
    }; 
    document.getElementById('task-items').appendChild(item); 
}

function remove_taskbar_item(windowId) { 
    if (isMobile()) return;
    const item = document.querySelector(`.task-item[data-window-id="${windowId}"]`); 
    if (item) item.remove(); 
}

function setupStartMenu() { 
    const startBtn = document.getElementById('start-button'); 
    const startMenu = document.getElementById('start-menu'); 
    const programsContainer = document.getElementById('start-programs'); 
    const docsContainer = document.getElementById('start-docs'); 
    
    programsContainer.innerHTML = '';
    docsContainer.innerHTML = '';
    
    const apps = desktopItems.filter(i => i.type === 'system_app');
    
    apps.forEach(app => { 
        const item = document.createElement('div'); 
        item.className = 'menu-item'; 
        item.innerHTML = `<div class="icon-img ${app.class}" style="width:24px; height:24px;"></div> <span>${app.name}</span>`; 
        item.onclick = () => { launchItem(app); startMenu.classList.remove('open'); }; 
        programsContainer.appendChild(item); 
    }); 
    
    desktopItems.filter(i => i.type === 'file' && ['document', 'image', 'code'].includes(i.class)).slice(0, 5).forEach(doc => { 
        const item = document.createElement('div'); 
        item.className = 'menu-item'; 
        item.innerHTML = `<div class="icon-img ${doc.class}" style="width:24px; height:24px;"></div> <span>${doc.name}</span>`; 
        item.onclick = () => { launchItem(doc); startMenu.classList.remove('open'); }; 
        docsContainer.appendChild(item); 
    }); 
    
    startBtn.addEventListener('click', (e) => { e.stopPropagation(); startMenu.classList.toggle('open'); }); 
    document.addEventListener('click', () => startMenu.classList.remove('open')); 
    startMenu.addEventListener('click', e => e.stopPropagation()); 
}

function setupMobileControls() {
    const clockEl = document.getElementById('mobile-clock');
    function updateClock() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 1000);
    
    const menuBtn = document.getElementById('mobile-menu-btn');
    const homeBtn = document.getElementById('mobile-home-btn');
    const sidebar = document.getElementById('mobile-sidebar');
    const overlay = document.getElementById('mobile-sidebar-overlay');
    
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.add('open');
        overlay.classList.add('open');
    });
    
    homeBtn.addEventListener('click', () => {
        showMobileHome(false); 
        closeMobileSidebar();
    });
    
    overlay.addEventListener('click', closeMobileSidebar);
}

function setupMobileGestures() {
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.body.addEventListener('touchstart', e => {
        if (!isMobile()) return;
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    document.body.addEventListener('touchend', e => {
        if (!isMobile()) return;
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        if (touchStartX < 30 && touchEndX > (touchStartX + 70)) {
            document.getElementById('mobile-sidebar').classList.add('open');
            document.getElementById('mobile-sidebar-overlay').classList.add('open');
        }
    }
}

function closeMobileSidebar() {
    document.getElementById('mobile-sidebar').classList.remove('open');
    document.getElementById('mobile-sidebar-overlay').classList.remove('open');
}

function showMobileHome(isMinimizing) {
    document.getElementById('mobile-homescreen').style.display = 'block';
    document.getElementById('mobile-app-container').style.display = 'none';
    
    if (!isMinimizing) {
        openMobileAppOrder = [];
    }
    
    setTimeout(() => {
        renderMobileIcons();
    }, 100);

    updateMobileTaskList();
}

function updateMobileTaskList() {
    const taskList = document.getElementById('mobile-task-list');
    if (!taskList) return;
    taskList.innerHTML = '';
    
    const activeAppId = openMobileAppOrder[openMobileAppOrder.length - 1];

    [...openMobileAppOrder].reverse().forEach(windowId => {
        const win = openWindows[windowId];
        if (!win) return;
        const title = win.querySelector('.mobile-app-title, .window-title')?.textContent || 'Untitled';
        
        const item = document.createElement('li');
        item.className = 'mobile-task-item';
        if (windowId === activeAppId) {
            item.classList.add('active');
        }
        item.innerHTML = `
            <span class="mobile-task-item-name">${title}</span>
            <span class="mobile-task-item-close">&times;</span>
        `;
        
        item.querySelector('.mobile-task-item-name').addEventListener('click', () => {
            bringWindowToFront(windowId);
            closeMobileSidebar();
        });
        
        item.querySelector('.mobile-task-item-close').addEventListener('click', () => {
            closeWindow(windowId);
        });
        
        taskList.appendChild(item);
    });
}