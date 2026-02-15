// ─── Dynamic Roulette Wheel ───────────────────────────────────────
// Supports unlimited names — wheel segments drawn on canvas

// 3 alternating segment colors (exact Figma wheel colors: purple, pink, white)
const SEGMENT_COLORS = ['#be78fe', '#ff9494', '#fefefe'];

// DOM elements
const wheelCanvas = document.getElementById('wheelCanvas');
const spinButton = document.getElementById('spinButton');
const wheelCenterBtn = document.getElementById('wheelCenterBtn');
const resultDisplay = document.getElementById('result');
const resultName = document.getElementById('resultName');
const nameInput = document.getElementById('nameInput');
const addNameBtn = document.getElementById('addNameBtn');
const nameListEl = document.getElementById('nameList');
const nameCountEl = document.getElementById('nameCount');
const ctx = wheelCanvas.getContext('2d');

let names = [];
let isSpinning = false;
let currentRotation = 0;
let riggedIdx = -1; // -1 = random, else predetermined winner index

// Win sound effects
const winSounds = [
    new Audio('Win %231.mp3'),
    new Audio('Win %232.mp3')
];
winSounds.forEach(s => s.preload = 'auto');

// ─── Spinning SFX (generated via Web Audio API) ──────────────────
let _spinAudioCtx = null;
let _spinSrc = null;

function _getAudioCtx() {
    if (!_spinAudioCtx) _spinAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return _spinAudioCtx;
}

function playSpinSFX(durationMs) {
    try {
        const ctx = _getAudioCtx();
        const dur = durationMs / 1000;
        const sampleRate = ctx.sampleRate;
        const totalSamples = Math.floor(sampleRate * dur);
        const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
        const dataL = buffer.getChannelData(0);
        const dataR = buffer.getChannelData(1);

        // ── Roulette pegs: woody, warm clicks that decelerate ──
        const totalTicks = 120 + Math.floor(Math.random() * 40);
        let tickPos = 0;
        for (let i = 0; i < totalTicks; i++) {
            const t = i / totalTicks;
            // Smooth deceleration curve (matches CSS cubic-bezier easing)
            const ease = t < 0.3 ? t * 0.8 : 0.24 + Math.pow((t - 0.3) / 0.7, 2.5) * 0.76;
            const spacing = (0.004 + ease * 0.14) * sampleRate;
            tickPos += spacing;
            const pos = Math.min(Math.floor(tickPos), totalSamples - 1);
            if (pos >= totalSamples) break;

            // Woody "tock" — layered frequencies for richness
            const vol = 0.18 * (1 - t * 0.15);
            const clickLen = Math.floor(sampleRate * (0.004 + t * 0.006));
            const baseFreq = 1200 - t * 300; // descending pitch
            const warmFreq = baseFreq * 0.5;  // octave below for body
            const brightFreq = baseFreq * 2.2; // harmonic shimmer

            // Stereo pan rotates with the wheel
            const pan = Math.sin(i * 0.4) * 0.3;
            const lVol = vol * (0.7 + (1 - pan) * 0.3);
            const rVol = vol * (0.7 + (1 + pan) * 0.3);

            for (let j = 0; j < clickLen && (pos + j) < totalSamples; j++) {
                const jt = j / clickLen;
                // Sharp attack, smooth exponential decay
                const env = jt < 0.05 ? jt / 0.05 : Math.exp(-jt * 5);

                const sample =
                    Math.sin(2 * Math.PI * baseFreq * j / sampleRate) * 0.5 +
                    Math.sin(2 * Math.PI * warmFreq * j / sampleRate) * 0.35 +
                    Math.sin(2 * Math.PI * brightFreq * j / sampleRate) * 0.15 * (1 - t);

                dataL[pos + j] += sample * lVol * env;
                dataR[pos + j] += sample * rVol * env;
            }
        }

        // ── Airy whoosh: filtered noise that swells then fades ──
        for (let i = 0; i < totalSamples; i++) {
            const t = i / totalSamples;
            // Bell curve peaking at 35% through the spin
            const whooshEnv = Math.exp(-Math.pow((t - 0.35) / 0.25, 2)) * 0.06;
            const noise = (Math.random() * 2 - 1) * whooshEnv;
            dataL[i] += noise;
            dataR[i] += noise * 0.9;
        }

        // ── Gentle rising tone that builds anticipation ──
        for (let i = 0; i < totalSamples; i++) {
            const t = i / totalSamples;
            // Swell in from 20-70%, then taper off
            let toneEnv = 0;
            if (t > 0.2 && t < 0.7) {
                toneEnv = Math.sin(Math.PI * (t - 0.2) / 0.5) * 0.02;
            }
            // Slowly rising pitch adds tension
            const toneFreq = 180 + t * 60;
            const tone = Math.sin(2 * Math.PI * toneFreq * i / sampleRate) * toneEnv;
            dataL[i] += tone;
            dataR[i] += tone;
        }

        // ── Final slowdown "dramatic" ticks: last 3 ticks ring longer ──
        // (Already handled by the deceleration curve — the last few ticks
        //  are spaced wide apart and have longer clickLen naturally)

        // Stop any previous spin sound
        stopSpinSFX();

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        // Warm filter — cut harsh highs, keep satisfying mids
        const lpf = ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.value = 4000;
        lpf.Q.value = 0.7;

        // Subtle high-shelf boost for sparkle
        const hsh = ctx.createBiquadFilter();
        hsh.type = 'highshelf';
        hsh.frequency.value = 2000;
        hsh.gain.value = 2;

        // Master gain with smooth fade out
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.9, ctx.currentTime);
        gain.gain.setValueAtTime(0.9, ctx.currentTime + dur * 0.8);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);

        // Subtle reverb via convolver (algorithmic)
        let reverbNode = null;
        try {
            const reverbLen = Math.floor(sampleRate * 0.3);
            const reverbBuf = ctx.createBuffer(2, reverbLen, sampleRate);
            for (let ch = 0; ch < 2; ch++) {
                const rd = reverbBuf.getChannelData(ch);
                for (let i = 0; i < reverbLen; i++) {
                    rd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sampleRate * 0.08)) * 0.15;
                }
            }
            reverbNode = ctx.createConvolver();
            reverbNode.buffer = reverbBuf;
        } catch (e) {}

        // Chain: source → lpf → hsh → gain → destination
        //                             ↘ reverb → destination
        source.connect(lpf);
        lpf.connect(hsh);
        hsh.connect(gain);
        gain.connect(ctx.destination);

        if (reverbNode) {
            const reverbGain = ctx.createGain();
            reverbGain.gain.value = 0.25;
            hsh.connect(reverbNode);
            reverbNode.connect(reverbGain);
            reverbGain.connect(ctx.destination);
        }

        source.start();
        _spinSrc = source;
    } catch (e) {
        // Audio not available — fail silently
    }
}

function stopSpinSFX() {
    if (_spinSrc) {
        try { _spinSrc.stop(); } catch (e) {}
        _spinSrc = null;
    }
}

// ─── Name management ──────────────────────────────────────────────

function addName(name) {
    name = name.trim();
    if (!name || isSpinning) return;
    names.push(name);
    renderNameList();
    drawWheel();
}

function removeName(index) {
    names.splice(index, 1);
    if (riggedIdx === index) riggedIdx = -1;
    else if (riggedIdx > index) riggedIdx--;
    renderNameList();
    drawWheel();
}

function renderNameList() {
    nameListEl.innerHTML = '';
    names.forEach((name, i) => {
        const row = document.createElement('div');
        row.className = 'name-row';
        row.dataset.index = i;

        const num = document.createElement('span');
        num.className = 'name-number';
        num.textContent = (i + 1) + '.';

        const text = document.createElement('span');
        text.className = 'name-text';
        text.textContent = name;

        const del = document.createElement('button');
        del.className = 'name-delete';
        del.textContent = '✕';
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isSpinning) removeName(i);
        });

        row.appendChild(num);
        row.appendChild(text);
        row.appendChild(del);
        nameListEl.appendChild(row);
    });

    nameCountEl.textContent = names.length + (names.length === 1 ? ' name' : ' names');

    // Scroll to bottom to show newest entry
    nameListEl.scrollTop = nameListEl.scrollHeight;
}

// Add name button
addNameBtn.addEventListener('click', () => {
    addName(nameInput.value);
    nameInput.value = '';
    nameInput.focus();
});

// Enter key adds name
nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        addName(nameInput.value);
        nameInput.value = '';
    }
});

// ─── Draw wheel on canvas ─────────────────────────────────────────

function drawWheel() {
    const w = wheelCanvas.width;   // 1422 (2x for sharpness)
    const h = wheelCanvas.height;  // 1420
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy) - 2;

    ctx.clearRect(0, 0, w, h);

    const count = names.length;

    if (count === 0) {
        // Draw empty wheel placeholder
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#c060a0';
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = 'bold 60px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Add names to spin!', cx, cy);
        return;
    }

    const anglePerSegment = (2 * Math.PI) / count;

    // Determine font size based on segment count
    let fontSize;
    if (count <= 8) fontSize = 40;
    else if (count <= 16) fontSize = 32;
    else if (count <= 30) fontSize = 24;
    else if (count <= 50) fontSize = 18;
    else if (count <= 80) fontSize = 14;
    else if (count <= 120) fontSize = 11;
    else fontSize = 9;

    // Build color assignment ensuring no two adjacent segments share a color
    const colorAssign = [];
    for (let i = 0; i < count; i++) {
        if (i === 0) {
            colorAssign.push(0);
        } else {
            let ci = i % SEGMENT_COLORS.length;
            // If this would match the previous segment, shift forward
            if (ci === colorAssign[i - 1]) {
                ci = (ci + 1) % SEGMENT_COLORS.length;
            }
            // For the last segment, also check it doesn't match the first
            if (i === count - 1 && count > 2 && ci === colorAssign[0]) {
                ci = (ci + 1) % SEGMENT_COLORS.length;
                if (ci === colorAssign[i - 1]) {
                    ci = (ci + 1) % SEGMENT_COLORS.length;
                }
            }
            colorAssign.push(ci);
        }
    }

    // Draw segments
    for (let i = 0; i < count; i++) {
        const startAngle = i * anglePerSegment - Math.PI / 2;
        const endAngle = startAngle + anglePerSegment;

        // Segment fill
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = SEGMENT_COLORS[colorAssign[i]];
        ctx.fill();

        // Segment border
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Draw names
    for (let i = 0; i < count; i++) {
        const startAngle = i * anglePerSegment - Math.PI / 2;
        const midAngle = startAngle + anglePerSegment / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(midAngle);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;

        // Dark text on white segments, white text on colored segments
        const colorIdx = colorAssign[i];
        if (colorIdx === 2) {
            // White segment — use dark purple text
            ctx.fillStyle = '#6a1b9a';
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        }
        ctx.lineWidth = Math.max(1, fontSize / 8);

        // Text position — further out for more segments so text doesn't overlap center
        const textRadius = count <= 8 ? radius * 0.58 : radius * 0.65;
        
        // Truncate long names for tiny segments
        let displayName = names[i];
        if (count > 50 && displayName.length > 8) {
            displayName = displayName.substring(0, 7) + '…';
        } else if (count > 30 && displayName.length > 12) {
            displayName = displayName.substring(0, 11) + '…';
        }

        ctx.strokeText(displayName, textRadius, 0);
        ctx.fillText(displayName, textRadius, 0);

        ctx.restore();
    }

    // Inner circle (darker center to match Figma look)
    const innerRadius = radius * 0.15;
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, 2 * Math.PI);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerRadius);
    grad.addColorStop(0, 'rgba(80, 20, 60, 0.6)');
    grad.addColorStop(1, 'rgba(80, 20, 60, 0.1)');
    ctx.fillStyle = grad;
    ctx.fill();
}

// ─── Spin logic ───────────────────────────────────────────────────

spinButton.addEventListener('click', () => {
    if (!isSpinning) spinWheel();
});

if (wheelCenterBtn) {
    wheelCenterBtn.addEventListener('click', () => {
        if (!isSpinning) spinWheel();
    });
}

function spinWheel() {
    if (names.length < 2) {
        resultName.textContent = 'Add at least 2 names!';
        resultDisplay.classList.add('show');
        setTimeout(() => resultDisplay.classList.remove('show'), 2000);
        return;
    }

    isSpinning = true;
    spinButton.style.pointerEvents = 'none';
    spinButton.style.opacity = '0.6';
    resultDisplay.classList.remove('show');
    resultName.textContent = '';

    // Clear previous winner highlights
    document.querySelectorAll('.name-row.winner').forEach(el => el.classList.remove('winner'));

    // Reset to current visual position instantly (no transition)
    wheelCanvas.style.transition = 'none';
    wheelCanvas.style.transform = `rotate(${currentRotation}deg)`;
    // Force reflow so the instant reset takes effect before adding the spin transition
    wheelCanvas.offsetHeight;

    // Choose winner — rigged or random
    let winnerIdx;
    if (riggedIdx >= 0 && riggedIdx < names.length) {
        winnerIdx = riggedIdx;
        console.log(`%c🎯 Rigged → "${names[winnerIdx]}" (index ${winnerIdx})`, 'color: #ff4444; font-weight: bold');
        // Reset rig after use so next spin is random
        riggedIdx = -1;
        _rigBuf = '';
        _updateRigTitle();
    } else {
        winnerIdx = Math.floor(Math.random() * names.length);
        console.log(`🎲 Random → "${names[winnerIdx]}" (index ${winnerIdx})`);
    }
    const winnerName = names[winnerIdx]; // capture name now in case array changes

    // Calculate rotation so pointer (top) lands on winner segment
    const segmentAngle = 360 / names.length;
    const minSpins = 5;
    const maxSpins = 8;
    // spins MUST be integer — fractional spins add unwanted extra degrees
    const spins = minSpins + Math.floor(Math.random() * (maxSpins - minSpins + 1));
    // Jitter within ±30% of segment so it stays inside the segment
    const randomOffset = (Math.random() - 0.5) * (segmentAngle * 0.6);
    // The CSS rotation where pointer (top) aligns with center of winnerIdx
    // Segments are drawn starting from top going clockwise, so after rotating
    // R degrees clockwise the segment at position (360-R)%360 is under pointer
    const targetAngle = (360 - (winnerIdx + 0.5) * segmentAngle + 360) % 360;
    const extraRotation = ((targetAngle + randomOffset) - (currentRotation % 360) + 360) % 360;
    const totalRotation = currentRotation + (360 * spins) + extraRotation;

    const duration = 4500 + Math.random() * 1000;

    // Apply the spin transition
    wheelCanvas.style.transition = `transform ${duration}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
    wheelCanvas.style.transform = `rotate(${totalRotation}deg)`;

    // Play spinning tick SFX
    playSpinSFX(duration);

    currentRotation = totalRotation % 360;

    setTimeout(() => {
        wheelCanvas.style.transition = 'none';
        isSpinning = false;
        spinButton.style.pointerEvents = 'auto';
        spinButton.style.opacity = '1';
        stopSpinSFX();

        // Show winner
        resultName.textContent = winnerName;
        resultDisplay.classList.add('show');

        // Play random win SFX
        const sfx = winSounds[Math.floor(Math.random() * winSounds.length)];
        sfx.currentTime = 0;
        sfx.play().catch(() => {});

        // Highlight winner row in list
        const rows = nameListEl.querySelectorAll('.name-row');
        if (rows[winnerIdx]) {
            rows[winnerIdx].classList.add('winner');
            rows[winnerIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, duration);
}

// Close button dismisses popup
document.getElementById('resultClose').addEventListener('click', () => {
    resultDisplay.classList.remove('show');
    document.querySelectorAll('.name-row.winner').forEach(el => el.classList.remove('winner'));
});

// ─── Keyboard support ─────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
    // Don't hijack Space/Enter when typing in the name input
    if (document.activeElement === nameInput) return;
    // Don't trigger spin while in rig mode (user is typing a name)
    if (_rigMode) return;
    if (e.code === 'Space' && !isSpinning) {
        e.preventDefault();
        spinWheel();
    }
});

// ─── Secret rig: press ` to toggle rig mode ─────────────────────
// No UI, no DOM, completely invisible.
// Press ` once → enter rig mode, type winner name (prefix match).
// Press ` again or Enter → lock in the rig and exit rig mode.
// Escape → cancel rig (back to random).
// Title bar shows subtle dot while in rig mode (only you'd notice).

let _rigMode = false;
let _rigBuf = '';
const _origTitle = document.title;

function _updateRigTitle() {
    if (_rigMode) {
        // Subtle dot in title so you know rig mode is active
        document.title = '· ' + _origTitle;
    } else if (riggedIdx >= 0) {
        // Tiny indicator that rig is locked in
        document.title = '• ' + _origTitle;
    } else {
        document.title = _origTitle;
    }
}

document.addEventListener('keydown', (e) => {
    if (document.activeElement === nameInput) return;

    // Toggle rig mode with backtick
    if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        if (!_rigMode) {
            // Enter rig mode
            _rigMode = true;
            _rigBuf = '';
            console.log('%c🔧 Rig mode ON — type name prefix, then ` or Enter to confirm', 'color: #ffaa00');
        } else {
            // Exit rig mode, lock in current match
            _rigMode = false;
            if (riggedIdx >= 0) {
                console.log(`%c🔒 Rig locked → "${names[riggedIdx]}"`, 'color: #00cc44; font-weight: bold');
            } else {
                console.log('%c⚠️ Rig cancelled — no name matched "' + _rigBuf + '"', 'color: #ff6600');
            }
        }
        _updateRigTitle();
        return;
    }

    if (!_rigMode) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
        // Cancel rig
        riggedIdx = -1;
        _rigBuf = '';
        _rigMode = false;
        _updateRigTitle();
        return;
    }

    if (e.key === 'Enter') {
        // Confirm and exit rig mode
        _rigMode = false;
        if (riggedIdx >= 0) {
            console.log(`%c🔒 Rig locked → "${names[riggedIdx]}"`, 'color: #00cc44; font-weight: bold');
        } else {
            console.log('%c⚠️ Rig cancelled — no name matched "' + _rigBuf + '"', 'color: #ff6600');
        }
        _updateRigTitle();
        return;
    }

    if (e.key === 'Backspace') {
        _rigBuf = _rigBuf.slice(0, -1);
    } else if (e.key.length === 1) {
        _rigBuf += e.key;
    }

    // Match buffer against names (case-insensitive prefix)
    if (_rigBuf.length > 0) {
        const lower = _rigBuf.toLowerCase();
        const idx = names.findIndex(n => n.toLowerCase().startsWith(lower));
        riggedIdx = idx; // -1 if no match
        if (idx >= 0) {
            console.log(`%c  → matched "${names[idx]}"`, 'color: #88cc88');
        } else {
            console.log(`%c  → no match for "${_rigBuf}"`, 'color: #cc8888');
        }
    } else {
        riggedIdx = -1;
    }
    _updateRigTitle();
});

// ─── Responsive scaling ───────────────────────────────────────────
// Scale the 1920×1080 Figma frame to cover the entire viewport.
// No black bars — edges crop slightly on non-16:9 screens.

function scaleFrame() {
    const frame = document.querySelector('.frame');
    if (!frame) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.max(vw / 1920, vh / 1080);
    frame.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', scaleFrame);
window.addEventListener('orientationchange', scaleFrame);
scaleFrame();

// ─── Initialize ───────────────────────────────────────────────────

drawWheel();
console.log('🎰 BETS Roulette - Lucky Spin Ready!');
console.log('Add unlimited names and spin!');
