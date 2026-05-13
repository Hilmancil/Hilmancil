// ==========================================================================
// GUNUNG BLOX - Mountain Adventure Map (Roblox-style)
// A stylized 3D mountain-climbing hangout built with Three.js
// ==========================================================================

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Scene bootstrap
// ---------------------------------------------------------------------------
const canvas   = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbcd8ea, 70, 320);
scene.background = new THREE.Color(0xbcd8ea);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(0, 18, 34);

// ---------------------------------------------------------------------------
// Lighting - cool mountain daylight
// ---------------------------------------------------------------------------
const hemi = new THREE.HemisphereLight(0xc8e0ff, 0x5a6a4d, 0.6);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff4d8, 1.35);
sun.position.set(50, 90, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 260;
sun.shadow.camera.left = -110;
sun.shadow.camera.right = 110;
sun.shadow.camera.top = 110;
sun.shadow.camera.bottom = -110;
sun.shadow.bias = -0.0005;
scene.add(sun);

const ambient = new THREE.AmbientLight(0xffffff, 0.28);
scene.add(ambient);

// ---------------------------------------------------------------------------
// Material & mesh helpers
// ---------------------------------------------------------------------------
const matCache = new Map();
function mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (matCache.has(key)) return matCache.get(key);
    const m = new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.85,
        metalness: opts.metalness ?? 0,
        transparent: opts.transparent ?? false,
        opacity: opts.opacity ?? 1,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 0,
        flatShading: opts.flatShading ?? false
    });
    matCache.set(key, m);
    return m;
}

function box(w, h, d, color, x = 0, y = 0, z = 0, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
}

function cyl(r, h, color, x = 0, y = 0, z = 0, opts = {}) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16), mat(color, opts));
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
}

// ---------------------------------------------------------------------------
// TERRAIN - procedurally shaped mountain
// ---------------------------------------------------------------------------
const world = new THREE.Group();
scene.add(world);

// Master height function used everywhere (objects, player, NPCs)
function terrainHeight(x, z) {
    let h = 0;
    // Main mountain peak at (0, 0)
    const d1 = Math.hypot(x, z);
    if (d1 < 62) h += Math.pow(1 - d1 / 62, 1.75) * 46;
    // Secondary ridge peak (NE)
    const d2 = Math.hypot(x - 24, z + 18);
    if (d2 < 26) h += Math.pow(1 - d2 / 26, 2) * 18;
    // Smaller peak (SW)
    const d3 = Math.hypot(x + 28, z - 12);
    if (d3 < 22) h += Math.pow(1 - d3 / 22, 2) * 12;
    // Natural noise
    h += Math.sin(x * 0.16) * Math.cos(z * 0.19) * 0.9;
    h += Math.sin(x * 0.45 + z * 0.32) * 0.35;
    // Flat camp plateau in front (z ~ 40..50)
    const campDist = Math.hypot(x, z - 42);
    if (campDist < 10) {
        const blend = Math.max(0, 1 - campDist / 10);
        h = h * (1 - blend) + 0.3 * blend;
    }
    // Frozen lake crater (NW mid-elevation)
    const lakeDist = Math.hypot(x + 14, z + 18);
    if (lakeDist < 7) {
        const blend = Math.max(0, 1 - lakeDist / 7);
        h = h * (1 - blend) + 8 * blend;
    }
    return h;
}

// Build terrain mesh with vertex colors
const TERRAIN_SIZE = 180;
const TERRAIN_SEG  = 140;
const terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEG, TERRAIN_SEG);
terrainGeo.rotateX(-Math.PI / 2);

const positions = terrainGeo.attributes.position;
const colors = new Float32Array(positions.count * 3);
const colGrass  = new THREE.Color(0x6aae55);
const colGrass2 = new THREE.Color(0x4f9446);
const colDirt   = new THREE.Color(0x7a5b3a);
const colRock   = new THREE.Color(0x7f7a78);
const colRock2  = new THREE.Color(0x5e5a58);
const colSnow   = new THREE.Color(0xf5fbff);
const colSand   = new THREE.Color(0xd9c488);

for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const h = terrainHeight(x, z);
    positions.setY(i, h);

    // Vertex color by altitude
    let c;
    if (h < 0.5)       c = colSand.clone();
    else if (h < 3)    c = colGrass.clone();
    else if (h < 9)    c = colGrass2.clone();
    else if (h < 17)   c = colDirt.clone();
    else if (h < 26)   c = colRock.clone();
    else if (h < 34)   c = colRock2.clone();
    else               c = colSnow.clone();
    // Slight random variation
    const j = (Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
    const jitter = 0.92 + (j - Math.floor(j)) * 0.16;
    c.multiplyScalar(jitter);
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
}
terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
terrainGeo.computeVertexNormals();

const terrainMesh = new THREE.Mesh(
    terrainGeo,
    new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.95,
        metalness: 0,
        flatShading: true
    })
);
terrainMesh.receiveShadow = true;
terrainMesh.castShadow = true;
world.add(terrainMesh);

// Outer ocean/fog plane (far horizon)
const oceanGeo = new THREE.PlaneGeometry(800, 800);
const ocean = new THREE.Mesh(
    oceanGeo,
    new THREE.MeshStandardMaterial({ color: 0x6fa9cf, roughness: 0.5, metalness: 0.1 })
);
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = -2.5;
ocean.receiveShadow = true;
scene.add(ocean);

// ---------------------------------------------------------------------------
// PINE FOREST (blocky low-poly pines)
// ---------------------------------------------------------------------------
function makePine(x, z, scale = 1) {
    const g = new THREE.Group();
    const trunk = box(0.8, 2.2, 0.8, 0x5a3825, 0, 0, 0, { roughness: 1 });
    g.add(trunk);
    const greens = [0x2f6e3a, 0x3a854a, 0x2a6234, 0x347e41];
    for (let i = 0; i < 4; i++) {
        const radius = 2.8 - i * 0.55;
        const cone = new THREE.Mesh(
            new THREE.ConeGeometry(radius, 1.9, 8),
            mat(greens[i % greens.length], { roughness: 0.95, flatShading: true })
        );
        cone.position.y = 2.2 + i * 1.3;
        cone.castShadow = true;
        cone.receiveShadow = true;
        g.add(cone);
    }
    // Snow cap if high altitude
    const y = terrainHeight(x, z);
    if (y > 18) {
        const snow = new THREE.Mesh(
            new THREE.ConeGeometry(1.1, 0.8, 8),
            mat(0xffffff, { roughness: 1, flatShading: true })
        );
        snow.position.y = 2.2 + 4 * 1.3 + 0.1;
        g.add(snow);
    }
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    g.rotation.y = Math.random() * Math.PI * 2;
    world.add(g);
}

// Scatter pines - denser at low elevations, none above snow line
const pineSpots = [];
for (let i = 0; i < 120; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 14 + Math.random() * 55;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = terrainHeight(x, z);
    if (h < 18 && h > 0.5) {
        // Avoid base camp plateau and lake crater
        if (Math.hypot(x, z - 42) < 12) continue;
        if (Math.hypot(x + 14, z + 18) < 10) continue;
        pineSpots.push([x, z, 0.7 + Math.random() * 0.8]);
    }
}
pineSpots.forEach(([x, z, s]) => makePine(x, z, s));

// ---------------------------------------------------------------------------
// BOULDERS & ROCKS
// ---------------------------------------------------------------------------
function makeRock(x, z, size = 1, dark = false) {
    const geom = new THREE.DodecahedronGeometry(size, 0);
    // Deform verts a bit
    const p = geom.attributes.position;
    for (let i = 0; i < p.count; i++) {
        p.setX(i, p.getX(i) * (0.85 + Math.random() * 0.3));
        p.setY(i, p.getY(i) * (0.85 + Math.random() * 0.3));
        p.setZ(i, p.getZ(i) * (0.85 + Math.random() * 0.3));
    }
    geom.computeVertexNormals();
    const rock = new THREE.Mesh(
        geom,
        mat(dark ? 0x565352 : 0x808385, { roughness: 1, flatShading: true })
    );
    rock.castShadow = true;
    rock.receiveShadow = true;
    rock.position.set(x, terrainHeight(x, z) + size * 0.45, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    world.add(rock);
}

for (let i = 0; i < 80; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * 60;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = terrainHeight(x, z);
    if (h > 1 && h < 44) {
        const size = 0.5 + Math.random() * 1.6;
        makeRock(x, z, size, h > 22);
    }
}

// ---------------------------------------------------------------------------
// ZONE 1 - BASE CAMP (south plateau)
// ---------------------------------------------------------------------------
const camp = new THREE.Group();
camp.position.set(0, terrainHeight(0, 42), 42);
world.add(camp);

// Wooden platform
const deck = box(10, 0.4, 10, 0x8a5a35, 0, 0, 0);
camp.add(deck);

// Lodge cabin
const cabin = new THREE.Group();
cabin.position.set(-5, 0.2, -2);
// Walls (log style)
for (let i = 0; i < 5; i++) {
    const logCol = i % 2 === 0 ? 0x8a5a35 : 0x7a4a2a;
    cabin.add(box(6, 0.55, 0.3, logCol, 0, i * 0.55, -2));   // back
    cabin.add(box(0.3, 0.55, 4, logCol, -3, i * 0.55, 0));  // left
    cabin.add(box(0.3, 0.55, 4, logCol, 3,  i * 0.55, 0));  // right
    if (i < 3 || i > 3) {
        // front with door gap
        cabin.add(box(1.8, 0.55, 0.3, logCol, -2.1, i * 0.55, 2));
        cabin.add(box(1.8, 0.55, 0.3, logCol, 2.1,  i * 0.55, 2));
    } else {
        cabin.add(box(6, 0.55, 0.3, logCol, 0, i * 0.55, 2));
    }
}
// Door
cabin.add(box(1.4, 2.2, 0.1, 0x3a251a, 0, 0, 2.1));
// Roof (pyramid of boxes)
for (let i = 0; i < 5; i++) {
    const w = 7 - i * 1.1;
    const d = 5 - i * 0.7;
    cabin.add(box(w, 0.35, d, 0x6b2e1f, 0, 2.75 + i * 0.35, 0));
}
// Chimney
cabin.add(box(0.7, 1.2, 0.7, 0x6b6463, 2.2, 4.2, -1.5));
camp.add(cabin);

// Tents (triangle prism via two slanted planes)
function makeTent(x, z, color = 0xd94e3a) {
    const g = new THREE.Group();
    const fabric = mat(color, { roughness: 0.9 });
    const w = 2.5, h = 2, d = 3;
    const left = new THREE.Mesh(new THREE.PlaneGeometry(d, Math.hypot(w / 2, h)), fabric);
    left.rotation.y = Math.PI / 2;
    left.rotation.x = 0;
    left.position.set(-w / 2, h / 2, 0);
    left.rotation.z = Math.atan2(w / 2, h);
    g.add(left);
    const right = new THREE.Mesh(new THREE.PlaneGeometry(d, Math.hypot(w / 2, h)), fabric);
    right.rotation.y = Math.PI / 2;
    right.position.set(w / 2, h / 2, 0);
    right.rotation.z = -Math.atan2(w / 2, h);
    g.add(right);
    // Doorway triangle (back)
    const back = new THREE.Mesh(
        new THREE.CircleGeometry(w / 1.7, 3),
        mat(color, { roughness: 0.9 })
    );
    back.rotation.z = Math.PI;
    back.position.set(0, h / 2, -d / 2);
    g.add(back);
    // Ground cloth
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(0x3a2a1e));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.02;
    g.add(floor);
    // Pole
    const pole = cyl(0.05, h + 0.3, 0xbbb5a8, 0, 0, 0, { metalness: 0.3 });
    g.add(pole);
    // Pegs/ropes (simple lines)
    const ropeMat = new THREE.LineBasicMaterial({ color: 0xdcd4b9 });
    for (let i = -1; i <= 1; i += 2) {
        const pts = [
            new THREE.Vector3(i * (w / 2), h, d / 2 - 0.2),
            new THREE.Vector3(i * (w / 2 + 0.8), 0, d / 2 + 0.8)
        ];
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ropeMat));
    }
    g.position.set(x, 0.2, z);
    g.rotation.y = Math.random() * Math.PI * 2;
    return g;
}
camp.add(makeTent(3, 3, 0xd94e3a));
camp.add(makeTent(-3, 4, 0x3a6ed9));
camp.add(makeTent(4, -3, 0xf2b135));

// Campfire in middle
const fireRing = new THREE.Group();
fireRing.position.set(0, 0.25, 2);
for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const stone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.35, 0),
        mat(0x6a6a6a, { roughness: 1, flatShading: true })
    );
    stone.position.set(Math.cos(a) * 1.2, 0.1, Math.sin(a) * 1.2);
    stone.castShadow = true;
    fireRing.add(stone);
}
// Logs
for (let i = 0; i < 3; i++) {
    const log = cyl(0.2, 1.1, 0x6b4423, 0, 0, 0);
    log.rotation.x = Math.PI / 2;
    log.rotation.z = (i / 3) * Math.PI * 2;
    log.position.y = 0.2;
    fireRing.add(log);
}
// Animated fire
const fireCones = [];
for (let i = 0; i < 5; i++) {
    const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.38 - i * 0.055, 1.1 - i * 0.12, 8),
        new THREE.MeshStandardMaterial({
            color: i < 2 ? 0xffdd44 : (i < 4 ? 0xff9033 : 0xff3a11),
            emissive: i < 2 ? 0xffdd44 : 0xff6600,
            emissiveIntensity: 1.9,
            transparent: true,
            opacity: 0.88
        })
    );
    cone.position.y = 0.7 + i * 0.28;
    fireCones.push(cone);
    fireRing.add(cone);
}
const fireLight = new THREE.PointLight(0xff7733, 3, 22);
fireLight.position.set(0, 2, 0);
fireRing.add(fireLight);
camp.add(fireRing);

// Log benches around fire
function makeLogBench(x, z, rotY = 0) {
    const g = new THREE.Group();
    const seat = cyl(0.3, 2.4, 0x7a4a2a, 0, 0.3, 0);
    seat.rotation.z = Math.PI / 2;
    seat.position.y = 0.3;
    g.add(seat);
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    return g;
}
camp.add(makeLogBench(0, 0, 0));
camp.add(makeLogBench(0, 4, 0));
camp.add(makeLogBench(-2, 2, Math.PI / 2));
camp.add(makeLogBench(2, 2, Math.PI / 2));

// Camp flag pole
const campPole = cyl(0.08, 5, 0xaaaaaa, -4.5, 0.2, 3, { metalness: 0.7 });
camp.add(campPole);
const campBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1),
    mat(0xd94e3a, { roughness: 0.8 })
);
campBanner.position.set(-3.7, 4.5, 3);
camp.add(campBanner);

// ---------------------------------------------------------------------------
// ZONE 2 - WATERFALL (east side of main peak)
// ---------------------------------------------------------------------------
const waterfall = new THREE.Group();
// Place at a point on the slope
const wfX = 30, wfZ = 10;
const wfTopY = terrainHeight(wfX - 3, wfZ - 3);
const wfBotY = terrainHeight(wfX + 2, wfZ + 6);
waterfall.position.set(wfX, 0, wfZ);
world.add(waterfall);

// Waterfall sheets (stacked, animated)
const waterSheets = [];
for (let i = 0; i < 3; i++) {
    const sheet = new THREE.Mesh(
        new THREE.PlaneGeometry(3.5, 14),
        new THREE.MeshStandardMaterial({
            color: 0xaee6ff,
            transparent: true,
            opacity: 0.6 - i * 0.1,
            emissive: 0x88bbee,
            emissiveIntensity: 0.35,
            side: THREE.DoubleSide,
            roughness: 0.2
        })
    );
    sheet.position.set(i * 0.15, (wfTopY + wfBotY) / 2, i * 0.15);
    sheet.rotation.x = -0.25;
    sheet.userData.phase = i * 0.3;
    waterfall.add(sheet);
    waterSheets.push(sheet);
}
// Splash pool at bottom
const splash = new THREE.Mesh(
    new THREE.CircleGeometry(3, 24),
    new THREE.MeshStandardMaterial({
        color: 0x6fc3e6,
        transparent: true,
        opacity: 0.75,
        roughness: 0.1,
        metalness: 0.2,
        emissive: 0x4290b0,
        emissiveIntensity: 0.25
    })
);
splash.rotation.x = -Math.PI / 2;
splash.position.set(0.5, wfBotY - 0.4, 2);
waterfall.add(splash);
// Mist particles (white spheres)
const mistParticles = [];
for (let i = 0; i < 18; i++) {
    const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.25 + Math.random() * 0.25, 6, 6),
        new THREE.MeshStandardMaterial({
            color: 0xffffff, transparent: true, opacity: 0.45, roughness: 1
        })
    );
    p.position.set(
        (Math.random() - 0.5) * 3,
        wfBotY + Math.random() * 1.5,
        (Math.random() - 0.5) * 2 + 1.5
    );
    p.userData.base = p.position.clone();
    p.userData.phase = Math.random() * Math.PI * 2;
    waterfall.add(p);
    mistParticles.push(p);
}
// Rocks framing the waterfall
makeRock(wfX - 3, wfZ - 2, 1.6, true);
makeRock(wfX + 3, wfZ - 1, 1.4, true);
makeRock(wfX - 1, wfZ + 4, 1.2, true);

// ---------------------------------------------------------------------------
// ZONE 3 - DANAU BEKU (frozen lake in a crater)
// ---------------------------------------------------------------------------
const lake = new THREE.Group();
lake.position.set(-14, terrainHeight(-14, -18) + 0.08, -18);
world.add(lake);

// Ice disc
const ice = new THREE.Mesh(
    new THREE.CircleGeometry(6, 32),
    new THREE.MeshStandardMaterial({
        color: 0xd4ecf7,
        transparent: true,
        opacity: 0.85,
        roughness: 0.15,
        metalness: 0.4,
        emissive: 0x6bb3d4,
        emissiveIntensity: 0.15
    })
);
ice.rotation.x = -Math.PI / 2;
lake.add(ice);

// Cracks (dark lines)
const crackMat = new THREE.LineBasicMaterial({ color: 0x6aa8c6, transparent: true, opacity: 0.5 });
for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    const pts = [
        new THREE.Vector3(Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3),
        new THREE.Vector3(Math.cos(a) * 5.5, 0.02, Math.sin(a) * 5.5)
    ];
    lake.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), crackMat));
}

// Snow rim around lake
for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const snowPile = new THREE.Mesh(
        new THREE.SphereGeometry(0.9 + Math.random() * 0.4, 8, 6),
        mat(0xffffff, { roughness: 1, flatShading: true })
    );
    snowPile.position.set(Math.cos(a) * 6.5, 0.1, Math.sin(a) * 6.5);
    snowPile.castShadow = true;
    lake.add(snowPile);
}
// Ice crystals / shards
for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 4;
    const shard = new THREE.Mesh(
        new THREE.ConeGeometry(0.25, 0.9, 5),
        new THREE.MeshStandardMaterial({
            color: 0xaee2f7,
            transparent: true,
            opacity: 0.75,
            emissive: 0x6bb3d4,
            emissiveIntensity: 0.4,
            roughness: 0.2
        })
    );
    shard.position.set(Math.cos(a) * r, 0.45, Math.sin(a) * r);
    shard.rotation.z = (Math.random() - 0.5) * 0.3;
    lake.add(shard);
}
// Small cabin by the lake
const lakeCabin = new THREE.Group();
lakeCabin.position.set(7, 0, 2);
lakeCabin.add(box(3, 2, 3, 0x6b3f25, 0, 0, 0));
for (let i = 0; i < 3; i++) {
    lakeCabin.add(box(3.3 - i * 0.6, 0.3, 3.3 - i * 0.6, 0x4a241a, 0, 2 + i * 0.3, 0));
}
lakeCabin.add(box(0.8, 1.2, 0.1, 0x2a1510, 0, 0, 1.55));
lakeCabin.add(box(0.6, 0.6, 0.1, 0xffe9a0, 1, 1.1, 1.55,
    { emissive: 0xffd070, emissiveIntensity: 0.8 }));
lake.add(lakeCabin);

// ---------------------------------------------------------------------------
// ZONE 4 - JEMBATAN TALI (Rope bridge between two rocky pillars)
// ---------------------------------------------------------------------------
const bridge = new THREE.Group();
const bA = new THREE.Vector3(8, 0, -8);
const bB = new THREE.Vector3(22, 0, -18);
bA.y = terrainHeight(bA.x, bA.z) + 1.2;
bB.y = terrainHeight(bB.x, bB.z) + 1.2;
world.add(bridge);

// Support posts
function makePost(v, color = 0x4a321d) {
    const g = new THREE.Group();
    g.position.set(v.x, 0, v.z);
    const yBase = terrainHeight(v.x, v.z);
    const postHeight = v.y - yBase + 0.5;
    const post1 = cyl(0.15, postHeight, color, -0.7, yBase, 0);
    const post2 = cyl(0.15, postHeight, color, 0.7, yBase, 0);
    const top = box(1.8, 0.2, 0.2, color, 0, yBase + postHeight, 0);
    g.add(post1, post2, top);
    return g;
}
bridge.add(makePost(bA));
bridge.add(makePost(bB));

// Planks
const bridgeLen = bA.distanceTo(bB);
const plankCount = Math.floor(bridgeLen / 0.7);
const bridgeDir = new THREE.Vector3().subVectors(bB, bA).normalize();
const bridgeAngle = Math.atan2(bridgeDir.x, bridgeDir.z);
for (let i = 0; i < plankCount; i++) {
    const t = i / (plankCount - 1);
    // Sag in middle (catenary-ish)
    const sag = Math.sin(t * Math.PI) * 1.1;
    const px = THREE.MathUtils.lerp(bA.x, bB.x, t);
    const pz = THREE.MathUtils.lerp(bA.z, bB.z, t);
    const py = THREE.MathUtils.lerp(bA.y, bB.y, t) - sag;
    const plank = box(2, 0.12, 0.5, i % 2 === 0 ? 0x7a4a28 : 0x6b3f25, 0, 0, 0);
    plank.position.set(px, py, pz);
    plank.rotation.y = bridgeAngle;
    bridge.add(plank);
}

// Ropes (as line segments)
function makeBridgeRope(offsetX, offsetY) {
    const pts = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const sag = Math.sin(t * Math.PI) * 1.1;
        const px = THREE.MathUtils.lerp(bA.x, bB.x, t) + offsetX * Math.cos(bridgeAngle);
        const pz = THREE.MathUtils.lerp(bA.z, bB.z, t) - offsetX * Math.sin(bridgeAngle);
        const py = THREE.MathUtils.lerp(bA.y, bB.y, t) - sag + offsetY;
        pts.push(new THREE.Vector3(px, py, pz));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0x3a2a1a, linewidth: 3 }));
}
bridge.add(makeBridgeRope(-1, 0));
bridge.add(makeBridgeRope(1, 0));
bridge.add(makeBridgeRope(-1, 1.2));
bridge.add(makeBridgeRope(1, 1.2));

// ---------------------------------------------------------------------------
// ZONE 5 - PUNCAK (summit with flag)
// ---------------------------------------------------------------------------
const summit = new THREE.Group();
const sumY = terrainHeight(0, 0);
summit.position.set(0, sumY, 0);
world.add(summit);

// Small snow platform
const summitPlatform = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3.5, 0.6, 8),
    mat(0xffffff, { roughness: 0.95, flatShading: true })
);
summitPlatform.position.y = 0.3;
summitPlatform.receiveShadow = true;
summit.add(summitPlatform);

// Stone cairn (stacked rocks)
for (let i = 0; i < 5; i++) {
    const s = 0.6 - i * 0.08;
    const r = new THREE.Mesh(
        new THREE.DodecahedronGeometry(s, 0),
        mat(0x7c7a78, { roughness: 1, flatShading: true })
    );
    r.position.set(1.8, 0.6 + i * (s * 1.4), 0);
    r.rotation.set(Math.random(), Math.random(), Math.random());
    r.castShadow = true;
    summit.add(r);
}

// Flagpole
const flagPole = cyl(0.1, 6, 0xc8c5c0, 0, 0.3, 0, { metalness: 0.7 });
summit.add(flagPole);

// Flag (red/white Indonesia inspired)
const flagCanvas = document.createElement('canvas');
flagCanvas.width = 128; flagCanvas.height = 80;
const flagCtx = flagCanvas.getContext('2d');
flagCtx.fillStyle = '#d94e3a';
flagCtx.fillRect(0, 0, 128, 40);
flagCtx.fillStyle = '#ffffff';
flagCtx.fillRect(0, 40, 128, 40);
flagCtx.strokeStyle = '#333';
flagCtx.lineWidth = 2;
flagCtx.strokeRect(0, 0, 128, 80);
flagCtx.fillStyle = '#333';
flagCtx.font = 'bold 22px Arial';
flagCtx.textAlign = 'center';
flagCtx.fillText('GUNUNG', 64, 26);
flagCtx.fillText('BLOX', 64, 68);
const flagTex = new THREE.CanvasTexture(flagCanvas);
flagTex.colorSpace = THREE.SRGBColorSpace;

const flagGeo = new THREE.PlaneGeometry(2.4, 1.5, 12, 6);
const flag = new THREE.Mesh(
    flagGeo,
    new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.9 })
);
flag.position.set(1.2, 5.5, 0);
summit.add(flag);

// "Altitude" marker
const altCanvas = document.createElement('canvas');
altCanvas.width = 256; altCanvas.height = 96;
const ac = altCanvas.getContext('2d');
ac.fillStyle = '#2a1a10';
ac.fillRect(0, 0, 256, 96);
ac.strokeStyle = '#f2b135';
ac.lineWidth = 4;
ac.strokeRect(4, 4, 248, 88);
ac.fillStyle = '#f2b135';
ac.font = 'bold 30px Arial';
ac.textAlign = 'center';
ac.fillText('PUNCAK', 128, 38);
ac.fillStyle = '#fff';
ac.font = 'bold 26px Arial';
ac.fillText('4096 m', 128, 72);
const altTex = new THREE.CanvasTexture(altCanvas);
altTex.colorSpace = THREE.SRGBColorSpace;
const altMarker = new THREE.Mesh(
    new THREE.PlaneGeometry(3, 1.1),
    new THREE.MeshStandardMaterial({ map: altTex, side: THREE.DoubleSide })
);
altMarker.position.set(-1.8, 3, 0);
summit.add(altMarker);

// ---------------------------------------------------------------------------
// Wooden path markers leading up the mountain
// ---------------------------------------------------------------------------
function makeMarker(x, z, label, color = 0xe27c3a) {
    const g = new THREE.Group();
    const post = cyl(0.1, 1.8, 0x5a3825, 0, 0, 0);
    g.add(post);
    const board = box(1.6, 0.5, 0.1, color, 0, 1.6, 0, { roughness: 0.9 });
    g.add(board);

    // Label
    const c = document.createElement('canvas');
    c.width = 256; c.height = 80;
    const cc = c.getContext('2d');
    cc.fillStyle = '#' + color.toString(16).padStart(6, '0');
    cc.fillRect(0, 0, 256, 80);
    cc.strokeStyle = '#fff';
    cc.lineWidth = 4;
    cc.strokeRect(4, 4, 248, 72);
    cc.fillStyle = '#fff';
    cc.font = 'bold 28px Arial';
    cc.textAlign = 'center';
    cc.textBaseline = 'middle';
    cc.fillText(label, 128, 40);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(1.55, 0.48),
        new THREE.MeshBasicMaterial({ map: tex })
    );
    plate.position.set(0, 1.6, 0.055);
    g.add(plate);

    g.position.set(x, terrainHeight(x, z), z);
    g.lookAt(0, terrainHeight(0, 0) + 3, 0);
    return g;
}
world.add(makeMarker(0, 30, 'BASE CAMP', 0xe27c3a));
world.add(makeMarker(-20, 8, 'HUTAN PINUS', 0x3a854a));
world.add(makeMarker(18, 4, 'AIR TERJUN', 0x48dbfb));
world.add(makeMarker(-8, -10, 'DANAU BEKU', 0x6bc7e6));
world.add(makeMarker(6, -6, 'JEMBATAN TALI', 0xb06a3a));
world.add(makeMarker(4, 4, 'PUNCAK 100m', 0xf2b135));

// Trail stones (visible pebbles along climbing route)
const trail = [
    [0, 34], [-2, 28], [-4, 22], [-6, 16], [-6, 8],
    [-3, 2], [0, -3], [2, -8], [4, -4], [3, 0]
];
trail.forEach(([x, z]) => {
    const stone = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.25, 1.2),
        mat(0xb0a99a, { roughness: 1, flatShading: true })
    );
    stone.position.set(x, terrainHeight(x, z) + 0.12, z);
    stone.rotation.y = Math.random() * Math.PI;
    stone.receiveShadow = true;
    world.add(stone);
});

// ---------------------------------------------------------------------------
// Decorative clouds
// ---------------------------------------------------------------------------
const clouds = new THREE.Group();
for (let i = 0; i < 14; i++) {
    const c = new THREE.Group();
    const puffs = 3 + Math.floor(Math.random() * 3);
    for (let j = 0; j < puffs; j++) {
        const s = 3 + Math.random() * 2.5;
        const p = box(s, s * 0.55, s, 0xffffff,
            j * 1.6 - 2, 0, (Math.random() - 0.5) * 1.5);
        p.material = new THREE.MeshStandardMaterial({
            color: 0xffffff, roughness: 0.95, flatShading: true
        });
        c.add(p);
    }
    const a = (i / 14) * Math.PI * 2;
    c.position.set(Math.cos(a) * 100, 55 + Math.random() * 18, Math.sin(a) * 100);
    c.userData.speed = 0.0015 + Math.random() * 0.003;
    c.userData.angle = a;
    c.userData.radius = 100 + Math.random() * 10;
    c.userData.yBase = c.position.y;
    clouds.add(c);
}
scene.add(clouds);

// Distant mountain silhouettes (background)
for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const r = 160;
    const m = new THREE.Mesh(
        new THREE.ConeGeometry(18 + Math.random() * 8, 30 + Math.random() * 15, 5),
        mat(0x7e98b3, { roughness: 1, flatShading: true })
    );
    m.position.set(Math.cos(a) * r, 10, Math.sin(a) * r);
    m.rotation.y = Math.random();
    scene.add(m);
}

// ---------------------------------------------------------------------------
// AVATAR (blocky Roblox-style hiker)
// ---------------------------------------------------------------------------
function buildAvatar(colors) {
    const g = new THREE.Group();

    const head = box(1, 1, 1, colors.skin, 0, 0, 0);
    head.position.y = 3.7;
    g.add(head);

    // Face texture
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 128; faceCanvas.height = 128;
    const fc = faceCanvas.getContext('2d');
    fc.fillStyle = '#' + colors.skin.toString(16).padStart(6, '0');
    fc.fillRect(0, 0, 128, 128);
    fc.fillStyle = '#111';
    fc.fillRect(32, 52, 16, 18);
    fc.fillRect(80, 52, 16, 18);
    fc.strokeStyle = '#111';
    fc.lineWidth = 5;
    fc.beginPath();
    fc.arc(64, 80, 14, 0, Math.PI);
    fc.stroke();
    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.8 })
    );
    face.position.set(0, 3.7, 0.501);
    g.add(face);

    // Beanie / hat (mountain theme)
    const hat = box(1.08, 0.5, 1.08, colors.hat ?? colors.hair, 0, 0, 0);
    hat.position.y = 4.4;
    g.add(hat);
    // Pom-pom
    const pom = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        mat(0xffffff, { roughness: 0.9 })
    );
    pom.position.y = 4.75;
    g.add(pom);

    // Torso / jacket
    const torso = box(1.4, 1.6, 0.8, colors.shirt, 0, 0, 0);
    torso.position.y = 2.4;
    g.add(torso);
    // Backpack
    const pack = box(1.2, 1.2, 0.5, colors.pack ?? 0xb23a2a, 0, 0, 0);
    pack.position.set(0, 2.6, -0.65);
    g.add(pack);
    // Backpack straps
    const strapL = box(0.15, 1, 0.1, 0x3a2a1a, -0.5, 0, 0);
    strapL.position.set(-0.5, 2.5, -0.35);
    g.add(strapL);
    const strapR = box(0.15, 1, 0.1, 0x3a2a1a, 0.5, 0, 0);
    strapR.position.set(0.5, 2.5, -0.35);
    g.add(strapR);

    // Arms
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.95, 3.2, 0);
    leftArm.add(box(0.5, 1.6, 0.8, colors.shirt, 0, -0.8, 0));
    g.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.95, 3.2, 0);
    rightArm.add(box(0.5, 1.6, 0.8, colors.shirt, 0, -0.8, 0));
    g.add(rightArm);

    // Legs
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.35, 1.6, 0);
    leftLeg.add(box(0.6, 1.6, 0.8, colors.pants, 0, -0.8, 0));
    g.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.35, 1.6, 0);
    rightLeg.add(box(0.6, 1.6, 0.8, colors.pants, 0, -0.8, 0));
    g.add(rightLeg);

    g.userData = { leftArm, rightArm, leftLeg, rightLeg, head };
    return g;
}

// Player
const player = buildAvatar({
    skin: 0xffd9a6, hair: 0x3a2a1a, hat: 0xd94e3a,
    shirt: 0x48dbfb, pants: 0x2a3a5a, pack: 0xf2b135
});
player.position.set(0, terrainHeight(0, 40), 40);
scene.add(player);

// NPC hikers
const npcs = [];
function spawnNPC(name, x, z, colors, roam = true) {
    const a = buildAvatar(colors);
    a.position.set(x, terrainHeight(x, z), z);

    // Floating name tag
    const tagCanvas = document.createElement('canvas');
    tagCanvas.width = 256; tagCanvas.height = 64;
    const tc = tagCanvas.getContext('2d');
    tc.fillStyle = 'rgba(15,20,45,0.82)';
    tc.fillRect(0, 0, 256, 64);
    tc.strokeStyle = '#48dbfb';
    tc.lineWidth = 3;
    tc.strokeRect(2, 2, 252, 60);
    tc.fillStyle = '#fff';
    tc.font = 'bold 30px Arial';
    tc.textAlign = 'center';
    tc.textBaseline = 'middle';
    tc.fillText(name, 128, 34);
    const tagTex = new THREE.CanvasTexture(tagCanvas);
    tagTex.colorSpace = THREE.SRGBColorSpace;
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex, depthTest: false }));
    tag.position.set(0, 5.5, 0);
    tag.scale.set(2.4, 0.6, 1);
    a.add(tag);

    scene.add(a);
    npcs.push({
        mesh: a,
        home: new THREE.Vector3(x, 0, z),
        target: new THREE.Vector3(x, 0, z),
        speed: 0.02 + Math.random() * 0.02,
        roam,
        idleTime: 0,
        waving: false
    });
    return a;
}

// Hikers scattered around the mountain
spawnNPC('Zara', -4, 38, { skin: 0xf5c898, hair: 0xd44, hat: 0xff6b9d, shirt: 0xff9f80, pants: 0x444, pack: 0x5a8a3a });
spawnNPC('Rio',  18, 14, { skin: 0xd4a378, hair: 0x222, hat: 0x2a4a8a, shirt: 0xfeca57, pants: 0x3a4a6a, pack: 0x8a3a2a });
spawnNPC('Luna', -18, -2, { skin: 0xf5c898, hair: 0xa29bfe, hat: 0xa29bfe, shirt: 0xc7b8ff, pants: 0x555, pack: 0x3a7aa8 });
spawnNPC('Kai',  4, -2,   { skin: 0xc28a5a, hair: 0x3a2a1a, hat: 0x2e6b3a, shirt: 0x55efc4, pants: 0x222a3a, pack: 0xe27c3a });

// One NPC stationed at summit (waving)
const summitNPC = npcs[3];
summitNPC.home.set(0, 0, -0.5);
summitNPC.mesh.position.set(0, terrainHeight(0, -0.5), -0.5);
summitNPC.waving = true;
summitNPC.roam = false;

// ---------------------------------------------------------------------------
// Proximity voice ripple (keep, like walkie-talkie presence)
// ---------------------------------------------------------------------------
const ripple = new THREE.Mesh(
    new THREE.RingGeometry(3.5, 4, 48),
    new THREE.MeshBasicMaterial({
        color: 0x48dbfb, transparent: true, opacity: 0.5, side: THREE.DoubleSide
    })
);
ripple.rotation.x = -Math.PI / 2;
scene.add(ripple);

const ripple2 = ripple.clone();
ripple2.material = ripple.material.clone();
scene.add(ripple2);

// NPC speaking rings
const npcRings = npcs.map(() => {
    const r = new THREE.Mesh(
        new THREE.RingGeometry(2.5, 3, 32),
        new THREE.MeshBasicMaterial({
            color: 0xff6b9d, transparent: true, opacity: 0.6, side: THREE.DoubleSide
        })
    );
    r.rotation.x = -Math.PI / 2;
    r.visible = false;
    scene.add(r);
    return r;
});

// ---------------------------------------------------------------------------
// INPUT
// ---------------------------------------------------------------------------
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mouse look (orbit around player)
let cameraYaw = 0;
let cameraPitch = -0.35;
let cameraDistance = 16;
let isDragging = false;
let dragStart = { x: 0, y: 0 };

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
});
window.addEventListener('mouseup', () => { isDragging = false; });
window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    cameraYaw -= dx * 0.005;
    cameraPitch -= dy * 0.005;
    cameraPitch = Math.max(-1.2, Math.min(-0.05, cameraPitch));
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
});
canvas.addEventListener('wheel', (e) => {
    cameraDistance = Math.max(6, Math.min(36, cameraDistance + e.deltaY * 0.02));
    e.preventDefault();
}, { passive: false });

// Touch
let touchStart = { x: 0, y: 0, id: null };
canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        touchStart.x = e.touches[0].clientX;
        touchStart.y = e.touches[0].clientY;
        touchStart.id = e.touches[0].identifier;
    }
}, { passive: true });
canvas.addEventListener('touchmove', (e) => {
    for (const t of e.touches) {
        if (t.identifier === touchStart.id) {
            const dx = t.clientX - touchStart.x;
            const dy = t.clientY - touchStart.y;
            cameraYaw -= dx * 0.01;
            cameraPitch = Math.max(-1.2, Math.min(-0.05, cameraPitch - dy * 0.01));
            touchStart.x = t.clientX;
            touchStart.y = t.clientY;
        }
    }
}, { passive: true });

// ---------------------------------------------------------------------------
// UI bindings
// ---------------------------------------------------------------------------
let isNight = false;
let micOn = true;
let emoteTimer = 0;
let emoteType = null; // 'wave' | 'dance'
let cameraMode = 0;

const btnMic   = document.getElementById('btnMic');
const btnDance = document.getElementById('btnDance');
const btnWave  = document.getElementById('btnWave');
const btnTime  = document.getElementById('btnTime');
const btnView  = document.getElementById('btnView');

btnMic.addEventListener('click', toggleMic);
btnDance.addEventListener('click', () => triggerEmote('dance'));
btnWave.addEventListener('click', () => triggerEmote('wave'));
btnTime.addEventListener('click', toggleTime);
btnView.addEventListener('click', cycleCamera);

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'm') toggleMic();
    if (k === 'e') triggerEmote('dance');
    if (k === 'q') triggerEmote('wave');
    if (k === 't') toggleTime();
    if (k === 'v') cycleCamera();
});

function toggleMic() {
    micOn = !micOn;
    btnMic.classList.toggle('active', micOn);
    btnMic.querySelector('.icon').textContent = micOn ? '📻' : '🔇';
    btnMic.querySelector('.label').textContent = micOn ? 'Radio ON' : 'Radio OFF';
    ripple.visible = micOn;
    ripple2.visible = micOn;

    const selfMic = document.querySelector('.player-item.self .mic-indicator');
    selfMic.className = micOn ? 'mic-indicator on' : 'mic-indicator off';
    selfMic.textContent = micOn ? '📻' : '🔇';
}

function triggerEmote(type) {
    emoteType = type;
    emoteTimer = 2.0;
    const bubble = document.getElementById('emoteBubble');
    bubble.textContent = type === 'wave' ? '👋 Halo pendaki!' : '💃 Yuhuuu!';
    bubble.classList.add('show');
    setTimeout(() => bubble.classList.remove('show'), 1500);
}

function toggleTime() {
    isNight = !isNight;
    btnTime.querySelector('.icon').textContent = isNight ? '☀️' : '🌙';
    btnTime.querySelector('.label').textContent = isNight ? 'Siang' : 'Malam';
    document.getElementById('timeIcon').textContent = isNight ? '🌙' : '☀️';
    document.getElementById('timeName').textContent = isNight ? 'Malam' : 'Siang';
}

function cycleCamera() {
    cameraMode = (cameraMode + 1) % 3;
    const labels = ['Follow', 'Cinema', 'Close'];
    btnView.querySelector('.label').textContent = labels[cameraMode];
}

btnMic.classList.add('active');

// ---------------------------------------------------------------------------
// Zones (for HUD detection)
// ---------------------------------------------------------------------------
const zones = [
    { name: 'Base Camp',     icon: '⛺',  x: 0,   z: 42,  r: 10 },
    { name: 'Hutan Pinus',   icon: '🌲', x: -28, z: 12,  r: 16 },
    { name: 'Air Terjun',    icon: '💦', x: 30,  z: 10,  r: 8  },
    { name: 'Danau Beku',    icon: '🧊', x: -14, z: -18, r: 10 },
    { name: 'Jembatan Tali', icon: '🌉', x: 15,  z: -13, r: 8  },
    { name: 'Puncak Blox',   icon: '🏔️', x: 0,   z: 0,   r: 6  }
];

function updateZoneHUD() {
    let found = null;
    for (const z of zones) {
        const dx = player.position.x - z.x;
        const dz = player.position.z - z.z;
        if (Math.sqrt(dx * dx + dz * dz) < z.r) { found = z; break; }
    }
    const nameEl = document.getElementById('zoneName');
    const iconEl = document.getElementById('zoneIcon');
    const pill   = document.getElementById('zoneInfo');
    const target = found ? found.name : 'Menjelajah...';
    if (nameEl.textContent !== target) {
        nameEl.textContent = target;
        iconEl.textContent = found ? found.icon : '🗺️';
        pill.classList.add('changed');
        setTimeout(() => pill.classList.remove('changed'), 300);
    }

    // Altitude display
    const altEl = document.getElementById('altitudeValue');
    if (altEl) {
        const alt = Math.round(terrainHeight(player.position.x, player.position.z) * 90);
        altEl.textContent = alt + ' m';
    }
}

// ---------------------------------------------------------------------------
// ANIMATION loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let velocityY = 0;
let isGrounded = true;

function animate() {
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.getElapsedTime();

    // ---- PLAYER MOVEMENT ----
    const moveSpeed = (keys['shift'] ? 14 : 7) * dt;
    let moveX = 0, moveZ = 0;
    if (keys['w']) moveZ -= 1;
    if (keys['s']) moveZ += 1;
    if (keys['a']) moveX -= 1;
    if (keys['d']) moveX += 1;

    const len = Math.hypot(moveX, moveZ);
    if (len > 0) {
        moveX /= len; moveZ /= len;
        const cy = Math.cos(cameraYaw), sy = Math.sin(cameraYaw);
        const rx = moveX * cy - moveZ * sy;
        const rz = moveX * sy + moveZ * cy;
        player.position.x += rx * moveSpeed;
        player.position.z += rz * moveSpeed;
        player.rotation.y = Math.atan2(rx, rz);
    }

    // Keep inside playable area
    const pDist = Math.hypot(player.position.x, player.position.z);
    if (pDist > 70) {
        player.position.x *= 70 / pDist;
        player.position.z *= 70 / pDist;
    }

    // Terrain-aware gravity
    const groundY = terrainHeight(player.position.x, player.position.z);
    if (keys[' '] && isGrounded) {
        velocityY = 11;
        isGrounded = false;
    }
    velocityY -= 28 * dt;
    player.position.y += velocityY * dt;
    if (player.position.y <= groundY) {
        player.position.y = groundY;
        velocityY = 0;
        isGrounded = true;
    }

    // Tilt body forward slightly when climbing uphill
    const uphill = terrainHeight(player.position.x + Math.sin(player.rotation.y),
                                 player.position.z + Math.cos(player.rotation.y)) - groundY;
    player.rotation.x = THREE.MathUtils.clamp(uphill * 0.25, -0.35, 0.35);

    // Walk animation
    const walking = len > 0 && isGrounded;
    const walkSpeed = keys['shift'] ? 12 : 8;
    const { leftArm, rightArm, leftLeg, rightLeg, head } = player.userData;

    if (emoteTimer > 0) {
        emoteTimer -= dt;
        if (emoteType === 'wave') {
            rightArm.rotation.z = -Math.PI / 2 + Math.sin(t * 10) * 0.3;
            rightArm.rotation.x = 0;
            leftArm.rotation.x = 0;
            leftArm.rotation.z = 0;
            leftLeg.rotation.x = 0;
            rightLeg.rotation.x = 0;
        } else if (emoteType === 'dance') {
            const s = Math.sin(t * 8);
            leftArm.rotation.z = -0.4 + s * 0.6;
            rightArm.rotation.z = 0.4 - s * 0.6;
            leftArm.rotation.x = Math.sin(t * 8) * 0.5;
            rightArm.rotation.x = -Math.sin(t * 8) * 0.5;
            player.position.y = groundY + Math.abs(Math.sin(t * 8)) * 0.4;
            head.rotation.z = Math.sin(t * 4) * 0.15;
        }
    } else if (walking) {
        const swing = Math.sin(t * walkSpeed);
        leftArm.rotation.x = swing * 0.6;
        rightArm.rotation.x = -swing * 0.6;
        leftLeg.rotation.x = -swing * 0.6;
        rightLeg.rotation.x = swing * 0.6;
        leftArm.rotation.z = 0;
        rightArm.rotation.z = 0;
        head.rotation.z = 0;
    } else {
        const s = Math.sin(t * 1.5) * 0.05;
        leftArm.rotation.x = s;
        rightArm.rotation.x = -s;
        leftArm.rotation.z = 0;
        rightArm.rotation.z = 0;
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        head.rotation.z = 0;
    }

    // ---- CAMERA ----
    const camTargets = {
        0: { dist: cameraDistance, height: 6, lookAhead: 2 },
        1: { dist: 30,             height: 14, lookAhead: 0 },
        2: { dist: 5,              height: 3,  lookAhead: 1 }
    };
    const cfg = camTargets[cameraMode];
    const camX = player.position.x - Math.sin(cameraYaw) * cfg.dist * Math.cos(cameraPitch);
    const camZ = player.position.z - Math.cos(cameraYaw) * cfg.dist * Math.cos(cameraPitch);
    const camY = player.position.y + cfg.height - cfg.dist * Math.sin(cameraPitch);
    camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.15);
    camera.lookAt(player.position.x, player.position.y + cfg.lookAhead + 2, player.position.z);

    // ---- NPC AI ----
    npcs.forEach((npc, idx) => {
        if (npc.waving) {
            const a = npc.mesh.userData;
            a.rightArm.rotation.z = -Math.PI / 2 + Math.sin(t * 4 + idx) * 0.4;
            a.leftArm.rotation.x = 0;
            a.leftArm.rotation.z = 0;
            a.head.rotation.z = Math.sin(t * 2) * 0.08;
            npc.mesh.position.y = terrainHeight(npc.mesh.position.x, npc.mesh.position.z)
                + Math.abs(Math.sin(t * 1.5)) * 0.05;
            return;
        }

        // Roaming
        npc.idleTime -= dt;
        if (npc.idleTime <= 0) {
            const ang = Math.random() * Math.PI * 2;
            const rad = 4 + Math.random() * 7;
            npc.target.set(
                npc.home.x + Math.cos(ang) * rad,
                0,
                npc.home.z + Math.sin(ang) * rad
            );
            npc.idleTime = 3 + Math.random() * 4;
        }

        const dx = npc.target.x - npc.mesh.position.x;
        const dz = npc.target.z - npc.mesh.position.z;
        const d = Math.hypot(dx, dz);

        if (d > 0.25) {
            const nx = dx / d;
            const nz = dz / d;
            npc.mesh.position.x += nx * npc.speed;
            npc.mesh.position.z += nz * npc.speed;
            npc.mesh.position.y = terrainHeight(npc.mesh.position.x, npc.mesh.position.z);
            npc.mesh.rotation.y = Math.atan2(nx, nz);

            const a = npc.mesh.userData;
            const sw = Math.sin(t * 8 + idx);
            a.leftArm.rotation.x = sw * 0.5;
            a.rightArm.rotation.x = -sw * 0.5;
            a.leftLeg.rotation.x = -sw * 0.5;
            a.rightLeg.rotation.x = sw * 0.5;
        } else {
            const a = npc.mesh.userData;
            a.leftArm.rotation.x *= 0.9;
            a.rightArm.rotation.x *= 0.9;
            a.leftLeg.rotation.x *= 0.9;
            a.rightLeg.rotation.x *= 0.9;
            npc.mesh.position.y = terrainHeight(npc.mesh.position.x, npc.mesh.position.z);
        }

        // Occasional radio chatter
        const speaking = (idx === 1 || idx === 2) && (Math.sin(t * 2 + idx * 5) > 0.2);
        npcRings[idx].visible = speaking;
        if (speaking) {
            npcRings[idx].position.set(
                npc.mesh.position.x,
                npc.mesh.position.y + 0.12,
                npc.mesh.position.z
            );
            const s = 1 + (Math.sin(t * 4 + idx) + 1) * 0.3;
            npcRings[idx].scale.set(s, s, 1);
            npcRings[idx].material.opacity = 0.6 - (s - 1) * 0.8;
        }
    });

    // ---- ENVIRONMENT ANIM ----
    // Radio ripple under player
    if (micOn) {
        ripple.position.set(player.position.x, player.position.y + 0.05, player.position.z);
        ripple2.position.set(player.position.x, player.position.y + 0.05, player.position.z);
        const s1 = 1 + ((t * 1.5) % 1) * 1.2;
        const s2 = 1 + ((t * 1.5 + 0.5) % 1) * 1.2;
        ripple.scale.set(s1, s1, 1);
        ripple2.scale.set(s2, s2, 1);
        ripple.material.opacity  = 0.5 * (1 - ((t * 1.5) % 1));
        ripple2.material.opacity = 0.5 * (1 - ((t * 1.5 + 0.5) % 1));
    }

    // Clouds drift
    clouds.children.forEach((c) => {
        c.userData.angle += c.userData.speed * dt * 10;
        c.position.x = Math.cos(c.userData.angle) * c.userData.radius;
        c.position.z = Math.sin(c.userData.angle) * c.userData.radius;
        c.position.y = c.userData.yBase + Math.sin(t * 0.5 + c.userData.angle) * 0.6;
    });

    // Waterfall scroll
    waterSheets.forEach((s, i) => {
        s.material.opacity = 0.4 + Math.sin(t * 4 + s.userData.phase) * 0.15 + 0.2;
        s.position.y = (wfTopY + wfBotY) / 2 + Math.sin(t * 2 + i) * 0.05;
    });
    mistParticles.forEach((p, i) => {
        const b = p.userData.base;
        p.position.x = b.x + Math.sin(t * 2 + i) * 0.4;
        p.position.y = b.y + ((t * 0.8 + i * 0.3) % 2);
        p.material.opacity = 0.6 * (1 - (((t * 0.8 + i * 0.3) % 2) / 2));
    });

    // Splash shimmer
    splash.material.opacity = 0.7 + Math.sin(t * 3) * 0.1;

    // Campfire dance
    fireCones.forEach((c, i) => {
        c.rotation.y += dt * (2 + i);
        c.scale.y = 1 + Math.sin(t * 8 + i) * 0.18;
        c.position.x = Math.sin(t * 6 + i) * 0.08;
        c.position.z = Math.cos(t * 5 + i) * 0.08;
    });
    fireLight.intensity = 2.8 + Math.sin(t * 10) * 0.9 + Math.sin(t * 16) * 0.4;

    // Flag wave (animate vertex positions)
    const flagPos = flag.geometry.attributes.position;
    for (let i = 0; i < flagPos.count; i++) {
        const fx = flagPos.getX(i);
        const wave = Math.sin(t * 5 + fx * 2) * 0.12 * (fx + 1.2) / 2.4;
        flagPos.setZ(i, wave);
    }
    flagPos.needsUpdate = true;

    // Summit cairn slight glow at night
    if (isNight) {
        summitPlatform.material.emissive = new THREE.Color(0x556688);
        summitPlatform.material.emissiveIntensity = 0.15;
    } else {
        summitPlatform.material.emissiveIntensity = 0;
    }

    // ---- DAY / NIGHT ----
    const nightTarget = isNight ? 1 : 0;
    scene.userData.nightLerp = (scene.userData.nightLerp ?? 0) * 0.95 + nightTarget * 0.05;
    const n = scene.userData.nightLerp;

    const daySky   = new THREE.Color(0xbcd8ea);
    const nightSky = new THREE.Color(0x0b1335);
    const sky = daySky.clone().lerp(nightSky, n);
    scene.background = sky;
    scene.fog.color.copy(sky);

    sun.intensity  = 1.35 * (1 - n) + 0.15 * n;
    sun.color.setHex(isNight ? 0x8899ff : 0xfff4d8);
    hemi.intensity = 0.6 * (1 - n) + 0.32 * n;
    hemi.color.setHex(n > 0.5 ? 0x4466aa : 0xc8e0ff);
    ambient.intensity = 0.28 + n * 0.15;

    // ---- HUD ----
    updateZoneHUD();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// ---------------------------------------------------------------------------
// RESIZE & START
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// Hide loader
setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('hidden');
    setTimeout(() => {
        document.getElementById('loadingScreen').remove();
    }, 700);
}, 2200);

animate();
