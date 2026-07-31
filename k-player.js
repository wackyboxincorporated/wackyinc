function getControlSVG(type, size = 20) {
  const svgs = {
    play: `<svg width="${size}" height="${size}" viewBox="0 0 12 12" fill="currentColor" style="display:block;"><polygon points="2,1 11,6 2,11"/></svg>`,
    pause: `<svg width="${size}" height="${size}" viewBox="0 0 12 12" fill="currentColor" style="display:block;"><rect x="2" y="1" width="3" height="10"/><rect x="7" y="1" width="3" height="10"/></svg>`,
    prev: `<svg width="${size}" height="${size}" viewBox="0 0 12 12" fill="currentColor" style="display:block;"><rect x="1" y="1" width="2" height="10"/><polygon points="11,1 4,6 11,11"/></svg>`,
    next: `<svg width="${size}" height="${size}" viewBox="0 0 12 12" fill="currentColor" style="display:block;"><polygon points="1,1 8,6 1,11"/><rect x="9" y="1" width="2" height="10"/></svg>`,
    shuffle: `<svg width="${size}" height="${size}" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" style="display:block;"><line x1="1" y1="3" x2="10" y2="9"/><polygon points="7,9 11,9 10,6" fill="currentColor" stroke="none"/><line x1="1" y1="9" x2="10" y2="3"/><polygon points="7,3 11,3 10,6" fill="currentColor" stroke="none"/></svg>`,
    repeat: `<svg width="${size}" height="${size}" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" style="display:block;"><path d="M2 4h8v3M10 8H2V5"/><polygon points="8,2 11,4 8,6" fill="currentColor" stroke="none"/><polygon points="4,10 1,8 4,6" fill="currentColor" stroke="none"/></svg>`,
    repeatOne: `<svg width="${size}" height="${size}" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" style="display:block;"><path d="M2 4h8v3M10 8H2V5"/><polygon points="8,2 11,4 8,6" fill="currentColor" stroke="none"/><polygon points="4,10 1,8 4,6" fill="currentColor" stroke="none"/><text x="4.5" y="7.5" font-size="5" font-family="monospace" fill="currentColor" stroke="none">1</text></svg>`
  };
  return svgs[type] || '';
}
const kPlayer = {
  audioEl: null,
  playlist: [],
  currentIndex: -1,
  isPlaying: false,
  volume: 0.8,
  audioCtx: null,
  analyser: null,
  source: null,
  visualizerData: null,
  uiElements: {
    bars: [],
    apps: []
  },
  rafId: null,
  init() {
    this.audioEl = document.createElement('audio');
    this.audioEl.volume = this.volume;
    this.audioEl.addEventListener('ended', () => this.next());
    this.audioEl.addEventListener('play', () => {
      this.isPlaying = true;
      this.updateUIs();
      this.startLoop();
      this.initAudioContext();
    });
    this.audioEl.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updateUIs();
    });
    this.audioEl.addEventListener('timeupdate', () => {
      this.updateProgress();
    });
    this.audioEl.addEventListener('error', (e) => {
      console.warn("Audio media error caught:", this.audioEl.error);
      this.isPlaying = false;
      this.updateUIs();
    });
  },
  initAudioContext() {
    if (!this.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        this.audioCtx = new Ctx();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        this.visualizerData = new Uint8Array(this.analyser.frequencyBinCount);
        this.source = this.audioCtx.createMediaElementSource(this.audioEl);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  },
  play() {
    if (!this.audioEl.src) return;
    const promise = this.audioEl.play();
    if (promise !== undefined) {
      promise.catch(e => {
        console.warn("Audio playback error caught:", e);
        this.isPlaying = false;
        this.updateUIs();
      });
    }
  },
  pause() {
    this.audioEl.pause();
  },
  togglePlay() {
    if (!this.audioEl.src && this.playlist.length > 0) {
      this.currentIndex = 0;
      const track = this.playlist[0];
      this.loadTrackInternal(track.url, track.name);
      return;
    }
    if (this.isPlaying) this.pause();
    else this.play();
  },
  isShuffle: false,
  isRepeat: 'none',
  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    this.updateUIs();
  },
  toggleRepeat() {
    if (this.isRepeat === 'none') this.isRepeat = 'all';
    else if (this.isRepeat === 'all') this.isRepeat = 'one';
    else this.isRepeat = 'none';
    this.updateUIs();
  },
  next() {
    if (this.playlist.length === 0) return;
    if (this.isRepeat === 'one') {
      this.audioEl.currentTime = 0;
      this.play();
      return;
    }
    if (this.isShuffle) {
      if (this.playlist.length > 1) {
        let newIdx = this.currentIndex;
        while (newIdx === this.currentIndex) {
          newIdx = Math.floor(Math.random() * this.playlist.length);
        }
        this.currentIndex = newIdx;
      }
    } else {
      if (this.currentIndex >= this.playlist.length - 1) {
        if (this.isRepeat === 'all') {
          this.currentIndex = 0;
        } else {
          this.pause();
          return;
        }
      } else {
        this.currentIndex++;
      }
    }
    const track = this.playlist[this.currentIndex];
    this.loadTrackInternal(track.url, track.name);
  },
  prev() {
    if (this.playlist.length === 0) return;
    if (this.audioEl.currentTime > 3) {
      this.audioEl.currentTime = 0;
    } else {
      this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
      const track = this.playlist[this.currentIndex];
      this.loadTrackInternal(track.url, track.name);
    }
  },
  seek(fraction) {
    if (isNaN(this.audioEl.duration)) return;
    this.audioEl.currentTime = fraction * this.audioEl.duration;
  },
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    this.audioEl.volume = this.volume;
  },
  loadTrackInternal(url, name) {
    this.audioEl.src = url;
    this.play();
    this.updateUIs();
  },
  loadTrack(url, name) {
    const existingIndex = this.playlist.findIndex(t => t.url === url);
    if (existingIndex !== -1) {
      this.currentIndex = existingIndex;
    } else {
      this.playlist.push({ url, name });
      this.currentIndex = this.playlist.length - 1;
    }
    this.loadTrackInternal(url, name);
  },
  loadPlaylist(files) {
    if (!files || files.length === 0) return;
    this.playlist = files;
    this.currentIndex = 0;
    const track = this.playlist[this.currentIndex];
    this.loadTrackInternal(track.url, track.name);
  },
  getCurrentTime() {
    return this.audioEl ? this.audioEl.currentTime : 0;
  },
  getDuration() {
    return this.audioEl ? this.audioEl.duration : 0;
  },
  getProgress() {
    const d = this.getDuration();
    if (!d || isNaN(d)) return 0;
    return this.getCurrentTime() / d;
  },
  getTrackName() {
    if (this.currentIndex >= 0 && this.currentIndex < this.playlist.length) {
      return this.playlist[this.currentIndex].name;
    }
    return 'no track';
  },
  formatTrackTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },
  updateUIs() {
    const trackName = this.getTrackName();
    const playSVG = this.isPlaying ? getControlSVG('pause') : getControlSVG('play');
    this.uiElements.bars.forEach(ui => {
      if (ui.playBtn) ui.playBtn.innerHTML = playSVG;
      if (ui.trackNameEl) ui.trackNameEl.textContent = trackName;
    });
    const topBarPopup = document.getElementById('top-bar-media-popup');
    if (topBarPopup) {
      const pBtn = topBarPopup.querySelector('.play-btn');
      if (pBtn) pBtn.innerHTML = playSVG;
      const titleEl = topBarPopup.querySelector('#media-popup-track-title');
      if (titleEl) titleEl.textContent = trackName;
    }
    this.uiElements.apps.forEach(ui => {
      if (ui.playBtn) ui.playBtn.innerHTML = playSVG;
      if (ui.trackNameEl) ui.trackNameEl.textContent = trackName;
      if (ui.shuffleBtn) {
        ui.shuffleBtn.innerHTML = getControlSVG('shuffle');
        if (this.isShuffle) {
          ui.shuffleBtn.style.borderColor = '#ffffff';
          ui.shuffleBtn.style.color = '#ffffff';
          ui.shuffleBtn.style.background = '#1a1a1a';
        } else {
          ui.shuffleBtn.style.borderColor = '#333333';
          ui.shuffleBtn.style.color = '#666666';
          ui.shuffleBtn.style.background = 'none';
        }
      }
      if (ui.repeatBtn) {
        if (this.isRepeat === 'all') {
          ui.repeatBtn.innerHTML = getControlSVG('repeat');
          ui.repeatBtn.style.borderColor = '#ffffff';
          ui.repeatBtn.style.color = '#ffffff';
          ui.repeatBtn.style.background = '#1a1a1a';
        } else if (this.isRepeat === 'one') {
          ui.repeatBtn.innerHTML = getControlSVG('repeatOne');
          ui.repeatBtn.style.borderColor = '#ffffff';
          ui.repeatBtn.style.color = '#ff3333';
          ui.repeatBtn.style.background = '#1a1a1a';
        } else {
          ui.repeatBtn.innerHTML = getControlSVG('repeat');
          ui.repeatBtn.style.borderColor = '#333333';
          ui.repeatBtn.style.color = '#666666';
          ui.repeatBtn.style.background = 'none';
        }
      }
      this.renderPlaylist(ui);
    });
  },
  updateProgress() {
    const progress = this.getProgress();
    const timeStr = `${this.formatTrackTime(this.getCurrentTime())} / ${this.formatTrackTime(this.getDuration())}`;
    this.uiElements.bars.forEach(ui => {
      if (ui.fillEl) ui.fillEl.style.width = `${progress * 100}%`;
      if (ui.timeEl) ui.timeEl.textContent = timeStr;
    });
    this.uiElements.apps.forEach(ui => {
      if (ui.fillEl) ui.fillEl.style.width = `${progress * 100}%`;
      if (ui.timeEl) ui.timeEl.textContent = timeStr;
    });
  },
  startLoop() {
    if (!this.rafId) {
      const loop = () => {
        if (this.isPlaying) {
          this.updateProgress();
          if (this.analyser && this.visualizerData) {
            this.analyser.getByteFrequencyData(this.visualizerData);
            this.uiElements.apps.forEach(ui => {
              if (ui.canvasCtx && ui.canvas) {
                this.drawVisualizer(ui.canvasCtx, ui.canvas);
              }
            });
            this.uiElements.bars.forEach(ui => {
              if (ui.canvasCtx && ui.canvas) {
                this.drawVisualizer(ui.canvasCtx, ui.canvas);
              }
            });
          }
        }
        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    }
  },
  drawVisualizer(ctx, canvas) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    if (!this.visualizerData) return;
    const barCount = this.analyser.frequencyBinCount;
    const spacing = 2;
    const totalSpacing = spacing * (barCount + 1);
    const barWidth = Math.max(1, (w - totalSpacing) / barCount);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < barCount; i++) {
      const value = this.visualizerData[i];
      const percent = value / 255;
      const barHeight = h * percent;
      const x = spacing + i * (barWidth + spacing);
      ctx.fillRect(x, h - barHeight, barWidth, barHeight);
    }
  },
  removeTrack(index) {
    if (index < 0 || index >= this.playlist.length) return;
    const wasPlayingTrack = (index === this.currentIndex);
    this.playlist.splice(index, 1);
    if (this.playlist.length === 0) {
      this.currentIndex = -1;
      this.pause();
      if (this.audioEl) this.audioEl.removeAttribute('src');
    } else {
      if (index < this.currentIndex) {
        this.currentIndex--;
      } else if (wasPlayingTrack) {
        this.currentIndex = this.currentIndex % this.playlist.length;
        const track = this.playlist[this.currentIndex];
        this.loadTrackInternal(track.url, track.name);
      }
    }
    this.updateUIs();
  },
  moveTrack(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.playlist.length) return;
    if (toIndex < 0 || toIndex >= this.playlist.length) return;
    if (fromIndex === toIndex) return;
    const [movedTrack] = this.playlist.splice(fromIndex, 1);
    this.playlist.splice(toIndex, 0, movedTrack);
    if (this.currentIndex === fromIndex) {
      this.currentIndex = toIndex;
    } else if (fromIndex < this.currentIndex && toIndex >= this.currentIndex) {
      this.currentIndex--;
    } else if (fromIndex > this.currentIndex && toIndex <= this.currentIndex) {
      this.currentIndex++;
    }
    this.updateUIs();
  },
  clearPlaylist() {
    this.playlist = [];
    this.currentIndex = -1;
    this.pause();
    if (this.audioEl) this.audioEl.removeAttribute('src');
    this.updateUIs();
  },
  renderPlaylist(ui) {
    if (!ui.playlistEl) return;
    ui.playlistEl.innerHTML = '';
    const uploadBox = document.createElement('div');
    uploadBox.className = 'playlist-upload-box';
    uploadBox.style.padding = '12px';
    uploadBox.style.textAlign = 'center';
    uploadBox.style.display = 'flex';
    uploadBox.style.flexDirection = 'column';
    uploadBox.style.alignItems = 'center';
    uploadBox.style.gap = '8px';
    uploadBox.style.borderBottom = '1px solid #222';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'audio/*,video/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '8px';
    btnRow.style.alignItems = 'center';
    btnRow.style.justifyContent = 'center';
    btnRow.style.flexWrap = 'wrap';
    const browseBtn = document.createElement('button');
    browseBtn.className = 'upload-media-btn';
    browseBtn.textContent = '+ upload media';
    browseBtn.style.padding = '6px 14px';
    browseBtn.style.background = '#111111';
    browseBtn.style.color = '#ffffff';
    browseBtn.style.border = '1px solid #ffffff';
    browseBtn.style.fontFamily = 'inherit';
    browseBtn.style.fontSize = '12px';
    browseBtn.style.cursor = 'pointer';
    browseBtn.style.textTransform = 'lowercase';
    browseBtn.style.transition = 'all 0.2s ease';
    browseBtn.onmouseenter = () => { browseBtn.style.background = '#222222'; };
    browseBtn.onmouseleave = () => { browseBtn.style.background = '#111111'; };
    browseBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const mediaFiles = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const blobUrl = URL.createObjectURL(file);
        mediaFiles.push({ name: file.name.toLowerCase(), url: blobUrl });
      }
      if (mediaFiles.length > 0) {
        const startIndex = this.playlist.length;
        this.playlist.push(...mediaFiles);
        this.currentIndex = startIndex;
        this.loadTrackInternal(mediaFiles[0].url, mediaFiles[0].name);
      }
    };
    btnRow.appendChild(browseBtn);
    if (this.playlist && this.playlist.length > 0) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'clear-playlist-btn';
      clearBtn.textContent = '✕ clear queue';
      clearBtn.style.padding = '6px 14px';
      clearBtn.style.background = '#111111';
      clearBtn.style.color = '#ff4444';
      clearBtn.style.border = '1px solid #ff4444';
      clearBtn.style.fontFamily = 'inherit';
      clearBtn.style.fontSize = '12px';
      clearBtn.style.cursor = 'pointer';
      clearBtn.style.textTransform = 'lowercase';
      clearBtn.style.transition = 'all 0.2s ease';
      clearBtn.onmouseenter = () => { clearBtn.style.background = '#331111'; };
      clearBtn.onmouseleave = () => { clearBtn.style.background = '#111111'; };
      clearBtn.onclick = () => this.clearPlaylist();
      btnRow.appendChild(clearBtn);
    }
    const label = document.createElement('div');
    label.className = 'upload-media-subtext';
    label.style.fontSize = '11px';
    label.style.color = '#666666';
    label.textContent = 'drop audio/video files here or select from search / file explorer';
    uploadBox.appendChild(btnRow);
    uploadBox.appendChild(label);
    uploadBox.appendChild(fileInput);
    if (this.playlist && this.playlist.length > 0) {
      label.style.display = 'none';
    } else {
      label.style.display = 'block';
    }
    ui.playlistEl.appendChild(uploadBox);
    if (this.playlist && this.playlist.length > 0) {
      const listContainer = document.createElement('div');
      listContainer.className = 'playlist-items-list';
      this.playlist.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = 'playlist-item' + (index === this.currentIndex ? ' playing' : '');
        item.style.padding = '8px 12px';
        item.style.cursor = 'grab';
        item.style.borderBottom = '1px solid #111';
        item.style.color = index === this.currentIndex ? '#ffffff' : '#888888';
        item.style.textTransform = 'lowercase';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        item.style.gap = '8px';
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', index.toString());
          e.dataTransfer.effectAllowed = 'move';
          item.style.opacity = '0.5';
        });
        item.addEventListener('dragend', () => {
          item.style.opacity = '1';
        });
        item.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          item.style.borderTop = '2px solid #ffffff';
        });
        item.addEventListener('dragleave', () => {
          item.style.borderTop = 'none';
        });
        item.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          item.style.borderTop = 'none';
          const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
          if (!isNaN(fromIndex)) {
            this.moveTrack(fromIndex, index);
          }
        });
        const trackInfo = document.createElement('div');
        trackInfo.style.display = 'flex';
        trackInfo.style.alignItems = 'center';
        trackInfo.style.overflow = 'hidden';
        trackInfo.style.whiteSpace = 'nowrap';
        trackInfo.style.textOverflow = 'ellipsis';
        trackInfo.style.flex = '1';
        const iconSpan = document.createElement('span');
        iconSpan.style.marginRight = '8px';
        iconSpan.style.opacity = '0.6';
        iconSpan.textContent = index === this.currentIndex ? '▶' : '♫';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = track.name;
        nameSpan.style.overflow = 'hidden';
        nameSpan.style.textOverflow = 'ellipsis';
        trackInfo.appendChild(iconSpan);
        trackInfo.appendChild(nameSpan);
        trackInfo.onclick = () => {
          this.currentIndex = index;
          this.loadTrackInternal(track.url, track.name);
        };
        const actionBtns = document.createElement('div');
        actionBtns.style.display = 'flex';
        actionBtns.style.alignItems = 'center';
        actionBtns.style.gap = '4px';
        actionBtns.style.flexShrink = '0';
        const actionBtnStyle = 'background:none; border:1px solid #333; color:#aaa; font-size:11px; padding:2px 6px; cursor:pointer; font-family:inherit; transition:all 0.15s ease;';
        if (index > 0) {
          const upBtn = document.createElement('button');
          upBtn.textContent = '▲';
          upBtn.title = 'move up';
          upBtn.style.cssText = actionBtnStyle;
          upBtn.onclick = (e) => {
            e.stopPropagation();
            this.moveTrack(index, index - 1);
          };
          actionBtns.appendChild(upBtn);
        }
        if (index < this.playlist.length - 1) {
          const downBtn = document.createElement('button');
          downBtn.textContent = '▼';
          downBtn.title = 'move down';
          downBtn.style.cssText = actionBtnStyle;
          downBtn.onclick = (e) => {
            e.stopPropagation();
            this.moveTrack(index, index + 1);
          };
          actionBtns.appendChild(downBtn);
        }
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '✕';
        removeBtn.title = 'remove track';
        removeBtn.style.cssText = actionBtnStyle;
        removeBtn.style.color = '#ff4444';
        removeBtn.style.borderColor = '#442222';
        removeBtn.onclick = (e) => {
          e.stopPropagation();
          this.removeTrack(index);
        };
        actionBtns.appendChild(removeBtn);
        item.appendChild(trackInfo);
        item.appendChild(actionBtns);
        listContainer.appendChild(item);
      });
      ui.playlistEl.appendChild(listContainer);
    }
  }
};
kPlayer.init();
function createProgressBar(onClick) {
  const container = document.createElement('div');
  container.className = 'player-progress-container';
  container.style.flex = '1';
  container.style.height = '10px';
  container.style.background = '#333';
  container.style.position = 'relative';
  container.style.cursor = 'pointer';
  container.style.margin = '0 10px';
  container.style.minWidth = '100px';
  const fill = document.createElement('div');
  fill.className = 'player-progress-fill';
  fill.style.height = '100%';
  fill.style.background = '#fff';
  fill.style.width = '0%';
  fill.style.pointerEvents = 'none';
  container.appendChild(fill);
  container.addEventListener('click', (e) => {
    const rect = container.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    onClick(Math.max(0, Math.min(1, fraction)));
  });
  return { container, fill };
}
function renderPlayerBar() {
  const bar = document.createElement('div');
  bar.className = 'k-player-bar';
  bar.style.display = 'flex';
  bar.style.alignItems = 'center';
  bar.style.height = '100%';
  bar.style.padding = '0 10px';
  bar.style.gap = '8px';
  bar.style.fontSize = '12px';
  bar.style.color = '#fff';
  bar.style.background = '#000';
  bar.style.border = '1px solid #333';
  bar.style.boxSizing = 'border-box';
  bar.style.textTransform = 'lowercase';
  const btnStyle = 'cursor:pointer; background:none; border:none; color:#fff; font-family:inherit; padding:2px 4px; display:flex; align-items:center; justify-content:center;';
  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = getControlSVG('prev');
  prevBtn.style.cssText = btnStyle;
  prevBtn.onclick = () => kPlayer.prev();
  const playBtn = document.createElement('button');
  playBtn.innerHTML = kPlayer.isPlaying ? getControlSVG('pause') : getControlSVG('play');
  playBtn.style.cssText = btnStyle;
  playBtn.onclick = () => kPlayer.togglePlay();
  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = getControlSVG('next');
  nextBtn.style.cssText = btnStyle;
  nextBtn.onclick = () => kPlayer.next();
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 14;
  canvas.style.width = '48px';
  canvas.style.height = '14px';
  canvas.style.border = '1px solid #222';
  canvas.style.background = '#000';
  canvas.style.flexShrink = '0';
  const canvasCtx = canvas.getContext('2d');
  const trackNameEl = document.createElement('div');
  trackNameEl.textContent = kPlayer.getTrackName();
  trackNameEl.style.whiteSpace = 'nowrap';
  trackNameEl.style.overflow = 'hidden';
  trackNameEl.style.textOverflow = 'ellipsis';
  trackNameEl.style.maxWidth = '150px';
  const { container: progressContainer, fill: progressFill } = createProgressBar((fraction) => {
    kPlayer.seek(fraction);
  });
  const timeEl = document.createElement('div');
  timeEl.textContent = '0:00 / 0:00';
  timeEl.style.whiteSpace = 'nowrap';
  timeEl.style.minWidth = '70px';
  timeEl.style.textAlign = 'right';
  timeEl.style.color = '#888';
  timeEl.style.fontSize = '10px';
  bar.appendChild(prevBtn);
  bar.appendChild(playBtn);
  bar.appendChild(nextBtn);
  bar.appendChild(canvas);
  bar.appendChild(trackNameEl);
  bar.appendChild(progressContainer);
  bar.appendChild(timeEl);
  const ui = {
    playBtn,
    trackNameEl,
    fillEl: progressFill,
    timeEl,
    canvas,
    canvasCtx
  };
  kPlayer.uiElements.bars.push(ui);
  return bar;
}
function renderPlayerApp() {
  const app = document.createElement('div');
  app.className = 'player-app';
  app.style.display = 'flex';
  app.style.flexDirection = 'column';
  app.style.height = '100%';
  app.style.width = '100%';
  app.style.background = '#000';
  app.style.color = '#fff';
  app.style.boxSizing = 'border-box';
  app.style.textTransform = 'lowercase';
  const topEl = document.createElement('div');
  topEl.style.padding = '10px';
  topEl.style.borderBottom = '1px solid #333';
  topEl.style.display = 'flex';
  topEl.style.flexDirection = 'column';
  topEl.style.gap = '8px';
  const trackInfoRow = document.createElement('div');
  trackInfoRow.style.display = 'flex';
  trackInfoRow.style.justifyContent = 'space-between';
  const trackNameEl = document.createElement('div');
  trackNameEl.textContent = kPlayer.getTrackName();
  trackNameEl.style.whiteSpace = 'nowrap';
  trackNameEl.style.overflow = 'hidden';
  trackNameEl.style.textOverflow = 'ellipsis';
  trackNameEl.style.fontWeight = 'bold';
  const timeEl = document.createElement('div');
  timeEl.textContent = '0:00 / 0:00';
  timeEl.style.color = '#888';
  timeEl.style.fontSize = '11px';
  trackInfoRow.appendChild(trackNameEl);
  trackInfoRow.appendChild(timeEl);
  const { container: progressContainer, fill: progressFill } = createProgressBar((fraction) => {
    kPlayer.seek(fraction);
  });
  progressContainer.style.margin = '0';
  topEl.appendChild(trackInfoRow);
  topEl.appendChild(progressContainer);
  const playlistEl = document.createElement('div');
  playlistEl.className = 'player-playlist';
  playlistEl.style.flex = '1';
  playlistEl.style.overflowY = 'auto';
  playlistEl.style.padding = '8px';
  const bottomEl = document.createElement('div');
  bottomEl.style.padding = '8px 10px';
  bottomEl.style.borderTop = '1px solid #333';
  const controlsRow = document.createElement('div');
  controlsRow.style.display = 'flex';
  controlsRow.style.alignItems = 'center';
  controlsRow.style.gap = '8px';
  controlsRow.style.flexWrap = 'wrap';
  const btnStyle = 'cursor:pointer; background:none; border:1px solid #333; color:#fff; font-family:inherit; padding:5px 8px; display:flex; align-items:center; justify-content:center;';
  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = getControlSVG('prev');
  prevBtn.style.cssText = btnStyle;
  prevBtn.onclick = () => kPlayer.prev();
  const playBtn = document.createElement('button');
  playBtn.innerHTML = kPlayer.isPlaying ? getControlSVG('pause') : getControlSVG('play');
  playBtn.style.cssText = btnStyle;
  playBtn.onclick = () => kPlayer.togglePlay();
  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = getControlSVG('next');
  nextBtn.style.cssText = btnStyle;
  nextBtn.onclick = () => kPlayer.next();
  const shuffleBtn = document.createElement('button');
  shuffleBtn.innerHTML = getControlSVG('shuffle');
  shuffleBtn.title = 'toggle shuffle';
  shuffleBtn.style.cssText = btnStyle;
  if (kPlayer.isShuffle) {
    shuffleBtn.style.borderColor = '#ffffff';
    shuffleBtn.style.color = '#ffffff';
    shuffleBtn.style.background = '#1a1a1a';
  } else {
    shuffleBtn.style.borderColor = '#333333';
    shuffleBtn.style.color = '#666666';
    shuffleBtn.style.background = 'none';
  }
  shuffleBtn.onclick = () => kPlayer.toggleShuffle();
  const repeatBtn = document.createElement('button');
  repeatBtn.title = 'toggle repeat mode';
  repeatBtn.style.cssText = btnStyle;
  if (kPlayer.isRepeat === 'all') {
    repeatBtn.innerHTML = getControlSVG('repeat');
    repeatBtn.style.borderColor = '#ffffff';
    repeatBtn.style.color = '#ffffff';
    repeatBtn.style.background = '#1a1a1a';
  } else if (kPlayer.isRepeat === 'one') {
    repeatBtn.innerHTML = getControlSVG('repeatOne');
    repeatBtn.style.borderColor = '#ffffff';
    repeatBtn.style.color = '#ff3333';
    repeatBtn.style.background = '#1a1a1a';
  } else {
    repeatBtn.innerHTML = getControlSVG('repeat');
    repeatBtn.style.borderColor = '#333333';
    repeatBtn.style.color = '#666666';
    repeatBtn.style.background = 'none';
  }
  repeatBtn.onclick = () => kPlayer.toggleRepeat();
  const canvas = document.createElement('canvas');
  canvas.className = 'player-visualizer';
  canvas.width = 64;
  canvas.height = 18;
  canvas.style.width = '64px';
  canvas.style.height = '18px';
  canvas.style.border = '1px solid #333';
  canvas.style.background = '#000';
  canvas.style.flexShrink = '0';
  const canvasCtx = canvas.getContext('2d');
  const volContainer = document.createElement('div');
  volContainer.style.display = 'flex';
  volContainer.style.alignItems = 'center';
  volContainer.style.gap = '6px';
  volContainer.style.marginLeft = 'auto';
  const volLabel = document.createElement('span');
  volLabel.textContent = 'vol';
  volLabel.style.color = '#888';
  volLabel.style.fontSize = '10px';
  const volSlider = document.createElement('input');
  volSlider.type = 'range';
  volSlider.min = '0';
  volSlider.max = '1';
  volSlider.step = '0.01';
  volSlider.value = kPlayer.volume;
  volSlider.style.width = '65px';
  volSlider.oninput = (e) => kPlayer.setVolume(parseFloat(e.target.value));
  volContainer.appendChild(volLabel);
  volContainer.appendChild(volSlider);
  controlsRow.appendChild(prevBtn);
  controlsRow.appendChild(playBtn);
  controlsRow.appendChild(nextBtn);
  controlsRow.appendChild(shuffleBtn);
  controlsRow.appendChild(repeatBtn);
  controlsRow.appendChild(canvas);
  controlsRow.appendChild(volContainer);
  bottomEl.appendChild(controlsRow);
  app.appendChild(topEl);
  app.appendChild(playlistEl);
  app.appendChild(bottomEl);
  const ui = {
    playBtn,
    shuffleBtn,
    repeatBtn,
    trackNameEl,
    timeEl,
    fillEl: progressFill,
    playlistEl,
    canvas,
    canvasCtx
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    app.style.borderColor = '#333';
    const files = e.dataTransfer ? e.dataTransfer.files : [];
    const audioFiles = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop().toLowerCase();
      if (file.type.startsWith('audio/') || file.type.startsWith('video/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus', 'mp4', 'webm'].includes(ext)) {
        const blobUrl = URL.createObjectURL(file);
        audioFiles.push({ name: file.name.toLowerCase(), url: blobUrl });
      }
    }
    if (audioFiles.length > 0) {
      const startIndex = kPlayer.playlist.length;
      kPlayer.playlist.push(...audioFiles);
      kPlayer.currentIndex = startIndex;
      kPlayer.loadTrackInternal(audioFiles[0].url, audioFiles[0].name);
    }
  };
  app.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    app.style.borderColor = '#fff';
  });
  app.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    app.style.borderColor = '#333';
  });
  app.addEventListener('drop', handleDrop);
  kPlayer.uiElements.apps.push(ui);
  kPlayer.renderPlaylist(ui);
  return app;
}
