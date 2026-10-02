/**
 * Sazon AI Agent — Next-Gen Frontend Controller
 * Powered by Framer Motion Spring Physics, Web Audio Micro-Chimes, 
 * Real-Time SSE Streaming, and Zero-API-Key Local Integration (Ollama / Local Engine).
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const promptInput = document.getElementById('promptInput');
    const btnExecute = document.getElementById('btnExecute');
    const modelSelect = document.getElementById('modelSelect');
    const optgroupLocal = document.getElementById('optgroupLocal');
    const optgroupFree = document.getElementById('optgroupFree');
    const optgroupCloud = document.getElementById('optgroupCloud');
    const engineBadge = document.getElementById('engineBadge');
    
    // Timeline & Subtasks
    const subtaskContainer = document.getElementById('subtaskContainer');
    const progressPercent = document.getElementById('progressPercent');
    const progressBarFill = document.getElementById('progressBarFill');
    const taskCountBadge = document.getElementById('taskCountBadge');
    
    // Console Output & Controls
    const consoleOutput = document.getElementById('consoleOutput');
    const autoScrollCheck = document.getElementById('autoScrollCheck');
    const logSearchInput = document.getElementById('logSearchInput');
    const btnClearConsole = document.getElementById('btnClearConsole');
    const btnCopyConsole = document.getElementById('btnCopyConsole');
    const btnRefreshHealth = document.getElementById('btnRefreshHealth');
    
    // Mascot & Status
    const mascotOrb = document.getElementById('mascotOrb');
    const statusPulse = document.getElementById('statusPulse');
    const agentStatusText = document.getElementById('agentStatusText');
    const orbCore = document.getElementById('orbCore');
    
    // Telemetry Stats
    const statTime = document.getElementById('statTime');
    const statSteps = document.getElementById('statSteps');
    const statProvider = document.getElementById('statProvider');
    const statZeroKey = document.getElementById('statZeroKey');

    // Utility & Modal Controls
    const btnZeroKeyGuide = document.getElementById('btnZeroKeyGuide');
    const zeroKeyModal = document.getElementById('zeroKeyModal');
    const btnCloseZeroKeyModal = document.getElementById('btnCloseZeroKeyModal');
    const btnSelectLocalModel = document.getElementById('btnSelectLocalModel');
    const guideOllamaStatus = document.getElementById('guideOllamaStatus');

    // Sound Controls
    const btnToggleSound = document.getElementById('btnToggleSound');
    const soundIconOn = document.getElementById('soundIconOn');
    const soundIconOff = document.getElementById('soundIconOff');

    // Floating Mascot Mode
    const btnMiniMascot = document.getElementById('btnMiniMascot');
    const floatingMascotWidget = document.getElementById('floatingMascotWidget');
    const floatingMascotAvatar = document.getElementById('floatingMascotAvatar');
    const btnHideBubble = document.getElementById('btnHideBubble');
    const mascotSpeechBubble = document.getElementById('mascotSpeechBubble');

    // Runtime State
    let isExecuting = false;
    let eventSource = null;
    let executionStartTime = 0;
    let timerInterval = null;
    let soundEnabled = localStorage.getItem('sazon_sound_enabled') !== 'false';
    let currentTasks = [];
    let activeFilter = 'all';
    let orbIdleAnimation = null;

    // Framer Motion Reference (from /static/vendor/motion.js)
    const Motion = window.Motion;

    // =========================================================================
    // 1. Framer Motion Helper Functions
    // =========================================================================

    function animateSpring(target, keyframes, options = {}) {
        if (!target) return null;
        if (Motion && typeof Motion.animate === 'function') {
            try {
                return Motion.animate(target, keyframes, {
                    type: 'spring',
                    stiffness: options.stiffness || 380,
                    damping: options.damping || 24,
                    mass: options.mass || 0.8,
                    ...options
                });
            } catch (e) {
                console.warn('Motion animate error:', e);
            }
        }
        return null;
    }

    function initPageEntrances() {
        if (!Motion) return;

        // Navbar entrance
        animateSpring('.navbar-glass', { y: [-24, 0], opacity: [0, 1] }, { duration: 0.6, stiffness: 300 });

        // Left Panel (Prompt & Timeline)
        animateSpring('#promptCard', { x: [-30, 0], opacity: [0, 1] }, { duration: 0.7, stiffness: 280, delay: 0.1 });
        animateSpring('#timelineCard', { x: [-30, 0], opacity: [0, 1] }, { duration: 0.7, stiffness: 280, delay: 0.2 });

        // Right Panel (Terminal)
        animateSpring('#terminalCard', { x: [30, 0], opacity: [0, 1] }, { duration: 0.7, stiffness: 280, delay: 0.15 });

        // Quick action chips staggered entrance
        const chips = document.querySelectorAll('.chip');
        chips.forEach((chip, i) => {
            animateSpring(chip, { scale: [0.8, 1], opacity: [0, 1] }, { delay: 0.2 + (i * 0.05), stiffness: 450 });
        });

        // Start idle breathing animation on Mascot Orb
        startOrbBreathing();
    }

    function startOrbBreathing() {
        if (!Motion || !mascotOrb) return;
        if (orbIdleAnimation) try { orbIdleAnimation.stop(); } catch(e) {}

        orbIdleAnimation = Motion.animate(mascotOrb, {
            y: [0, -6, 0]
        }, {
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut'
        });
    }

    function triggerOrbReaction(state) {
        if (!Motion || !mascotOrb) return;

        if (state === 'click') {
            animateSpring(mascotOrb, { scale: [1, 1.25, 0.95, 1.05, 1] }, { stiffness: 500, damping: 15 });
            playTone(900, 0.1, 'sine');
        } else if (state === 'start') {
            animateSpring(mascotOrb, { scale: [1, 1.2, 1], rotate: [0, 180, 360] }, { duration: 0.8 });
        } else if (state === 'success') {
            animateSpring(mascotOrb, { scale: [1, 1.3, 1], rotate: [0, -15, 15, 0] }, { stiffness: 400, damping: 18 });
            if (orbCore) orbCore.style.fill = '#10b981';
            setTimeout(() => { if (orbCore) orbCore.style.fill = '#22d3ee'; }, 2500);
        } else if (state === 'error') {
            animateSpring(mascotOrb, { x: [-6, 6, -4, 4, 0] }, { duration: 0.5 });
            if (orbCore) orbCore.style.fill = '#f43f5e';
            setTimeout(() => { if (orbCore) orbCore.style.fill = '#22d3ee'; }, 2500);
        }
    }

    // =========================================================================
    // 2. Synthesizer Micro-Audio Feedback (Web Audio API)
    // =========================================================================

    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx = new AudioContext();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playTone(freq, duration = 0.08, type = 'sine', volume = 0.05) {
        if (!soundEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);

            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            // Audio policy or unsupported
        }
    }

    function playSoundEffect(name) {
        if (!soundEnabled) return;
        if (name === 'click') {
            playTone(840, 0.06, 'sine', 0.04);
        } else if (name === 'start') {
            playTone(520, 0.08, 'triangle', 0.05);
            setTimeout(() => playTone(780, 0.12, 'triangle', 0.06), 70);
        } else if (name === 'step') {
            playTone(660, 0.08, 'sine', 0.04);
        } else if (name === 'success') {
            playTone(523.25, 0.1, 'triangle', 0.05); // C5
            setTimeout(() => playTone(659.25, 0.12, 'triangle', 0.06), 90); // E5
            setTimeout(() => playTone(783.99, 0.2, 'triangle', 0.07), 180); // G5
        } else if (name === 'error') {
            playTone(280, 0.14, 'sawtooth', 0.06);
            setTimeout(() => playTone(220, 0.18, 'sawtooth', 0.06), 110);
        }
    }

    function updateSoundIcon() {
        if (soundEnabled) {
            soundIconOn.classList.remove('hidden');
            soundIconOff.classList.add('hidden');
        } else {
            soundIconOn.classList.add('hidden');
            soundIconOff.classList.remove('hidden');
        }
        localStorage.setItem('sazon_sound_enabled', String(soundEnabled));
    }
    updateSoundIcon();

    btnToggleSound.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        updateSoundIcon();
        if (soundEnabled) {
            playSoundEffect('click');
            showToast('🔊 Sound feedback enabled', 'info');
        } else {
            showToast('🔇 Sound feedback muted', 'info');
        }
    });

    // =========================================================================
    // 3. Toast Notifications System
    // =========================================================================

    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';

        toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);

        // Framer Motion Entrance
        animateSpring(toast, { y: [-20, 0], opacity: [0, 1], scale: [0.9, 1] }, { stiffness: 450 });

        setTimeout(() => {
            if (Motion) {
                Motion.animate(toast, { opacity: [1, 0], y: [0, -10] }, { duration: 0.25 }).then(() => {
                    toast.remove();
                });
            } else {
                toast.remove();
            }
        }, 3200);
    }

    // =========================================================================
    // 4. Dynamic Model Loading & Ollama Detection
    // =========================================================================

    async function loadAvailableModels() {
        try {
            const res = await fetch('/api/models');
            if (!res.ok) return;
            const data = await res.json();
            const models = data.models || [];

            // Clear optgroups
            optgroupLocal.innerHTML = '';
            optgroupFree.innerHTML = '';
            optgroupCloud.innerHTML = '';

            let hasOllama = false;

            models.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.name;
                opt.setAttribute('data-provider', m.provider);
                opt.setAttribute('data-model', m.model);
                opt.setAttribute('data-category', m.category || 'cloud');

                if (m.provider === 'ollama') {
                    hasOllama = true;
                }

                if (m.category === 'local') {
                    optgroupLocal.appendChild(opt);
                } else if (m.category === 'free') {
                    optgroupFree.appendChild(opt);
                } else {
                    optgroupCloud.appendChild(opt);
                }
            });

            // Update Ollama guide indicator
            if (guideOllamaStatus) {
                if (hasOllama) {
                    guideOllamaStatus.innerHTML = `
                        <span class="status-indicator-dot online"></span>
                        <span>Ollama is detected & active on localhost:11434!</span>
                    `;
                } else {
                    guideOllamaStatus.innerHTML = `
                        <span class="status-indicator-dot" style="background:#f59e0b; box-shadow:none;"></span>
                        <span>Ollama offline. Run <code>ollama serve</code> to activate.</span>
                    `;
                }
            }

            updateSelectedModelBadge();
        } catch (e) {
            console.warn('Failed to load dynamic models:', e);
        }
    }

    function updateSelectedModelBadge() {
        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        if (!selectedOption) return;

        const provider = selectedOption.getAttribute('data-provider') || selectedOption.value.split('/')[0];
        const category = selectedOption.getAttribute('data-category') || 'cloud';

        statProvider.textContent = `${provider} (${selectedOption.getAttribute('data-model') || ''})`;

        if (category === 'local' || provider === 'sample' || provider === 'ollama') {
            engineBadge.textContent = provider === 'ollama' ? '🦙 Ollama Local' : '🤖 Offline Engine';
            engineBadge.style.color = '#34d399';
            engineBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            engineBadge.style.background = 'rgba(16, 185, 129, 0.12)';
            statZeroKey.textContent = 'Active (Zero Keys)';
            statZeroKey.className = 'stat-value text-emerald';
        } else if (category === 'free') {
            engineBadge.textContent = '🆓 Free Cloud';
            engineBadge.style.color = '#38bdf8';
            engineBadge.style.borderColor = 'rgba(56, 189, 248, 0.3)';
            engineBadge.style.background = 'rgba(56, 189, 248, 0.12)';
            statZeroKey.textContent = 'Free Tier';
            statZeroKey.className = 'stat-value text-emerald';
        } else {
            engineBadge.textContent = '☁️ Cloud API';
            engineBadge.style.color = '#a78bfa';
            engineBadge.style.borderColor = 'rgba(167, 139, 250, 0.3)';
            engineBadge.style.background = 'rgba(167, 139, 248, 0.12)';
            statZeroKey.textContent = 'API Key Required';
            statZeroKey.className = 'stat-value';
        }
    }

    modelSelect.addEventListener('change', () => {
        updateSelectedModelBadge();
        showToast(`Switched engine to ${modelSelect.options[modelSelect.selectedIndex].text}`, 'info');
    });

    // =========================================================================
    // 5. Execution Logging & Console
    // =========================================================================

    function logToConsole(type, message, details = null) {
        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.setAttribute('data-type', type);
        entry.setAttribute('data-text', (message + ' ' + (details ? JSON.stringify(details) : '')).toLowerCase());

        let badgeClass = 'badge-system';
        if (type === 'PLAN') badgeClass = 'badge-plan';
        if (type === 'STEP') badgeClass = 'badge-step';
        if (type === 'TOOL') badgeClass = 'badge-tool';
        if (type === 'SUCCESS') badgeClass = 'badge-success';
        if (type === 'ERROR') badgeClass = 'badge-error';

        entry.innerHTML = `
            <span class="log-time">[${timeStr}]</span>
            <span class="log-badge ${badgeClass}">${type}</span>
            <span class="log-msg">${escapeHtml(message)}</span>
        `;

        if (details) {
            const codeBlock = document.createElement('pre');
            codeBlock.className = 'log-details-block';
            codeBlock.textContent = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
            entry.appendChild(codeBlock);
        }

        consoleOutput.appendChild(entry);

        // Framer Motion entry micro-animation for log entry
        if (Motion) {
            Motion.animate(entry, { opacity: [0, 1], y: [6, 0] }, { duration: 0.18 });
        }

        if (autoScrollCheck.checked) {
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }

        // Apply search filter if active
        if (logSearchInput.value.trim()) {
            filterLogs();
        }
    }

    function filterLogs() {
        const query = logSearchInput.value.trim().toLowerCase();
        const entries = consoleOutput.querySelectorAll('.log-entry');
        entries.forEach(entry => {
            const text = entry.getAttribute('data-text') || '';
            if (!query || text.includes(query)) {
                entry.style.display = 'flex';
            } else {
                entry.style.display = 'none';
            }
        });
    }

    logSearchInput.addEventListener('input', filterLogs);

    btnCopyConsole.addEventListener('click', async () => {
        try {
            const logsText = Array.from(consoleOutput.querySelectorAll('.log-entry'))
                .map(e => e.innerText)
                .join('\n');
            await navigator.clipboard.writeText(logsText);
            showToast('📋 Console logs copied to clipboard!', 'success');
            playSoundEffect('click');
        } catch (e) {
            showToast('Failed to copy logs', 'error');
        }
    });

    btnClearConsole.addEventListener('click', () => {
        consoleOutput.innerHTML = '';
        logToConsole('SYSTEM', 'Console output cleared.');
        playSoundEffect('click');
    });

    // =========================================================================
    // 6. Subtask Timeline Rendering with Spring Animations
    // =========================================================================

    function renderSubtasks(tasks) {
        currentTasks = tasks || [];
        taskCountBadge.textContent = `${currentTasks.length} tasks`;

        if (!tasks || tasks.length === 0) {
            subtaskContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon-orbit">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                    </div>
                    <h4>No active plan in progress</h4>
                    <p>Type a goal above or click a quick action chip. Sazon will decompose it into atomic subtasks using spring-physics workflow.</p>
                </div>
            `;
            updateProgress(0, 0);
            return;
        }

        let completedCount = 0;
        subtaskContainer.innerHTML = '';

        tasks.forEach((t, idx) => {
            const status = t.status || 'pending';
            if (status === 'completed') completedCount++;

            // Filter check
            if (activeFilter === 'in_progress' && status !== 'in_progress') return;
            if (activeFilter === 'completed' && status !== 'completed') return;

            const card = document.createElement('div');
            card.className = `subtask-card ${status}`;
            card.setAttribute('data-id', t.id);

            let statusIcon = '⏸️';
            if (status === 'in_progress') statusIcon = '⏳';
            if (status === 'completed') statusIcon = '✅';
            if (status === 'failed') statusIcon = '❌';

            const hasDetails = Boolean(t.tool_name || t.result || t.tool_input);

            card.innerHTML = `
                <div class="subtask-main-row" title="Click to view step details">
                    <div class="task-status-icon">${statusIcon}</div>
                    <div class="subtask-info">
                        <div class="subtask-title-row">
                            <span class="subtask-title">${idx + 1}. ${escapeHtml(t.title)}</span>
                            <span class="badge-status">${status}</span>
                        </div>
                        ${t.description ? `<p class="subtask-desc">${escapeHtml(t.description)}</p>` : ''}
                        <div class="subtask-meta-row">
                            ${t.tool_name ? `<span class="badge-tool">Tool: ${t.tool_name}</span>` : ''}
                            <span class="badge-priority">P${t.priority || 1}</span>
                        </div>
                    </div>
                </div>
                ${hasDetails ? `
                    <div class="subtask-details-panel hidden">
                        ${t.tool_input ? `
                            <div>
                                <span class="details-block-label">Tool Input Parameters:</span>
                                <pre class="details-code-output">${escapeHtml(JSON.stringify(t.tool_input, null, 2))}</pre>
                            </div>
                        ` : ''}
                        ${t.result ? `
                            <div>
                                <span class="details-block-label">Execution Observation / Result:</span>
                                <pre class="details-code-output">${escapeHtml(typeof t.result === 'string' ? t.result : JSON.stringify(t.result, null, 2))}</pre>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            `;

            // Toggle details drawer on click
            const mainRow = card.querySelector('.subtask-main-row');
            const detailsPanel = card.querySelector('.subtask-details-panel');
            if (mainRow && detailsPanel) {
                mainRow.addEventListener('click', () => {
                    const isHidden = detailsPanel.classList.contains('hidden');
                    if (isHidden) {
                        detailsPanel.classList.remove('hidden');
                        animateSpring(detailsPanel, { opacity: [0, 1], y: [-8, 0] }, { duration: 0.2 });
                    } else {
                        detailsPanel.classList.add('hidden');
                    }
                });
            }

            subtaskContainer.appendChild(card);

            // Framer Motion spring entrance for cards
            animateSpring(card, { opacity: [0, 1], y: [16, 0], scale: [0.97, 1] }, { stiffness: 400, damping: 26 });
        });

        updateProgress(completedCount, tasks.length);
    }

    function updateProgress(completed, total) {
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        progressPercent.textContent = `${pct}%`;
        
        // Spring animated progress bar width
        if (Motion) {
            Motion.animate(progressBarFill, { width: `${pct}%` }, { type: 'spring', stiffness: 220, damping: 28 });
        } else {
            progressBarFill.style.width = `${pct}%`;
        }
    }

    // Tab Filters
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.getAttribute('data-filter') || 'all';
            renderSubtasks(currentTasks);
            playSoundEffect('click');
        });
    });

    // =========================================================================
    // 7. Real-Time SSE Streaming
    // =========================================================================

    function initEventStream() {
        if (eventSource) {
            eventSource.close();
        }

        eventSource = new EventSource('/api/stream');

        eventSource.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                const evType = payload.event;
                const data = payload.data;

                if (evType === 'start') {
                    setAgentState('executing', `Planning Goal (${data.model || 'sazon'})`);
                    logToConsole('SYSTEM', `Goal Execution Started: "${data.goal}"`);
                    triggerOrbReaction('start');
                    playSoundEffect('start');
                } else if (evType === 'plan') {
                    logToConsole('PLAN', `Generated ${data.subtasks ? data.subtasks.length : 0} autonomous subtasks.`);
                    renderSubtasks(data.subtasks);
                } else if (evType === 'step') {
                    const step = data.step;
                    logToConsole('STEP', `Step ${step.step_number}: ${step.task_title}`, step.observation);
                    renderSubtasks(data.subtasks);
                    statSteps.textContent = step.step_number;
                    playSoundEffect('step');
                } else if (evType === 'complete') {
                    setAgentState('ready', 'Goal Completed');
                    logToConsole('SUCCESS', `Goal Finished Successfully! Answer: ${data.final_answer}`);
                    renderSubtasks(data.tasks);
                    stopTimer();
                    setExecuting(false);
                    triggerOrbReaction('success');
                    playSoundEffect('success');
                    showToast('🎉 Goal executed successfully!', 'success');
                } else if (evType === 'error') {
                    setAgentState('error', 'Execution Error');
                    logToConsole('ERROR', `Execution Error: ${data.error}`);
                    stopTimer();
                    setExecuting(false);
                    triggerOrbReaction('error');
                    playSoundEffect('error');
                    showToast(`Error: ${data.error}`, 'error');
                }
            } catch (err) {
                console.error('Failed to parse SSE event:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.warn('SSE Connection reconnecting...', err);
        };
    }

    function setAgentState(state, text = '') {
        statusPulse.className = 'status-pulse-dot';
        if (state === 'executing') {
            statusPulse.classList.add('executing');
            agentStatusText.textContent = text || 'Executing Tasks...';
        } else if (state === 'error') {
            statusPulse.classList.add('error');
            agentStatusText.textContent = text || 'Execution Failed';
        } else {
            agentStatusText.textContent = text || 'Ready & Active';
        }
    }

    function startTimer() {
        executionStartTime = Date.now();
        statTime.textContent = '0.0s';
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const sec = ((Date.now() - executionStartTime) / 1000).toFixed(1);
            statTime.textContent = `${sec}s`;
        }, 100);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function setExecuting(executing) {
        isExecuting = executing;
        btnExecute.disabled = executing;
        promptInput.disabled = executing;
        if (executing) {
            btnExecute.querySelector('.btn-text').textContent = 'Executing...';
            startTimer();
        } else {
            btnExecute.querySelector('.btn-text').textContent = 'Execute Goal';
        }
    }

    async function handleExecute() {
        const goalText = promptInput.value.trim();
        if (!goalText) {
            showToast('Please type a goal to execute.', 'error');
            return;
        }

        setExecuting(true);
        setAgentState('executing', 'Initializing...');
        statSteps.textContent = '0';

        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        const provider = selectedOption.getAttribute('data-provider') || selectedOption.value.split('/')[0];
        const model = selectedOption.getAttribute('data-model') || selectedOption.value.split('/')[1];

        statProvider.textContent = `${provider} (${model})`;

        try {
            const res = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal: goalText,
                    llm_provider: provider,
                    model: model
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Execution request failed');
            }
        } catch (err) {
            logToConsole('ERROR', err.message);
            setAgentState('error', 'Failed to Start');
            setExecuting(false);
            triggerOrbReaction('error');
            playSoundEffect('error');
            showToast(err.message, 'error');
        }
    }

    btnExecute.addEventListener('click', handleExecute);

    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleExecute();
        }
    });

    // Quick Action Chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const goal = chip.getAttribute('data-goal');
            if (goal) {
                promptInput.value = goal;
                promptInput.focus();
                animateSpring(chip, { scale: [1, 0.94, 1] }, { stiffness: 500, damping: 15 });
                playSoundEffect('click');
            }
        });
    });

    // Mascot Orb Click Micro-Interaction
    mascotOrb.addEventListener('click', () => {
        triggerOrbReaction('click');
    });

    // Diagnostics / Health Check
    btnRefreshHealth.addEventListener('click', async () => {
        playSoundEffect('click');
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            logToConsole('SYSTEM', `Health Diagnostic: Agent ${data.status.toUpperCase()}`, data);
            showToast(`Diagnostics: ${data.tools_registered.length} tools loaded`, 'success');
            await loadAvailableModels();
        } catch (err) {
            logToConsole('ERROR', 'Health check failed: ' + err.message);
            showToast('Health check failed', 'error');
        }
    });

    // Zero-Key Guide Modal Controls
    btnZeroKeyGuide.addEventListener('click', () => {
        zeroKeyModal.classList.remove('hidden');
        animateSpring('.modal-card', { scale: [0.9, 1], opacity: [0, 1] }, { stiffness: 400, damping: 25 });
        playSoundEffect('click');
    });

    btnCloseZeroKeyModal.addEventListener('click', () => {
        zeroKeyModal.classList.add('hidden');
    });

    zeroKeyModal.addEventListener('click', (e) => {
        if (e.target === zeroKeyModal) {
            zeroKeyModal.classList.add('hidden');
        }
    });

    btnSelectLocalModel.addEventListener('click', () => {
        // Select first local model in dropdown (Ollama or Sazon Local Engine)
        if (optgroupLocal && optgroupLocal.children.length > 0) {
            modelSelect.value = optgroupLocal.children[0].value;
            updateSelectedModelBadge();
            showToast(`Selected ${optgroupLocal.children[0].text}!`, 'success');
        }
        zeroKeyModal.classList.add('hidden');
        playSoundEffect('click');
    });

    // Floating Mascot Mode Toggle
    btnMiniMascot.addEventListener('click', () => {
        floatingMascotWidget.classList.toggle('hidden');
        if (!floatingMascotWidget.classList.contains('hidden')) {
            animateSpring(floatingMascotWidget, { y: [30, 0], opacity: [0, 1], scale: [0.8, 1] }, { stiffness: 400 });
            playSoundEffect('click');
        }
    });

    btnHideBubble.addEventListener('click', () => {
        mascotSpeechBubble.classList.add('hidden');
    });

    floatingMascotAvatar.addEventListener('click', () => {
        animateSpring(floatingMascotAvatar, { scale: [1, 1.3, 0.9, 1] }, { stiffness: 500 });
        mascotSpeechBubble.classList.remove('hidden');
        promptInput.focus();
        showToast('🤖 Sazon: Click a chip or type a goal!', 'info');
        playSoundEffect('click');
    });

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Startup Initialization
    initPageEntrances();
    initEventStream();
    loadAvailableModels();
});
