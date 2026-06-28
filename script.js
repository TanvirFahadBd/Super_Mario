
const cv = document.getElementById('c');
const cx = cv.getContext('2d');
const W = 640, H = 360;
const TILE = 32, GRAV = 0.55, JSPD = -10, MSPD = 3.2;
const MW = 26, MH = 32;

const elScore = document.getElementById('sScore');
const elCoins = document.getElementById('sCoins');
const elLives = document.getElementById('sLives');
const elTime = document.getElementById('sTime');
const elWorld = document.getElementById('sWorld');
const overlay = document.getElementById('overlay');

const keys = {};
let tLeft = false, tRight = false, tJump = false, jumpPressed = false;
let running = false, raf = null, state = null;
let totalScore = 0, totalCoins = 0, lives = 3;

// ─── WORLD THEMES ────────────────────────────────────────────────────────────
const WORLDS = [
    {
        name: 'Grassland', label: 'World 1', num: 1,
        sky: '#5c94fc', groundTop: '#3a8a00', groundBody: '#8B4513',
        platformTop: '#3a8a00', platformBody: '#6b4020',
        pipeCol: '#009900', pipeDark: '#006600',
        cloudCol: '#ffffff',
        bgDecos: drawGrassDecos,
        enemyType: 'goomba',
        enemyCol: '#b05010', enemyCol2: '#7a3000',
        brickCol: '#c84c0c', brickDark: '#8b3000',
    },
    {
        name: 'Underground', label: 'World 2', num: 2,
        sky: '#181020', groundTop: '#555', groundBody: '#333',
        platformTop: '#666', platformBody: '#3a3a3a',
        pipeCol: '#607060', pipeDark: '#304030',
        cloudCol: '#555566',
        bgDecos: drawCaveDecos,
        enemyType: 'bat',
        enemyCol: '#6030a0', enemyCol2: '#3a1060',
        brickCol: '#5a4a3a', brickDark: '#3a2a1a',
    },
    {
        name: 'Desert', label: 'World 3', num: 3,
        sky: '#f0c060', groundTop: '#d4a040', groundBody: '#b07820',
        platformTop: '#e0b050', platformBody: '#c09030',
        pipeCol: '#c8a030', pipeDark: '#906010',
        cloudCol: '#fff8e0',
        bgDecos: drawDesertDecos,
        enemyType: 'crab',
        enemyCol: '#e04020', enemyCol2: '#a02010',
        brickCol: '#c89040', brickDark: '#906020',
    },
    {
        name: 'Night Castle', label: 'World 4', num: 4,
        sky: '#0a0820', groundTop: '#4a3060', groundBody: '#2a1a40',
        platformTop: '#5a3a70', platformBody: '#3a2050',
        pipeCol: '#303060', pipeDark: '#181030',
        cloudCol: '#332255',
        bgDecos: drawCastleDecos,
        enemyType: 'ghost',
        enemyCol: '#ccbbee', enemyCol2: '#9977bb',
        brickCol: '#3a2a5a', brickDark: '#201535',
    },
];

// ─── LEVEL BUILDER ────────────────────────────────────────────────────────────
const WORLD_W = W * 3;

function makeLevel(wIdx) {
    const ground = [
        { x: 0, y: H - TILE, w: 620, h: TILE },
        { x: 660, y: H - TILE, w: 500, h: TILE },
        { x: 1210, y: H - TILE, w: 500, h: TILE },
        { x: 1760, y: H - TILE, w: WORLD_W, h: TILE },
    ];
    const plats = [
        { x: 200, y: H - TILE * 3, w: TILE * 3, h: TILE },
        { x: 460, y: H - TILE * 4, w: TILE * 3, h: TILE },
        { x: 700, y: H - TILE * 3, w: TILE * 4, h: TILE },
        { x: 960, y: H - TILE * 4, w: TILE * 3, h: TILE },
        { x: 1180, y: H - TILE * 3, w: TILE * 3, h: TILE },
        { x: 1400, y: H - TILE * 4, w: TILE * 4, h: TILE },
        { x: 1660, y: H - TILE * 3, w: TILE * 3, h: TILE },
    ];
    const platforms = [...ground, ...plats];

    const qblocks = [
        { x: 230, y: H - TILE * 5, hit: false },
        { x: 490, y: H - TILE * 6, hit: false },
        { x: 730, y: H - TILE * 5, hit: false },
        { x: 990, y: H - TILE * 6, hit: false },
        { x: 1210, y: H - TILE * 5, hit: false },
        { x: 1440, y: H - TILE * 6, hit: false },
    ];

    const coins = [];
    [
        { sx: 100, y: H - TILE * 2.5, n: 5, g: 38 },
        { sx: 360, y: H - TILE * 3.5, n: 4, g: 38 },
        { sx: 700, y: H - TILE * 4.5, n: 4, g: 38 },
        { sx: 960, y: H - TILE * 3.5, n: 5, g: 38 },
        { sx: 1400, y: H - TILE * 4.5, n: 5, g: 38 },
        { sx: 1800, y: H - TILE * 2.5, n: 6, g: 38 },
    ].forEach(r => {
        for (let i = 0; i < r.n; i++) coins.push({ x: r.sx + i * r.g, y: r.y, got: false, anim: i * 0.5 });
    });

    // different enemy counts per world — harder later
    const eCounts = [5, 6, 7, 8];
    const eSpacing = WORLD_W / (eCounts[wIdx] + 1);
    const enemies = [];
    for (let i = 0; i < eCounts[wIdx]; i++) {
        enemies.push({ x: eSpacing * (i + 1), y: H - TILE * 2, vx: (i % 2 === 0 ? -1 : 1) * (0.7 + wIdx * 0.2), dead: false, squish: 0, anim: 0 });
    }

    const pipes = [
        { x: 420, h: TILE * 2 }, { x: 840, h: TILE * 3 },
        { x: 1280, h: TILE * 2 }, { x: 1700, h: TILE * 3 },
    ];

    const clouds = [];
    for (let i = 0; i < 10; i++) clouds.push({ x: i * 210 + 60, y: 35 + (i % 3) * 22, spd: 0.18 + (i % 3) * 0.08 });

    return { platforms, qblocks, coins, enemies, pipes, clouds };
}

// ─── BACKGROUND DECORATIONS ───────────────────────────────────────────────────
function drawGrassDecos(cam) {
    // little bushes on ground
    const bpos = [120, 280, 500, 750, 1000, 1300, 1600, 1900, 2200];
    for (const bx of bpos) {
        const x = bx - cam;
        if (x < -60 || x > W + 60) continue;
        cx.fillStyle = '#2a7a00';
        cx.beginPath(); cx.arc(x + 15, H - TILE - 8, 14, 0, Math.PI * 2); cx.fill();
        cx.beginPath(); cx.arc(x + 30, H - TILE - 12, 18, 0, Math.PI * 2); cx.fill();
        cx.beginPath(); cx.arc(x + 45, H - TILE - 8, 13, 0, Math.PI * 2); cx.fill();
        cx.fillStyle = '#3a9a10';
        cx.fillRect(x + 5, H - TILE - 6, 50, 10);
    }
    // hills in background
    const hpos = [60, 380, 720, 1100, 1500, 1900];
    for (const hx of hpos) {
        const x = hx - cam * 0.5; // parallax
        if (x < -120 || x > W + 120) continue;
        cx.fillStyle = '#4aaa20';
        cx.beginPath(); cx.arc(x + 50, H - TILE, 55, Math.PI, 0); cx.closePath(); cx.fill();
    }
}

function drawCaveDecos(cam) {
    // stalactites from ceiling
    cx.fillStyle = '#3a3a3a';
    for (let sx = 0; sx < WORLD_W; sx += 90) {
        const x = sx - cam;
        if (x < -30 || x > W + 30) continue;
        const h = 18 + ((sx * 7) % 22);
        cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x + 14, h); cx.lineTo(x + 28, 0); cx.closePath(); cx.fill();
    }
    // lava glow pools
    for (let lx = 300; lx < WORLD_W; lx += 400) {
        const x = lx - cam;
        if (x < -80 || x > W + 80) continue;
        cx.fillStyle = 'rgba(255,80,0,0.18)';
        cx.fillRect(x, H - TILE - 8, 80, 8);
        cx.fillStyle = 'rgba(255,120,0,0.10)';
        cx.fillRect(x - 10, H - TILE - 20, 100, 14);
    }
    // glowing dots (mushrooms)
    cx.fillStyle = 'rgba(100,255,180,0.5)';
    for (let mx = 150; mx < WORLD_W; mx += 220) {
        const x = mx - cam;
        if (x < -20 || x > W + 20) continue;
        cx.beginPath(); cx.arc(x, H - TILE - 10, 6, 0, Math.PI * 2); cx.fill();
        cx.fillStyle = 'rgba(60,255,150,0.2)';
        cx.beginPath(); cx.arc(x, H - TILE - 10, 14, 0, Math.PI * 2); cx.fill();
        cx.fillStyle = 'rgba(100,255,180,0.5)';
    }
}

function drawDesertDecos(cam) {
    // sun
    cx.fillStyle = '#ffee00';
    cx.beginPath(); cx.arc(W * 0.85, 50, 28, 0, Math.PI * 2); cx.fill();
    cx.strokeStyle = 'rgba(255,230,0,0.3)'; cx.lineWidth = 8;
    cx.beginPath(); cx.arc(W * 0.85, 50, 40, 0, Math.PI * 2); cx.stroke();
    // cacti
    const cpos = [200, 550, 900, 1200, 1600, 2000, 2300];
    for (const cp of cpos) {
        const x = cp - cam;
        if (x < -30 || x > W + 30) continue;
        cx.fillStyle = '#5a8a20';
        cx.fillRect(x + 10, H - TILE - 45, 12, 45);
        cx.fillRect(x, H - TILE - 30, 10, 12);
        cx.fillRect(x + 22, H - TILE - 35, 10, 14);
    }
    // sand dunes (parallax)
    cx.fillStyle = 'rgba(200,160,60,0.3)';
    for (let dx = 0; dx < WORLD_W; dx += 300) {
        const x = dx - cam * 0.4;
        cx.beginPath(); cx.arc(x + 80, H - TILE, 90, Math.PI, 0); cx.closePath(); cx.fill();
    }
    // heat shimmer lines
    cx.strokeStyle = 'rgba(255,200,80,0.08)'; cx.lineWidth = 2;
    for (let hx = 0; hx < W; hx += 40) {
        cx.beginPath(); cx.moveTo(hx, H - TILE * 2); cx.lineTo(hx + 10, H - TILE * 2 - 30); cx.stroke();
    }
}

function drawCastleDecos(cam) {
    // stars
    cx.fillStyle = 'rgba(255,255,255,0.6)';
    const stars = [[50, 20], [120, 40], [200, 15], [350, 30], [480, 18], [560, 45], [620, 25],
    [80, 55], [230, 60], [400, 50], [530, 38], [670, 12]];
    for (const [sx, sy] of stars) { cx.fillRect(sx, sy, 2, 2); cx.fillRect(sx + 1, sy - 1, 1, 4); cx.fillRect(sx - 1, sy + 1, 4, 1); }
    // moon
    cx.fillStyle = '#eeeeff';
    cx.beginPath(); cx.arc(80, 55, 20, 0, Math.PI * 2); cx.fill();
    cx.fillStyle = '#0a0820';
    cx.beginPath(); cx.arc(90, 48, 16, 0, Math.PI * 2); cx.fill();
    // castle towers in bg
    cx.fillStyle = 'rgba(50,30,80,0.6)';
    const tpos = [300, 700, 1100, 1500, 1900, 2300];
    for (const tp of tpos) {
        const x = tp - cam * 0.4;
        if (x < -80 || x > W + 80) continue;
        cx.fillRect(x, H - TILE * 6, 40, TILE * 5);
        cx.fillRect(x - 5, H - TILE * 6 - 8, 50, 10);
        // battlements
        for (let b = 0; b < 3; b++) cx.fillRect(x + b * 16 - 2, H - TILE * 6 - 18, 10, 10);
    }
    // purple fog
    cx.fillStyle = 'rgba(80,0,120,0.06)';
    cx.fillRect(0, H - TILE * 3, W, TILE * 2);
}

// ─── DRAW FUNCTIONS ────────────────────────────────────────────────────────────
function rect(x, y, w, h, col) { cx.fillStyle = col; cx.fillRect(x, y, w, h); }

function drawCloud(x, y, col) {
    cx.fillStyle = col;
    cx.beginPath(); cx.arc(x, y, 17, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.arc(x + 19, y + 4, 13, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.arc(x - 13, y + 4, 12, 0, Math.PI * 2); cx.fill();
    cx.fillRect(x - 13, y + 4, 52, 11);
}

function drawPlatform(pl, cam, W) {
    const x = pl.x - cam;
    rect(x, pl.y, pl.w, 8, W.platformTop);
    rect(x, pl.y + 8, pl.w, pl.h - 8, W.platformBody);
    cx.strokeStyle = 'rgba(0,0,0,0.2)'; cx.lineWidth = 1;
    for (let bx = x; bx < x + pl.w; bx += TILE) cx.strokeRect(bx, pl.y + 8, TILE, pl.h - 8);
}

function drawPipe(pp, cam, W) {
    const x = pp.x - cam, y = H - pp.h, pw = TILE * 2;
    rect(x, y, pw, pp.h, W.pipeCol);
    rect(x + pw - 5, y, 5, pp.h, W.pipeDark);
    rect(x - 4, y, pw + 8, 14, W.pipeDark);
    rect(x - 2, y + 2, pw + 4, 10, W.pipeCol);
}

function drawQBlock(qb, cam, W) {
    const x = qb.x - cam, y = qb.y;
    if (!qb.hit) {
        rect(x, y, TILE, TILE, '#f7c948');
        rect(x, y, TILE, 2, '#c89000'); rect(x, y + TILE - 2, TILE, 2, '#c89000');
        rect(x, y, 2, TILE, '#c89000'); rect(x + TILE - 2, y, 2, TILE, '#c89000');
        cx.fillStyle = '#fff'; cx.font = 'bold 15px monospace';
        cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.fillText('?', x + TILE / 2, y + TILE / 2);
    } else {
        rect(x, y, TILE, TILE, '#666');
        rect(x, y, TILE, 2, '#444'); rect(x, y + TILE - 2, TILE, 2, '#444');
        rect(x, y, 2, TILE, '#444'); rect(x + TILE - 2, y, 2, TILE, '#444');
    }
}

function drawCoin(cn, cam) {
    const x = cn.x - cam, bob = Math.sin(cn.anim) * 3;
    cx.fillStyle = '#f7c948'; cx.strokeStyle = '#c89000'; cx.lineWidth = 1.5;
    cx.beginPath();
    cx.ellipse(x, cn.y + bob, 7 * Math.abs(Math.cos(cn.anim * 0.6 + 0.1)), 9, 0, 0, Math.PI * 2);
    cx.fill(); cx.stroke();
}

// Enemy drawing — different per type
function drawEnemy(e, cam, wTheme) {
    const x = e.x - cam, y = e.y, t = wTheme.enemyType;
    const c1 = wTheme.enemyCol, c2 = wTheme.enemyCol2;
    e.anim = (e.anim || 0) + 0.06;

    if (e.dead) {
        rect(x, y + 20, 30, 8, c1);
        return;
    }

    if (t === 'goomba') {
        rect(x + 2, y + 4, 26, 24, c1); rect(x, y + 10, 30, 14, c1);
        rect(x + 2, y + 24, 10, 6, c2); rect(x + 18, y + 24, 10, 6, c2);
        rect(x + 5, y + 8, 8, 7, '#fff'); rect(x + 17, y + 8, 8, 7, '#fff');
        rect(x + 8, y + 10, 4, 4, '#000'); rect(x + 20, y + 10, 4, 4, '#000');
        cx.strokeStyle = '#000'; cx.lineWidth = 1.5;
        cx.beginPath(); cx.moveTo(x + 9, y + 20); cx.quadraticCurveTo(x + 15, y + 17, x + 21, y + 20); cx.stroke();
    }
    else if (t === 'bat') {
        // bat body
        rect(x + 8, y + 8, 14, 14, c1);
        // wings flap
        const flap = Math.sin(e.anim * 4) * 6;
        rect(x, y + 6 + flap, 10, 10, c1); rect(x + 20, y + 6 + flap, 10, 10, c1);
        // eyes
        rect(x + 10, y + 10, 4, 4, '#ff3300'); rect(x + 16, y + 10, 4, 4, '#ff3300');
        // fangs
        rect(x + 11, y + 22, 3, 4, '#fff'); rect(x + 16, y + 22, 3, 4, '#fff');
    }
    else if (t === 'crab') {
        // body
        rect(x + 4, y + 10, 22, 14, c1);
        // shell dome
        cx.fillStyle = c1;
        cx.beginPath(); cx.arc(x + 15, y + 14, 12, Math.PI, 0); cx.fill();
        // claws wave
        const cl = Math.sin(e.anim * 3) * 4;
        rect(x, y + 8 + cl, 8, 8, c2); rect(x + 22, y + 8 - cl, 8, 8, c2);
        // eyes on stalks
        rect(x + 9, y + 4, 3, 8, '#c04020'); rect(x + 18, y + 4, 3, 8, '#c04020');
        rect(x + 7, y + 2, 7, 6, c2); rect(x + 16, y + 2, 7, 6, c2);
        rect(x + 9, y + 3, 3, 3, '#fff'); rect(x + 18, y + 3, 3, 3, '#fff');
        // legs
        for (let i = 0; i < 3; i++) {
            const ly = y + 16 + Math.sin(e.anim * 3 + i) * 3;
            rect(x + 2 + i * 8, ly + 8, 4, 8, c2); rect(x + 24 - i * 4, ly + 8, 4, 8, c2);
        }
    }
    else if (t === 'ghost') {
        const bob = Math.sin(e.anim * 2) * 4;
        cx.fillStyle = c1; cx.globalAlpha = 0.85;
        // body
        cx.beginPath();
        cx.arc(x + 15, y + 12 + bob, 14, Math.PI, 0);
        cx.lineTo(x + 29, y + 28 + bob);
        // wavy bottom
        cx.quadraticCurveTo(x + 24, y + 22 + bob, x + 20, y + 28 + bob);
        cx.quadraticCurveTo(x + 15, y + 22 + bob, x + 10, y + 28 + bob);
        cx.quadraticCurveTo(x + 6, y + 22 + bob, x + 1, y + 28 + bob);
        cx.closePath(); cx.fill();
        cx.globalAlpha = 1;
        // eyes
        rect(x + 8, y + 10 + bob, 5, 5, '#6030a0'); rect(x + 17, y + 10 + bob, 5, 5, '#6030a0');
        // mouth
        cx.strokeStyle = '#6030a0'; cx.lineWidth = 1.5;
        cx.beginPath(); cx.arc(x + 15, y + 20 + bob, 5, 0.2, Math.PI - 0.2); cx.stroke();
    }
}

function drawPlayer(m, cam) {
    if (m.dead) return;
    if (m.iframes > 0 && Math.floor(Date.now() / 80) % 2 === 0) return;
    const x = m.x - cam, y = m.y, fl = m.dir === -1;
    cx.save();
    if (fl) { cx.translate(x + 26, y); cx.scale(-1, 1); cx.translate(0, 0); }
    else { cx.translate(x, y); }
    rect(4, 0, 18, 8, '#e52521'); rect(2, 6, 22, 4, '#e52521');
    rect(4, 8, 18, 10, '#ffd0a0');
    rect(4, 18, 18, 14, '#0052c4');
    rect(6, 20, 4, 4, '#afd0ff'); rect(16, 20, 4, 4, '#afd0ff');
    rect(2, 28, 10, 6, '#7b4000'); rect(14, 28, 10, 6, '#7b4000');
    rect(14, 11, 3, 3, '#000');
    rect(8, 15, 10, 2, '#7b4000');
    cx.restore();
}

function drawFlag(flagX, cam) {
    const fx = flagX - cam;
    cx.strokeStyle = '#aaa'; cx.lineWidth = 3;
    cx.beginPath(); cx.moveTo(fx, H - TILE * 8); cx.lineTo(fx, H - TILE); cx.stroke();
    rect(fx, H - TILE * 8, 22, 14, '#e52521');
    rect(fx + 3, H - TILE * 8 + 3, 10, 8, '#fff');
    // checkered finish line
    cx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let ry = 0; ry < TILE * 5; ry += 10)
        cx.fillRect(fx - 8, H - TILE * 8 + ry + ry % 20 / 10 * 10, 8, 10);
}

// ─── GAME STATE ───────────────────────────────────────────────────────────────
function newPlayer() {
    return { x: 60, y: H - TILE - 36, vx: 0, vy: 0, onGround: false, dir: 1, dead: false, dTimer: 0, iframes: 0 };
}

function startGame(wIdx) {
    const lvl = makeLevel(wIdx);
    const w = WORLDS[wIdx];
    state = {
        p: newPlayer(), wIdx, wTheme: w,
        ...lvl, cam: 0,
        score: totalScore, coinCount: totalCoins,
        lives, time: 200, timeTick: 0,
        particles: [], flagX: WORLD_W - TILE * 5, flagReached: false,
    };
    elScore.textContent = state.score;
    elCoins.textContent = state.coinCount;
    elLives.textContent = lives;
    elTime.textContent = 200;
    elWorld.textContent = w.num;
    document.getElementById('worldTag').textContent = w.label + ' — ' + w.name;
    overlay.style.display = 'none';
    running = true;
    if (raf) cancelAnimationFrame(raf);
    loop();
}

function showScreen(title, body) {
    running = false;
    overlay.style.display = 'flex';
    overlay.innerHTML = `
    <h2>${title}</h2>
    <p>${body}</p>
    <div id="worldSelect" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:4px;">
      <button class="wb" style="background:#3a7a00;border-color:#5aaa10;" onclick="startGame(0)"> W1<br><small>Grassland</small></button>
      <button class="wb" style="background:#4a3010;border-color:#8a6030;" onclick="startGame(1)"> W2<br><small>Underground</small></button>
      <button class="wb" style="background:#a06010;border-color:#e08820;" onclick="startGame(2)"> W3<br><small>Desert</small></button>
      <button class="wb" style="background:#1a0a3a;border-color:#6030a0;" onclick="startGame(3)"> W4<br><small>Castle</small></button>
    </div>
    <p style="margin-top:4px;font-size:9px;color:#666;">Developed by Tanver Fahat</p>
  `;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function hits(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
function addPop(x, y, col, n) {
    for (let i = 0; i < n; i++) state.particles.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4 - 1, col, life: 25 + Math.random() * 15 | 0 });
}
function addScore(n) { state.score += n; totalScore = state.score; elScore.textContent = state.score; }
function killPlayer(m) {
    if (m.dead) return;
    m.dead = true; m.dTimer = 80; m.vy = -8; m.vx = 0;
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
function update() {
    const p = state, m = p.p;

    p.timeTick++;
    if (p.timeTick >= 60) { p.timeTick = 0; p.time = Math.max(0, p.time - 1); elTime.textContent = p.time; }
    if (p.time === 0 && !m.dead) killPlayer(m);

    if (m.dead) {
        m.y += m.vy; m.vy += GRAV; m.dTimer--;
        if (m.dTimer <= 0) {
            lives--; elLives.textContent = lives;
            if (lives <= 0) {
                lives = 3; totalScore = 0; totalCoins = 0;
                showScreen('GAME OVER', 'You ran out of lives!<br>Score reset. Pick a world:');
            } else {
                // restart current world
                const widx = p.wIdx;
                startGame(widx);
            }
        }
        return;
    }
    if (m.iframes > 0) m.iframes--;

    const goLeft = keys['ArrowLeft'] || keys['a'] || keys['A'] || tLeft;
    const goRight = keys['ArrowRight'] || keys['d'] || keys['D'] || tRight;
    const wantJump = keys['ArrowUp'] || keys['w'] || keys['W'] || keys[' '] || tJump;

    if (goLeft) { m.vx = Math.max(m.vx - 0.6, -MSPD); m.dir = -1; }
    else if (goRight) { m.vx = Math.min(m.vx + 0.6, MSPD); m.dir = 1; }
    else { m.vx *= 0.78; if (Math.abs(m.vx) < 0.15) m.vx = 0; }

    if (wantJump && !jumpPressed && m.onGround) { m.vy = JSPD; m.onGround = false; }
    jumpPressed = wantJump;

    m.vy = Math.min(m.vy + GRAV, 14);

    // horizontal
    m.x += m.vx; m.x = Math.max(p.cam, m.x);
    for (const pl of p.platforms) {
        if (hits(m.x, m.y, MW, MH, pl.x, pl.y, pl.w, pl.h)) {
            if (m.vx > 0) m.x = pl.x - MW; else m.x = pl.x + pl.w; m.vx = 0;
        }
    }
    for (const pp of p.pipes) {
        const px = pp.x, py = H - pp.h, pw = TILE * 2;
        if (hits(m.x, m.y, MW, MH, px, py, pw, pp.h)) {
            if (m.vx > 0) m.x = px - MW; else m.x = px + pw; m.vx = 0;
        }
    }

    // vertical
    m.onGround = false; m.y += m.vy;
    for (const pl of p.platforms) {
        if (hits(m.x, m.y, MW, MH, pl.x, pl.y, pl.w, pl.h)) {
            if (m.vy > 0) { m.y = pl.y - MH; m.vy = 0; m.onGround = true; }
            else { m.y = pl.y + pl.h; m.vy = 1; }
        }
    }
    for (const pp of p.pipes) {
        const px = pp.x, py = H - pp.h, pw = TILE * 2;
        if (hits(m.x, m.y, MW, MH, px, py, pw, pp.h)) {
            if (m.vy > 0) { m.y = py - MH; m.vy = 0; m.onGround = true; }
            else { m.y = py + pp.h; m.vy = 1; }
        }
    }
    // ? blocks
    for (const qb of p.qblocks) {
        if (!qb.hit && hits(m.x, m.y, MW, MH, qb.x, qb.y, TILE, TILE)) {
            if (m.vy < 0) { qb.hit = true; m.vy = 2; addScore(100); p.coinCount++; totalCoins = p.coinCount; elCoins.textContent = p.coinCount; addPop(qb.x + TILE / 2, qb.y, '#f7c948', 6); }
            else if (m.vy > 0) { m.y = qb.y - MH; m.vy = 0; m.onGround = true; }
        }
    }

    if (m.y > H + 60) killPlayer(m);

    // coins
    for (const cn of p.coins) {
        cn.anim += 0.08;
        if (!cn.got && hits(m.x, m.y, MW, MH, cn.x - 8, cn.y - 10, 16, 20)) {
            cn.got = true; p.coinCount++; totalCoins = p.coinCount; elCoins.textContent = p.coinCount; addScore(50); addPop(cn.x, cn.y, '#f7c948', 4);
        }
    }

    // enemies
    for (const e of p.enemies) {
        if (e.dead) { e.squish++; continue; }
        e.x += e.vx;
        if (e.x < 0 || e.x > WORLD_W - 30) e.vx *= -1;
        for (const pl of p.platforms) {
            if (hits(e.x, e.y, 30, 28, pl.x, pl.y, pl.w, pl.h)) { e.vx *= -1; break; }
        }
        if (m.iframes <= 0 && hits(m.x, m.y, MW, MH, e.x, e.y, 30, 28)) {
            if (m.vy > 0 && m.y + MH < e.y + 14) { e.dead = true; m.vy = JSPD * 0.45; addScore(200); addPop(e.x + 15, e.y, p.wTheme.enemyCol, 5); }
            else killPlayer(m);
        }
    }

    // flag
    if (!p.flagReached && m.x + MW > p.flagX) {
        p.flagReached = true; addScore(800);
        const wi = p.wIdx;
        setTimeout(() => {
            running = false;
            if (wi === 3) {
                showScreen('YOU WIN! 🎉 ALL WORLDS CLEARED!', `Final Score: ${state.score}<br>Coins: ${state.coinCount}<br><br>Thanks for playing!`);
            } else {
                showScreen(`World ${wi + 1} Complete! 🏆`, `Score: ${state.score} | Coins: ${state.coinCount}<br>Choose next world:`);
            }
        }, 1200);
    }

    const target = m.x - W / 3;
    p.cam += (target - p.cam) * 0.12;
    p.cam = Math.max(0, Math.min(p.cam, WORLD_W - W));

    for (const cl of p.clouds) { cl.x -= cl.spd; if (cl.x + 80 < p.cam) cl.x = p.cam + W + 40; }
    p.particles = p.particles.filter(pt => pt.life-- > 0);
    for (const pt of p.particles) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.25; }
}

// ─── DRAW ─────────────────────────────────────────────────────────────────────
function draw() {
    const p = state, cam = p.cam, w = p.wTheme;

    // sky
    cx.fillStyle = w.sky; cx.fillRect(0, 0, W, H);

    // world-specific background decorations
    w.bgDecos(cam);

    // clouds
    for (const cl of p.clouds) drawCloud(cl.x - cam, cl.y, w.cloudCol);

    // platforms
    for (const pl of p.platforms) {
        const px = pl.x - cam;
        if (px < W + pl.w && px + pl.w > 0) drawPlatform(pl, cam, w);
    }

    // pipes
    for (const pp of p.pipes) {
        const px = pp.x - cam;
        if (px > -TILE * 3 && px < W + TILE * 3) drawPipe(pp, cam, w);
    }

    // ? blocks
    for (const qb of p.qblocks) {
        const bx = qb.x - cam;
        if (bx > -TILE && bx < W + TILE) drawQBlock(qb, cam, w);
    }

    // coins
    for (const cn of p.coins) {
        const cx2 = cn.x - cam;
        if (!cn.got && cx2 > -20 && cx2 < W + 20) drawCoin(cn, cam);
    }

    // enemies
    for (const e of p.enemies) {
        const ex = e.x - cam;
        if (ex > -50 && ex < W + 50) drawEnemy(e, cam, w);
    }

    // flag
    drawFlag(p.flagX, cam);

    // player
    drawPlayer(p.p, cam);

    // particles
    for (const pt of p.particles) {
        cx.globalAlpha = pt.life / 40;
        cx.fillStyle = pt.col;
        cx.fillRect(pt.x - cam - 3, pt.y - 3, 6, 6);
    }
    cx.globalAlpha = 1;

    // world name watermark (subtle)
    cx.fillStyle = 'rgba(255,255,255,0.12)';
    cx.font = 'bold 48px Courier New';
    cx.textAlign = 'right'; cx.textBaseline = 'bottom';
    cx.fillText(w.name.toUpperCase(), W - 10, H - TILE - 4);
}

// ─── LOOP ─────────────────────────────────────────────────────────────────────
function loop() {
    if (!running) return;
    update(); draw();
    raf = requestAnimationFrame(loop);
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    keys[e.key] = true;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

function hold(id, setter) {
    const el = document.getElementById(id);
    el.addEventListener('pointerdown', e => { setter(true); e.preventDefault(); });
    el.addEventListener('pointerup', () => setter(false));
    el.addEventListener('pointerleave', () => setter(false));
}
hold('bL', v => tLeft = v);
hold('bR', v => tRight = v);
hold('bJ', v => tJump = v);
