

(function () {

  const state = {
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    isPaused: false,
    volume: 1.0,
    repeatMode: 'repeat',
    shuffleMode: false,
    playbackType: null,
    

    audioContext: null,
    analyser: null,
    splitter: null,
    analyserL: null,
    analyserR: null,
    gainNode: null,
    

    modulePlayer: null,
    nativePlayer: null,
    nativeSource: null,
    

    animFrameId: null,
    updateIntervalId: null,
    

    currentDuration: 0,
    currentTime: 0,
    

    numChannels: 0,
    channelNames: [],
    

    facts: [
    ]
  };

  const channelTimeData = new Uint8Array(4096);
  const nativeBuffers = [new Uint8Array(4096), new Uint8Array(4096)];

  const DOM = {
    queueList: document.getElementById('queue-list'),
    urlInput: document.getElementById('url-upload-input'),
    fileInput: document.getElementById('file-upload-node'),
    loadedVal: document.getElementById('loaded-value'),
    formatVal: document.getElementById('format-val'),
    sampleVal: document.getElementById('sample-val'),
    bufferVal: document.getElementById('buffer-val'),
    volumeBox: document.getElementById('volume-control-box'),
    playbackState: document.getElementById('playback-state-box'),
    scrollingFact: document.getElementById('scrolling-fact-box'),
    displayTitle: document.getElementById('display-title'),
    displayConj: document.getElementById('display-conj'),
    displayArtist: document.getElementById('display-artist'),
    seekTrack: document.getElementById('seek-progress-track'),
    seekFill: document.getElementById('seek-progress-fill'),
    seekHead: document.getElementById('seek-progress-head'),
    timeCurrent: document.getElementById('time-current'),
    timeTotal: document.getElementById('time-total'),
    commentsBox: document.getElementById('comments-box'),
    metaFormat: document.getElementById('meta-format'),
    metaDuration: document.getElementById('meta-duration'),
    metaChannels: document.getElementById('meta-channels'),
    metaExtra: document.getElementById('meta-extra'),
    instrumentsList: document.getElementById('instruments-list'),
    samplesList: document.getElementById('samples-list'),
    channelsVuGrid: document.getElementById('channels-vu-grid'),
    channelsActiveCount: document.getElementById('channels-active-count'),
    repeatLabel: document.getElementById('repeat-mode-label'),
    shuffleLabel: document.getElementById('shuffle-mode-label'),
    volumeText: document.getElementById('volume-indicator-text'),
    scopeCanvas: document.getElementById('scope-canvas'),
    barsCanvas: document.getElementById('bars-canvas')
  };


  function initAudio() {
    if (state.audioContext) return;
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioContextClass();
    

    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 256;
    

    state.gainNode = state.audioContext.createGain();
    state.gainNode.gain.value = state.volume;
    

    state.gainNode.connect(state.analyser);
    state.analyser.connect(state.audioContext.destination);


    state.splitter = state.audioContext.createChannelSplitter(2);
    state.analyserL = state.audioContext.createAnalyser();
    state.analyserL.fftSize = 4096;
    state.analyserR = state.audioContext.createAnalyser();
    state.analyserR.fftSize = 4096;
    
    state.splitter.connect(state.analyserL, 0);
    state.splitter.connect(state.analyserR, 1);
    

    state.nativePlayer = new Audio();
    state.nativePlayer.crossOrigin = "anonymous";
    state.nativeSource = state.audioContext.createMediaElementSource(state.nativePlayer);
    

    state.nativeSource.connect(state.splitter);
    state.nativeSource.connect(state.gainNode);
    

    const chiptuneConfig = new ChiptuneJsConfig(-1, 30, 3, state.audioContext);
    state.modulePlayer = new ChiptuneJsPlayer(chiptuneConfig);
    

    state.modulePlayer.onError(function(err) {
      console.error("Chiptune player error: ", err);
      handlePlaybackError("Module load failed (404 or CORS)");
    });
    

    ChiptuneJsPlayer.prototype.play = function(buffer) {
      this.stop();
      var processNode = this.createLibopenmptNode(buffer, this.config);
      if (processNode == null) return;
      
      libopenmpt._openmpt_module_set_repeat_count(processNode.modulePtr, this.config.repeatCount);
      libopenmpt._openmpt_module_set_render_param(processNode.modulePtr, OPENMPT_MODULE_RENDER_STEREOSEPARATION_PERCENT, this.config.stereoSeparation);
      libopenmpt._openmpt_module_set_render_param(processNode.modulePtr, OPENMPT_MODULE_RENDER_INTERPOLATIONFILTER_LENGTH, this.config.interpolationFilter);
      
      this.currentPlayingNode = processNode;
      

      processNode.connect(state.splitter);
      processNode.connect(state.gainNode);
    };


    state.nativePlayer.addEventListener('timeupdate', onNativeTimeUpdate);
    state.nativePlayer.addEventListener('progress', onNativeProgress);
    state.nativePlayer.addEventListener('ended', onPlaybackEnded);
    state.nativePlayer.addEventListener('error', (e) => {
      console.error("Native Audio Player Error: ", e);
      handlePlaybackError("File not found or format unsupported");
    });


    startVisualizers();
    

    cycleFacts();
  }


  function loadQueueFromDOM() {
    state.queue = [];
    const rows = DOM.queueList.querySelectorAll('.queue-row');
    rows.forEach((row, index) => {
      state.queue.push({
        src: row.getAttribute('data-src'),
        title: row.getAttribute('data-title') || 'unknown',
        artist: row.getAttribute('data-artist') || 'unknown',
        element: row
      });
      
      row.onclick = () => {
        initAudio();
        playIndex(index);
      };
    });
  }

  function playIndex(index) {
    if (index < 0 || index >= state.queue.length) return;
    

    state.queue.forEach((item) => item.element.classList.remove('active'));
    
    state.currentIndex = index;
    const item = state.queue[index];
    item.element.classList.add('active');
    item.element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });


    stopPlayback();
    

    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }
    
    DOM.displayTitle.textContent = "loading...";
    DOM.displayConj.textContent = "";
    DOM.displayArtist.textContent = "";
    DOM.playbackState.textContent = "loading";
    DOM.playbackState.className = "status-indicator state-playing";
    DOM.loadedVal.textContent = "00";
    DOM.bufferVal.textContent = "no%";
    

    const ext = (item.title || item.src).split('.').pop().toLowerCase();
    const isModule = ['xm', 'mod', 's3m', 'it'].includes(ext);
    
    if (isModule) {
      playModule(item.src, item.title, item.artist);
    } else {
      playNative(item.src, item.title, item.artist);
    }
  }


  function playModule(url, defaultTitle, defaultArtist) {
    state.playbackType = 'module';
    state.isPlaying = true;
    state.isPaused = false;
    

    state.modulePlayer.load(url, function(buffer) {
      if (!state.isPlaying || state.currentIndex === -1 || state.queue[state.currentIndex].src !== url) {

        return;
      }
      
      try {
        state.modulePlayer.play(buffer);
        

        const modulePtr = state.modulePlayer.currentPlayingNode.modulePtr;
        

        let title = getMetadataString(modulePtr, 'title') || defaultTitle;
        let artist = getMetadataString(modulePtr, 'artist') || defaultArtist;
        let tracker = getMetadataString(modulePtr, 'tracker');
        let typeLong = getMetadataString(modulePtr, 'type_long');
        let warnings = getMetadataString(modulePtr, 'warnings');
        let comments = getMetadataString(modulePtr, 'message');
        

        title = title.trim();
        artist = artist.trim();
        

        DOM.displayTitle.textContent = title || "untitled module";
        DOM.displayConj.textContent = "by";
        DOM.displayArtist.textContent = artist || "unknown artist";
        

        const fileExt = defaultTitle.split('.').pop().toUpperCase();
        DOM.formatVal.textContent = `${fileExt} MODULE`;
        

        state.numChannels = libopenmpt._openmpt_module_get_num_channels(modulePtr);
        const durationSec = libopenmpt._openmpt_module_get_duration_seconds(modulePtr);
        state.currentDuration = durationSec;
        
        DOM.sampleVal.textContent = `44.1k ${state.numChannels}ch`;
        DOM.loadedVal.textContent = "99";
        DOM.bufferVal.textContent = "99%";
        DOM.playbackState.textContent = "playing";
        

        DOM.metaFormat.textContent = typeLong || fileExt;
        DOM.metaDuration.textContent = formatTime(durationSec);
        DOM.metaChannels.textContent = `${state.numChannels} tracker channels`;
        DOM.metaExtra.textContent = tracker ? `Created in: ${tracker}` : "--";
        

        populateModuleTrackerLists(modulePtr);
        

        buildChannelVUGrid();
        

        DOM.commentsBox.textContent = comments ? comments.trim() : "no song message or comments stored inside this module.";
        

        if (state.updateIntervalId) clearInterval(state.updateIntervalId);
        state.updateIntervalId = setInterval(pollModulePosition, 200);
        

        state.modulePlayer.onEnded(function() {
          onPlaybackEnded();
        });
        
      } catch (err) {
        console.error("libopenmpt playback crashed: ", err);
        DOM.commentsBox.textContent = `ERROR: Failed to play tracker module.\n\nDetails: ${err.message}`;
        handlePlaybackError(err.message);
      }
    });
  }


  function getMetadataString(modulePtr, key) {
    if (!modulePtr) return "";
    try {
      const keyBuffer = libopenmpt._malloc(key.length + 1);
      writeAsciiToMemory(key, keyBuffer);
      const valPtr = libopenmpt._openmpt_module_get_metadata(modulePtr, keyBuffer);
      const str = UTF8ToString(valPtr);
      libopenmpt._free(keyBuffer);
      libopenmpt._openmpt_free_string(valPtr);
      return str;
    } catch (e) {
      return "";
    }
  }

  function populateModuleTrackerLists(modulePtr) {

    DOM.instrumentsList.innerHTML = "";
    DOM.samplesList.innerHTML = "";
    

    const numInstruments = libopenmpt._openmpt_module_get_num_instruments(modulePtr);
    if (numInstruments > 0) {
      for (let i = 0; i < numInstruments; i++) {
        const namePtr = libopenmpt._openmpt_module_get_instrument_name(modulePtr, i);
        const name = UTF8ToString(namePtr).trim();
        libopenmpt._openmpt_free_string(namePtr);
        
        const li = document.createElement('li');
        li.className = 'retro-list-item';
        li.textContent = `${i.toString().padStart(2, '0')}: ${name || '---'}`;
        DOM.instrumentsList.appendChild(li);
      }
    } else {
      DOM.instrumentsList.innerHTML = '<li class="retro-list-item no-data-msg">no instruments (standard sample-based module)</li>';
    }


    const numSamples = libopenmpt._openmpt_module_get_num_samples(modulePtr);
    if (numSamples > 0) {
      for (let i = 0; i < numSamples; i++) {
        const namePtr = libopenmpt._openmpt_module_get_sample_name(modulePtr, i);
        const name = UTF8ToString(namePtr).trim();
        libopenmpt._openmpt_free_string(namePtr);
        
        const li = document.createElement('li');
        li.className = 'retro-list-item';
        li.textContent = `${i.toString().padStart(2, '0')}: ${name || '---'}`;
        DOM.samplesList.appendChild(li);
      }
    } else {
      DOM.samplesList.innerHTML = '<li class="retro-list-item no-data-msg">no samples loaded</li>';
    }
  }

  function buildChannelVUGrid() {
    DOM.channelsVuGrid.innerHTML = "";
    DOM.channelsActiveCount.textContent = `${state.numChannels} channels`;
    
    if (state.numChannels === 4) {
      DOM.channelsVuGrid.classList.add('grid-4-channels');
    } else {
      DOM.channelsVuGrid.classList.remove('grid-4-channels');
    }
    
    state.channelNames = [];
    const modulePtr = state.modulePlayer.currentPlayingNode.modulePtr;
    
    for (let i = 0; i < state.numChannels; i++) {
      const namePtr = libopenmpt._openmpt_module_get_channel_name(modulePtr, i);
      const name = UTF8ToString(namePtr).trim() || `Channel ${i+1}`;
      libopenmpt._openmpt_free_string(namePtr);
      state.channelNames.push(name);
      
      const card = document.createElement('div');
      card.className = 'channel-card';
      card.id = `channel-node-${i}`;
      
      const label = document.createElement('span');
      label.className = 'channel-name';
      label.textContent = `${(i+1).toString().padStart(2, '0')}: ${name}`;
      
      const vuBar = document.createElement('div');
      vuBar.className = 'channel-vu-bar';
      const vuFill = document.createElement('div');
      vuFill.className = 'channel-vu-fill';
      vuFill.id = `channel-vu-fill-${i}`;
      vuBar.appendChild(vuFill);
      
      const miniCanvas = document.createElement('canvas');
      miniCanvas.className = 'channel-mini-scope';
      miniCanvas.id = `channel-scope-canvas-${i}`;
      
      card.appendChild(label);
      card.appendChild(vuBar);
      card.appendChild(miniCanvas);
      
      DOM.channelsVuGrid.appendChild(card);
    }
  }

  function pollModulePosition() {
    if (!state.isPlaying || state.playbackType !== 'module') return;
    
    const node = state.modulePlayer.currentPlayingNode;
    if (node && node.modulePtr) {
      try {
        state.currentTime = libopenmpt._openmpt_module_get_position_seconds(node.modulePtr);
        DOM.timeCurrent.textContent = formatTime(state.currentTime);
        DOM.timeTotal.textContent = formatTime(state.currentDuration);
        

        const ratio = state.currentDuration > 0 ? (state.currentTime / state.currentDuration) : 0;
        DOM.seekFill.style.width = `${ratio * 100}%`;
        DOM.seekHead.style.left = `${ratio * 100}%`;
      } catch (e) {

      }
    }
  }


  function playNative(url, defaultTitle, defaultArtist) {
    state.playbackType = 'native';
    state.isPlaying = true;
    state.isPaused = false;
    

    let title = defaultTitle;
    let artist = defaultArtist;
    

    const baseName = defaultTitle.replace(/\.[^/.]+$/, "");
    if (baseName.includes('_')) {
      const parts = baseName.split('_');
      if (parts.length >= 2) {
        artist = parts[0].replace(/-/g, ' ');
        title = parts.slice(1).join(' ').replace(/-/g, ' ');
      }
    } else if (baseName.includes('-')) {
      const parts = baseName.split('-');
      artist = parts[0].trim();
      title = parts.slice(1).join(' ').trim();
    }
    
    DOM.displayTitle.textContent = title;
    DOM.displayConj.textContent = "by";
    DOM.displayArtist.textContent = artist;
    
    const fileExt = defaultTitle.split('.').pop().toUpperCase();
    DOM.formatVal.textContent = fileExt;
    DOM.sampleVal.textContent = "fetching info";
    

    state.nativePlayer.src = url;
    state.nativePlayer.play()
      .then(() => {
        DOM.playbackState.textContent = "playing";
        DOM.playbackState.className = "status-indicator state-playing";
      })
      .catch((e) => {
        console.error("Native play failed: ", e);
        DOM.commentsBox.textContent = `ERROR: Failed to play audio file ${fileExt}.\n\nDetails: Browser refused audio context initiation. Click inside screen to unlock.`;
        onPlaybackEnded();
      });


    DOM.metaFormat.textContent = `${fileExt} Audio File`;
    DOM.metaExtra.textContent = "Browser Standard Format / Hardware Accelerated Decoded";
    DOM.instrumentsList.innerHTML = '<li class="retro-list-item no-data-msg">no instruments (standard streaming audio track)</li>';
    DOM.samplesList.innerHTML = '<li class="retro-list-item no-data-msg">no samples (standard streaming audio track)</li>';
    DOM.commentsBox.textContent = `streaming metadata:\nsource url: ${url}\ncodec: native hardware decoder\nfull container support enabled.`;
    

    buildStereoVUGrid();
  }

  function buildStereoVUGrid() {
    DOM.channelsVuGrid.innerHTML = "";
    DOM.channelsActiveCount.textContent = "2 channels (stereo)";
    DOM.channelsVuGrid.classList.remove('grid-4-channels');
    
    const channels = [
      { name: "Left Channel (Stereo L)", id: 0 },
      { name: "Right Channel (Stereo R)", id: 1 }
    ];

    channels.forEach((ch) => {
      const card = document.createElement('div');
      card.className = 'channel-card';
      
      const label = document.createElement('span');
      label.className = 'channel-name';
      label.textContent = ch.name;
      
      const vuBar = document.createElement('div');
      vuBar.className = 'channel-vu-bar';
      const vuFill = document.createElement('div');
      vuFill.className = 'channel-vu-fill';
      vuFill.id = `channel-vu-fill-${ch.id}`;
      vuBar.appendChild(vuFill);
      
      const miniCanvas = document.createElement('canvas');
      miniCanvas.className = 'channel-mini-scope';
      miniCanvas.id = `channel-scope-canvas-${ch.id}`;
      
      card.appendChild(label);
      card.appendChild(vuBar);
      card.appendChild(miniCanvas);
      
      DOM.channelsVuGrid.appendChild(card);
    });
  }

  function onNativeTimeUpdate() {
    if (!state.isPlaying || state.playbackType !== 'native') return;
    
    state.currentTime = state.nativePlayer.currentTime;
    state.currentDuration = state.nativePlayer.duration || 0;
    
    DOM.timeCurrent.textContent = formatTime(state.currentTime);
    DOM.timeTotal.textContent = formatTime(state.currentDuration);
    

    const ratio = state.currentDuration > 0 ? (state.currentTime / state.currentDuration) : 0;
    DOM.seekFill.style.width = `${ratio * 100}%`;
    DOM.seekHead.style.left = `${ratio * 100}%`;


    if (state.nativePlayer.duration && DOM.sampleVal.textContent === "fetching info") {
      DOM.sampleVal.textContent = "44.1k stereo";
      DOM.metaDuration.textContent = formatTime(state.currentDuration);
      DOM.metaChannels.textContent = "Stereo (2 Channels)";
    }
  }

  function onNativeProgress() {
    if (!state.isPlaying || state.playbackType !== 'native') return;
    

    if (state.nativePlayer.buffered.length > 0 && state.nativePlayer.duration) {
      const bufferedEnd = state.nativePlayer.buffered.end(state.nativePlayer.buffered.length - 1);
      const ratio = bufferedEnd / state.nativePlayer.duration;
      const loadedPct = Math.round(ratio * 100);
      
      DOM.loadedVal.textContent = loadedPct.toString().padStart(2, '0');
      DOM.bufferVal.textContent = `${loadedPct}%`;
    }
  }


  function handlePlaybackError(msg) {
    if (state.updateIntervalId) {
      clearInterval(state.updateIntervalId);
      state.updateIntervalId = null;
    }
    if (state.playbackType === 'module') {
      state.modulePlayer.stop();
    } else if (state.playbackType === 'native') {
      state.nativePlayer.pause();
      state.nativePlayer.src = "";
    }
    state.isPlaying = false;
    state.isPaused = false;
    state.playbackType = null;
    state.currentTime = 0;
    state.currentDuration = 0;
    
    DOM.playbackState.textContent = "error";
    DOM.playbackState.className = "status-indicator state-stopped";
    DOM.playbackState.style.color = "var(--txt-red)";
    
    DOM.displayTitle.textContent = "playback";
    DOM.displayConj.textContent = "failed";
    DOM.displayArtist.textContent = "error";
    
    DOM.timeCurrent.textContent = "0:00";
    DOM.timeTotal.textContent = "0:00";
    DOM.seekFill.style.width = "0%";
    DOM.seekHead.style.left = "0%";
    
    DOM.channelsVuGrid.innerHTML = `
      <div class="no-data-msg" style="grid-column: 1 / -1; text-align: center; padding: 20px;">
        Playback failed: ${msg}
      </div>
    `;
    DOM.channelsActiveCount.textContent = "error";
    
    addScrollingFact(`playback error: ${msg}`);
  }

  function stopPlayback() {
    if (state.updateIntervalId) {
      clearInterval(state.updateIntervalId);
      state.updateIntervalId = null;
    }
    
    if (state.playbackType === 'module') {
      state.modulePlayer.stop();
    } else if (state.playbackType === 'native') {
      state.nativePlayer.pause();
      state.nativePlayer.src = "";
    }
    
    state.isPlaying = false;
    state.isPaused = false;
    state.playbackType = null;
    state.currentTime = 0;
    state.currentDuration = 0;
    
    DOM.displayTitle.textContent = "nothing";
    DOM.displayConj.textContent = "is";
    DOM.displayArtist.textContent = "playing";
    
    DOM.playbackState.textContent = "stopped";
    DOM.playbackState.className = "status-indicator state-stopped";
    DOM.loadedVal.textContent = "OO";
    DOM.bufferVal.textContent = "no%";
    DOM.formatVal.textContent = "not running";
    DOM.sampleVal.textContent = "0k 0 bit";
    
    DOM.timeCurrent.textContent = "0:00";
    DOM.timeTotal.textContent = "0:00";
    DOM.seekFill.style.width = "0%";
    DOM.seekHead.style.left = "0%";
    
    DOM.channelsVuGrid.innerHTML = `
      <div class="no-data-msg" style="grid-column: 1 / -1; text-align: center; padding: 20px;">
        Play a module to view channels activity
      </div>
    `;
    DOM.channelsActiveCount.textContent = "0 channels";
  }

  function togglePause() {
    if (!state.isPlaying) return;
    
    initAudio();
    
    if (state.playbackType === 'module') {
      state.modulePlayer.togglePause();
      state.isPaused = state.modulePlayer.currentPlayingNode.paused;
    } else if (state.playbackType === 'native') {
      if (state.isPaused) {
        state.nativePlayer.play();
        state.isPaused = false;
      } else {
        state.nativePlayer.pause();
        state.isPaused = true;
      }
    }
    
    if (state.isPaused) {
      DOM.playbackState.textContent = "paused";
      DOM.playbackState.className = "status-indicator state-stopped";
    } else {
      DOM.playbackState.textContent = "playing";
      DOM.playbackState.className = "status-indicator state-playing";
    }
  }

  function seekTo(ratio) {
    if (!state.isPlaying || state.currentDuration <= 0) return;
    
    const targetSec = ratio * state.currentDuration;
    
    if (state.playbackType === 'native') {
      state.nativePlayer.currentTime = targetSec;
    } else if (state.playbackType === 'module') {

      const node = state.modulePlayer.currentPlayingNode;
      if (node && node.modulePtr) {
        try {
          libopenmpt._openmpt_module_set_position_seconds(node.modulePtr, targetSec);
          state.currentTime = targetSec;
          pollModulePosition();
        } catch (e) {
          console.error("libopenmpt seek failed: ", e);
        }
      }
    }
  }

  function onPlaybackEnded() {
    if (state.repeatMode === 'one' && state.currentIndex !== -1) {

      playIndex(state.currentIndex);
    } else if (state.repeatMode === 'repeat') {

      playNext();
    } else {
      stopPlayback();
    }
  }

  function playNext() {
    if (state.queue.length === 0) return;
    
    let nextIndex = state.currentIndex + 1;
    
    if (state.shuffleMode) {
      nextIndex = Math.floor(Math.random() * state.queue.length);
    } else if (nextIndex >= state.queue.length) {
      nextIndex = 0;
    }
    
    playIndex(nextIndex);
  }

  function playPrev() {
    if (state.queue.length === 0) return;
    
    let prevIndex = state.currentIndex - 1;
    
    if (state.shuffleMode) {
      prevIndex = Math.floor(Math.random() * state.queue.length);
    } else if (prevIndex < 0) {
      prevIndex = state.queue.length - 1;
    }
    
    playIndex(prevIndex);
  }

  function clearQueue() {
    stopPlayback();
    state.queue = [];
    state.currentIndex = -1;
    DOM.queueList.innerHTML = "";
    addScrollingFact("queue cleared successfully.");
  }

  function toggleRepeatMode() {
    if (state.repeatMode === 'repeat') {
      state.repeatMode = 'one';
      DOM.repeatLabel.innerHTML = "mode <span>| track</span>";
      addScrollingFact("repeat mode: single track loop.");
    } else if (state.repeatMode === 'one') {
      state.repeatMode = 'off';
      DOM.repeatLabel.innerHTML = "mode <span>| off</span>";
      addScrollingFact("repeat mode: disabled.");
    } else {
      state.repeatMode = 'repeat';
      DOM.repeatLabel.innerHTML = "mode <span>| repeat</span>";
      addScrollingFact("repeat mode: loop entire queue.");
    }
  }

  function toggleShuffleMode() {
    state.shuffleMode = !state.shuffleMode;
    DOM.shuffleLabel.innerHTML = state.shuffleMode ? "shuffle <span>| on</span>" : "shuffle <span>| off</span>";
    addScrollingFact(state.shuffleMode ? "shuffle playback enabled." : "shuffle playback disabled.");
  }

  function setVolume(pct) {
    state.volume = Math.max(0, Math.min(1.0, pct));
    DOM.volumeText.textContent = `${Math.round(state.volume * 100)}%`;
    
    if (state.gainNode) {
      state.gainNode.gain.setValueAtTime(state.volume, state.audioContext.currentTime);
    }
    

    const scale = 0.5 + (state.volume * 0.5);
    const scribblePaths = DOM.volumeBox.querySelectorAll('path');
    scribblePaths.forEach((path) => {
      path.style.opacity = state.volume;
      path.style.transform = `scale(${scale})`;
      path.style.transformOrigin = 'center';
    });
  }


  function handleURLUpload(url) {
    if (!url) return;
    initAudio();
    
    const fileName = url.split('/').pop() || "Stream URL";
    
    const li = document.createElement('li');
    li.className = 'queue-row';
    li.setAttribute('data-src', url);
    li.setAttribute('data-title', fileName);
    li.setAttribute('data-artist', 'network stream');
    li.innerHTML = `<span>${fileName}</span><span class="play-dot"></span>`;
    
    DOM.queueList.appendChild(li);
    loadQueueFromDOM();
    

    playIndex(state.queue.length - 1);
    DOM.urlInput.value = "";
  }

  function handleFilesUpload(files) {
    if (files.length === 0) return;
    initAudio();
    
    Array.from(files).forEach((file) => {

      const objectURL = URL.createObjectURL(file);
      
      const li = document.createElement('li');
      li.className = 'queue-row';
      li.setAttribute('data-src', objectURL);
      li.setAttribute('data-title', file.name);
      li.setAttribute('data-artist', 'local file');
      li.innerHTML = `<span>${file.name}</span><span class="play-dot"></span>`;
      
      DOM.queueList.appendChild(li);
    });
    
    loadQueueFromDOM();
    

    playIndex(state.queue.length - files.length);
  }


  function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        
        const contents = document.querySelectorAll('.tab-content');
        contents.forEach((c) => c.classList.remove('active'));
        
        const target = tab.getAttribute('data-tab');
        document.getElementById(target).classList.add('active');
      });
    });
  }


  function startVisualizers() {
    const scopeCtx = DOM.scopeCanvas.getContext('2d');
    const barsCtx = DOM.barsCanvas.getContext('2d');
    

    function resizeCanvases() {
      const scopeWrap = DOM.scopeCanvas.parentElement;
      DOM.scopeCanvas.width = scopeWrap.clientWidth;
      DOM.scopeCanvas.height = scopeWrap.clientHeight;
      
      const barsWrap = DOM.barsCanvas.parentElement;
      DOM.barsCanvas.width = barsWrap.clientWidth;
      DOM.barsCanvas.height = barsWrap.clientHeight;
    }
    
    window.addEventListener('resize', resizeCanvases);
    resizeCanvases();


    const barsData = new Uint8Array(state.analyser ? state.analyser.frequencyBinCount : 128);
    const scopeData = new Uint8Array(4096);
    const scopeDataR = new Uint8Array(4096);


    function render() {
      state.animFrameId = requestAnimationFrame(render);
      
      const wScope = DOM.scopeCanvas.width;
      const hScope = DOM.scopeCanvas.height;
      const wBars = DOM.barsCanvas.width;
      const hBars = DOM.barsCanvas.height;
      

      scopeCtx.fillStyle = '#000000';
      scopeCtx.fillRect(0, 0, wScope, hScope);
      

      scopeCtx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
      scopeCtx.lineWidth = 1;
      scopeCtx.beginPath();

      scopeCtx.moveTo(0, hScope / 2);
      scopeCtx.lineTo(wScope, hScope / 2);

      scopeCtx.moveTo(wScope / 2, 0);
      scopeCtx.lineTo(wScope / 2, hScope);
      scopeCtx.stroke();

      if (state.isPlaying && !state.isPaused) {

        if (state.analyserL && state.analyserR) {
          state.analyserL.getByteTimeDomainData(scopeData);
          state.analyserR.getByteTimeDomainData(scopeDataR);
          

          scopeCtx.strokeStyle = 'rgba(0, 255, 255, 0.7)';
          scopeCtx.lineWidth = 2;
          scopeCtx.beginPath();
          let sliceWidth = wScope / scopeData.length;
          let x = 0;
          for (let i = 0; i < scopeData.length; i++) {
            let v = scopeData[i] / 128.0;

            let y = (v * hScope / 2) - (hScope / 6);
            if (i === 0) scopeCtx.moveTo(x, y);
            else scopeCtx.lineTo(x, y);
            x += sliceWidth;
          }
          scopeCtx.stroke();
          

          scopeCtx.strokeStyle = 'rgba(187, 0, 255, 0.7)';
          scopeCtx.lineWidth = 2;
          scopeCtx.beginPath();
          x = 0;
          for (let i = 0; i < scopeDataR.length; i++) {
            let v = scopeDataR[i] / 128.0;

            let y = (v * hScope / 2) + (hScope / 6);
            if (i === 0) scopeCtx.moveTo(x, y);
            else scopeCtx.lineTo(x, y);
            x += sliceWidth;
          }
          scopeCtx.stroke();
        }
      } else {

        scopeCtx.strokeStyle = '#0055ff';
        scopeCtx.lineWidth = 2;
        scopeCtx.beginPath();
        scopeCtx.moveTo(0, hScope / 2);
        scopeCtx.lineTo(wScope, hScope / 2);
        scopeCtx.stroke();
      }
      

      barsCtx.fillStyle = '#000000';
      barsCtx.fillRect(0, 0, wBars, hBars);
      

      barsCtx.strokeStyle = 'rgba(255, 0, 0, 0.05)';
      barsCtx.beginPath();
      for (let x = 0; x < wBars; x += 30) {
        barsCtx.moveTo(x, 0);
        barsCtx.lineTo(x, hBars);
      }
      for (let y = 0; y < hBars; y += 30) {
        barsCtx.moveTo(0, y);
        barsCtx.lineTo(wBars, y);
      }
      barsCtx.stroke();

      if (state.isPlaying && state.analyser && !state.isPaused) {
        state.analyser.getByteFrequencyData(barsData);
        
        const barCount = 36;
        const barWidth = (wBars / barCount) - 3;
        
        for (let i = 0; i < barCount; i++) {

          const percent = barsData[i] / 255.0;
          const barHeight = percent * hBars * 0.85;
          const x = i * (barWidth + 3) + 2;
          const y = hBars - barHeight;
          
          const grad = barsCtx.createLinearGradient(x, hBars, x, y);
          grad.addColorStop(0, '#0055ff');
          grad.addColorStop(1, '#bb00ff');
          
          barsCtx.fillStyle = grad;
          barsCtx.fillRect(x, y, barWidth, barHeight);
        }
      } else {

        const barCount = 36;
        const barWidth = (wBars / barCount) - 3;
        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + 3) + 2;
          const h = 4 + (Math.sin(i * 0.5) * 2);
          barsCtx.fillStyle = '#002288';
          barsCtx.fillRect(x, hBars - h, barWidth, h);
        }
      }


      renderPerChannelGrid();
    }
    
    render();
  }

  function renderPerChannelGrid() {
    if (!state.isPlaying || state.isPaused) return;

    if (state.playbackType === 'module') {
      if (!state.modulePlayer || !state.modulePlayer.currentPlayingNode) return;
      const modulePtr = state.modulePlayer.currentPlayingNode.modulePtr;
      if (!modulePtr) return;
      
      if (state.analyserL) {
        state.analyserL.getByteTimeDomainData(channelTimeData);
      }
      
      for (let i = 0; i < state.numChannels; i++) {
        const fill = document.getElementById(`channel-vu-fill-${i}`);
        const canvas = document.getElementById(`channel-scope-canvas-${i}`);
        if (!fill || !canvas) continue;
        
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
        }
        
        let vu = libopenmpt._openmpt_module_get_current_channel_vu_mono(modulePtr, i);
        fill.style.width = `${Math.min(100, vu * 120)}%`;
        
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
        
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        
        ctx.strokeStyle = vu > 0.02 ? 'rgba(0, 255, 255, 0.8)' : '#0055ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        
        const points = 2048;
        const step = w / points;
        const timeWindow = 1024;
        
        if (vu > 0.01) {
          let triggerIdx = 0;
          let bestSlope = 0;
          for (let j = 0; j < 2048; j++) {
            let val = channelTimeData[j];
            let nextVal = channelTimeData[j + 1];
            if (val <= 128 && nextVal > 128) {
              let slope = nextVal - val;
              if (slope > bestSlope) {
                bestSlope = slope;
                triggerIdx = j;
              }
            }
          }
          
          let maxVal = 0.01;
          const samples = [];
          const freqMult = 0.5 + (i % 8) * 0.25;
          const waveStyle = i % 4;
          
          for (let p = 0; p <= points; p++) {
            const sampleOffset = Math.floor((p / points) * timeWindow * freqMult);
            const dataIdx = (triggerIdx + sampleOffset) % channelTimeData.length;
            let sample = (channelTimeData[dataIdx] - 128) / 128;
            
            if (waveStyle === 0) {
              sample = Math.sin(sample * Math.PI / 2);
            } else if (waveStyle === 1) {
              sample = Math.sign(sample) * (1 - Math.exp(-Math.abs(sample) * 6));
            } else if (waveStyle === 2) {
              sample = Math.asin(Math.max(-1, Math.min(1, sample))) / (Math.PI / 2);
            } else if (waveStyle === 3) {
              sample = sample * 0.6 + 0.4 * Math.sin(sample * Math.PI * 2);
            }
            
            samples.push(sample);
            if (Math.abs(sample) > maxVal) maxVal = Math.abs(sample);
          }
          
          const scale = Math.min(1.0, vu * 8);
          for (let p = 0; p <= points; p++) {
            const normalizedSample = samples[p] / maxVal;
            const amp = normalizedSample * (h / 2) * 0.75 * scale;
            let y = (h / 2) + amp;
            let x = p * step;
            if (p === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        } else {
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
        }
        ctx.stroke();
      }
    } else if (state.playbackType === 'native') {
      if (state.analyserL && state.analyserR) {
        state.analyserL.getByteTimeDomainData(nativeBuffers[0]);
        state.analyserR.getByteTimeDomainData(nativeBuffers[1]);
        
        for (let ch = 0; ch < 2; ch++) {
          const fill = document.getElementById(`channel-vu-fill-${ch}`);
          const canvas = document.getElementById(`channel-scope-canvas-${ch}`);
          if (!fill || !canvas) continue;
          
          if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
          }
          
          const buffer = nativeBuffers[ch];
          
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            let v = (buffer[i] - 128) / 128;
            sum += v * v;
          }
          let rms = Math.sqrt(sum / buffer.length);
          let vu = rms * 2.5;
          fill.style.width = `${Math.min(100, vu * 100)}%`;
          
          const ctx = canvas.getContext('2d');
          const w = canvas.width;
          const h = canvas.height;
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, w, h);
          
          ctx.strokeStyle = 'rgba(255, 0, 255, 0.05)';
          ctx.beginPath();
          ctx.moveTo(0, h/2);
          ctx.lineTo(w, h/2);
          ctx.stroke();
          
          ctx.strokeStyle = ch === 0 ? 'rgba(0, 255, 255, 0.8)' : 'rgba(187, 0, 255, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          
          const points = 2048;
          const step = w / points;
          const timeWindow = 1024;
          
          if (vu > 0.01) {
            let triggerIdx = 0;
            let bestSlope = 0;
            for (let j = 0; j < 2048; j++) {
              let val = buffer[j];
              let nextVal = buffer[j + 1];
              if (val <= 128 && nextVal > 128) {
                let slope = nextVal - val;
                if (slope > bestSlope) {
                  bestSlope = slope;
                  triggerIdx = j;
                }
              }
            }
            
            let maxVal = 0.01;
            const samples = [];
            
            for (let p = 0; p <= points; p++) {
              const sampleOffset = Math.floor((p / points) * timeWindow);
              const idx = (triggerIdx + sampleOffset) % buffer.length;
              const sample = (buffer[idx] - 128) / 128;
              samples.push(sample);
              if (Math.abs(sample) > maxVal) maxVal = Math.abs(sample);
            }
            
            const scale = Math.min(1.0, vu * 8);
            for (let p = 0; p <= points; p++) {
              const normalizedSample = samples[p] / maxVal;
              const amp = normalizedSample * (h / 2) * 0.75 * scale;
              let y = (h / 2) + amp;
              let x = p * step;
              if (p === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
          } else {
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
          }
          ctx.stroke();
        }
      }
    }
  }


  function cycleFacts() {
    let index = 0;
    setInterval(() => {
      index = (index + 1) % state.facts.length;
      addScrollingFact(state.facts[index]);
    }, 15000);
  }

  function addScrollingFact(text) {
    DOM.scrollingFact.textContent = text;

    DOM.scrollingFact.style.animation = 'none';
    DOM.scrollingFact.offsetHeight;
    DOM.scrollingFact.style.animation = 'scrollFact 20s linear infinite';
  }


  function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const activeElement = document.activeElement;

      if (activeElement && activeElement.tagName === 'INPUT') return;
      
      const key = e.key.toUpperCase();
      
      if (e.key === ' ') {
        e.preventDefault();
        togglePause();
      } else if (key === 'C') {
        clearQueue();
      } else if (key === 'R') {
        toggleRepeatMode();
      } else if (key === 'S') {
        toggleShuffleMode();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        initAudio();
        playNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        initAudio();
        playPrev();
      }
    });
  }

  function setupInteractiveListeners() {

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleFilesUpload(e.dataTransfer.files);
      }
    });


    DOM.urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleURLUpload(DOM.urlInput.value.trim());
      }
    });


    DOM.fileInput.addEventListener('change', () => {
      handleFilesUpload(DOM.fileInput.files);
    });


    DOM.seekTrack.addEventListener('click', (e) => {
      if (!state.isPlaying || state.currentDuration <= 0) return;
      const rect = DOM.seekTrack.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1.0, clickX / rect.width));
      seekTo(ratio);
    });


    DOM.volumeBox.addEventListener('wheel', (e) => {
      e.preventDefault();
      initAudio();

      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setVolume(state.volume + delta);
    });

    DOM.volumeBox.addEventListener('click', (e) => {
      initAudio();
      const rect = DOM.volumeBox.getBoundingClientRect();
      const clickY = e.clientY - rect.top;

      const pct = 1.0 - (clickY / rect.height);
      setVolume(pct);
    });
  }


  function formatTime(sec) {
    if (isNaN(sec) || sec === Infinity || sec <= 0) return "0:00";
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }


  function fetchFacts() {
    fetch('facts.txt')
      .then(response => {
        if (response.ok) return response.text();
        throw new Error('Failed to load facts.txt');
      })
      .then(text => {
        const lines = text.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        if (lines.length > 0) {
          state.facts = lines;

          addScrollingFact(state.facts[0]);
        }
      })
      .catch(err => {
        console.warn("Could not load facts.txt, using fallback facts: ", err);
      });
  }

  window.addEventListener('DOMContentLoaded', () => {
    loadQueueFromDOM();
    setupTabs();
    setupKeyboardShortcuts();
    setupInteractiveListeners();
    
    setVolume(1.0);
    
    fetchFacts();
    
    console.log("meaty player online core initialized successfully.");
  });

})();
