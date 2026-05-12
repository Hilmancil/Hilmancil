// ==========================================================================
// BLOX HANGOUT - Voice Chat Island (Roblox-style)
// A colorful 3D voice hangout map built with Three.js
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
scene.fog = new THREE.Fog(0x9bd4ff, 60, 260);
scene.background = new THREE.Color(0x9bd4ff);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 12, 22);

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------
const hemi = new THREE.HemisphereLight(0xaee6ff, 0x5a8a4d, 0.65);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff4e0, 1.25);
sun.position.set(40, 60, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 200;
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
sun.shadow.bias = -0.0005;
scene.add(sun);

// Ambient fill
const ambient = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambient);

// ---------------------------------------------------------------------------
// Helpers - Material & Mesh factories
// ---------------------------------------------------------------------------
const matCache = new Map();
function mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (matCache.has(key)) return matCache.get(key);
    const m = new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.75,
        metalness: opts.metalness ?? 0,
        transparent: opts.transparent ?? false,
        opacity: opts.opacity ?? 1,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 0
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
// The island (ground)
// ---------------------------------------------------------------------------
const world = new THREE.Group();
scene.add(world);

// Water (the sea around the island)
const seaGeo = new THREE.PlaneGeometry(600, 600, 40, 40);
const seaMat = new THREE.MeshStandardMaterial({
    color: 0x3ab7dc,
    roughness: 0.35,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92
});
const sea = new THREE.Mesh(seaGeo, seaMat);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -0.4;
sea.receiveShadow = true;
world.add(sea);

// Island base (big cylinder like a floating slice of land)
const islandBase = new THREE.Mesh(
    new THREE.CylinderGeometry(55, 60, 4, 32),
    mat(0x8b6a45, { roughness: 0.95 })
);
islandBase.position.y = -1.8;
islandBase.receiveShadow = true;
world.add(islandBase);

// Grassy top (a slightly smaller rounded disc on top)
const grass = new THREE.Mesh(
    new THREE.CylinderGeometry(54, 54, 0.6, 48),
    mat(0x66c75f, { roughness: 0.9 })
);
grass.position.y = 0.1;
grass.receiveShadow = true;
world.add(grass);

// Beach ring (sandy edge)
const beach = new THREE.Mesh(
    new THREE.RingGeometry(52, 56, 48),
    mat(0xf2d9a0, { roughness: 1 })
);
beach.rotation.x = -Math.PI / 2;
beach.position.y = 0.12;
beach.receiveShadow = true;
world.add(beach);

// Decorative tile plaza in the center
for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
        const tile = new THREE.Mesh(
            new THREE.BoxGeometry(3.8, 0.2, 3.8),
            mat((i + j) % 2 === 0 ? 0xf5c5d8 : 0xffe9c7, { roughness: 0.8 })
        );
        tile.position.set(i * 4, 0.5, j * 4);
        tile.receiveShadow = true;
        world.add(tile);
    }
}

// Center fountain statue (pink/cyan checker pillar with a topper)
const fountainBase = cyl(3.2, 0.6, 0xcccccc, 0, 0.5, 0, { roughness: 0.6 });
world.add(fountainBase);
const fountainPool = cyl(3.0, 0.3, 0x7fd8ff, 0, 1.1, 0, { metalness: 0.2, roughness: 0.2, transparent: true, opacity: 0.85 });
world.add(fountainPool);
const fountainPillar = cyl(0.5, 3.5, 0xffffff, 0, 1.4, 0);
world.add(fountainPillar);
const fountainTop = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.9, 0),
    mat(0xff6b9d, { emissive: 0xff3377, emissiveIntensity: 0.3 })
);
fountainTop.position.set(0, 5.4, 0);
fountainTop.castShadow = true;
world.add(fountainTop);

// ---------------------------------------------------------------------------
// Trees (low-poly blocky trees)
// ---------------------------------------------------------------------------
function makeTree(x, z, scale = 1) {
    const g = new THREE.Group();
    const trunk = box(1, 3, 1, 0x6b4423, 0, 0, 0);
    trunk.castShadow = true;
    g.add(trunk);

    // Layered leaves
    const leafColors = [0x3fa847, 0x52c25a, 0x4cb854];
    for (let i = 0; i < 3; i++) {
        const s = 3.2 - i * 0.6;
        const leaf = box(s, 1.6, s, leafColors[i], 0, 2.5 + i * 1.2, 0);
        g.add(leaf);
    }

    g.position.set(x, 0.2, z);
    g.scale.setScalar(scale);
    world.add(g);
}

// Palm tree for beach
function makePalm(x, z) {
    const g = new THREE.Group();
    // curved trunk
    for (let i = 0; i < 6; i++) {
        const t = box(0.7 - i * 0.04, 0.9, 0.7 - i * 0.04, 0x9b6b3f, i * 0.1, i * 0.9, 0);
        t.rotation.z = -i * 0.04;
        g.add(t);
    }
    // coconut leaves
    const leafMat = mat(0x3fa847, { roughness: 0.8 });
    for (let i = 0; i < 6; i++) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 0.8), leafMat);
        leaf.position.set(0.5, 5.6, 0);
        leaf.rotation.y = (i / 6) * Math.PI * 2;
        leaf.rotation.z = -0.35;
        leaf.position.x += Math.cos(leaf.rotation.y) * 1.5;
        leaf.position.z += Math.sin(leaf.rotation.y) * 1.5;
        leaf.castShadow = true;
        g.add(leaf);
    }
    // coconuts
    for (let i = 0; i < 3; i++) {
        const nut = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 8, 8),
            mat(0x5a3825)
        );
        const a = (i / 3) * Math.PI * 2;
        nut.position.set(0.5 + Math.cos(a) * 0.6, 5.3, Math.sin(a) * 0.6);
        g.add(nut);
    }
    g.position.set(x, 0.2, z);
    world.add(g);
}

// Scatter trees in grassy areas (avoid plaza)
const treeSpots = [
    [-22, -10, 1], [-28, 6, 1.2], [-24, 22, 1], [-14, 30, 0.9],
    [12, 28, 1.1], [24, 20, 1], [30, 4, 1.2], [26, -16, 0.9],
    [14, -26, 1], [-8, -30, 1.1], [-32, -20, 1],
    [-40, 12, 0.85], [38, -10, 0.95], [38, 22, 0.9]
];
treeSpots.forEach(([x, z, s]) => makeTree(x, z, s));

// Palms along the beach
const palmSpots = [
    [48, 0], [44, 20], [30, 42], [6, 50], [-20, 46],
    [-42, 28], [-50, 0], [-44, -22], [-24, -44], [0, -50], [26, -42], [44, -24]
];
palmSpots.forEach(([x, z]) => makePalm(x, z));

// ---------------------------------------------------------------------------
// ZONE 1 - Spawn Plaza (center) - already built with tiles + fountain
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ZONE 2 - DJ Stage / Dance Floor
// ---------------------------------------------------------------------------
const djZone = new THREE.Group();
djZone.position.set(-28, 0, -22);
world.add(djZone);

// Dance floor (tiled glowing squares)
const floorTiles = [];
for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
        const c = [0xff3377, 0xff9900, 0xffee00, 0x00ddaa, 0x00aaff, 0xaa33ff][Math.abs(i + j) % 6];
        const tile = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.2, 1.8),
            new THREE.MeshStandardMaterial({
                color: c,
                emissive: c,
                emissiveIntensity: 0.35,
                roughness: 0.4
            })
        );
        tile.position.set(i * 2, 0.2, j * 2);
        tile.receiveShadow = true;
        djZone.add(tile);
        floorTiles.push({ mesh: tile, baseColor: c, offset: Math.random() * Math.PI * 2 });
    }
}

// Stage platform
const stage = box(10, 1, 5, 0x2a2a3a, 0, 0, -10, { roughness: 0.6 });
djZone.add(stage);

// DJ booth (box with turntables)
const booth = box(4, 2, 2, 0x1a1a2e, 0, 1, -10.5);
djZone.add(booth);
// Turntable discs
for (let i = -1; i <= 1; i += 2) {
    const tt = cyl(0.6, 0.15, 0x111111, i * 1, 3, -10.5, { metalness: 0.5, roughness: 0.3 });
    djZone.add(tt);
    const center = cyl(0.15, 0.2, 0xff6b9d, i * 1, 3.1, -10.5, { emissive: 0xff6b9d, emissiveIntensity: 0.6 });
    djZone.add(center);
}

// Speakers (tall black boxes with cones)
function makeSpeaker(x, z) {
    const g = new THREE.Group();
    const body = box(2, 4, 2, 0x0f0f16, 0, 0, 0);
    g.add(body);
    const cone1 = cyl(0.7, 0.3, 0x333333, 0, 2.8, 0.9, { metalness: 0.3 });
    cone1.rotation.x = Math.PI / 2;
    cone1.position.set(0, 2.8, 1.05);
    g.add(cone1);
    const cone2 = cyl(0.5, 0.3, 0x333333, 0, 1.6, 0.9, { metalness: 0.3 });
    cone2.rotation.x = Math.PI / 2;
    cone2.position.set(0, 1.6, 1.05);
    g.add(cone2);
    g.position.set(x, 0.2, z);
    return g;
}
djZone.add(makeSpeaker(-5, -11));
djZone.add(makeSpeaker(5, -11));

// Stage lights (point lights with colored emissive)
const stageLights = [];
const lightColors = [0xff3377, 0x00ddff, 0xffaa00];
for (let i = 0; i < 3; i++) {
    const lampBox = box(0.8, 0.8, 0.8, 0x222222, -4 + i * 4, 6, -11);
    djZone.add(lampBox);
    const pl = new THREE.PointLight(lightColors[i], 2.5, 18);
    pl.position.set(-4 + i * 4, 6, -11);
    djZone.add(pl);
    stageLights.push(pl);
}

// Disco ball hanging in front
const disco = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.95, roughness: 0.15, emissive: 0x555555 })
);
disco.position.set(0, 7, -3);
disco.castShadow = true;
djZone.add(disco);

// Poles for ropes (dance floor boundary)
for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const pole = cyl(0.15, 1.2, 0xeeeeee, Math.cos(a) * 8, 0, Math.sin(a) * 8, { metalness: 0.7 });
    djZone.add(pole);
}

// ---------------------------------------------------------------------------
// ZONE 3 - Pool Party
// ---------------------------------------------------------------------------
const poolZone = new THREE.Group();
poolZone.position.set(28, 0, -22);
world.add(poolZone);

// Pool deck (tile surround)
const deck = box(22, 0.4, 18, 0xf0e0c8, 0, 0, 0, { roughness: 0.9 });
poolZone.add(deck);

// Pool hole (dark liner)
const liner = box(14, 1, 10, 0x0d5a8f, 0, -0.6, 0, { roughness: 0.3 });
poolZone.add(liner);

// Water plane (animated)
const poolWater = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 10, 14, 10),
    new THREE.MeshStandardMaterial({
        color: 0x5ec4e8,
        transparent: true,
        opacity: 0.8,
        metalness: 0.2,
        roughness: 0.15,
        emissive: 0x1e4a6a,
        emissiveIntensity: 0.15
    })
);
poolWater.rotation.x = -Math.PI / 2;
poolWater.position.y = 0.15;
poolWater.receiveShadow = true;
poolZone.add(poolWater);

// Pool ladder
const ladder1 = box(0.2, 0.8, 1, 0xcccccc, -6, 0.4, 4, { metalness: 0.6 });
const ladder2 = box(0.2, 0.8, 1, 0xcccccc, -6, 0.4, -4, { metalness: 0.6 });
poolZone.add(ladder1, ladder2);

// Pool deck chairs
function makeLounger(x, z, rotY = 0) {
    const g = new THREE.Group();
    const seat = box(3, 0.3, 1, 0xffffff, 0, 0.5, 0);
    g.add(seat);
    for (let i = -1; i <= 1; i += 2) {
        const leg = box(0.2, 0.5, 0.2, 0xdddddd, i * 1.3, 0, 0);
        g.add(leg);
    }
    // Pillow
    const pillow = box(0.9, 0.2, 0.8, 0xff6b9d, 1, 0.95, 0);
    g.add(pillow);
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    return g;
}
poolZone.add(makeLounger(8, 6));
poolZone.add(makeLounger(8, 3));
poolZone.add(makeLounger(8, 0));
poolZone.add(makeLounger(8, -3));

// Floating rubber ring
const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.35, 10, 24),
    mat(0xff9933, { roughness: 0.6 })
);
ring.position.set(3, 0.3, 2);
ring.rotation.x = Math.PI / 2;
ring.castShadow = true;
poolZone.add(ring);

// Umbrella
function makeUmbrella(x, z) {
    const g = new THREE.Group();
    const pole = cyl(0.1, 4, 0x777777, 0, 0, 0, { metalness: 0.5 });
    g.add(pole);
    const top = new THREE.Mesh(
        new THREE.ConeGeometry(2.2, 0.9, 8),
        mat(0xff3377, { roughness: 0.8 })
    );
    top.position.y = 4.4;
    top.castShadow = true;
    g.add(top);
    g.position.set(x, 0.2, z);
    return g;
}
poolZone.add(makeUmbrella(-8, -6));
poolZone.add(makeUmbrella(8, 7));

// ---------------------------------------------------------------------------
// ZONE 4 - Cafe / Hangout
// ---------------------------------------------------------------------------
const cafeZone = new THREE.Group();
cafeZone.position.set(28, 0, 22);
world.add(cafeZone);

// Cafe floor (wooden deck)
const cafeDeck = box(18, 0.3, 16, 0xb07a4a, 0, 0, 0);
cafeZone.add(cafeDeck);

// Walls (open cafe - only 2 walls + awning)
const wallBack  = box(18, 5, 0.4, 0xfff1db, 0, 0.3, -8);
const wallSide  = box(0.4, 5, 16, 0xfff1db, -9, 0.3, 0);
cafeZone.add(wallBack, wallSide);

// Striped awning
for (let i = 0; i < 9; i++) {
    const stripe = box(2, 0.2, 3, i % 2 === 0 ? 0xff3377 : 0xffffff, -8 + i * 2, 5.2, -6.5);
    stripe.rotation.x = -0.3;
    cafeZone.add(stripe);
}

// Counter bar
const counter = box(10, 1.2, 1.4, 0x5a3825, 0, 0.3, -5);
cafeZone.add(counter);
const counterTop = box(10.4, 0.15, 1.8, 0x3a251a, 0, 1.5, -5);
cafeZone.add(counterTop);

// Coffee machine on counter
const machine = box(1.5, 1.5, 1, 0x3a3a3a, -3, 1.6, -5, { metalness: 0.4 });
cafeZone.add(machine);
const spout = box(0.3, 0.4, 0.4, 0xbbbbbb, -3, 2.1, -4.4, { metalness: 0.8 });
cafeZone.add(spout);

// Cake display case
const cakeCase = box(2, 1, 1.2, 0xddf2ff, 2, 1.6, -5, { transparent: true, opacity: 0.4, roughness: 0.1 });
cafeZone.add(cakeCase);
const cake = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.6, 16),
    mat(0xffc1cc)
);
cake.position.set(2, 1.9, -5);
cafeZone.add(cake);
const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), mat(0xff3333, { emissive: 0xff3333, emissiveIntensity: 0.3 }));
cherry.position.set(2, 2.3, -5);
cafeZone.add(cherry);

// Round tables with chairs
function makeCafeTable(x, z) {
    const g = new THREE.Group();
    const leg = cyl(0.15, 1.4, 0x3a3a3a, 0, 0, 0, { metalness: 0.3 });
    g.add(leg);
    const top = cyl(1.1, 0.15, 0x8a5a35, 0, 1.4, 0);
    g.add(top);

    // 3 stools around
    for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const sx = Math.cos(a) * 1.9;
        const sz = Math.sin(a) * 1.9;
        const stoolLeg = cyl(0.1, 1.0, 0x3a3a3a, sx, 0, sz, { metalness: 0.3 });
        g.add(stoolLeg);
        const stoolTop = cyl(0.35, 0.15, 0xff6b9d, sx, 1.0, sz);
        g.add(stoolTop);
    }
    g.position.set(x, 0.2, z);
    return g;
}
cafeZone.add(makeCafeTable(-3, 3));
cafeZone.add(makeCafeTable(3, 3));
cafeZone.add(makeCafeTable(0, -0.5));

// Menu sign on the wall
const signBoard = box(3, 1.6, 0.1, 0x222222, 0, 2.5, -7.7);
cafeZone.add(signBoard);

// Planters
for (let i = -1; i <= 1; i += 2) {
    const pot = cyl(0.4, 0.6, 0xa85c32, i * 8.3, 0.2, 7);
    cafeZone.add(pot);
    const bush = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 8, 8),
        mat(0x52c25a)
    );
    bush.position.set(i * 8.3, 1.3, 7);
    bush.castShadow = true;
    cafeZone.add(bush);
}

// ---------------------------------------------------------------------------
// ZONE 5 - Campfire Chill Spot
// ---------------------------------------------------------------------------
const fireZone = new THREE.Group();
fireZone.position.set(-28, 0, 22);
world.add(fireZone);

// Stone circle
for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const stone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.5, 0),
        mat(0x666666, { roughness: 1 })
    );
    stone.position.set(Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5);
    stone.castShadow = true;
    fireZone.add(stone);
}

// Logs
for (let i = 0; i < 3; i++) {
    const log = cyl(0.25, 1.4, 0x6b4423, (Math.random() - 0.5) * 0.4, 0.2, (Math.random() - 0.5) * 0.4);
    log.rotation.x = Math.PI / 2;
    log.rotation.z = i * 0.9;
    fireZone.add(log);
}

// Fire (animated cones)
const fireCones = [];
for (let i = 0; i < 5; i++) {
    const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.4 - i * 0.06, 1.2 - i * 0.15, 8),
        new THREE.MeshStandardMaterial({
            color: i < 2 ? 0xffdd33 : (i < 4 ? 0xff8833 : 0xff3311),
            emissive: i < 2 ? 0xffdd33 : 0xff5500,
            emissiveIntensity: 1.8,
            transparent: true,
            opacity: 0.85
        })
    );
    cone.position.y = 0.8 + i * 0.3;
    fireCones.push(cone);
    fireZone.add(cone);
}

const fireLight = new THREE.PointLight(0xff7733, 3, 22);
fireLight.position.set(0, 2, 0);
fireZone.add(fireLight);

// Benches around the fire
function makeBench(x, z, rotY) {
    const g = new THREE.Group();
    const seat = box(3, 0.2, 0.7, 0x8a5a35, 0, 0.5, 0);
    g.add(seat);
    for (let i = -1; i <= 1; i += 2) {
        const leg = box(0.2, 0.5, 0.7, 0x6b4423, i * 1.2, 0, 0);
        g.add(leg);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    return g;
}
fireZone.add(makeBench(0, 3.5, 0));
fireZone.add(makeBench(3.5, 0, Math.PI / 2));
fireZone.add(makeBench(0, -3.5, 0));
fireZone.add(makeBench(-3.5, 0, Math.PI / 2));

// String lights between poles (cafe lights)
for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const pole = cyl(0.08, 5, 0x3a3a3a, Math.cos(a) * 5, 0, Math.sin(a) * 5);
    fireZone.add(pole);
}
// Lantern bulbs - circling above
for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffd070, emissiveIntensity: 1.2 })
    );
    bulb.position.set(Math.cos(a) * 5, 4.5, Math.sin(a) * 5);
    fireZone.add(bulb);
}

// ---------------------------------------------------------------------------
// Decorative clouds (blocky)
// ---------------------------------------------------------------------------
const clouds = new THREE.Group();
for (let i = 0; i < 12; i++) {
    const c = new THREE.Group();
    const puffs = 3 + Math.floor(Math.random() * 3);
    for (let j = 0; j < puffs; j++) {
        const s = 3 + Math.random() * 2;
        const p = box(s, s * 0.6, s, 0xffffff, j * 1.5 - 2, 0, (Math.random() - 0.5) * 1.5);
        p.castShadow = false;
        p.receiveShadow = false;
        p.material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
        c.add(p);
    }
    const a = (i / 12) * Math.PI * 2;
    c.position.set(Math.cos(a) * 90, 35 + Math.random() * 10, Math.sin(a) * 90);
    c.userData.speed = 0.002 + Math.random() * 0.003;
    c.userData.angle = a;
    c.userData.radius = 90;
    c.userData.yBase = c.position.y;
    clouds.add(c);
}
scene.add(clouds);

// ---------------------------------------------------------------------------
// Signs pointing to zones
// ---------------------------------------------------------------------------
function makeSign(x, z, text, color) {
    const g = new THREE.Group();
    const post = cyl(0.15, 2.5, 0x6b4423, 0, 0, 0);
    g.add(post);
    const board = box(3, 1, 0.15, color, 0, 2.3, 0, { emissive: color, emissiveIntensity: 0.15 });
    g.add(board);

    // Canvas text as texture
    const c = document.createElement('canvas');
    c.width = 256; c.height = 96;
    const cx = c.getContext('2d');
    cx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    cx.fillRect(0, 0, c.width, c.height);
    cx.fillStyle = '#fff';
    cx.font = 'bold 44px Arial';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(text, c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(2.95, 0.95),
        new THREE.MeshBasicMaterial({ map: tex })
    );
    plate.position.set(0, 2.3, 0.09);
    g.add(plate);

    g.position.set(x, 0.2, z);
    g.lookAt(0, 2.3, 0); // face the center plaza
    return g;
}

world.add(makeSign(-14, -12, 'DJ STAGE',  0xff3377));
world.add(makeSign(14, -12,  'POOL',      0x48dbfb));
world.add(makeSign(14, 12,   'CAFE',      0xffaa33));
world.add(makeSign(-14, 12,  'CAMPFIRE',  0xff7733));

// ---------------------------------------------------------------------------
// AVATAR (blocky Roblox-style character)
// ---------------------------------------------------------------------------
function buildAvatar(colors) {
    const g = new THREE.Group();

    const head = box(1, 1, 1, colors.skin, 0, 0, 0);
    head.position.y = 3.7;
    g.add(head);

    // Face (eyes + smile as a texture on front of head)
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 128; faceCanvas.height = 128;
    const fc = faceCanvas.getContext('2d');
    fc.fillStyle = '#' + colors.skin.toString(16).padStart(6, '0');
    fc.fillRect(0, 0, 128, 128);
    fc.fillStyle = '#111';
    fc.fillRect(32, 52, 16, 18);
    fc.fillRect(80, 52, 16, 18);
    // smile
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

    // Hair (small box on top)
    const hair = box(1.05, 0.35, 1.05, colors.hair, 0, 0, 0);
    hair.position.y = 4.35;
    g.add(hair);

    const torso = box(1.4, 1.6, 0.8, colors.shirt, 0, 0, 0);
    torso.position.y = 2.4;
    g.add(torso);

    // Arms (pivot at shoulder for swinging)
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.95, 3.2, 0);
    const leftArmMesh = box(0.5, 1.6, 0.8, colors.skin, 0, -0.8, 0);
    leftArm.add(leftArmMesh);
    g.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.95, 3.2, 0);
    const rightArmMesh = box(0.5, 1.6, 0.8, colors.skin, 0, -0.8, 0);
    rightArm.add(rightArmMesh);
    g.add(rightArm);

    // Legs
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.35, 1.6, 0);
    const leftLegMesh = box(0.6, 1.6, 0.8, colors.pants, 0, -0.8, 0);
    leftLeg.add(leftLegMesh);
    g.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.35, 1.6, 0);
    const rightLegMesh = box(0.6, 1.6, 0.8, colors.pants, 0, -0.8, 0);
    rightLeg.add(rightLegMesh);
    g.add(rightLeg);

    g.userData = { leftArm, rightArm, leftLeg, rightLeg, head };
    return g;
}

// Player avatar
const player = buildAvatar({ skin: 0xffd9a6, hair: 0x3a2a1a, shirt: 0x48dbfb, pants: 0x2a3a5a });
player.position.set(0, 0, 8);
scene.add(player);

// NPC avatars (fake players for vibe)
const npcs = [];
function spawnNPC(name, x, z, colors, roam = true) {
    const a = buildAvatar(colors);
    a.position.set(x, 0, z);

    // Floating name tag
    const tagCanvas = document.createElement('canvas');
    tagCanvas.width = 256; tagCanvas.height = 64;
    const tc = tagCanvas.getContext('2d');
    tc.fillStyle = 'rgba(15,20,45,0.8)';
    tc.fillRect(0, 0, 256, 64);
    tc.strokeStyle = '#48dbfb';
    tc.lineWidth = 3;
    tc.strokeRect(2, 2, 252, 60);
    tc.fillStyle = '#fff';
    tc.font = 'bold 32px Arial';
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
        dancing: false
    });
    return a;
}

spawnNPC('Zara', -26, -20, { skin: 0xf5c898, hair: 0xd44, shirt: 0xff6b9d, pants: 0x222 }, true);
spawnNPC('Rio',   26, -22, { skin: 0xd4a378, hair: 0x222, shirt: 0xfeca57, pants: 0x3a4a6a }, true);
spawnNPC('Luna',  26,  22, { skin: 0xf5c898, hair: 0xa29bfe, shirt: 0xa29bfe, pants: 0x555 }, true);
spawnNPC('Kai',  -26,  20, { skin: 0xc28a5a, hair: 0x3a2a1a, shirt: 0x55efc4, pants: 0x222a3a }, true);

// Make one NPC permanently dancing on stage
const djNPC = npcs[0];
djNPC.home.set(-28, 0, -32);
djNPC.mesh.position.copy(djNPC.home);
djNPC.mesh.position.y = 1; // on stage
djNPC.dancing = true;
djNPC.roam = false;

// ---------------------------------------------------------------------------
// Proximity voice ripple ring under player
// ---------------------------------------------------------------------------
const ripple = new THREE.Mesh(
    new THREE.RingGeometry(3.5, 4, 48),
    new THREE.MeshBasicMaterial({
        color: 0x48dbfb,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    })
);
ripple.rotation.x = -Math.PI / 2;
scene.add(ripple);

const ripple2 = ripple.clone();
ripple2.material = ripple.material.clone();
scene.add(ripple2);

// NPC speaking rings
const npcRings = npcs.map((npc) => {
    const r = new THREE.Mesh(
        new THREE.RingGeometry(2.5, 3, 32),
        new THREE.MeshBasicMaterial({
            color: 0xff6b9d,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
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
let cameraDistance = 14;
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
    cameraPitch = Math.max(-1.2, Math.min(-0.1, cameraPitch));
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
});
canvas.addEventListener('wheel', (e) => {
    cameraDistance = Math.max(6, Math.min(30, cameraDistance + e.deltaY * 0.02));
    e.preventDefault();
}, { passive: false });

// Touch (mobile)
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
            cameraPitch = Math.max(-1.2, Math.min(-0.1, cameraPitch - dy * 0.01));
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
let cameraMode = 0; // 0 follow, 1 cinematic wide, 2 first person-ish

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
    btnMic.querySelector('.icon').textContent = micOn ? '🎤' : '🔇';
    btnMic.querySelector('.label').textContent = micOn ? 'Mic ON' : 'Mic OFF';
    ripple.visible = micOn;
    ripple2.visible = micOn;

    // Update player list
    const selfMic = document.querySelector('.player-item.self .mic-indicator');
    selfMic.className = micOn ? 'mic-indicator on' : 'mic-indicator off';
    selfMic.textContent = micOn ? '🎤' : '🔇';
}

function triggerEmote(type) {
    emoteType = type;
    emoteTimer = 2.0;
    const bubble = document.getElementById('emoteBubble');
    bubble.textContent = type === 'wave' ? '👋 Hi!' : '💃 Let\'s dance!';
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
    { name: 'Spawn Plaza', icon: '🌴', x: 0,   z: 0,   r: 14 },
    { name: 'DJ Stage',    icon: '🎧', x: -28, z: -22, r: 14 },
    { name: 'Pool Party',  icon: '🏊', x: 28,  z: -22, r: 14 },
    { name: 'Cafe Hangout',icon: '☕', x: 28,  z: 22,  r: 12 },
    { name: 'Campfire',    icon: '🔥', x: -28, z: 22,  r: 10 }
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

    // rotate movement vector by camera yaw
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

    // Clamp within island radius
    const pDist = Math.hypot(player.position.x, player.position.z);
    if (pDist > 52) {
        player.position.x *= 52 / pDist;
        player.position.z *= 52 / pDist;
    }

    // Jumping
    if (keys[' '] && isGrounded) {
        velocityY = 10;
        isGrounded = false;
    }
    velocityY -= 25 * dt;
    player.position.y += velocityY * dt;
    if (player.position.y <= 0) {
        player.position.y = 0;
        velocityY = 0;
        isGrounded = true;
    }

    // Walking animation
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
            player.position.y = Math.abs(Math.sin(t * 8)) * 0.4;
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
        // Idle sway
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
        1: { dist: 26,              height: 12, lookAhead: 0 },
        2: { dist: 5,               height: 3,  lookAhead: 1 }
    };
    const cfg = camTargets[cameraMode];
    const camX = player.position.x - Math.sin(cameraYaw) * cfg.dist * Math.cos(cameraPitch);
    const camZ = player.position.z - Math.cos(cameraYaw) * cfg.dist * Math.cos(cameraPitch);
    const camY = player.position.y + cfg.height - cfg.dist * Math.sin(cameraPitch);
    camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.15);
    camera.lookAt(player.position.x, player.position.y + cfg.lookAhead + 2, player.position.z);

    // ---- NPC AI ----
    npcs.forEach((npc, idx) => {
        if (npc.dancing) {
            // DJ is dancing
            const s = Math.sin(t * 6 + idx);
            const a = npc.mesh.userData;
            a.leftArm.rotation.x = s * 0.8;
            a.rightArm.rotation.x = -s * 0.8;
            a.leftArm.rotation.z = -0.3 + s * 0.3;
            a.rightArm.rotation.z = 0.3 - s * 0.3;
            a.head.rotation.z = Math.sin(t * 3) * 0.2;
            npc.mesh.position.y = 1 + Math.abs(Math.sin(t * 6)) * 0.3;
            npc.mesh.rotation.y += dt * 0.5;
            return;
        }

        // Roaming
        npc.idleTime -= dt;
        if (npc.idleTime <= 0) {
            const a = Math.random() * Math.PI * 2;
            const r = 6 + Math.random() * 6;
            npc.target.set(
                npc.home.x + Math.cos(a) * r,
                0,
                npc.home.z + Math.sin(a) * r
            );
            npc.idleTime = 3 + Math.random() * 4;
        }

        const dx = npc.target.x - npc.mesh.position.x;
        const dz = npc.target.z - npc.mesh.position.z;
        const d = Math.hypot(dx, dz);

        if (d > 0.2) {
            const nx = dx / d;
            const nz = dz / d;
            npc.mesh.position.x += nx * npc.speed;
            npc.mesh.position.z += nz * npc.speed;
            npc.mesh.rotation.y = Math.atan2(nx, nz);

            // Walk animation
            const a = npc.mesh.userData;
            const sw = Math.sin(t * 8 + idx);
            a.leftArm.rotation.x = sw * 0.5;
            a.rightArm.rotation.x = -sw * 0.5;
            a.leftLeg.rotation.x = -sw * 0.5;
            a.rightLeg.rotation.x = sw * 0.5;
        } else {
            // Idle
            const a = npc.mesh.userData;
            a.leftArm.rotation.x *= 0.9;
            a.rightArm.rotation.x *= 0.9;
            a.leftLeg.rotation.x *= 0.9;
            a.rightLeg.rotation.x *= 0.9;
        }

        // Speaking ring: NPCs 0 & 3 periodically "speak"
        const speaking = (idx === 1 || idx === 3) && (Math.sin(t * 2 + idx * 5) > 0.2);
        npcRings[idx].visible = speaking;
        if (speaking) {
            npcRings[idx].position.set(npc.mesh.position.x, 0.15, npc.mesh.position.z);
            const s = 1 + (Math.sin(t * 4 + idx) + 1) * 0.3;
            npcRings[idx].scale.set(s, s, 1);
            npcRings[idx].material.opacity = 0.6 - (s - 1) * 0.8;
        }
    });

    // ---- ENVIRONMENT ANIM ----
    // Ripple under player (mic on)
    if (micOn) {
        ripple.position.set(player.position.x, 0.15, player.position.z);
        ripple2.position.set(player.position.x, 0.15, player.position.z);
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
        c.position.y = c.userData.yBase + Math.sin(t * 0.5 + c.userData.angle) * 0.5;
    });

    // Water wiggle
    sea.position.y = -0.4 + Math.sin(t * 1.2) * 0.08;
    poolWater.material.opacity = 0.75 + Math.sin(t * 2) * 0.08;

    // Fountain top spin
    fountainTop.rotation.y += dt * 0.6;
    fountainTop.position.y = 5.4 + Math.sin(t * 2) * 0.1;

    // Fire dance
    fireCones.forEach((c, i) => {
        c.rotation.y += dt * (2 + i);
        c.scale.y = 1 + Math.sin(t * 8 + i) * 0.15;
        c.position.x = Math.sin(t * 6 + i) * 0.08;
        c.position.z = Math.cos(t * 5 + i) * 0.08;
    });
    fireLight.intensity = 2.5 + Math.sin(t * 10) * 0.8 + Math.sin(t * 16) * 0.4;

    // Disco ball spin + tile flashing
    disco.rotation.y += dt * 0.8;
    floorTiles.forEach((tile) => {
        const pulse = 0.25 + (Math.sin(t * 3 + tile.offset) + 1) * 0.35;
        tile.mesh.material.emissiveIntensity = pulse;
    });
    stageLights.forEach((l, i) => {
        l.intensity = 2 + Math.sin(t * 4 + i * 2) * 1.2;
    });

    // ---- DAY / NIGHT ----
    const nightTarget = isNight ? 1 : 0;
    scene.userData.nightLerp = (scene.userData.nightLerp ?? 0) * 0.95 + nightTarget * 0.05;
    const n = scene.userData.nightLerp;

    const daySky   = new THREE.Color(0x9bd4ff);
    const nightSky = new THREE.Color(0x0b1640);
    const sky = daySky.clone().lerp(nightSky, n);
    scene.background = sky;
    scene.fog.color.copy(sky);

    sun.intensity  = 1.25 * (1 - n) + 0.15 * n;
    sun.color.setHex(isNight ? 0x8899ff : 0xfff4e0);
    hemi.intensity = 0.65 * (1 - n) + 0.35 * n;
    hemi.color.setHex(n > 0.5 ? 0x4466aa : 0xaee6ff);
    ambient.intensity = 0.25 + n * 0.15;

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

// Hide loader after short delay
setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('hidden');
    setTimeout(() => {
        document.getElementById('loadingScreen').remove();
    }, 700);
}, 2200);

animate();
