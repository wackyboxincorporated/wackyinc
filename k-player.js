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
    const playIcon = this.isPlaying ? '⏸' : '▶';
    this.uiElements.bars.forEach(ui => {
      ui.playBtn.textContent = playIcon;
      ui.trackNameEl.textContent = trackName;
    });
    const topBarPopup = document.getElementById('top-bar-media-popup');
    if (topBarPopup) {
      const pBtn = topBarPopup.querySelector('.play-btn');
      if (pBtn) pBtn.textContent = playIcon;
      const titleEl = topBarPopup.querySelector('#media-popup-track-title');
      if (titleEl) titleEl.textContent = '♫ ' + trackName;
    }
    this.uiElements.apps.forEach(ui => {
      ui.playBtn.textContent = playIcon;
      ui.trackNameEl.textContent = trackName;
      if (ui.shuffleBtn) {
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
          ui.repeatBtn.textContent = '🔁';
          ui.repeatBtn.style.borderColor = '#ffffff';
          ui.repeatBtn.style.color = '#ffffff';
          ui.repeatBtn.style.background = '#1a1a1a';
        } else if (this.isRepeat === 'one') {
          ui.repeatBtn.textContent = '🔂';
          ui.repeatBtn.style.borderColor = '#ffffff';
          ui.repeatBtn.style.color = '#ff3333';
          ui.repeatBtn.style.background = '#1a1a1a';
        } else {
          ui.repeatBtn.textContent = '🔁';
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
      ui.fillEl.style.width = `${progress * 100}%`;
      ui.timeEl.textContent = timeStr;
    });
    this.uiElements.apps.forEach(ui => {
      ui.fillEl.style.width = `${progress * 100}%`;
      ui.timeEl.textContent = timeStr;
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
  renderPlaylist(ui) {
    ui.playlistEl.innerHTML = '';
    if (!this.playlist || this.playlist.length === 0) {
      const emptyBox = document.createElement('div');
      emptyBox.style.padding = '20px';
      emptyBox.style.color = '#666';
      emptyBox.style.textAlign = 'center';
      emptyBox.style.display = 'flex';
      emptyBox.style.flexDirection = 'column';
      emptyBox.style.alignItems = 'center';
      emptyBox.style.gap = '10px';
      const label = document.createElement('div');
      label.textContent = 'drop audio files here or select from search / file explorer';
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'audio/*';
      fileInput.multiple = true;
      fileInput.style.display = 'none';
      const browseBtn = document.createElement('button');
      browseBtn.textContent = 'browse local music';
      browseBtn.style.padding = '6px 12px';
      browseBtn.style.background = 'transparent';
      browseBtn.style.color = '#fff';
      browseBtn.style.border = '1px solid #333';
      browseBtn.style.cursor = 'pointer';
      browseBtn.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const audioFiles = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const blobUrl = URL.createObjectURL(file);
          audioFiles.push({ name: file.name.toLowerCase(), url: blobUrl });
        }
        if (audioFiles.length > 0) {
          const startIndex = this.playlist.length;
          this.playlist.push(...audioFiles);
          this.currentIndex = startIndex;
          this.loadTrackInternal(audioFiles[0].url, audioFiles[0].name);
        }
      };
      emptyBox.appendChild(label);
      emptyBox.appendChild(browseBtn);
      emptyBox.appendChild(fileInput);
      ui.playlistEl.appendChild(emptyBox);
      return;
    }
    this.playlist.forEach((track, index) => {
      const item = document.createElement('div');
      item.className = 'playlist-item' + (index === this.currentIndex ? ' playing' : '');
      item.style.padding = '4px';
      item.style.cursor = 'pointer';
      item.style.borderBottom = '1px solid #333';
      item.style.color = index === this.currentIndex ? '#fff' : '#888';
      item.style.textTransform = 'lowercase';
      item.textContent = track.name;
      item.onclick = () => {
        this.currentIndex = index;
        this.loadTrackInternal(track.url, track.name);
      };
      ui.playlistEl.appendChild(item);
    });
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
  bar.style.gap = '10px';
  bar.style.fontSize = '14px';
  bar.style.color = '#fff';
  bar.style.background = '#000';
  bar.style.border = '1px solid #333';
  bar.style.boxSizing = 'border-box';
  bar.style.textTransform = 'lowercase';
  const btnStyle = 'cursor:pointer; background:none; border:none; color:#fff; font-family:inherit; padding:0 5px; font-size:14px;';
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '◂◂';
  prevBtn.style.cssText = btnStyle;
  prevBtn.onclick = () => kPlayer.prev();
  const playBtn = document.createElement('button');
  playBtn.textContent = kPlayer.isPlaying ? '❙❙' : '▶';
  playBtn.style.cssText = btnStyle;
  playBtn.onclick = () => kPlayer.togglePlay();
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '▸▸';
  nextBtn.style.cssText = btnStyle;
  nextBtn.onclick = () => kPlayer.next();
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
  timeEl.style.minWidth = '80px';
  timeEl.style.textAlign = 'right';
  timeEl.style.color = '#888';
  bar.appendChild(prevBtn);
  bar.appendChild(playBtn);
  bar.appendChild(nextBtn);
  bar.appendChild(trackNameEl);
  bar.appendChild(progressContainer);
  bar.appendChild(timeEl);
  const ui = {
    playBtn,
    trackNameEl,
    fillEl: progressFill,
    timeEl
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
  topEl.style.gap = '10px';
  const trackInfoRow = document.createElement('div');
  trackInfoRow.style.display = 'flex';
  trackInfoRow.style.justifyContent = 'space-between';
  const trackNameEl = document.createElement('div');
  trackNameEl.textContent = kPlayer.getTrackName();
  trackNameEl.style.whiteSpace = 'nowrap';
  trackNameEl.style.overflow = 'hidden';
  trackNameEl.style.textOverflow = 'ellipsis';
  const timeEl = document.createElement('div');
  timeEl.textContent = '0:00 / 0:00';
  timeEl.style.color = '#888';
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
  playlistEl.style.padding = '10px';
  playlistEl.style.scrollbarWidth = 'none';
  const bottomEl = document.createElement('div');
  bottomEl.style.padding = '10px';
  bottomEl.style.borderTop = '1px solid #333';
  bottomEl.style.display = 'flex';
  bottomEl.style.flexDirection = 'column';
  bottomEl.style.gap = '10px';
  const controlsRow = document.createElement('div');
  controlsRow.style.display = 'flex';
  controlsRow.style.alignItems = 'center';
  controlsRow.style.gap = '15px';
  const btnStyle = 'cursor:pointer; background:none; border:1px solid #333; color:#fff; font-family:inherit; padding:5px 10px; font-size:14px;';
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '◂◂';
  prevBtn.style.cssText = btnStyle;
  prevBtn.onclick = () => kPlayer.prev();
  const playBtn = document.createElement('button');
  playBtn.textContent = kPlayer.isPlaying ? '❙❙' : '▶';
  playBtn.style.cssText = btnStyle;
  playBtn.onclick = () => kPlayer.togglePlay();
  const nextBtn = document.createElement('button');
  nextBtn.textContent = '▸▸';
  nextBtn.style.cssText = btnStyle;
  nextBtn.onclick = () => kPlayer.next();
  const shuffleBtn = document.createElement('button');
  shuffleBtn.textContent = '🔀';
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
    repeatBtn.textContent = '🔁';
    repeatBtn.style.borderColor = '#ffffff';
    repeatBtn.style.color = '#ffffff';
    repeatBtn.style.background = '#1a1a1a';
  } else if (kPlayer.isRepeat === 'one') {
    repeatBtn.textContent = '🔂';
    repeatBtn.style.borderColor = '#ffffff';
    repeatBtn.style.color = '#ff3333';
    repeatBtn.style.background = '#1a1a1a';
  } else {
    repeatBtn.textContent = '🔁';
    repeatBtn.style.borderColor = '#333333';
    repeatBtn.style.color = '#666666';
    repeatBtn.style.background = 'none';
  }
  repeatBtn.onclick = () => kPlayer.toggleRepeat();
  const volContainer = document.createElement('div');
  volContainer.style.display = 'flex';
  volContainer.style.alignItems = 'center';
  volContainer.style.gap = '5px';
  volContainer.style.marginLeft = 'auto';
  const volLabel = document.createElement('span');
  volLabel.textContent = 'vol';
  volLabel.style.color = '#888';
  const volSlider = document.createElement('input');
  volSlider.type = 'range';
  volSlider.min = '0';
  volSlider.max = '1';
  volSlider.step = '0.01';
  volSlider.value = kPlayer.volume;
  volSlider.style.width = '80px';
  volSlider.oninput = (e) => kPlayer.setVolume(parseFloat(e.target.value));
  volContainer.appendChild(volLabel);
  volContainer.appendChild(volSlider);
  controlsRow.appendChild(prevBtn);
  controlsRow.appendChild(playBtn);
  controlsRow.appendChild(nextBtn);
  controlsRow.appendChild(shuffleBtn);
  controlsRow.appendChild(repeatBtn);
  controlsRow.appendChild(volContainer);
  const canvas = document.createElement('canvas');
  canvas.className = 'player-visualizer';
  canvas.height = 60;
  canvas.style.width = '100%';
  canvas.style.display = 'block';
  canvas.style.background = '#000';
  canvas.style.border = '1px solid #333';
  canvas.style.boxSizing = 'border-box';
  canvas.width = 300;
  const canvasCtx = canvas.getContext('2d');
  bottomEl.appendChild(controlsRow);
  bottomEl.appendChild(canvas);
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
  const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      if (entry.target === canvas) {
        canvas.width = entry.contentRect.width;
      }
    }
  });
  resizeObserver.observe(canvas);
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    app.style.borderColor = '#333';
    const files = e.dataTransfer ? e.dataTransfer.files : [];
    const audioFiles = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop().toLowerCase();
      if (file.type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus'].includes(ext)) {
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
