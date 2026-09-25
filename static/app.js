/**
 * Sazon AI Agent — Next-Gen Frontend Controller
 * Handles real-time SSE streaming events, subtask timeline animation, 
 * live terminal logging, preset chip triggers, and model selection.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const promptInput = document.getElementById('promptInput');
    const btnExecute = document.getElementById('btnExecute');
    const modelSelect = document.getElementById('modelSelect');
    const subtaskContainer = document.getElementById('subtaskContainer');
    const consoleOutput = document.getElementById('consoleOutput');
    const autoScrollCheck = document.getElementById('autoScrollCheck');
    const btnClearConsole = document.getElementById('btnClearConsole');
    const btnRefreshHealth = document.getElementById('btnRefreshHealth');
    
    // Status Indicators & Stats
    const mascotOrb = document.getElementById('mascotOrb');
    const statusPulse = document.getElementById('statusPulse');
    const agentStatusText = document.getElementById('agentStatusText');
    const progressPercent = document.getElementById('progressPercent');
    const progressBarFill = document.getElementById('progressBarFill');
    const statTime = document.getElementById('statTime');
    const statSteps = document.getElementById('statSteps');
    const statProvider = document.getElementById('statProvider');

    let isExecuting = false;
    let eventSource = null;
    let executionStartTime = 0;
    let timerInterval = null;

    // Helper: Add log entry to terminal
    function logToConsole(type, message, details = null) {
        const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
        const entry = document.createElement('div');
        entry.className = 'log-entry';

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
            codeBlock.style.fontSize = '0.75rem';
            codeBlock.style.color = '#94a3b8';
            codeBlock.style.marginTop = '4px';
            codeBlock.style.whiteSpace = 'pre-wrap';
            codeBlock.textContent = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
            entry.appendChild(codeBlock);
        }

        consoleOutput.appendChild(entry);

        if (autoScrollCheck.checked) {
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Set Agent Visual State
    function setAgentState(state, text = "") {
        statusPulse.className = 'status-pulse-dot';
        if (state === 'executing') {
            statusPulse.classList.add('executing');
            agentStatusText.textContent = text || "Executing Tasks...";
        } else if (state === 'error') {
            statusPulse.classList.add('error');
            agentStatusText.textContent = text || "Execution Failed";
        } else {
            agentStatusText.textContent = text || "Ready & Active";
        }
    }

    // Render Subtasks Timeline
    function renderSubtasks(tasks) {
        if (!tasks || tasks.length === 0) {
            subtaskContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">✨</div>
                    <p>No active execution plan yet.</p>
                    <span>Enter a goal above or click a quick action chip to start Sazon.</span>
                </div>
            `;
            updateProgress(0, 0);
            return;
        }

        let completedCount = 0;
        subtaskContainer.innerHTML = '';

        tasks.forEach((t, idx) => {
            const card = document.createElement('div');
            card.className = `subtask-card ${t.status}`;

            let icon = '⏸️';
            if (t.status === 'in_progress') icon = '⏳';
            if (t.status === 'completed') { icon = '✅'; completedCount++; }
            if (t.status === 'failed') icon = '❌';

            card.innerHTML = `
                <div class="status-icon">${icon}</div>
                <div class="subtask-content">
                    <div class="subtask-title">${idx + 1}. ${escapeHtml(t.title)}</div>
                    ${t.description ? `<div class="subtask-desc">${escapeHtml(t.description)}</div>` : ''}
                    <div class="subtask-meta">
                        ${t.tool_name ? `<span class="badge-tool">Tool: ${t.tool_name}</span>` : ''}
                        <span class="subtask-status-label" style="font-size:0.7rem; color:#94a3b8; text-transform:uppercase;">${t.status}</span>
                    </div>
                </div>
            `;

            subtaskContainer.appendChild(card);
        });

        updateProgress(completedCount, tasks.length);
    }

    function updateProgress(completed, total) {
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        progressPercent.textContent = `${pct}%`;
        progressBarFill.style.width = `${pct}%`;
    }

    // Connect SSE Stream
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
                    setAgentState('executing', `Goal Started (${data.model || 'sazon'})`);
                    logToConsole('SYSTEM', `Goal Execution Started: "${data.goal}"`);
                } else if (evType === 'plan') {
                    logToConsole('PLAN', `Generated ${data.subtasks ? data.subtasks.length : 0} subtasks.`);
                    renderSubtasks(data.subtasks);
                } else if (evType === 'step') {
                    const step = data.step;
                    logToConsole('STEP', `Step ${step.step_number}: ${step.task_title}`, step.observation);
                    renderSubtasks(data.subtasks);
                    statSteps.textContent = step.step_number;
                } else if (evType === 'complete') {
                    setAgentState('ready', 'Goal Completed');
                    logToConsole('SUCCESS', `Goal Finished Successfully! Answer: ${data.final_answer}`);
                    renderSubtasks(data.tasks);
                    stopTimer();
                    setExecuting(false);
                } else if (evType === 'error') {
                    setAgentState('error', 'Error Encountered');
                    logToConsole('ERROR', `Execution Error: ${data.error}`);
                    stopTimer();
                    setExecuting(false);
                }
            } catch (err) {
                console.error("Failed to parse SSE event:", err);
            }
        };

        eventSource.onerror = (err) => {
            console.warn("SSE Connection lost, retrying...", err);
        };
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

    // Trigger Goal Execution
    async function handleExecute() {
        const goalText = promptInput.value.trim();
        if (!goalText) return;

        setExecuting(true);
        setAgentState('executing', 'Planning Goal...');
        statSteps.textContent = '0';

        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        const provider = selectedOption.getAttribute('data-provider') || selectedOption.value.split('/')[0];
        const model = selectedOption.getAttribute('data-model') || selectedOption.value.split('/')[1];

        statProvider.textContent = provider;

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
        }
    }

    // Quick Action Preset Chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const goal = chip.getAttribute('data-goal');
            if (goal) {
                promptInput.value = goal;
                promptInput.focus();
            }
        });
    });

    // Event Listeners
    btnExecute.addEventListener('click', handleExecute);

    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleExecute();
        }
    });

    btnClearConsole.addEventListener('click', () => {
        consoleOutput.innerHTML = '';
        logToConsole('SYSTEM', 'Console output cleared.');
    });

    btnRefreshHealth.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/health');
            const data = await res.json();
            logToConsole('SYSTEM', `Health Check: Status ${data.status.toUpperCase()}`, data);
        } catch (err) {
            logToConsole('ERROR', 'Health check failed: ' + err.message);
        }
    });

    // Populate model dataset properties
    Array.from(modelSelect.options).forEach(opt => {
        const parts = opt.value.split('/');
        if (parts.length >= 2) {
            opt.setAttribute('data-provider', parts[0]);
            opt.setAttribute('data-model', parts.slice(1).join('/'));
        }
    });

    // Initialize Event Stream
    initEventStream();
});
