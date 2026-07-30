let openCategoryFolder = null;
function categorizeAllItems() {
  const categories = {
    games: [],
    tools: [],
    apps: [],
    documents: [],
    videos: [],
    audio: [],
    misc: []
  };
  if (typeof systemApps !== 'undefined' && Array.isArray(systemApps)) {
    systemApps.forEach(app => {
      categories.tools.push({ ...app, isApp: true, category: 'tools' });
    });
  }
  if (typeof kPlayer !== 'undefined' && kPlayer.playlist && Array.isArray(kPlayer.playlist)) {
    kPlayer.playlist.forEach(track => {
      categories.audio.push({
        name: track.name || track.title || 'audio track',
        url: track.url || track.src || '',
        type: 'audio',
        icon: '♫'
      });
    });
  }
  function collectItems(list, parentName = '') {
    if (!list) return;
    list.forEach(item => {
      const cat = (item.category || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      const cls = (item.class || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      const parent = (parentName || '').toLowerCase();
      const isAudio = cls === 'audio' || type === 'audio' || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.m4a') || name.endsWith('.flac') || name.endsWith('.aac');
      const isVideo = cls === 'video' || type === 'video' || name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.ogv') || name.endsWith('.mkv') || name.endsWith('.avi');
      const isDoc = cls === 'document' || cls === 'code' || cls === 'image' || cls === 'zip' || type === 'document' || type === 'code' || type === 'image' || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.json') || name.endsWith('.js') || name.endsWith('.html') || name.endsWith('.css') || name.endsWith('.pmp') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.hdr') || name.endsWith('.zip');
      const isGame = parent.includes('game') || cat === 'game' || type === 'game' || name.includes('game');
      const isApp = parent.includes('website') || parent.includes('project') || cat === 'website' || cat === 'app' || type === 'app';
      if (isAudio) {
        categories.audio.push(item);
      } else if (isVideo) {
        categories.videos.push(item);
      } else if (isDoc) {
        categories.documents.push(item);
      } else if (isGame) {
        categories.games.push(item);
      } else if (cat === 'tool' || type === 'tool') {
        categories.tools.push(item);
      } else if (isApp || (item.url && !item.items && !item.contents)) {
        categories.apps.push(item);
      } else {
        categories.misc.push(item);
      }
      if (item.items && item.items.length > 0) {
        collectItems(item.items, item.name);
      } else if (item.contents && item.contents.length > 0) {
        collectItems(item.contents, item.name);
      }
    });
  }
  if (typeof desktopItems !== 'undefined' && Array.isArray(desktopItems)) {
    collectItems(desktopItems);
  }
  return categories;
}
function renderMainMenu() {
  const mainMenu = document.getElementById('main-menu');
  if (!mainMenu) return;
  mainMenu.innerHTML = `
    <div class="menu-tab-bar">
      <div class="menu-tab active" data-tab="home">home</div>
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
  renderMenuContent('home');
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
  const homeContainer = document.createElement('div');
  homeContainer.className = 'home-menu-container';
  homeContainer.style.display = 'flex';
  homeContainer.style.flexDirection = 'column';
  homeContainer.style.height = '100%';
  homeContainer.style.position = 'relative';
  const searchContainer = document.createElement('div');
  searchContainer.className = 'home-search-bar';
  searchContainer.style.padding = '8px 12px 12px 12px';
  searchContainer.style.flexShrink = '0';
  searchContainer.style.borderBottom = '1px solid #222';
  const searchInput = document.createElement('input');
  searchInput.className = 'search-input';
  searchInput.type = 'text';
  searchInput.placeholder = 'search apps, games, documents, tools...';
  searchInput.style.width = '100%';
  searchInput.style.padding = '8px 12px';
  searchContainer.appendChild(searchInput);
  const resultsContainer = document.createElement('div');
  resultsContainer.className = 'search-results-overlay';
  resultsContainer.style.display = 'none';
  resultsContainer.style.overflowY = 'auto';
  resultsContainer.style.flex = '1';
  resultsContainer.style.padding = '8px 12px';
  const mainViewArea = document.createElement('div');
  mainViewArea.className = 'home-main-view';
  mainViewArea.style.flex = '1';
  mainViewArea.style.overflowY = 'auto';
  mainViewArea.style.padding = '8px 12px';
  const categories = categorizeAllItems();
  function renderCategoryFoldersView() {
    mainViewArea.innerHTML = '';
    const categorySpecs = [
      { id: 'games', name: 'games', icon: '🎮', items: categories.games },
      { id: 'tools', name: 'tools', icon: '⚙', items: categories.tools },
      { id: 'apps', name: 'apps', icon: '🌐', items: categories.apps },
      { id: 'documents', name: 'documents', icon: '▢', items: categories.documents },
      { id: 'videos', name: 'videos', icon: '▶', items: categories.videos },
      { id: 'audio', name: 'audio', icon: '♫', items: categories.audio },
      { id: 'misc', name: 'misc', icon: '⬡', items: categories.misc }
    ];
    if (openCategoryFolder) {
      const activeSpec = categorySpecs.find(c => c.id === openCategoryFolder);
      if (activeSpec) {
        mainViewArea.scrollTop = 0;
        const unrolledContainer = document.createElement('div');
        unrolledContainer.className = 'unrolled-folder-wrapper';
        const header = document.createElement('div');
        header.className = 'unrolled-folder-header';
        header.style.position = 'sticky';
        header.style.top = '0';
        header.style.zIndex = '20';
        header.style.background = '#000';
        header.style.padding = '8px 0 12px 0';
        header.style.borderBottom = '1px solid #333';
        header.style.marginBottom = '12px';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.justifyContent = 'flex-start';
        header.style.gap = '12px';
        header.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">${activeSpec.icon}</span>
            <span style="font-size: 13px; font-weight: bold; color: #fff;">${activeSpec.name} (${activeSpec.items.length})</span>
          </div>
          <button class="close-unrolled-btn" style="background: #111; color: #ff3333; border: 1px solid #ff3333; padding: 4px 12px; font-family: inherit; font-size: 11px; cursor: pointer; border-radius: 0;">✕ close folder</button>
        `;
        header.querySelector('.close-unrolled-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          openCategoryFolder = null;
          renderCategoryFoldersView();
        });
        unrolledContainer.appendChild(header);
        if (activeSpec.items.length === 0) {
          const emptyEl = document.createElement('div');
          emptyEl.style.color = '#666';
          emptyEl.style.padding = '12px 0';
          emptyEl.style.fontSize = '12px';
          emptyEl.textContent = 'no items in this folder';
          unrolledContainer.appendChild(emptyEl);
        } else {
          const itemsGrid = document.createElement('div');
          itemsGrid.className = 'app-grid';
          activeSpec.items.forEach(item => {
            const appItem = document.createElement('div');
            appItem.className = 'app-grid-item';
            let icon = item.icon || activeSpec.icon;
            appItem.innerHTML = `<div class="app-icon">${icon}</div><div class="app-name">${item.name}</div>`;
            appItem.addEventListener('click', () => {
              if (item.isApp) {
                if (typeof launchApp === 'function') launchApp(item.name);
              } else {
                if (typeof openFile === 'function') openFile(item);
              }
            });
            itemsGrid.appendChild(appItem);
          });
          unrolledContainer.appendChild(itemsGrid);
        }
        mainViewArea.appendChild(unrolledContainer);
        return;
      }
    }
    const folderGrid = document.createElement('div');
    folderGrid.className = 'app-grid';
    categorySpecs.forEach(cat => {
      const folderCard = document.createElement('div');
      folderCard.className = 'app-grid-item folder-category-card';
      folderCard.innerHTML = `
        <div class="app-icon" style="border-color: #555;">${cat.icon}</div>
        <div class="app-name" style="font-weight: bold; color: #fff;">${cat.name}</div>
        <div style="font-size: 10px; color: #888;">${cat.items.length} items</div>
      `;
      folderCard.addEventListener('click', () => {
        openCategoryFolder = cat.id;
        renderCategoryFoldersView();
      });
      folderGrid.appendChild(folderCard);
    });
    mainViewArea.appendChild(folderGrid);
  }
  function updateSearchState() {
    const q = searchInput.value.toLowerCase().trim();
    const isSearchActive = document.activeElement === searchInput || q.length > 0;
    if (!isSearchActive && !q) {
      resultsContainer.style.display = 'none';
      mainViewArea.style.display = 'block';
      return;
    }
    resultsContainer.style.display = 'block';
    mainViewArea.style.display = 'none';
    resultsContainer.innerHTML = '';
    const recents = (typeof kSettings !== 'undefined' && kSettings.recentApps) ? kSettings.recentApps : [];
    if (recents.length > 0) {
      const recentHeader = document.createElement('div');
      recentHeader.style.fontSize = '12px';
      recentHeader.style.color = '#888';
      recentHeader.style.padding = '4px 0 8px 0';
      recentHeader.style.borderBottom = '1px solid #222';
      recentHeader.style.marginBottom = '8px';
      recentHeader.style.fontWeight = 'bold';
      recentHeader.textContent = 'recent apps';
      resultsContainer.appendChild(recentHeader);
      const recentGrid = document.createElement('div');
      recentGrid.className = 'app-grid';
      recentGrid.style.marginBottom = '16px';
      recents.slice(0, 6).forEach(item => {
        const appItem = document.createElement('div');
        appItem.className = 'app-grid-item';
        appItem.innerHTML = `<div class="app-icon">${item.icon || '⬡'}</div><div class="app-name">${item.name}</div>`;
        appItem.addEventListener('click', () => {
          if (item.isApp) {
            if (typeof launchApp === 'function') launchApp(item.name);
          } else {
            if (typeof openFile === 'function') openFile(item);
          }
        });
        recentGrid.appendChild(appItem);
      });
      resultsContainer.appendChild(recentGrid);
    }
    if (q) {
      const searchResultsHeader = document.createElement('div');
      searchResultsHeader.style.fontSize = '12px';
      searchResultsHeader.style.color = '#888';
      searchResultsHeader.style.padding = '4px 0 8px 0';
      searchResultsHeader.style.borderBottom = '1px solid #222';
      searchResultsHeader.style.marginBottom = '8px';
      searchResultsHeader.style.fontWeight = 'bold';
      searchResultsHeader.textContent = 'search results';
      resultsContainer.appendChild(searchResultsHeader);
      const results = [];
      let allItems = [];
      Object.values(categories).forEach(arr => { allItems = allItems.concat(arr); });
      const seen = new Set();
      allItems.forEach(item => {
        if (!item || !item.name) return;
        if (seen.has(item.name.toLowerCase())) return;
        seen.add(item.name.toLowerCase());
        const matchName = item.name && item.name.toLowerCase().includes(q);
        const matchUrl = item.url && item.url.toLowerCase().includes(q);
        if (matchName || matchUrl) results.push(item);
      });
      if (results.length === 0) {
        const noRes = document.createElement('div');
        noRes.style.padding = '12px 0';
        noRes.style.color = '#666';
        noRes.style.fontSize = '12px';
        noRes.textContent = 'no matching items found';
        resultsContainer.appendChild(noRes);
        return;
      }
      results.forEach(res => {
        const resEl = document.createElement('div');
        resEl.className = 'search-result-item';
        resEl.style.display = 'flex';
        resEl.style.alignItems = 'center';
        resEl.style.justifyContent = 'space-between';
        resEl.style.padding = '8px 12px';
        resEl.style.borderBottom = '1px solid #111';
        resEl.style.cursor = 'pointer';
        resEl.innerHTML = `
          <div><span class="icon">${res.icon || '◈'}</span> <span class="name">${res.name}</span></div>
          <span style="font-size:10px; color:#666;">[${res.category || 'item'}]</span>
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
    }
  }
  searchInput.addEventListener('focus', updateSearchState);
  searchInput.addEventListener('input', updateSearchState);
  searchInput.addEventListener('blur', () => {
    setTimeout(() => {
      if (!searchInput.value.trim()) {
        resultsContainer.style.display = 'none';
        mainViewArea.style.display = 'block';
      }
    }, 200);
  });
  const specMap = {
    games: { id: 'games', name: 'games', icon: '🎮', items: categories.games },
    tools: { id: 'tools', name: 'tools', icon: '⚙', items: categories.tools },
    apps: { id: 'apps', name: 'apps', icon: '🌐', items: categories.apps },
    documents: { id: 'documents', name: 'documents', icon: '▢', items: categories.documents },
    videos: { id: 'videos', name: 'videos', icon: '▶', items: categories.videos },
    audio: { id: 'audio', name: 'audio', icon: '♫', items: categories.audio },
    misc: { id: 'misc', name: 'misc', icon: '⬡', items: categories.misc }
  };
  if (openCategoryFolder && specMap[openCategoryFolder]) {
    renderUnrolledFolderView(specMap[openCategoryFolder]);
  } else {
    renderCategoryFoldersView();
  }
  homeContainer.appendChild(searchContainer);
  homeContainer.appendChild(resultsContainer);
  homeContainer.appendChild(mainViewArea);
  contentArea.appendChild(homeContainer);
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
        <div class="top-bar-tile-tab ${isActive ? 'active' : ''} ${tile.minimized ? 'minimized' : ''}" data-id="${tile.id}" title="${tile.title}">
          <span>${icon}</span>
          <span class="tab-title">${tile.title.toLowerCase()} ${tile.minimized ? '[_]' : ''}</span>
          <span class="tab-close-btn" data-close-id="${tile.id}" title="close">✕</span>
        </div>
      `;
    });
  }
  const taskSwitcherHTML = `<div class="top-bar-tiles">${tileIndicatorsHTML}</div>`;
  let compactPlayerHTML = '';
  if (typeof kPlayer !== 'undefined' && kPlayer.playlist && kPlayer.playlist.length > 0) {
    const trackName = kPlayer.getTrackName ? kPlayer.getTrackName() : 'unknown track';
    const isPlaying = kPlayer.isPlaying;
    const isOpen = topBar.dataset.mediaPopupOpen === 'true';
    compactPlayerHTML = `
      <div class="top-bar-media-container" style="position:relative; display:inline-flex; align-items:center;">
        <button class="top-bar-btn top-bar-media-toggle ${isOpen ? 'open' : ''}" id="top-bar-media-triangle" title="media playback">▶</button>
        <div class="top-bar-media-popup ${isOpen ? 'visible' : ''}" id="top-bar-media-popup">
          <div class="top-bar-media-track-title" id="media-popup-track-title" title="open media player">♫ ${trackName}</div>
          <div class="top-bar-media-controls">
            <button class="top-bar-btn prev-btn" title="previous">⏮</button>
            <button class="top-bar-btn play-btn" title="play/pause">${isPlaying ? '⏸' : '▶'}</button>
            <button class="top-bar-btn next-btn" title="next">⏭</button>
          </div>
        </div>
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
      ${taskSwitcherHTML}
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
  const mediaTriangleBtn = topBar.querySelector('#top-bar-media-triangle');
  const mediaPopup = topBar.querySelector('#top-bar-media-popup');
  if (mediaTriangleBtn && mediaPopup) {
    mediaTriangleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = mediaPopup.classList.contains('visible');
      if (!isOpen) {
        mediaTriangleBtn.classList.add('open');
        mediaPopup.classList.add('visible');
        topBar.dataset.mediaPopupOpen = 'true';
      } else {
        mediaTriangleBtn.classList.remove('open');
        mediaPopup.classList.remove('visible');
        topBar.dataset.mediaPopupOpen = 'false';
      }
    });
    const trackTitleEl = mediaPopup.querySelector('#media-popup-track-title');
    if (trackTitleEl) {
      trackTitleEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof launchApp === 'function') {
          launchApp('media player');
        }
      });
    }
    const prevBtn = mediaPopup.querySelector('.prev-btn');
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); kPlayer.prev(); });
    const playBtn = mediaPopup.querySelector('.play-btn');
    if (playBtn) playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      kPlayer.togglePlay();
    });
    const nextBtn = mediaPopup.querySelector('.next-btn');
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); kPlayer.next(); });
    document.addEventListener('click', (e) => {
      if (!mediaPopup.contains(e.target) && e.target !== mediaTriangleBtn) {
        mediaTriangleBtn.classList.remove('open');
        mediaPopup.classList.remove('visible');
        topBar.dataset.mediaPopupOpen = 'false';
      }
    });
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
  if (typeof checkWanderingBtnState === 'function') checkWanderingBtnState();
}
function expandMenu() {
  const mainMenu = document.getElementById('main-menu');
  if (mainMenu) mainMenu.classList.remove('collapsed');
  kSettings.menuOpen = true;
  if (typeof saveSettings === 'function') saveSettings();
  renderMainMenu();
  renderTopBar();
  if (typeof checkWanderingBtnState === 'function') checkWanderingBtnState();
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
function checkStartupRedirectPrompt() {
  if (typeof kSettings === 'undefined') return;
  if (kSettings.alwaysRedirectToOs) {
    showStartupRedirectCountdown();
    return;
  }
  if (!kSettings.firstRunHandled) {
    showFirstStartPrompt();
  }
}
function showStartupRedirectCountdown() {
  const existing = document.getElementById('startup-redirect-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'startup-redirect-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '100000';
  overlay.style.background = '#000000';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.padding = '20px';
  overlay.style.boxSizing = 'border-box';
  overlay.style.fontFamily = "'Share Tech Mono', monospace";
  overlay.style.textTransform = 'lowercase';
  let secondsLeft = 5;
  overlay.innerHTML = `
    <div style="max-width: 480px; width: 100%; border: 1px solid #333333; padding: 32px 24px; background: #050505; text-align: center; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; box-shadow: 0 8px 32px rgba(0,0,0,1);">
      <div id="redirect-counter-text" style="font-size: 18px; color: #ffffff; margin-bottom: 24px; line-height: 1.4;">
        directing you to wbos in ${secondsLeft} seconds.
      </div>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; width: 100%;">
        <button id="redirect-use-k-btn" style="flex: 1; min-width: 120px; padding: 10px 16px; border: 1px solid #333333; background: #111111; color: #ffffff; font-family: inherit; font-size: 13px; cursor: pointer; text-transform: lowercase; transition: all 0.2s ease;">use K</button>
        <button id="redirect-disable-btn" style="flex: 1; min-width: 140px; padding: 10px 16px; border: 1px solid #ff3333; background: #111111; color: #ff3333; font-family: inherit; font-size: 13px; cursor: pointer; text-transform: lowercase; transition: all 0.2s ease;">disable redirect</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const counterEl = overlay.querySelector('#redirect-counter-text');
  const useKBtn = overlay.querySelector('#redirect-use-k-btn');
  const disableBtn = overlay.querySelector('#redirect-disable-btn');
  useKBtn.onmouseenter = () => { useKBtn.style.borderColor = '#ffffff'; useKBtn.style.background = '#222222'; };
  useKBtn.onmouseleave = () => { useKBtn.style.borderColor = '#333333'; useKBtn.style.background = '#111111'; };
  disableBtn.onmouseenter = () => { disableBtn.style.borderColor = '#ff0000'; disableBtn.style.background = '#330000'; disableBtn.style.color = '#ffffff'; };
  disableBtn.onmouseleave = () => { disableBtn.style.borderColor = '#ff3333'; disableBtn.style.background = '#111111'; disableBtn.style.color = '#ff3333'; };
  const timerId = setInterval(() => {
    secondsLeft--;
    if (secondsLeft > 0) {
      if (counterEl) counterEl.textContent = `directing you to wbos in ${secondsLeft} seconds.`;
    } else {
      clearInterval(timerId);
      window.location.href = (typeof BASE_URL !== 'undefined' ? BASE_URL : '') + 'os/';
    }
  }, 1000);
  useKBtn.onclick = () => {
    clearInterval(timerId);
    overlay.remove();
  };
  disableBtn.onclick = () => {
    clearInterval(timerId);
    if (typeof kSettings !== 'undefined') {
      kSettings.alwaysRedirectToOs = false;
      if (typeof saveSettings === 'function') saveSettings();
    }
    overlay.remove();
  };
}
function showFirstStartPrompt() {
  const existing = document.getElementById('first-start-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'first-start-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '100000';
  overlay.style.background = '#000000';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.padding = '20px';
  overlay.style.boxSizing = 'border-box';
  overlay.style.fontFamily = "'Share Tech Mono', monospace";
  overlay.style.textTransform = 'lowercase';
  overlay.innerHTML = `
    <div style="max-width: 440px; width: 100%; border: 1px solid #ffffff; padding: 32px 24px; background: #050505; text-align: center; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; box-shadow: 0 8px 32px rgba(0,0,0,1);">
      <div style="font-size: 18px; color: #ffffff; margin-bottom: 8px; font-weight: bold; line-height: 1.3;">
        hi! wbOS... has changed.
      </div>
      <div style="font-size: 13px; color: #888888; margin-bottom: 24px;">
        choose what to do:
      </div>
      <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
        <button id="first-start-look-around" style="padding: 12px 16px; border: 1px solid #333333; background: #111111; color: #ffffff; font-family: inherit; font-size: 13px; cursor: pointer; text-transform: lowercase; transition: all 0.2s ease;">take a look around</button>
        <button id="first-start-take-back" style="padding: 12px 16px; border: 1px solid #333333; background: #111111; color: #ffffff; font-family: inherit; font-size: 13px; cursor: pointer; text-transform: lowercase; transition: all 0.2s ease;">take me back this time!</button>
        <button id="first-start-never" style="padding: 12px 16px; border: 1px solid #ff3333; background: #111111; color: #ff3333; font-family: inherit; font-size: 13px; cursor: pointer; text-transform: lowercase; transition: all 0.2s ease;">NEVER BRING ME HERE AGAIN!</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const btnLookAround = overlay.querySelector('#first-start-look-around');
  const btnTakeBack = overlay.querySelector('#first-start-take-back');
  const btnNever = overlay.querySelector('#first-start-never');
  btnLookAround.onmouseenter = () => { btnLookAround.style.borderColor = '#ffffff'; btnLookAround.style.background = '#222222'; };
  btnLookAround.onmouseleave = () => { btnLookAround.style.borderColor = '#333333'; btnLookAround.style.background = '#111111'; };
  btnTakeBack.onmouseenter = () => { btnTakeBack.style.borderColor = '#ffffff'; btnTakeBack.style.background = '#222222'; };
  btnTakeBack.onmouseleave = () => { btnTakeBack.style.borderColor = '#333333'; btnTakeBack.style.background = '#111111'; };
  btnNever.onmouseenter = () => { btnNever.style.borderColor = '#ff0000'; btnNever.style.background = '#330000'; btnNever.style.color = '#ffffff'; };
  btnNever.onmouseleave = () => { btnNever.style.borderColor = '#ff3333'; btnNever.style.background = '#111111'; btnNever.style.color = '#ff3333'; };
  btnLookAround.onclick = () => {
    kSettings.firstRunHandled = true;
    if (typeof saveSettings === 'function') saveSettings();
    overlay.remove();
    showHelpPromptModal();
  };
  btnTakeBack.onclick = () => {
    kSettings.firstRunHandled = true;
    if (typeof saveSettings === 'function') saveSettings();
    window.location.href = (typeof BASE_URL !== 'undefined' ? BASE_URL : '') + 'os/';
  };
  btnNever.onclick = () => {
    kSettings.firstRunHandled = true;
    kSettings.alwaysRedirectToOs = true;
    if (typeof saveSettings === 'function') saveSettings();
    window.location.href = (typeof BASE_URL !== 'undefined' ? BASE_URL : '') + 'os/';
  };
}
function showHelpPromptModal() {
  const existing = document.getElementById('help-prompt-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'help-prompt-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.zIndex = '100000';
  overlay.style.background = '#000000';
  overlay.style.display = 'flex';
  overlay.style.flexDirection = 'column';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.padding = '20px';
  overlay.style.boxSizing = 'border-box';
  overlay.style.fontFamily = 'inherit';
  overlay.style.textTransform = 'lowercase';
  overlay.innerHTML = `
    <div style="max-width: 400px; width: 100%; border: 1px solid #ffffff; padding: 28px 24px; background: #050505; text-align: center; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; box-shadow: 0 8px 32px rgba(0,0,0,1);">
      <div style="font-size: 16px; color: #ffffff; margin-bottom: 8px; font-weight: bold; line-height: 1.3;">
        would you like to read the help document?
      </div>
      <div style="font-size: 12px; color: #888888; margin-bottom: 20px;">
        learn about navigation, tiling windows, and shortcuts.
      </div>
      <div style="display: flex; gap: 12px; width: 100%;">
        <button id="help-prompt-yes" style="flex: 1; padding: 10px 14px; border: 1px solid #ffffff; background: #111111; color: #ffffff; font-family: inherit; font-size: 12px; cursor: pointer; text-transform: lowercase; transition: all 0.2s ease;">yes, show help!</button>
        <button id="help-prompt-no" style="flex: 1; padding: 10px 14px; border: 1px solid #333333; background: #111111; color: #888888; font-family: inherit; font-size: 12px; cursor: pointer; text-transform: lowercase; transition: all 0.2s ease;">no thanks</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const btnYes = overlay.querySelector('#help-prompt-yes');
  const btnNo = overlay.querySelector('#help-prompt-no');
  btnYes.onmouseenter = () => { btnYes.style.background = '#222222'; };
  btnYes.onmouseleave = () => { btnYes.style.background = '#111111'; };
  btnNo.onmouseenter = () => { btnNo.style.borderColor = '#ffffff'; btnNo.style.color = '#ffffff'; btnNo.style.background = '#222222'; };
  btnNo.onmouseleave = () => { btnNo.style.borderColor = '#333333'; btnNo.style.color = '#888888'; btnNo.style.background = '#111111'; };
  btnYes.onclick = () => {
    overlay.remove();
    if (typeof openHelpWindow === 'function') {
      openHelpWindow();
    } else if (typeof launchApp === 'function') {
      launchApp('help');
    }
  };
  btnNo.onclick = () => {
    overlay.remove();
  };
}
let wanderingBtnTimer = null;
let wanderingState = 'hidden';
let wanderingPauseTimer = null;
let mouseStopTimer = null;
function checkWanderingBtnState() {
  const isDesktopEmpty = (typeof openTiles !== 'undefined' && openTiles.length === 0);
  const isMenuClosed = (typeof kSettings !== 'undefined' && !kSettings.menuOpen);
  const shouldBeActive = isDesktopEmpty && isMenuClosed;
  let btn = document.getElementById('wandering-menu-btn');
  if (!shouldBeActive) {
    if (btn) {
      btn.style.display = 'none';
      btn.classList.remove('visible');
    }
    clearTimeout(wanderingBtnTimer);
    clearTimeout(wanderingPauseTimer);
    clearTimeout(mouseStopTimer);
    wanderingState = 'hidden';
    return;
  }
  if (wanderingState === 'hidden') {
    wanderingState = 'waiting';
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'wandering-menu-btn';
      btn.className = 'wandering-menu-btn';
      btn.innerHTML = '<span>menu</span> <span>☰</span>';
      document.body.appendChild(btn);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof expandMenu === 'function') {
          expandMenu();
        }
        checkWanderingBtnState();
      });
    }
    btn.style.display = 'none';
    btn.classList.remove('visible');
    clearTimeout(wanderingBtnTimer);
    wanderingBtnTimer = setTimeout(() => {
      const emptyNow = (typeof openTiles !== 'undefined' && openTiles.length === 0);
      const closedNow = (typeof kSettings !== 'undefined' && !kSettings.menuOpen);
      if (wanderingState === 'waiting' && emptyNow && closedNow) {
        btn.style.display = 'flex';
        btn.classList.add('visible');
        wanderingState = 'following';
      }
    }, 3000);
  }
}
window.addEventListener('mousemove', (e) => {
  const btn = document.getElementById('wandering-menu-btn');
  if (!btn || wanderingState === 'hidden' || wanderingState === 'waiting') return;
  if (wanderingState === 'paused') {
    return;
  }
  wanderingState = 'following';
  const scale = (typeof kSettings !== 'undefined' && kSettings.contentScale) ? kSettings.contentScale : 1.0;
  const btnW = btn.offsetWidth || 80;
  const btnH = btn.offsetHeight || 32;
  const targetX = Math.max(10, Math.min((window.innerWidth / scale) - btnW - 10, (e.clientX / scale) + 15));
  const targetY = Math.max(40, Math.min((window.innerHeight / scale) - btnH - 10, (e.clientY / scale) + 15));
  btn.style.left = `${targetX}px`;
  btn.style.top = `${targetY}px`;
  clearTimeout(mouseStopTimer);
  mouseStopTimer = setTimeout(() => {
    if (wanderingState === 'following') {
      wanderingState = 'paused';
      clearTimeout(wanderingPauseTimer);
      wanderingPauseTimer = setTimeout(() => {
        if (wanderingState === 'paused') {
          wanderingState = 'following';
        }
      }, 3000);
    }
  }, 250);
});
setInterval(updateClock, 1000);
