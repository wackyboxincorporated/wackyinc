function renderUI() {
    renderDesktopIcons();
    renderMobileIcons();
}

function renderDesktopIcons() {
    const container = document.getElementById('desktop-icon-container');
    if (!container) return;

    
    if (container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(renderDesktopIcons, 100);
        return;
    }

    container.innerHTML = '';

    
    
    const wrapper = document.createElement('div');
    wrapper.id = 'desktop-pages-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'row';
    wrapper.style.overflowX = 'auto';
    wrapper.style.scrollSnapType = 'x mandatory';
    wrapper.style.height = '100%';
    wrapper.style.width = '100%';
    wrapper.style.scrollbarWidth = 'none'; 
    container.appendChild(wrapper);

    
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

    
    const tempIcon = createIconElement({ name: 'Temp', class: 'folder' });
    
    const tempPage = document.createElement('div');
    tempPage.style.position = 'absolute';
    tempPage.style.visibility = 'hidden';
    tempPage.appendChild(tempIcon);
    wrapper.appendChild(tempPage);

    const iconStyle = window.getComputedStyle(tempIcon);
    const iconWidth = tempIcon.offsetWidth + parseFloat(iconStyle.marginLeft) + parseFloat(iconStyle.marginRight);
    const iconHeight = tempIcon.offsetHeight + parseFloat(iconStyle.marginTop) + parseFloat(iconStyle.marginBottom);

    wrapper.removeChild(tempPage); 

    
    
    const availableHeight = container.clientHeight - 40;
    const availableWidth = container.clientWidth;

    const cols = Math.floor(availableWidth / (iconWidth + 10)); 
    const rows = Math.floor(availableHeight / (iconHeight + 10));

    
    const iconsPerPage = Math.max(4, cols * rows);
    const totalPages = Math.ceil(desktopItems.length / iconsPerPage);

    
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

    
    wrapper.addEventListener('scroll', () => {
        const pageIndex = Math.round(wrapper.scrollLeft / wrapper.clientWidth);
        const dots = dotsContainer.querySelectorAll('.dot');
        dots.forEach((d, idx) => {
            d.classList.toggle('active', idx === pageIndex);
        });
    });

    
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
        if (item.contents) {
            openExplorerApp({ startFolder: item.name });
        } else {
            if (appSettings.alwaysOpenInWindow) {
                openIframeWindow(item.name, item.url);
            } else {
                openWebAppPrompt(item);
            }
        }
        return;
    }

    if (item.type === 'locked_folder') {
        openPasswordModal(item.name, item.passwordHash || item.password, () => {
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
        if (item.action === 'openMeatyPlayer') openMediaPlayerWindow();
        return;
    }

    if (item.action === 'newTab') { openFileInNewTab(item.name); return; }

    switch (item.class) {
        case 'audio': openMediaPlayerWindow(item.name); break;
        case 'webapp-browser': openIframeWindow(item.name, item.url); break;
        case 'video': openVideoPlayerApp(item.name); break;
        case 'image': openImageViewWindow(item.name); break;
        case 'document': case 'code': case 'unknown': openTextViewWindow(item.name); break;
        case 'zip': openZipWindow(item.name); break;
        default: openErrorWindow(item.name, 'Unsupported file type.'); break;
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
    
    openWindows[windowId] = {
        id: windowId,
        title: title,
        element: windowDiv,
        iconClass: options.iconClass || getIconClassForTitle(title)
    };

    add_taskbar_item(windowId, title);
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

    if (hasBack) appPage.querySelector('.mobile-app-close-btn').style.display = 'none';

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

function getIconClassForTitle(title) {
    const t = title.toLowerCase();
    if (t.includes('calculator')) return 'webapp-calculator';
    if (t.includes('clock')) return 'webapp-clock';
    if (t.includes('notepad')) return 'webapp-notepad';
    if (t.includes('settings') || t.includes('theme')) return 'webapp-settings';
    if (t.includes('browser')) return 'webapp-browser';
    if (t.includes('explorer') || t.includes('file')) return 'webapp-explorer';
    if (t.includes('terminal')) return 'webapp-terminal';
    if (t.includes('image')) return 'image';
    if (t.includes('video') || t.includes('player')) return 'video';
    if (t.includes('audio') || t.includes('meaty')) return 'audio';
    return 'folder';
}

function closeWindow(windowId, isMobileBack = false) {
    playUISound('windowClose');
    const winObj = openWindows[windowId];
    if (!winObj) return;
    const win = winObj.element || winObj;

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
            renderTaskbarItems();
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
            renderTaskbarItems();
        }, { once: true });
    }
}

function minimizeWindow(windowId) {
    const winObj = openWindows[windowId];
    if (!winObj) return;
    const win = winObj.element || winObj;

    if (isMobile()) {
        win.classList.remove('active', 'inactive-behind');
        win.classList.add('minimized');
        showMobileHome(true);
    } else {
        if (win) {
            if (appSettings.graphicsGlass) {
                win.classList.add('minimizing');
                win.addEventListener('transitionend', () => {
                    win.classList.add('minimized');
                    win.classList.remove('minimizing');
                    renderTaskbarItems();
                }, { once: true });
            } else {
                win.classList.add('minimized');
                renderTaskbarItems();
            }
        }
    }
}

function maximizeWindow(windowId) {
    if (isMobile()) return;
    const winObj = openWindows[windowId];
    const win = winObj ? (winObj.element || winObj) : document.getElementById(windowId);
    win?.classList.toggle('maximized');
}

function bringWindowToFront(windowId, skipMobileAnimation = false) {
    const winObj = openWindows[windowId];
    if (!winObj) return;
    const win = winObj.element || winObj;

    if (isMobile()) {
        document.getElementById('mobile-homescreen').style.display = 'none';
        document.getElementById('mobile-app-container').style.display = 'block';

        const appIndex = openMobileAppOrder.indexOf(windowId);
        if (appIndex > -1) {
            openMobileAppOrder.splice(appIndex, 1);
        }
        openMobileAppOrder.push(windowId);

        Object.values(openWindows).forEach(appItem => {
            const page = appItem.element || appItem;
            if (appItem.id === windowId || page.id === windowId) {
                page.classList.remove('inactive-behind', 'minimized');
                page.classList.add('active');
            } else {
                page.classList.remove('active', 'inactive-behind');
                page.classList.add('minimized');
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
        renderTaskbarItems();
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

function renderQuickLaunchBar() {
    const qlBar = document.getElementById('quick-launch-bar');
    if (!qlBar) return;
    qlBar.innerHTML = '';
    
    if (!appSettings.quickLaunchApps || appSettings.quickLaunchApps.length === 0) {
        qlBar.style.display = 'none';
        return;
    }
    qlBar.style.display = 'flex';

    appSettings.quickLaunchApps.forEach(appName => {
        const appObj = systemApps.find(a => a.name === appName) || desktopItems.find(i => i.name === appName);
        if (!appObj) return;

        const btn = document.createElement('div');
        btn.className = 'quick-launch-btn';
        btn.title = appObj.name;
        btn.innerHTML = `<div class="icon-img ${appObj.class || 'unknown'}" style="width:20px; height:20px; background-size:contain;"></div>`;
        btn.onclick = (e) => {
            e.stopPropagation();
            launchItem(appObj);
        };
        btn.oncontextmenu = (e) => {
            e.preventDefault();
            if (confirm(`Unpin "${appObj.name}" from Quick Launch?`)) {
                appSettings.quickLaunchApps = appSettings.quickLaunchApps.filter(n => n !== appName);
                saveSettings();
                renderQuickLaunchBar();
            }
        };
        qlBar.appendChild(btn);
    });
}

function renderTaskbarItems() {
    if (isMobile()) return;
    const taskContainer = document.getElementById('task-items');
    if (!taskContainer) return;
    taskContainer.innerHTML = '';

    const openWins = Object.values(openWindows).filter(w => w && document.getElementById(w.id));

    if (appSettings.taskbarGroupWindows) {
        const groups = {};
        openWins.forEach(winObj => {
            const groupKey = winObj.title.split(' - ')[0] || winObj.title;
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(winObj);
        });

        Object.keys(groups).forEach(groupTitle => {
            const wins = groups[groupTitle];
            if (wins.length === 1) {
                createSingleTaskItem(taskContainer, wins[0]);
            } else {
                createGroupedTaskItem(taskContainer, groupTitle, wins);
            }
        });
    } else {
        openWins.forEach(winObj => {
            createSingleTaskItem(taskContainer, winObj);
        });
    }
}

function createSingleTaskItem(container, winObj) {
    const item = document.createElement('div');
    item.className = 'task-item';
    if (winObj.element.classList.contains('active') && !winObj.element.classList.contains('minimized')) {
        item.classList.add('active');
    }
    item.setAttribute('data-window-id', winObj.id);

    const iconClass = winObj.iconClass || 'folder';
    const iconSpan = `<span class="task-item-icon icon-img ${iconClass}"></span>`;
    
    if (appSettings.taskbarMode === 'compact') {
        item.innerHTML = iconSpan;
        item.title = winObj.title;
        item.style.width = '38px';
        item.style.justifyContent = 'center';
    } else {
        item.innerHTML = `${iconSpan}<span class="task-item-label">${winObj.title}</span>`;
        item.title = winObj.title;
        item.style.width = '';
    }

    item.onclick = () => {
        if (winObj.element.classList.contains('minimized') || !winObj.element.classList.contains('active')) {
            bringWindowToFront(winObj.id);
        } else {
            minimizeWindow(winObj.id);
        }
        renderTaskbarItems();
    };

    item.oncontextmenu = (e) => {
        e.preventDefault();
        showTaskbarContextMenu(e.clientX, e.clientY, winObj);
    };

    container.appendChild(item);
}

function createGroupedTaskItem(container, groupTitle, wins) {
    const item = document.createElement('div');
    item.className = 'task-item task-item-grouped';
    const hasActive = wins.some(w => w.element.classList.contains('active') && !w.element.classList.contains('minimized'));
    if (hasActive) item.classList.add('active');

    const iconClass = wins[0].iconClass || 'folder';
    const iconSpan = `<span class="task-item-icon icon-img ${iconClass}"></span>`;

    if (appSettings.taskbarMode === 'compact') {
        item.innerHTML = `${iconSpan}<span class="group-count-badge">${wins.length}</span>`;
        item.title = `${groupTitle} (${wins.length} open)`;
        item.style.width = '42px';
        item.style.justifyContent = 'center';
    } else {
        item.innerHTML = `${iconSpan}<span class="task-item-label">${groupTitle}</span><span class="group-count-badge">${wins.length}</span>`;
        item.title = `${groupTitle} (${wins.length} windows)`;
        item.style.width = '';
    }

    item.onclick = (e) => {
        const unminimized = wins.filter(w => !w.element.classList.contains('minimized'));
        if (unminimized.length === 0) {
            wins.forEach(w => bringWindowToFront(w.id));
        } else {
            const nextIndex = wins.findIndex(w => w.element.classList.contains('active'));
            const targetWin = wins[(nextIndex + 1) % wins.length];
            bringWindowToFront(targetWin.id);
        }
        renderTaskbarItems();
    };

    item.oncontextmenu = (e) => {
        e.preventDefault();
        showGroupContextMenu(e.clientX, e.clientY, groupTitle, wins);
    };

    container.appendChild(item);
}

function showTaskbarContextMenu(x, y, winObj) {
    document.querySelectorAll('.taskbar-context-menu').forEach(m => m.remove());
    const menu = document.createElement('div');
    menu.className = 'taskbar-context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y - 80}px`;

    const appName = winObj.title.split(' - ')[0] || winObj.title;
    const isPinned = appSettings.quickLaunchApps.includes(appName);

    menu.innerHTML = `
        <div class="menu-item" id="tb-ctx-pin">${isPinned ? '📌 Unpin from Quick Launch' : '📌 Pin to Quick Launch'}</div>
        <div class="menu-item" id="tb-ctx-min">${winObj.element.classList.contains('minimized') ? 'Restore Window' : 'Minimize Window'}</div>
        <div class="menu-item" id="tb-ctx-close" style="color:#ff6b6b;">Close Window</div>
    `;
    document.body.appendChild(menu);

    menu.querySelector('#tb-ctx-pin').onclick = () => {
        if (isPinned) {
            appSettings.quickLaunchApps = appSettings.quickLaunchApps.filter(a => a !== appName);
        } else {
            appSettings.quickLaunchApps.push(appName);
        }
        saveSettings();
        renderQuickLaunchBar();
        menu.remove();
    };
    menu.querySelector('#tb-ctx-min').onclick = () => {
        if (winObj.element.classList.contains('minimized')) {
            bringWindowToFront(winObj.id);
        } else {
            minimizeWindow(winObj.id);
        }
        renderTaskbarItems();
        menu.remove();
    };
    menu.querySelector('#tb-ctx-close').onclick = () => {
        closeWindow(winObj.id);
        menu.remove();
    };

    const removeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', removeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', removeMenu), 10);
}

function showGroupContextMenu(x, y, groupTitle, wins) {
    document.querySelectorAll('.taskbar-context-menu').forEach(m => m.remove());
    const menu = document.createElement('div');
    menu.className = 'taskbar-context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y - 100}px`;

    let winItemsHtml = wins.map(w => `<div class="menu-item win-subitem" data-id="${w.id}">• ${w.title}</div>`).join('');

    menu.innerHTML = `
        <div class="menu-header" style="padding:4px 8px; font-weight:bold; font-size:11px; opacity:0.7;">${groupTitle} (${wins.length})</div>
        ${winItemsHtml}
        <div class="right-link-separator" style="height:1px; background:rgba(255,255,255,0.1); margin:4px 0;"></div>
        <div class="menu-item" id="tb-ctx-close-all" style="color:#ff6b6b;">Close All Windows</div>
    `;
    document.body.appendChild(menu);

    menu.querySelectorAll('.win-subitem').forEach(el => {
        el.onclick = () => {
            const wId = el.getAttribute('data-id');
            bringWindowToFront(wId);
            renderTaskbarItems();
            menu.remove();
        };
    });
    menu.querySelector('#tb-ctx-close-all').onclick = () => {
        wins.forEach(w => closeWindow(w.id));
        menu.remove();
    };

    const removeMenu = (e) => {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', removeMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', removeMenu), 10);
}

function add_taskbar_item(windowId, title) {
    renderTaskbarItems();
}

function remove_taskbar_item(windowId) {
    renderTaskbarItems();
}

function setupStartMenu() {
    const startBtn = document.getElementById('start-button');
    const startMenu = document.getElementById('start-menu');

    if (!document.getElementById('start-menu-layout')) {
        startMenu.innerHTML = `
            <div id="start-menu-layout">
                <div id="start-menu-left">
                    <div id="start-left-content">
                        <div id="start-programs-pane">
                            <div class="start-pane-header">Pinned programs</div>
                            <div id="start-pinned-programs"></div>
                            <div id="start-all-programs-btn" class="all-programs-btn">
                                <span>All programs</span> <span class="arrow">&raquo;</span>
                            </div>
                        </div>
                        <div id="start-all-programs-pane" style="display: none;">
                            <div id="start-all-programs-back" class="all-programs-back">
                                <span class="arrow">&laquo;</span> <span>Back</span>
                            </div>
                            <div id="start-all-programs-tree"></div>
                        </div>
                        <div id="start-search-results-pane" style="display: none;">
                            <div class="start-pane-header">Search results</div>
                            <div id="start-search-results"></div>
                        </div>
                    </div>
                    <div id="start-search-box">
                        <span class="search-icon">&#128269;</span>
                        <input type="text" id="start-search-input" placeholder="Search programs and files" autocomplete="off">
                        <span id="start-search-clear" style="display: none;">&times;</span>
                    </div>
                </div>
                <div id="start-menu-right">
                    <div id="start-user-area">
                        <div id="start-user-avatar"></div>
                        <span id="start-user-name">User</span>
                    </div>
                    <div id="start-right-links">
                        <div class="right-link" data-path="Games"><div class="right-link-icon games-icon"></div><span>Games</span></div>
                        <div class="right-link" data-path="Websites & Projects"><div class="right-link-icon websites-icon"></div><span>Websites</span></div>
                        <div class="right-link" data-path="Documents & Code"><div class="right-link-icon docs-icon"></div><span>Documents</span></div>
                        <div class="right-link" data-path="Media & Files"><div class="right-link-icon media-icon"></div><span>Music & Videos</span></div>
                        <div class="right-link" data-path="Computer"><div class="right-link-icon computer-icon"></div><span>Computer</span></div>
                        <div class="right-link-separator"></div>
                        <div class="right-link" data-action="settings"><div class="right-link-icon settings-icon"></div><span>Control panel</span></div>
                        <div class="right-link" data-action="terminal"><div class="right-link-icon terminal-icon"></div><span>Command prompt</span></div>
                        <div class="right-link" data-action="about"><div class="right-link-icon about-icon"></div><span>Help and support</span></div>
                    </div>
                    <div id="start-shutdown-bar">
                        <button id="start-shutdown-btn">Shut down</button>
                    </div>
                </div>
            </div>
        `;

        const allProgramsBtn = document.getElementById('start-all-programs-btn');
        const allProgramsBack = document.getElementById('start-all-programs-back');
        const searchInput = document.getElementById('start-search-input');
        const searchClear = document.getElementById('start-search-clear');

        const programsPane = document.getElementById('start-programs-pane');
        const allProgramsPane = document.getElementById('start-all-programs-pane');
        const searchPane = document.getElementById('start-search-results-pane');

        allProgramsBtn.onclick = (e) => {
            e.stopPropagation();
            programsPane.style.display = 'none';
            allProgramsPane.style.display = 'block';
            searchPane.style.display = 'none';
            renderAllProgramsTree();
        };

        allProgramsBack.onclick = (e) => {
            e.stopPropagation();
            programsPane.style.display = 'block';
            allProgramsPane.style.display = 'none';
            searchPane.style.display = 'none';
        };

        searchInput.oninput = (e) => {
            const query = e.target.value.trim().toLowerCase();
            if (query.length > 0) {
                searchClear.style.display = 'block';
                programsPane.style.display = 'none';
                allProgramsPane.style.display = 'none';
                searchPane.style.display = 'block';
                performStartSearch(query);
            } else {
                searchClear.style.display = 'none';
                searchPane.style.display = 'none';
                if (allProgramsPane.style.display === 'block') {
                    allProgramsPane.style.display = 'block';
                } else {
                    programsPane.style.display = 'block';
                }
            }
        };

        searchClear.onclick = (e) => {
            e.stopPropagation();
            searchInput.value = '';
            searchClear.style.display = 'none';
            searchPane.style.display = 'none';
            programsPane.style.display = 'block';
            allProgramsPane.style.display = 'none';
            searchInput.focus();
        };

        document.getElementById('start-shutdown-btn').onclick = () => {
            playUISound('error');
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0'; overlay.style.left = '0';
            overlay.style.width = '100%'; overlay.style.height = '100%';
            overlay.style.background = '#000';
            overlay.style.zIndex = '99999';
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.color = '#fff';
            overlay.style.fontFamily = "'Segoe UI', sans-serif";
            overlay.innerHTML = `
                <div class="icon-img webapp-settings" style="width: 60px; height: 60px; filter: hue-rotate(180deg); margin-bottom: 20px; animation: spin 2s linear infinite;"></div>
                <div style="font-size: 20px;">Shutting down...</div>
                <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
            `;
            document.body.appendChild(overlay);
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        };

        document.querySelectorAll('#start-right-links .right-link').forEach(link => {
            link.onclick = (e) => {
                e.stopPropagation();
                startMenu.classList.remove('open');

                const action = link.dataset.action;
                const path = link.dataset.path;

                if (action) {
                    if (action === 'settings') openSettingsApp();
                    if (action === 'terminal') openTerminalApp();
                    if (action === 'about') openAboutApp();
                } else if (path) {
                    openExplorerApp({ startFolder: path });
                }
            };
        });
    }

    const pinnedContainer = document.getElementById('start-pinned-programs');
    pinnedContainer.innerHTML = '';

    const pinnedApps = [
        { name: 'Browser', class: 'webapp-browser', action: 'openBrowser' },
        { name: 'Notepad', class: 'webapp-notepad', action: 'openNotepad' },
        { name: 'Calculator', class: 'webapp-computer', action: 'openCalculator' },
        { name: 'Theme studio', class: 'webapp-themes', action: 'openThemeApp' },
        { name: 'File Explorer', class: 'webapp-explorer', action: 'openExplorer' }
    ];

    pinnedApps.forEach(app => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.innerHTML = `<div class="icon-img ${app.class}" style="width:32px; height:32px;"></div> <span>${app.name}</span>`;
        item.onclick = () => {
            if (app.action === 'openBrowser') openBrowserApp();
            if (app.action === 'openNotepad') openNotepadApp();
            if (app.action === 'openCalculator') openCalculatorApp();
            if (app.action === 'openThemeApp') openThemeApp();
            if (app.action === 'openExplorer') openExplorerApp();
            startMenu.classList.remove('open');
        };
        pinnedContainer.appendChild(item);
    });

    const gamesFolder = desktopItems.find(i => i.name === 'Games');
    if (gamesFolder && gamesFolder.contents) {
        const separator = document.createElement('div');
        separator.className = 'start-pane-separator';
        pinnedContainer.appendChild(separator);

        gamesFolder.contents.slice(0, 3).forEach(game => {
            const item = document.createElement('div');
            item.className = 'menu-item';
            item.innerHTML = `<div class="icon-img folder" style="width:32px; height:32px; filter: hue-rotate(90deg);"></div> <span>${game.name}</span>`;
            item.onclick = () => {
                launchItem(game);
                startMenu.classList.remove('open');
            };
            pinnedContainer.appendChild(item);
        });
    }

    if (!startBtn.dataset.wired) {
        startBtn.onclick = (e) => {
            e.stopPropagation();
            startMenu.classList.toggle('open');
            if (startMenu.classList.contains('open')) {
                setTimeout(() => document.getElementById('start-search-input')?.focus(), 50);
            }
        };
        startBtn.dataset.wired = "true";
    }

    document.addEventListener('click', () => startMenu.classList.remove('open'));
    startMenu.onclick = (e) => e.stopPropagation();
}

function renderAllProgramsTree() {
    const treeContainer = document.getElementById('start-all-programs-tree');
    treeContainer.innerHTML = '';

    const systemAppsFolder = {
        name: "System Accessories",
        contents: desktopItems.filter(i => i.type === 'system_app')
    };

    const folders = [
        ...desktopItems.filter(i => i.type === 'folder'),
        systemAppsFolder
    ];

    folders.forEach(folder => {
        const folderNode = document.createElement('div');
        folderNode.className = 'tree-folder';

        const folderHeader = document.createElement('div');
        folderHeader.className = 'tree-folder-header';
        folderHeader.innerHTML = `<span class="tree-arrow">&#9656;</span> <div class="icon-img folder" style="width:18px; height:18px; display:inline-block; vertical-align:middle; margin:0 5px 0 0;"></div> <span>${folder.name}</span>`;

        const folderContent = document.createElement('div');
        folderContent.className = 'tree-folder-content';
        folderContent.style.display = 'none';

        folder.contents.forEach(item => {
            const leafNode = document.createElement('div');
            leafNode.className = 'tree-leaf menu-item';
            const cls = item.class || (item.type === 'system_app' ? 'webapp-computer' : 'folder');
            leafNode.innerHTML = `<div class="icon-img ${cls}" style="width:20px; height:20px;"></div> <span>${item.name}</span>`;
            leafNode.onclick = (e) => {
                e.stopPropagation();
                launchItem(item);
                document.getElementById('start-menu').classList.remove('open');
            };
            folderContent.appendChild(leafNode);
        });

        folderHeader.onclick = (e) => {
            e.stopPropagation();
            const isOpen = folderContent.style.display === 'block';
            folderContent.style.display = isOpen ? 'none' : 'block';
            folderHeader.querySelector('.tree-arrow').innerHTML = isOpen ? '&#9656;' : '&#9662;';
        };

        folderNode.appendChild(folderHeader);
        folderNode.appendChild(folderContent);
        treeContainer.appendChild(folderNode);
    });
}

function performStartSearch(query) {
    const resultsContainer = document.getElementById('start-search-results');
    resultsContainer.innerHTML = '';

    const results = {
        games: [],
        websites: [],
        files: [],
        programs: []
    };

    desktopItems.forEach(item => {
        if (item.type === 'folder' && item.contents) {
            item.contents.forEach(child => {
                if (child.name.toLowerCase().includes(query)) {
                    if (item.name === 'Games') results.games.push(child);
                    else if (item.name === 'Websites & Projects') results.websites.push(child);
                    else if (item.name === 'Documents & Code') results.files.push(child);
                    else if (item.name === 'Media & Files') results.files.push(child);
                }
            });
        } else if (item.type === 'system_app') {
            if (item.name.toLowerCase().includes(query)) {
                results.programs.push(item);
            }
        } else {
            if (item.name.toLowerCase().includes(query)) {
                if (item.type === 'locked_folder') results.files.push(item);
                else if (item.class === 'webapp-browser') results.websites.push(item);
                else results.files.push(item);
            }
        }
    });

    customDesktopItems.forEach(item => {
        if (item.name.toLowerCase().includes(query)) {
            results.websites.push(item);
        }
    });

    let hasResults = false;

    const renderSection = (title, list) => {
        if (list.length === 0) return;
        hasResults = true;

        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'search-section-header';
        sectionHeader.textContent = title;
        resultsContainer.appendChild(sectionHeader);

        list.forEach(item => {
            const resItem = document.createElement('div');
            resItem.className = 'menu-item';
            const cls = item.class || (item.type === 'system_app' ? 'webapp-computer' : 'folder');
            resItem.innerHTML = `<div class="icon-img ${cls}" style="width:24px; height:24px;"></div> <span>${item.name}</span>`;
            resItem.onclick = () => {
                launchItem(item);
                document.getElementById('start-menu').classList.remove('open');
            };
            resultsContainer.appendChild(resItem);
        });
    };

    renderSection('Games', results.games);
    renderSection('Programs', results.programs);
    renderSection('Websites', results.websites);
    renderSection('Files & Documents', results.files);

    if (!hasResults) {
        resultsContainer.innerHTML = '<div style="padding:10px; color:var(--theme-text-secondary); text-align:center;">No items match your search.</div>';
    }
}

function setupMobileControls() {
    const clockEl = document.getElementById('mobile-clock');
    const trayClockEl = document.getElementById('system-clock-applet');
    const showDesktopBtn = document.getElementById('show-desktop-button');

    function updateClock() {
        const now = new Date();
        const use24h = appSettings.taskbarClockFormat === '24h';
        const showSec = appSettings.taskbarShowClockSeconds !== false;
        
        const timeOptions = {
            hour12: !use24h,
            hour: '2-digit',
            minute: '2-digit',
            ...(showSec ? { second: '2-digit' } : {})
        };

        const timeStr = now.toLocaleTimeString([], timeOptions);

        if (clockEl) clockEl.textContent = timeStr;
        if (trayClockEl) {
            const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            trayClockEl.innerHTML = `<span class="tray-time">${timeStr}</span><span class="tray-date">${dateStr}</span>`;
        }
    }
    updateClock();
    setInterval(updateClock, 1000);

    if (trayClockEl) {
        trayClockEl.onclick = (e) => {
            e.stopPropagation();
            openClockApp();
        };
    }

    if (showDesktopBtn) {
        showDesktopBtn.onclick = (e) => {
            e.stopPropagation();
            const openWins = Object.values(openWindows).filter(w => w && w.element);
            const allMinimized = openWins.every(w => w.element.classList.contains('minimized'));
            if (allMinimized) {
                openWins.forEach(w => bringWindowToFront(w.id));
            } else {
                openWins.forEach(w => minimizeWindow(w.id));
            }
        };
    }

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
        showMobileHome(true);
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
        
        Object.keys(openWindows).forEach(windowId => {
            const win = openWindows[windowId];
            if (win) win.remove();
            delete openWindows[windowId];
        });
    } else {
        
        Object.values(openWindows).forEach(appPage => {
            appPage.classList.remove('active', 'inactive-behind');
            appPage.classList.add('minimized');
        });
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