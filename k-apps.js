function launchApp(name, ...args) {
  name = name.toLowerCase();
  if (typeof recordRecentApp === 'function') {
    recordRecentApp({ name: name, isApp: true });
  }
  switch (name) {
    case 'calculator': {
      const calcEl = document.createElement('div');
      calcEl.className = 'calculator-app';
      calcEl.style.display = 'flex';
      calcEl.style.flexDirection = 'column';
      calcEl.style.height = '100%';
      calcEl.style.padding = '10px';
      const display = document.createElement('div');
      display.className = 'calc-display';
      display.style.flex = '1';
      display.style.display = 'flex';
      display.style.justifyContent = 'flex-end';
      display.style.alignItems = 'flex-end';
      display.style.fontSize = '24px';
      display.style.marginBottom = '10px';
      display.style.wordBreak = 'break-all';
      display.textContent = '0';
      calcEl.appendChild(display);
      const grid = document.createElement('div');
      grid.className = 'calculator-grid';
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
      grid.style.gap = '5px';
      grid.style.flex = '4';
      const buttons = [
        'c', '±', '%', '÷',
        '7', '8', '9', '×',
        '4', '5', '6', '−',
        '1', '2', '3', '+',
        '0', '.', '='
      ];
      let currentVal = '0';
      let prevVal = null;
      let operator = null;
      let waitingForNewValue = false;
      const updateDisplay = () => {
        display.textContent = currentVal;
      };
      const calculate = () => {
        if (prevVal === null || operator === null) return;
        const a = parseFloat(prevVal);
        const b = parseFloat(currentVal);
        let res = 0;
        switch (operator) {
          case '÷': res = a / b; break;
          case '×': res = a * b; break;
          case '−': res = a - b; break;
          case '+': res = a + b; break;
        }
        currentVal = String(res);
        prevVal = null;
        operator = null;
        waitingForNewValue = true;
      };
      buttons.forEach(btn => {
        const btnEl = document.createElement('button');
        btnEl.textContent = btn;
        btnEl.style.background = 'transparent';
        btnEl.style.color = '#fff';
        btnEl.style.border = '1px solid #333';
        btnEl.style.cursor = 'pointer';
        btnEl.style.fontSize = '16px';
        btnEl.style.fontFamily = "'Share Tech Mono', monospace";
        if (['÷', '×', '−', '+', '='].includes(btn)) {
          btnEl.className = 'op';
          btnEl.style.borderColor = '#888';
        }
        if (btn === '0') {
          btnEl.style.gridColumn = 'span 2';
        }
        btnEl.addEventListener('click', () => {
          if (/[0-9]/.test(btn)) {
            if (waitingForNewValue) {
              currentVal = btn;
              waitingForNewValue = false;
            } else {
              currentVal = currentVal === '0' ? btn : currentVal + btn;
            }
          } else if (btn === '.') {
            if (waitingForNewValue) {
              currentVal = '0.';
              waitingForNewValue = false;
            } else if (!currentVal.includes('.')) {
              currentVal += '.';
            }
          } else if (btn === 'c') {
            currentVal = '0';
            prevVal = null;
            operator = null;
            waitingForNewValue = false;
          } else if (btn === '±') {
            currentVal = String(parseFloat(currentVal) * -1);
          } else if (btn === '%') {
            currentVal = String(parseFloat(currentVal) / 100);
          } else if (btn === '=') {
            calculate();
          } else {
            if (operator && !waitingForNewValue) {
              calculate();
            }
            prevVal = currentVal;
            operator = btn;
            waitingForNewValue = true;
          }
          updateDisplay();
        });
        grid.appendChild(btnEl);
      });
      calcEl.appendChild(grid);
      openTile('calculator', calcEl, { float: true, width: 280, height: 380 });
      break;
    }
    case 'clock': {
      const clockEl = document.createElement('div');
      clockEl.className = 'clock-app';
      const timeEl = document.createElement('div');
      timeEl.className = 'clock-time';
      const dateEl = document.createElement('div');
      dateEl.className = 'clock-date';
      clockEl.appendChild(timeEl);
      clockEl.appendChild(dateEl);
      const updateClockApp = () => {
        const now = new Date();
        timeEl.textContent = formatTime(now);
        dateEl.textContent = formatDate(now);
      };
      updateClockApp();
      const interval = setInterval(updateClockApp, 1000);
      const tileId = openTile('clock', clockEl, { float: true, width: 250, height: 200 });
      const observer = new MutationObserver(() => {
        if (!document.body.contains(clockEl)) {
          clearInterval(interval);
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      break;
    }
    case 'notepad': {
      const textEl = document.createElement('textarea');
      textEl.className = 'notepad-area';
      textEl.placeholder = 'start typing...';
      textEl.style.width = '100%';
      textEl.style.height = '100%';
      textEl.style.background = 'transparent';
      textEl.style.color = '#fff';
      textEl.style.border = 'none';
      textEl.style.resize = 'none';
      textEl.style.outline = 'none';
      textEl.style.fontFamily = "'Share Tech Mono', monospace";
      textEl.style.padding = '10px';
      textEl.style.boxSizing = 'border-box';
      if (args[0] && typeof args[0] === 'string') {
        textEl.value = args[0];
        textEl.readOnly = true;
      }
      openTile(args[1] || 'notepad', textEl);
      setTimeout(() => textEl.focus(), 100);
      break;
    }
    case 'browser': {
      const browserEl = document.createElement('div');
      browserEl.style.display = 'flex';
      browserEl.style.flexDirection = 'column';
      browserEl.style.height = '100%';
      const barEl = document.createElement('div');
      barEl.className = 'browser-bar';
      barEl.style.display = 'flex';
      barEl.style.padding = '5px';
      barEl.style.borderBottom = '1px solid #333';
      const inputEl = document.createElement('input');
      inputEl.className = 'browser-url';
      inputEl.type = 'text';
      inputEl.value = args[0] || 'https://wackybox.org';
      inputEl.style.flex = '1';
      inputEl.style.background = 'transparent';
      inputEl.style.color = '#fff';
      inputEl.style.border = '1px solid #333';
      inputEl.style.padding = '5px';
      inputEl.style.fontFamily = "'Share Tech Mono', monospace";
      const btnEl = document.createElement('button');
      btnEl.textContent = 'go';
      btnEl.style.background = 'transparent';
      btnEl.style.color = '#fff';
      btnEl.style.border = '1px solid #333';
      btnEl.style.marginLeft = '5px';
      btnEl.style.padding = '5px 10px';
      btnEl.style.cursor = 'pointer';
      btnEl.style.fontFamily = "'Share Tech Mono', monospace";
      barEl.appendChild(inputEl);
      barEl.appendChild(btnEl);
      const frameEl = document.createElement('iframe');
      frameEl.className = 'browser-frame';
      frameEl.style.flex = '1';
      frameEl.style.border = 'none';
      frameEl.style.width = '100%';
      frameEl.src = inputEl.value;
      const navigate = () => {
        let url = inputEl.value;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        inputEl.value = url;
        frameEl.src = url;
      };
      btnEl.addEventListener('click', navigate);
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') navigate();
      });
      browserEl.appendChild(barEl);
      browserEl.appendChild(frameEl);
      openTile('browser', browserEl);
      break;
    }
    case 'apps':
    case 'file explorer': {
      const items = args[0] || desktopItems;
      const breadcrumbs = args[1] || ['root'];
      if (typeof renderFileNavigator === 'function') {
        const navEl = renderFileNavigator(items, breadcrumbs);
        openTile('apps', navEl);
      }
      break;
    }
    case 'terminal': {
      const termEl = document.createElement('div');
      termEl.style.display = 'flex';
      termEl.style.flexDirection = 'column';
      termEl.style.height = '100%';
      termEl.style.padding = '10px';
      termEl.style.boxSizing = 'border-box';
      termEl.style.overflowY = 'auto';
      termEl.style.scrollbarWidth = 'none';
      const outputEl = document.createElement('div');
      outputEl.className = 'terminal-output';
      outputEl.style.flex = '1';
      outputEl.style.overflowY = 'auto';
      outputEl.style.scrollbarWidth = 'none';
      outputEl.style.marginBottom = '10px';
      outputEl.style.whiteSpace = 'pre-wrap';
      const inputLineEl = document.createElement('div');
      inputLineEl.className = 'terminal-input-line';
      inputLineEl.style.display = 'flex';
      inputLineEl.style.alignItems = 'center';
      const promptEl = document.createElement('div');
      promptEl.className = 'terminal-prompt';
      promptEl.textContent = '>';
      promptEl.style.marginRight = '10px';
      promptEl.style.color = '#888';
      const inputEl = document.createElement('input');
      inputEl.className = 'terminal-input';
      inputEl.type = 'text';
      inputEl.style.flex = '1';
      inputEl.style.background = 'transparent';
      inputEl.style.color = '#fff';
      inputEl.style.border = 'none';
      inputEl.style.outline = 'none';
      inputEl.style.fontFamily = "'Share Tech Mono', monospace";
      inputLineEl.appendChild(promptEl);
      inputLineEl.appendChild(inputEl);
      termEl.appendChild(outputEl);
      termEl.appendChild(inputLineEl);
      const print = (text) => {
        const line = document.createElement('div');
        line.textContent = text;
        outputEl.appendChild(line);
        termEl.scrollTop = termEl.scrollHeight;
      };
      print('wbOSk v1 terminal initialized.');
      print('type "help" for commands.');
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const cmd = inputEl.value.trim();
          inputEl.value = '';
          print('> ' + cmd);
          if (!cmd) return;
          const parts = cmd.split(' ');
          const base = parts[0].toLowerCase();
          const arg = parts.slice(1).join(' ');
          switch (base) {
            case 'help':
              print('commands: help, clear, date, echo, ls, open, about, settings, os');
              break;
            case 'clear':
              outputEl.innerHTML = '';
              break;
            case 'date':
              print(new Date().toString());
              break;
            case 'echo':
              print(arg);
              break;
            case 'ls':
              print(desktopItems.map(i => i.name).join('  '));
              break;
            case 'open':
              if (arg) launchApp(arg);
              else print('usage: open [app]');
              break;
            case 'about':
              print('wbOSk v1 - terminal module');
              break;
            case 'settings':
              print(JSON.stringify(kSettings, null, 2));
              break;
            case 'os':
              window.open(BASE_URL + 'os/', '_blank');
              break;
            default:
              print('unknown command: ' + base);
          }
        }
      });
      openTile('terminal', termEl);
      setTimeout(() => inputEl.focus(), 100);
      break;
    }
    case 'settings': {
      const settingsEl = document.createElement('div');
      settingsEl.className = 'settings-panel';
      settingsEl.style.padding = '10px';
      settingsEl.style.height = '100%';
      settingsEl.style.overflowY = 'auto';
      settingsEl.style.scrollbarWidth = 'none';
      settingsEl.style.boxSizing = 'border-box';
      const createGroup = (label) => {
        const g = document.createElement('div');
        g.className = 'settings-group';
        g.style.marginBottom = '20px';
        const l = document.createElement('div');
        l.textContent = label;
        l.style.color = '#888';
        l.style.marginBottom = '5px';
        g.appendChild(l);
        return g;
      };
      const gPlayer = createGroup('player mode');
      const pmContainer = document.createElement('div');
      pmContainer.style.display = 'flex';
      pmContainer.style.gap = '10px';
      ['integrated', 'meaty'].forEach(mode => {
        const btn = document.createElement('button');
        btn.textContent = mode;
        btn.style.flex = '1';
        btn.style.padding = '5px';
        btn.style.background = 'transparent';
        btn.style.color = '#fff';
        btn.style.border = kSettings.playerMode === mode ? '1px solid #fff' : '1px solid #333';
        btn.style.cursor = 'pointer';
        btn.style.fontFamily = "'Share Tech Mono', monospace";
        btn.addEventListener('click', () => {
          kSettings.playerMode = mode;
          saveSettings();
          Array.from(pmContainer.children).forEach(b => b.style.borderColor = '#333');
          btn.style.borderColor = '#fff';
        });
        pmContainer.appendChild(btn);
      });
      gPlayer.appendChild(pmContainer);
      settingsEl.appendChild(gPlayer);
      const gClock = createGroup('clock format');
      const cfContainer = document.createElement('div');
      cfContainer.style.display = 'flex';
      cfContainer.style.gap = '10px';
      ['12h', '24h'].forEach(fmt => {
        const btn = document.createElement('button');
        btn.textContent = fmt;
        btn.style.flex = '1';
        btn.style.padding = '5px';
        btn.style.background = 'transparent';
        btn.style.color = '#fff';
        btn.style.border = kSettings.clockFormat === fmt ? '1px solid #fff' : '1px solid #333';
        btn.style.cursor = 'pointer';
        btn.style.fontFamily = "'Share Tech Mono', monospace";
        btn.addEventListener('click', () => {
          kSettings.clockFormat = fmt;
          saveSettings();
          Array.from(cfContainer.children).forEach(b => b.style.borderColor = '#333');
          btn.style.borderColor = '#fff';
        });
        cfContainer.appendChild(btn);
      });
      gClock.appendChild(cfContainer);
      settingsEl.appendChild(gClock);
      const gSecs = createGroup('');
      const secLabel = document.createElement('label');
      secLabel.style.display = 'flex';
      secLabel.style.alignItems = 'center';
      secLabel.style.cursor = 'pointer';
      const secCb = document.createElement('input');
      secCb.type = 'checkbox';
      secCb.checked = !!kSettings.showSeconds;
      secCb.style.marginRight = '10px';
      secCb.addEventListener('change', () => {
        kSettings.showSeconds = secCb.checked;
        saveSettings();
      });
      secLabel.appendChild(secCb);
      secLabel.appendChild(document.createTextNode('show seconds'));
      gSecs.appendChild(secLabel);
      settingsEl.appendChild(gSecs);
      const gBold = createGroup('');
      const boldLabel = document.createElement('label');
      boldLabel.style.display = 'flex';
      boldLabel.style.alignItems = 'center';
      boldLabel.style.cursor = 'pointer';
      const boldCb = document.createElement('input');
      boldCb.type = 'checkbox';
      boldCb.checked = !!kSettings.boldText;
      boldCb.style.marginRight = '10px';
      boldCb.addEventListener('change', () => {
        kSettings.boldText = boldCb.checked;
        saveSettings();
      });
      boldLabel.appendChild(boldCb);
      boldLabel.appendChild(document.createTextNode('bold text'));
      gBold.appendChild(boldLabel);
      settingsEl.appendChild(gBold);
      const gRedirect = createGroup('');
      const redirectLabel = document.createElement('label');
      redirectLabel.style.display = 'flex';
      redirectLabel.style.alignItems = 'center';
      redirectLabel.style.cursor = 'pointer';
      const redirectCb = document.createElement('input');
      redirectCb.type = 'checkbox';
      redirectCb.checked = !!kSettings.autoRedirectToWbOS;
      redirectCb.style.marginRight = '10px';
      redirectCb.addEventListener('change', () => {
        kSettings.autoRedirectToWbOS = redirectCb.checked;
        saveSettings();
      });
      redirectLabel.appendChild(redirectCb);
      redirectLabel.appendChild(document.createTextNode('redirect to wbos on startup'));
      gRedirect.appendChild(redirectLabel);
      settingsEl.appendChild(gRedirect);
      const currentScalePct = Math.round((kSettings.contentScale || 1.0) * 100);
      const gScale = createGroup(`content scale (${currentScalePct}%)`);
      const scaleInput = document.createElement('input');
      scaleInput.type = 'range';
      scaleInput.min = '0.70';
      scaleInput.max = '1.40';
      scaleInput.step = '0.05';
      scaleInput.value = kSettings.contentScale || 1.0;
      scaleInput.style.width = '100%';
      scaleInput.addEventListener('input', () => {
        const val = parseFloat(scaleInput.value);
        kSettings.contentScale = val;
        const titleEl = gScale.querySelector('.settings-label');
        if (titleEl) titleEl.textContent = `content scale (${Math.round(val * 100)}%)`;
        saveSettings();
        if (typeof applyContentScale === 'function') applyContentScale();
      });
      gScale.appendChild(scaleInput);
      settingsEl.appendChild(gScale);
      const gGap = createGroup('tile gap');
      const gapInput = document.createElement('input');
      gapInput.type = 'range';
      gapInput.min = '0';
      gapInput.max = '8';
      gapInput.step = '1';
      gapInput.value = kSettings.tileGap !== undefined ? kSettings.tileGap : 2;
      gapInput.style.width = '100%';
      gapInput.addEventListener('input', () => {
        kSettings.tileGap = parseInt(gapInput.value, 10);
        saveSettings();
        if (typeof retile === 'function') retile();
      });
      gGap.appendChild(gapInput);
      settingsEl.appendChild(gGap);
      const gHelp = createGroup('help');
      const helpBtn = document.createElement('button');
      helpBtn.textContent = 'help!';
      helpBtn.style.width = '100%';
      helpBtn.style.padding = '10px';
      helpBtn.style.background = '#111';
      helpBtn.style.color = '#fff';
      helpBtn.style.border = '1px solid #333';
      helpBtn.style.cursor = 'pointer';
      helpBtn.style.fontFamily = 'inherit';
      helpBtn.style.fontSize = '13px';
      helpBtn.style.textTransform = 'lowercase';
      helpBtn.style.transition = 'all 0.2s ease';
      helpBtn.onmouseenter = () => { helpBtn.style.borderColor = '#fff'; helpBtn.style.background = '#222'; };
      helpBtn.onmouseleave = () => { helpBtn.style.borderColor = '#333'; helpBtn.style.background = '#111'; };
      helpBtn.addEventListener('click', () => {
        openHelpWindow();
      });
      gHelp.appendChild(helpBtn);
      settingsEl.appendChild(gHelp);
      const gAbout = createGroup('about');
      const aboutTxt = document.createElement('div');
      aboutTxt.textContent = 'wbosk v1';
      gAbout.appendChild(aboutTxt);
      settingsEl.appendChild(gAbout);
      openTile('settings', settingsEl);
      break;
    }
    case 'help': {
      openHelpWindow();
      break;
    }
    case 'about': {
      const aboutEl = document.createElement('div');
      aboutEl.className = 'about-app';
      aboutEl.innerHTML = `
        <div class="about-header">
          about wbos!k
        </div>
        <div class="about-card card-1">
          wbOS was a project originally in the form of a LOT scratch-to-js things. but it kept growing. i'd add more little games, tools, and things to muck around with. and I had no way to help people navigate them all. it was just "remember the link or you don't get the thing!". so I wrote a little scratch interface with a bunch of hardcoded buttons to the current list of things, and that was that, for a while.
        </div>
        <div class="about-card card-2">
          fast forward months later, after much horrible webdev Bullshit, wbOS! 1 appeared. revolutionary. a useless start menu. a useless taskbar. little to no QoL. just a bunch of files and folders slapped on a background gradient. and then I added visual features, and theming, and a better start menu, and cool visual effects, and total customisation, and better organisation, etc., etc.
        </div>
        <div class="about-card card-3">
          but again. it kept growing, and eventually I realised just how much of a pain in the ass it had become to make simple changes to the code/design. and also noticed that it didn't look very good. I pushed wbOS!'s final major update yesterday, adding much better visual control.
        </div>
        <div class="about-card card-4">
          and now you're here. this is wbOS!k, the lighter and easier-to-navigate version of wbOS!. I will never take wbOS! or this down, and I won't say wbOS! is deprecated. It's just not at the top of my list.
        </div>
        <div class="about-thanks-card">
          thanks for using my stupid joke software, and i do hope you enjoy!
        </div>
        <div class="about-footer-note">
          p.s.: this is actually version 3 of OS!k
        </div>
      `;
      openTile('about', aboutEl);
      break;
    }
    case 'video player': {
      const vidEl = document.createElement('div');
      vidEl.className = 'video-player-container';
      vidEl.style.width = '100%';
      vidEl.style.height = '100%';
      vidEl.style.display = 'flex';
      vidEl.style.justifyContent = 'center';
      vidEl.style.alignItems = 'center';
      vidEl.style.background = '#000';
      const video = document.createElement('video');
      video.controls = true;
      video.style.maxWidth = '100%';
      video.style.maxHeight = '100%';
      if (args[0]) video.src = args[0];
      vidEl.appendChild(video);
      openTile('video player', vidEl);
      break;
    }
    case 'media player': {
      if (typeof renderPlayerApp === 'function') {
        const playerAppEl = renderPlayerApp();
        openTile('media player', playerAppEl);
      }
      break;
    }
  }
}
function openHelpWindow() {
  const helpEl = document.createElement('div');
  helpEl.className = 'help-app';
  helpEl.style.padding = '16px';
  helpEl.style.height = '100%';
  helpEl.style.overflowY = 'auto';
  helpEl.style.boxSizing = 'border-box';
  helpEl.style.fontSize = '12px';
  helpEl.style.lineHeight = '1.6';
  helpEl.style.color = '#ffffff';
  helpEl.style.textTransform = 'lowercase';
  helpEl.innerHTML = `
    <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px; border-bottom: 1px solid #333; padding-bottom: 6px; color: #fff;">
      how things work:
    </div>
    <div style="margin-bottom: 16px;">
      <div style="color: #888; margin-bottom: 4px; font-weight: bold;">menu & navigation</div>
      <div>• apps tab: browse apps, games & content</div>
      <div>• search tab: search apps, recent apps & system tools</div>
      <div>• top taskbar: toggle menu, playback controls & open app tabs</div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="color: #888; margin-bottom: 4px; font-weight: bold;">tiling window manager</div>
      <div>• drag window headers to reorder or snap grid slots</div>
      <div>• click [_] to minimize window</div>
      <div>• click [⊡] to toggle floating mode</div>
      <div>• click [✕] to close window</div>
      <div>• mobile portrait: max 2 active visible tiles with scrollable taskbar</div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="color: #888; margin-bottom: 4px; font-weight: bold;">keyboard shortcuts</div>
      <div>• alt + m : toggle main menu</div>
      <div>• alt + q : close active window</div>
      <div>• alt + f : toggle window float mode</div>
      <div>• alt + 1-9 : switch window tile</div>
      <div>• alt + s : open search tab</div>
      <div>• alt + a : open apps tab</div>
    </div>
    <div style="margin-bottom: 16px;">
      <div style="color: #888; margin-bottom: 4px; font-weight: bold;">media player shortcuts</div>
      <div>• alt + p / alt + space : play / pause media</div>
      <div>• alt + n / alt + → : next track</div>
      <div>• alt + b / alt + ← : previous track</div>
      <div>• alt + ↑ / alt + ↓ : volume up / down</div>
      <div>• alt + z : toggle shuffle</div>
      <div>• alt + r : toggle repeat mode</div>
    </div>
  `;
  openTile('help', helpEl);
}
function showFolderPrompt(item) {
  let overlay = document.getElementById('prompt-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'prompt-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.85)';
    overlay.style.display = 'none';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9999';
    document.body.appendChild(overlay);
  }
  const name = (item.name || 'folder').toLowerCase();
  let folderUrl = item.url || item.path || '';
  if (folderUrl && !folderUrl.startsWith('http://') && !folderUrl.startsWith('https://') && !folderUrl.startsWith('blob:')) {
    if (!folderUrl.endsWith('/') && !folderUrl.includes('.')) folderUrl += '/';
    folderUrl = BASE_URL + (folderUrl.startsWith('/') ? folderUrl.substring(1) : folderUrl);
  }
  overlay.innerHTML = `
    <div class="prompt-dialog" style="border: 1px solid #333; background: #000; padding: 24px; min-width: 300px; max-width: 420px; font-family: 'Share Tech Mono', monospace; text-transform: lowercase;">
      <div class="prompt-title" style="font-size: 15px; margin-bottom: 12px; color: #fff;">folder: <span style="color:#ff3333">${name}</span></div>
      <div style="font-size: 12px; color: #888; margin-bottom: 20px;">choose how to open this subfolder:</div>
      <div class="prompt-buttons" style="display: flex; gap: 10px;">
        <button class="prompt-btn view-contents-btn" style="flex: 1; padding: 10px; text-align: center; border: 1px solid #333; background: transparent; color: #fff; cursor: pointer; font-family: inherit;">view contents</button>
        <button class="prompt-btn launch-app-btn" style="flex: 1; padding: 10px; text-align: center; border: 1px solid #ff3333; background: transparent; color: #ff3333; cursor: pointer; font-family: inherit;">launch as app</button>
      </div>
    </div>
  `;
  overlay.style.display = 'flex';
  overlay.classList.add('visible');
  const closePrompt = () => {
    overlay.classList.remove('visible');
    overlay.style.display = 'none';
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) closePrompt();
  };
  const viewBtn = overlay.querySelector('.view-contents-btn');
  const launchBtn = overlay.querySelector('.launch-app-btn');
  viewBtn.onclick = () => {
    closePrompt();
    const subItems = item.items || [];
    launchApp('file explorer', subItems, ['root', name]);
  };
  launchBtn.onclick = () => {
    closePrompt();
    const appUrl = folderUrl || (BASE_URL + name + '/');
    showPrompt(name, appUrl);
  };
}
function openFile(item) {
  if (typeof recordRecentApp === 'function') {
    recordRecentApp(item);
  }
  let url = item.url || item.path || '';
  if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('blob:') && !url.startsWith('data:')) {
    url = BASE_URL + (url.startsWith('/') ? url.substring(1) : url);
  }
  const name = (item.name || '').toLowerCase();
  const type = (item.type || '').toLowerCase();
  if (type === 'folder' || item.items || item.isFolder) {
    showFolderPrompt(item);
    return;
  }
  const isAudio = type === 'audio' || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.m4a') || name.endsWith('.flac');
  const isVideo = type === 'video' || name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.ogv');
  const isImage = type === 'image' || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || name.endsWith('.webp') || name.endsWith('.svg');
  const isText = type === 'code' || type === 'document' || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.json') || name.endsWith('.js') || name.endsWith('.css') || name.endsWith('.html');
  const isArchive = name.endsWith('.zip') || name.endsWith('.pmp');
  if (isAudio) {
    if (kSettings.playerMode === 'integrated' && typeof kPlayer !== 'undefined') {
      kPlayer.loadTrack(url, name);
      launchApp('media player');
    } else {
      showPrompt(name, MEDIA_PLAYER_APP_URL + encodeURIComponent(url));
    }
  } else if (isVideo) {
    launchApp('video player', url);
  } else if (isImage) {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'image-viewer';
    imgContainer.style.width = '100%';
    imgContainer.style.height = '100%';
    imgContainer.style.display = 'flex';
    imgContainer.style.justifyContent = 'center';
    imgContainer.style.alignItems = 'center';
    imgContainer.style.overflow = 'auto';
    const img = document.createElement('img');
    img.src = url;
    img.alt = name;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    imgContainer.appendChild(img);
    openTile(name, imgContainer);
  } else if (isText) {
    fetch(url)
      .then(r => r.text())
      .then(content => {
        launchApp('notepad', content, name);
      })
      .catch(e => {
        launchApp('notepad', 'error loading file:\n' + e.message, name);
      });
  } else if (isArchive) {
    showPrompt(name, url);
  } else {
    showPrompt(name, url);
  }
}
function showPrompt(title, url) {
  let overlay = document.getElementById('prompt-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'prompt-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    overlay.style.display = 'none';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9999';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('visible');
        overlay.style.display = 'none';
      }
    });
  }
  overlay.innerHTML = `
    <div class="prompt-dialog" style="background:#000;border:1px solid #fff;padding:20px;width:320px;font-family:'Share Tech Mono', monospace;display:flex;flex-direction:column;text-transform:lowercase;">
      <div class="prompt-title" style="color:#fff;font-size:15px;margin-bottom:8px;text-transform:lowercase;">app: <span style="color:#ff3333">${title}</span></div>
      <div style="font-size:11px;color:#888;margin-bottom:12px;">choose launch target:</div>
      <div class="prompt-buttons" style="display:flex;gap:10px;margin-bottom:10px;">
        <button class="prompt-btn" id="prompt-panel" style="flex:1;background:transparent;color:#fff;border:1px solid #333;padding:8px;cursor:pointer;font-family:inherit;">open in tile</button>
        <button class="prompt-btn" id="prompt-tab" style="flex:1;background:transparent;color:#fff;border:1px solid #333;padding:8px;cursor:pointer;font-family:inherit;">open in new tab</button>
      </div>
      <button class="prompt-btn" style="margin-top:4px;width:100%;background:transparent;color:#888;border:1px solid #222;padding:6px;cursor:pointer;font-family:inherit;" id="prompt-cancel">cancel</button>
    </div>
  `;
  const hideOverlay = () => {
    overlay.classList.remove('visible');
    overlay.style.display = 'none';
  };
  overlay.querySelector('#prompt-panel').addEventListener('click', () => {
    launchApp('browser', url);
    hideOverlay();
  });
  overlay.querySelector('#prompt-tab').addEventListener('click', () => {
    window.open(url, '_blank');
    hideOverlay();
  });
  overlay.querySelector('#prompt-cancel').addEventListener('click', () => {
    hideOverlay();
  });
  overlay.style.display = 'flex';
  overlay.classList.add('visible');
}
