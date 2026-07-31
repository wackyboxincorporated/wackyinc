const BASE_URL = (window.location.origin && !window.location.origin.includes('null'))
  ? (window.location.origin.endsWith('/') ? window.location.origin : window.location.origin + '/')
  : 'https://wackybox.org/';
const MEDIA_PLAYER_APP_URL = `${BASE_URL}media?=`;
let desktopItems = [];
let siteIndex = { tree: [], all: [] };
let systemApps = [
  { name: 'calculator', icon: '⊞', description: 'basic calculator tool' },
  { name: 'clock', icon: '◷', description: 'current time tool' },
  { name: 'notepad', icon: '☰', description: 'text editor tool' },
  { name: 'browser', icon: '◎', description: 'web browser tool' },
  { name: 'apps', icon: '⊟', description: 'apps navigator tool' },
  { name: 'terminal', icon: '▬', description: 'command line tool' },
  { name: 'settings', icon: '⚙', description: 'preferences tool' },
  { name: 'video player', icon: '▶', description: 'play videos tool' },
  { name: 'media player', icon: '♫', description: 'play music tool' },
  { name: 'about', icon: 'ⓘ', description: 'about wbos!k' }
];
const defaultSettings = {
  playerMode: 'integrated',
  clockFormat: '12h',
  showSeconds: true,
  boldText: false,
  contentScale: 1.0,
  tileGap: 1,
  menuOpen: true,
  firstRunHandled: false,
  alwaysRedirectToOs: false,
  recentApps: []
};
let kSettings = { ...defaultSettings };
function recordRecentApp(item) {
  if (!item || !item.name) return;
  if (!kSettings.recentApps) kSettings.recentApps = [];
  const entry = {
    name: item.name,
    icon: item.icon || '',
    type: item.type || (item.isApp ? 'tool' : 'file'),
    url: item.url || '',
    category: item.category || '',
    isApp: !!item.isApp
  };
  kSettings.recentApps = kSettings.recentApps.filter(r => r.name.toLowerCase() !== item.name.toLowerCase());
  kSettings.recentApps.unshift(entry);
  if (kSettings.recentApps.length > 6) {
    kSettings.recentApps = kSettings.recentApps.slice(0, 6);
  }
  saveSettings();
}
function applyContentScale() {
  const scale = (kSettings && kSettings.contentScale) ? kSettings.contentScale : 1.0;
  document.documentElement.style.setProperty('--k-ui-scale', scale);
  if ('zoom' in document.body.style) {
    document.body.style.zoom = scale;
  } else {
    document.documentElement.style.fontSize = (14 * scale) + 'px';
  }
  if (typeof retile === 'function') retile();
}
function applyFontWeightSettings() {
  if (kSettings && kSettings.boldText) {
    document.body.classList.add('bold-text');
  } else {
    document.body.classList.remove('bold-text');
  }
}
function saveSettings() {
  try {
    localStorage.setItem('wbosk_settings_v1', JSON.stringify(kSettings));
    applyFontWeightSettings();
    applyContentScale();
  } catch (e) {
    console.error('Error saving settings:', e);
  }
}
function loadSettings() {
  try {
    const stored = localStorage.getItem('wbosk_settings_v1');
    if (stored) {
      kSettings = { ...defaultSettings, ...JSON.parse(stored) };
    } else {
      kSettings = { ...defaultSettings };
    }
  } catch (e) {
    kSettings = { ...defaultSettings };
  }
  applyFontWeightSettings();
  applyContentScale();
}
async function loadSiteIndex() {
  try {
    const res = await fetch('site-index.json');
    if (res.ok) {
      siteIndex = await res.json();
      if (siteIndex.tree) {
        desktopItems = siteIndex.tree;
      }
    }
  } catch (e) {
    console.error('Error loading site index:', e);
  }
}
async function loadDesktopItems() {
  await loadSiteIndex();
  if (!desktopItems || desktopItems.length === 0) {
    try {
      const res = await fetch('os/desktop-items.json');
      if (res.ok) {
        desktopItems = await res.json();
      }
    } catch (e) {
      console.error('Error fetching fallback desktop items:', e);
    }
  }
  return desktopItems;
}
function formatTime(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes().toString().padStart(2, '0');
  let seconds = date.getSeconds().toString().padStart(2, '0');
  let ampm = '';
  if (kSettings.clockFormat === '12h') {
    ampm = hours >= 12 ? ' pm' : ' am';
    hours = hours % 12 || 12;
  } else {
    hours = hours.toString().padStart(2, '0');
  }
  let str = `${hours}:${minutes}`;
  if (kSettings.showSeconds) {
    str += `:${seconds}`;
  }
  str += ampm;
  return str.toLowerCase();
}
function formatDate(date) {
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options).toLowerCase();
}
async function initWbOSk() {
  loadSettings();
  kSettings.menuOpen = true;
  await loadDesktopItems();
  if (typeof renderMainMenu === 'function') {
    renderMainMenu();
  }
  if (typeof renderTopBar === 'function') {
    renderTopBar();
  }
  if (typeof updateClock === 'function') {
    updateClock();
    setInterval(updateClock, 1000);
  }
  if (typeof checkStartupRedirectPrompt === 'function') {
    checkStartupRedirectPrompt();
  }
}
document.addEventListener('DOMContentLoaded', initWbOSk);
