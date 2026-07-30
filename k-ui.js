function renderMainMenu() {
  const mainMenu = document.getElementById('main-menu');
  if (!mainMenu) return;
  const activeTab = mainMenu.dataset.activeTab || 'files';
  mainMenu.innerHTML = `
    <div class="menu-tab-bar">
      <div class="menu-tab ${activeTab === 'files' ? 'active' : ''}" data-tab="files">files</div>
      <div class="menu-tab ${activeTab === 'apps' ? 'active' : ''}" data-tab="apps">apps</div>
      <div class="menu-tab ${activeTab === 'search' ? 'active' : ''}" data-tab="search">search</div>
    </div>
    <div class="menu-content" id="menu-content-area"></div>
    <div class="k-player-bar-container" id="menu-player-container"></div>
    <div class="menu-footer">
      <div>
        <div class="menu-clock" id="menu-clock-display"></div>
        <div class="menu-clock-date" id="menu-date-display"></div>
      </div>
      <a href="/os/" class="os-link">open wbos →</a>
    </div>
  `;
  if (!kSettings.menuOpen) {
    mainMenu.classList.add('collapsed');
  } else {
    mainMenu.classList.remove('collapsed');
  }
  const tabs = mainMenu.querySelectorAll('.menu-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      mainMenu.dataset.activeTab = tab.dataset.tab;
      renderMenuContent(tab.dataset.tab);
    });
  });
  renderMenuContent(activeTab);
  const playerContainer = document.getElementById('menu-player-container');
  if (playerContainer && typeof renderPlayerBar === 'function') {
    playerContainer.innerHTML = '';
    playerContainer.appendChild(renderPlayerBar());
  }
  updateClock();
}
function renderMenuContent(tab) {
  const contentArea = document.getElementById('menu-content-area');
  if (!contentArea) return;
  contentArea.innerHTML = '';
  if (tab === 'files') {
    let currentSortMode = (typeof kSettings !== 'undefined' && kSettings.fileSortMode) ? kSettings.fileSortMode : 'name-asc';
    const sortBar = document.createElement('div');
    sortBar.className = 'file-sort-bar';
    sortBar.style.display = 'flex';
    sortBar.style.alignItems = 'center';
    sortBar.style.gap = '8px';
    sortBar.style.marginBottom = '12px';
    sortBar.style.paddingBottom = '8px';
    sortBar.style.borderBottom = '1px solid #222';
    sortBar.style.fontSize = '11px';
    sortBar.style.color = '#888';
    const sortLabel = document.createElement('span');
    sortLabel.textContent = 'sort by:';
    const sortSelect = document.createElement('select');
    sortSelect.className = 'file-sort-select';
    sortSelect.style.background = '#050505';
    sortSelect.style.color = '#fff';
    sortSelect.style.border = '1px solid #333';
    sortSelect.style.padding = '3px 8px';
    sortSelect.style.fontFamily = 'inherit';
    sortSelect.style.fontSize = '11px';
    sortSelect.style.cursor = 'pointer';
    sortSelect.style.textTransform = 'lowercase';
    const options = [
      { value: 'name-asc', label: 'name (a-z)' },
      { value: 'name-desc', label: 'name (z-a)' },
      { value: 'category', label: 'category / type' },
      { value: 'size-desc', label: 'size (largest)' },
      { value: 'size-asc', label: 'size (smallest)' }
    ];
    options.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt.value;
      el.textContent = opt.label;
      if (opt.value === currentSortMode) el.selected = true;
      sortSelect.appendChild(el);
    });
    sortSelect.addEventListener('change', () => {
      if (typeof kSettings !== 'undefined') {
        kSettings.fileSortMode = sortSelect.value;
        if (typeof saveSettings === 'function') saveSettings();
      }
      renderMenuContent('files');
    });
    sortBar.appendChild(sortLabel);
    sortBar.appendChild(sortSelect);
    contentArea.appendChild(sortBar);
    const fileTree = document.createElement('div');
    fileTree.className = 'file-tree';
    function sortTreeNodes(nodes, sortMode) {
      if (!nodes || !Array.isArray(nodes)) return [];
      const copy = [...nodes];
      copy.sort((a, b) => {
        const isAFolder = a.type === 'folder' || !!a.items;
        const isBFolder = b.type === 'folder' || !!b.items;
        if (sortMode === 'name-asc') {
          if (isAFolder !== isBFolder) return isAFolder ? -1 : 1;
          return (a.name || '').localeCompare(b.name || '');
        } else if (sortMode === 'name-desc') {
          if (isAFolder !== isBFolder) return isAFolder ? -1 : 1;
          return (b.name || '').localeCompare(a.name || '');
        } else if (sortMode === 'category') {
          const catA = a.category || a.type || 'file';
          const catB = b.category || b.type || 'file';
          if (catA !== catB) return catA.localeCompare(catB);
          return (a.name || '').localeCompare(b.name || '');
        } else if (sortMode === 'size-desc') {
          return (b.size || 0) - (a.size || 0);
        } else if (sortMode === 'size-asc') {
          return (a.size || 0) - (b.size || 0);
        }
        return 0;
      });
      return copy;
    }
    function renderTreeNodes(nodes, containerEl) {
      if (!nodes) return;
      const sorted = sortTreeNodes(nodes, currentSortMode);
      sorted.forEach(item => {
        const itemEl = document.createElement('div');
        if (item.type === 'folder' || item.items) {
          itemEl.className = 'file-tree-folder';
          const header = document.createElement('div');
          header.className = 'file-tree-folder-header';
          const isLink = !!item.url;
          const isGameOrWebApp = item.category === 'game' || item.category === 'website' || isLink;
          if (isGameOrWebApp) {
            header.classList.add('is-game-app');
          }
          const icon = isLink ? '⬡' : '□';
          header.innerHTML = `<span class="icon">${icon}</span> ${item.name}`;
          const itemsContainer = document.createElement('div');
          itemsContainer.className = 'file-tree-children';
          itemsContainer.style.display = 'none';
          if (item.items && item.items.length > 0) {
            renderTreeNodes(item.items, itemsContainer);
          }
          header.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof openFile === 'function') {
              openFile(item);
            }
          });
          itemEl.appendChild(header);
          if (item.items && item.items.length > 0) {
            itemEl.appendChild(itemsContainer);
          }
        } else {
          itemEl.className = 'file-tree-item';
          let icon = '■';
          if (item.type === 'audio') icon = '♫';
          else if (item.type === 'video') icon = '▶';
          else if (item.type === 'image') icon = '▣';
          else if (item.type === 'code') icon = '◇';
          else if (item.type === 'document') icon = '▢';
          itemEl.innerHTML = `<span class="icon">${icon}</span> ${item.name}`;
          itemEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof openFile === 'function') openFile(item);
          });
        }
        containerEl.appendChild(itemEl);
      });
    }
    if (typeof desktopItems !== 'undefined') {
      renderTreeNodes(desktopItems, fileTree);
    }
    contentArea.appendChild(fileTree);
  } else if (tab === 'apps') {
    const appGrid = document.createElement('div');
    appGrid.className = 'app-grid';
    if (typeof systemApps !== 'undefined') {
      systemApps.forEach(app => {
        const appItem = document.createElement('div');
        appItem.className = 'app-grid-item';
        appItem.innerHTML = `<div class="app-icon">${app.icon}</div><div class="app-name">${app.name}</div>`;
        appItem.addEventListener('click', () => {
          if (typeof launchApp === 'function') launchApp(app.name);
        });
        appGrid.appendChild(appItem);
      });
    }
    contentArea.appendChild(appGrid);
  } else if (tab === 'search') {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    const searchInput = document.createElement('input');
    searchInput.className = 'search-input';
    searchInput.type = 'text';
    searchInput.placeholder = 'search apps, games, documents, tools, sites...';
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'search-results';
    function collectAllItems(list, category = '') {
      let collected = [];
      if (!list) return collected;
      list.forEach(i => {
        const cat = category || (i.type === 'folder' ? 'folder' : (i.type || 'file'));
        collected.push({ ...i, searchCategory: cat });
        if (i.items && i.items.length > 0) {
          collected = collected.concat(collectAllItems(i.items, i.name.toLowerCase()));
        }
      });
      return collected;
    }
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      resultsContainer.innerHTML = '';
      if (!q) return;
      const results = [];
      if (typeof systemApps !== 'undefined') {
        systemApps.forEach(app => {
          if (app.name.toLowerCase().includes(q) || (app.description && app.description.toLowerCase().includes(q))) {
            results.push({ ...app, isApp: true, searchCategory: 'app' });
          }
        });
      }
      if (typeof desktopItems !== 'undefined') {
        const allFiles = collectAllItems(desktopItems);
        allFiles.forEach(item => {
          const matchName = item.name && item.name.toLowerCase().includes(q);
          const matchUrl = item.url && item.url.toLowerCase().includes(q);
          const matchType = item.type && item.type.toLowerCase().includes(q);
          const matchCat = item.searchCategory && item.searchCategory.toLowerCase().includes(q);
          if (matchName || matchUrl || matchType || matchCat) {
            results.push(item);
          }
        });
      }
      if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-state" style="padding: 12px; color: #666;">no matching items found</div>';
        return;
      }
      results.forEach(res => {
        const resEl = document.createElement('div');
        const isGameOrWebApp = res.category === 'game' || res.category === 'website' || !!res.url || (res.searchCategory && (res.searchCategory === 'game' || res.searchCategory === 'website'));
        resEl.className = 'search-result-item' + (isGameOrWebApp ? ' is-game-app' : '');
        resEl.style.display = 'flex';
        resEl.style.alignItems = 'center';
        resEl.style.justifyContent = 'space-between';
        resEl.style.padding = '8px 12px';
        resEl.style.borderBottom = '1px solid #111';
        resEl.style.cursor = 'pointer';
        let icon = '■';
        if (res.isApp) icon = res.icon || '◈';
        else if (res.type === 'folder' || res.isFolder) icon = '□';
        else if (res.type === 'audio') icon = '♫';
        else if (res.type === 'video') icon = '▶';
        else if (res.type === 'image') icon = '▣';
        else if (res.type === 'code') icon = '◇';
        else if (res.type === 'document') icon = '▢';
        const categoryTag = res.searchCategory ? `[${res.searchCategory}]` : '';
        resEl.innerHTML = `
          <div><span class="icon">${icon}</span> <span class="name">${res.name}</span></div>
          <span style="font-size:10px; color:#666;">${categoryTag}</span>
        `;
        resEl.addEventListener('click', () => {
          if (res.isApp) {
            if (typeof launchApp === 'function') launchApp(res.name);
          } else {
            if (typeof openFile === 'function') openFile(res);
          }
        });
        resultsContainer.appendChild(resEl);
      });
    });
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(resultsContainer);
    contentArea.appendChild(searchContainer);
    setTimeout(() => searchInput.focus(), 50);
  }
}
function renderTopBar() {
  const topBar = document.getElementById('top-bar');
  if (!topBar) return;
  topBar.classList.add('visible');
  let tileIndicatorsHTML = '';
  if (typeof openTiles !== 'undefined' && openTiles.length > 0) {
    openTiles.forEach(tile => {
      const isActive = typeof activeTileId !== 'undefined' && activeTileId == tile.id;
      const icon = tile.icon || (tile.isFloat ? '⊡' : '■');
      tileIndicatorsHTML += `
        <div class="top-bar-tile-tab ${isActive ? 'active' : ''}" data-id="${tile.id}" title="${tile.title}">
          <span>${icon}</span>
          <span class="tab-title">${tile.title.toLowerCase()}</span>
          <span class="tab-close-btn" data-close-id="${tile.id}" title="close">✕</span>
        </div>
      `;
    });
  }
  let compactPlayerHTML = '';
  if (typeof kPlayer !== 'undefined' && kPlayer.playlist && kPlayer.playlist.length > 0) {
    const trackName = kPlayer.getTrackName ? kPlayer.getTrackName() : 'unknown track';
    const isPlaying = kPlayer.isPlaying;
    compactPlayerHTML = `
      <div class="top-bar-player">
        <button class="top-bar-btn prev-btn">⏮</button>
        <button class="top-bar-btn play-btn">${isPlaying ? '⏸' : '▶'}</button>
        <button class="top-bar-btn next-btn">⏭</button>
        <span class="top-bar-track-name">${trackName}</span>
      </div>
    `;
  }
  topBar.innerHTML = `
    <div class="top-bar-section left">
      <button class="top-bar-btn menu-toggle" title="toggle menu">☰</button>
    </div>
    <div class="top-bar-section center-left">
      ${compactPlayerHTML}
    </div>
    <div class="top-bar-section tiles-container">
      <div class="top-bar-tiles">${tileIndicatorsHTML}</div>
    </div>
    <div class="top-bar-section center">
      <span class="top-bar-clock" id="top-bar-clock"></span>
      <span class="top-bar-date" id="top-bar-date"></span>
    </div>
    <div class="top-bar-section right">
      <button class="top-bar-btn settings-btn" title="settings">⚙</button>
    </div>
  `;
  topBar.querySelector('.menu-toggle').addEventListener('click', () => {
    if (kSettings.menuOpen) {
      collapseMenu();
    } else {
      expandMenu();
    }
  });
  const settingsBtn = topBar.querySelector('.settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (typeof launchApp === 'function') launchApp('settings');
    });
  }
  const tabs = topBar.querySelectorAll('.top-bar-tile-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('.tab-close-btn');
      if (closeBtn) {
        e.stopPropagation();
        if (typeof closeTile === 'function') closeTile(closeBtn.dataset.closeId);
        return;
      }
      if (typeof focusTile === 'function') focusTile(tab.dataset.id);
    });
  });
  const topPlayer = topBar.querySelector('.top-bar-player');
  if (topPlayer) {
    topPlayer.querySelector('.prev-btn').addEventListener('click', () => kPlayer.prev());
    topPlayer.querySelector('.play-btn').addEventListener('click', () => {
      if (kPlayer.isPlaying) kPlayer.pause();
      else kPlayer.play();
      renderTopBar();
      renderMainMenu();
    });
    topPlayer.querySelector('.next-btn').addEventListener('click', () => kPlayer.next());
  }
  updateClock();
}
function collapseMenu() {
  const mainMenu = document.getElementById('main-menu');
  const topBar = document.getElementById('top-bar');
  if (mainMenu) mainMenu.classList.add('collapsed');
  if (topBar) topBar.classList.add('visible');
  kSettings.menuOpen = false;
  if (typeof saveSettings === 'function') saveSettings();
  renderTopBar();
}
function expandMenu() {
  const mainMenu = document.getElementById('main-menu');
  if (mainMenu) mainMenu.classList.remove('collapsed');
  kSettings.menuOpen = true;
  if (typeof saveSettings === 'function') saveSettings();
  renderMainMenu();
  renderTopBar();
}
function updateClock() {
  const now = new Date();
  let timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: kSettings.showSeconds ? '2-digit' : undefined });
  let dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  let topTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let topDateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
  if (typeof formatTime === 'function') timeStr = formatTime(now);
  if (typeof formatDate === 'function') dateStr = formatDate(now);
  const menuClock = document.getElementById('menu-clock-display');
  const menuDate = document.getElementById('menu-date-display');
  if (menuClock) menuClock.textContent = timeStr.toLowerCase();
  if (menuDate) menuDate.textContent = dateStr.toLowerCase();
  const topClock = document.getElementById('top-bar-clock');
  const topDate = document.getElementById('top-bar-date');
  if (topClock) topClock.textContent = topTimeStr.toLowerCase();
  if (topDate) topDate.textContent = topDateStr.toLowerCase();
}
function renderFileNavigator(items, breadcrumb) {
  const container = document.createElement('div');
  container.className = 'file-navigator';
  const breadcrumbEl = document.createElement('div');
  breadcrumbEl.className = 'file-nav-breadcrumb';
  const crumbs = Array.isArray(breadcrumb) ? breadcrumb : ['root'];
  crumbs.forEach((cr, index) => {
    const crEl = document.createElement('span');
    crEl.className = 'breadcrumb-segment';
    const label = typeof cr === 'object' ? cr.name : cr;
    crEl.textContent = label;
    crEl.addEventListener('click', () => {
      const newBreadcrumb = crumbs.slice(0, index + 1);
      const newItems = index === 0 ? (typeof desktopItems !== 'undefined' ? desktopItems : []) : (typeof cr === 'object' ? (cr.items || []) : []);
      const newContainer = renderFileNavigator(newItems, newBreadcrumb);
      if (container.parentNode) {
        container.parentNode.replaceChild(newContainer, container);
      }
    });
    breadcrumbEl.appendChild(crEl);
    if (index < crumbs.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'breadcrumb-sep';
      sep.textContent = ' / ';
      breadcrumbEl.appendChild(sep);
    }
  });
  const sortBar = document.createElement('div');
  sortBar.className = 'file-nav-sort-bar';
  sortBar.style.padding = '6px 12px';
  sortBar.style.borderBottom = '1px solid #222';
  sortBar.style.display = 'flex';
  sortBar.style.alignItems = 'center';
  sortBar.style.gap = '8px';
  sortBar.style.fontSize = '11px';
  sortBar.style.color = '#888';
  const sortLabel = document.createElement('span');
  sortLabel.textContent = 'sort:';
  const sortSelect = document.createElement('select');
  sortSelect.style.background = '#050505';
  sortSelect.style.color = '#fff';
  sortSelect.style.border = '1px solid #333';
  sortSelect.style.padding = '2px 6px';
  sortSelect.style.fontFamily = 'inherit';
  sortSelect.style.fontSize = '10px';
  sortSelect.style.cursor = 'pointer';
  let currentSortMode = (typeof kSettings !== 'undefined' && kSettings.fileSortMode) ? kSettings.fileSortMode : 'name-asc';
  const options = [
    { value: 'name-asc', label: 'name (a-z)' },
    { value: 'name-desc', label: 'name (z-a)' },
    { value: 'category', label: 'category' },
    { value: 'size-desc', label: 'size (desc)' },
    { value: 'size-asc', label: 'size (asc)' }
  ];
  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt.value;
    el.textContent = opt.label;
    if (opt.value === currentSortMode) el.selected = true;
    sortSelect.appendChild(el);
  });
  sortSelect.addEventListener('change', () => {
    if (typeof kSettings !== 'undefined') {
      kSettings.fileSortMode = sortSelect.value;
      if (typeof saveSettings === 'function') saveSettings();
    }
    const newContainer = renderFileNavigator(items, crumbs);
    if (container.parentNode) {
      container.parentNode.replaceChild(newContainer, container);
    }
  });
  sortBar.appendChild(sortLabel);
  sortBar.appendChild(sortSelect);
  const itemsList = document.createElement('div');
  itemsList.className = 'file-nav-items';
  if (items && items.length > 0) {
    const copy = [...items];
    copy.sort((a, b) => {
      const isAFolder = a.type === 'folder' || !!a.items;
      const isBFolder = b.type === 'folder' || !!b.items;
      if (currentSortMode === 'name-asc') {
        if (isAFolder !== isBFolder) return isAFolder ? -1 : 1;
        return (a.name || '').localeCompare(b.name || '');
      } else if (currentSortMode === 'name-desc') {
        if (isAFolder !== isBFolder) return isAFolder ? -1 : 1;
        return (b.name || '').localeCompare(a.name || '');
      } else if (currentSortMode === 'category') {
        const catA = a.category || a.type || 'file';
        const catB = b.category || b.type || 'file';
        if (catA !== catB) return catA.localeCompare(catB);
        return (a.name || '').localeCompare(b.name || '');
      } else if (currentSortMode === 'size-desc') {
        return (b.size || 0) - (a.size || 0);
      } else if (currentSortMode === 'size-asc') {
        return (a.size || 0) - (b.size || 0);
      }
      return 0;
    });
    copy.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'file-nav-item';
      let icon = '■';
      if (item.type === 'folder') icon = item.url ? '⬡' : '□';
      else if (item.type === 'audio') icon = '♫';
      else if (item.type === 'video') icon = '▶';
      else if (item.type === 'image') icon = '▣';
      else if (item.type === 'code') icon = '◇';
      else if (item.type === 'document') icon = '▢';
      itemEl.innerHTML = `<span class="icon">${icon}</span> <span class="name">${item.name}</span>`;
      itemEl.addEventListener('click', () => {
        if (item.type === 'folder') {
          if (item.items && item.items.length > 0) {
            const newBreadcrumb = [...crumbs, item];
            const newContainer = renderFileNavigator(item.items, newBreadcrumb);
            if (container.parentNode) {
              container.parentNode.replaceChild(newContainer, container);
            }
          } else {
            if (typeof openFile === 'function') openFile(item);
          }
        } else {
          if (typeof openFile === 'function') openFile(item);
        }
      });
      itemsList.appendChild(itemEl);
    });
  } else {
    itemsList.innerHTML = '<div class="empty-state" style="padding: 12px; color: #666;">folder is empty</div>';
  }
  container.appendChild(breadcrumbEl);
  container.appendChild(itemsList);
  return container;
}
setInterval(updateClock, 1000);
