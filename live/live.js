/*
Live visualizer controller
- Polls API for N most recent successful matches
- Queues matches not currently in queue
- Loads and auto-plays them nonstop
*/

(function(){
    const POLL_DEFAULT_MS = 60000;
    const MAX_QUEUE = 20;
    const RECENT_MATCHES_LIMIT = 30; // Only look at N most recent matches
    const PLAY_AUTOSTART_DELAY_MS = 1500;
    const POST_MATCH_DELAY_MS = 2000;

    const API_BASE_URL = (window.API_BASE_URL) || 'https://api-mechmania.duckdns.org';

    // State
    const state = {
        running: false,
        pollingTimer: null,
        pollMs: POLL_DEFAULT_MS,
        queue: [], // { id, meta }
        playingId: null,
        tourneyFilter: null,
        manualSkip: false,
        postDelayTimer: null,
    };

    // Elements
    const els = {
        statusDot: document.getElementById('liveStatusDot'),
        statusText: document.getElementById('liveStatusText'),
        pollLabel: document.getElementById('pollIntervalLabel'),
        queueCount: document.getElementById('queueCount'),
        toggleBtn: document.getElementById('liveToggleBtn'),
        skipBtn: document.getElementById('skipBtn'),
        refreshBtn: document.getElementById('refreshBtn'),
        tourneyInput: document.getElementById('tourneyInput'),
        playPauseBtn: document.getElementById('playPauseBtn'),
        frameSlider: document.getElementById('frameSlider'),
    };

    function setStatus(running){
        els.statusDot.classList.toggle('green', running);
        els.statusDot.classList.toggle('red', !running);
        els.statusText.textContent = running ? 'Live' : 'Stopped';
        els.toggleBtn.textContent = running ? 'Stop Live' : 'Start Live';
        els.pollLabel.textContent = `${Math.round(state.pollMs/1000)}s`;
    }

    function updateQueueUI(){
        els.queueCount.textContent = String(state.queue.length);
    }

    function getQueuedIds(){
        const queuedIds = new Set(state.queue.map(item => item.id));
        if (state.playingId !== null) {
            queuedIds.add(state.playingId);
        }
        return queuedIds;
    }

    async function pollMatches(){
        try {
            const params = new URLSearchParams();
            params.set('status', 'success');
            params.set('order_by', 'ended_at');
            params.set('order', 'desc'); // Get most recent first
            params.set('limit', String(RECENT_MATCHES_LIMIT));
            if (state.tourneyFilter) params.set('tourney', state.tourneyFilter);

            const resp = await fetch(`${API_BASE_URL}/match/list?${params.toString()}`, {
                method: 'GET',
            });
            if (!resp.ok) throw new Error(`poll failed: ${resp.status}`);
            const data = await resp.json();
            const list = Array.isArray(data.matches) ? data.matches : [];

            // Get currently queued/playing IDs
            const currentIds = getQueuedIds();

            // Add new matches (reverse to play oldest first)
            const newMatches = list
                .filter(m => m && typeof m.id === 'number' && !currentIds.has(m.id))
                .reverse(); // Oldest first for playback order

            for (const m of newMatches) {
                state.queue.push({ id: m.id, meta: m });
                if (state.queue.length > MAX_QUEUE) {
                    state.queue.shift(); // Drop oldest queued
                }
            }

            updateQueueUI();
            maybeStartNext();
        } catch (err) {
            console.error('Live poll error:', err);
        }
    }

    function startPolling(){
        stopPolling();
        state.pollingTimer = setInterval(pollMatches, state.pollMs);
        // also trigger immediate poll
        pollMatches();
    }

    function stopPolling(){
        if (state.pollingTimer){
            clearInterval(state.pollingTimer);
            state.pollingTimer = null;
        }
    }

    function start(){
        if (state.running) return;
        state.running = true;
        setStatus(true);
        state.tourneyFilter = (els.tourneyInput.value || '').trim() || null;
        startPolling();
        maybeStartNext();
    }

    function stop(){
        if (!state.running) return;
        state.running = false;
        setStatus(false);
        stopPolling();
        if (state.postDelayTimer){
            clearTimeout(state.postDelayTimer);
            state.postDelayTimer = null;
        }
    }

    function skip(){
        state.manualSkip = true;
        if (state.postDelayTimer){
            clearTimeout(state.postDelayTimer);
            state.postDelayTimer = null;
        }
        if (window.animController){
            window.animController.stop();
        }
        state.playingId = null;
        maybeStartNext();
        state.manualSkip = false;
    }

    function onPlaybackEnded(){
        state.playingId = null;
        if (state.running) {
            if (state.postDelayTimer){
                clearTimeout(state.postDelayTimer);
                state.postDelayTimer = null;
            }
            state.postDelayTimer = setTimeout(() => {
                state.postDelayTimer = null;
                if (!state.running) return;
                if (state.playingId != null) return;
                maybeStartNext();
            }, POST_MATCH_DELAY_MS);
        }
    }

    async function playMatch(id){
        try {
            state.playingId = id;
            await window.loadMatchData(id);
            setTimeout(() => {
                if (window.gameState){
                    window.gameState.isPlaying = true;
                }
                if (window.animController){
                    window.animController.start();
                }
            }, PLAY_AUTOSTART_DELAY_MS);
        } catch (e) {
            console.error('Failed to load match', id, e);
            state.playingId = null;
        }
    }

    function maybeStartNext(){
        if (state.postDelayTimer){
            clearTimeout(state.postDelayTimer);
            state.postDelayTimer = null;
        }
        if (state.playingId != null) return;
        const next = state.queue.shift();
        if (!next) return;
        updateQueueUI();
        playMatch(next.id);
    }

    // Hook into animation controller to detect natural end
    if (window.animController){
        const origStop = window.animController.stop.bind(window.animController);
        window.animController.stop = function(){
            const wasPlaying = window.gameState?.isPlaying;
            origStop();
            const atEnd = window.gameState && window.gameState.currentFrame >= window.gameState.maxFrame;
            if (wasPlaying && atEnd && !state.manualSkip){
                onPlaybackEnded();
            }
        }
    }

    // Wire UI
    els.toggleBtn.addEventListener('click', () => {
        if (state.running) stop(); else start();
    });
    els.skipBtn.addEventListener('click', skip);
    els.refreshBtn.addEventListener('click', pollMatches);

    // Changing tourney restarts
    els.tourneyInput.addEventListener('change', () => {
        state.queue = [];
        updateQueueUI();
        if (state.running){
            start();
        }
    });

    // Initialize
    setStatus(false);
    updateQueueUI();

    // Auto-start live on page load
    start();
})();
