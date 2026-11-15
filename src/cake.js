import * as T from "../vendor/three.module.js";
import { PaintedCake } from "./cake-fallback.js";
import { config } from "./config.js";

const TAU = Math.PI * 2;
const TOP = 2.05;
const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const v3 = (x, y, z) => new T.Vector3(x, y, z);

function waxNumber(n) {
  if (n === 6) {
    const six = waxNumber(9);
    six.rotateZ(Math.PI);
    six.translate(0, 0.85, 0);
    return six;
  }
  const s = new T.Shape();
  if (n === 1) {
    s.moveTo(-0.245, 0.055);
    s.lineTo(-0.245, 0.14);
    s.lineTo(-0.084, 0.165);
    s.lineTo(-0.084, 0.56);
    s.lineTo(-0.205, 0.49);
    s.quadraticCurveTo(-0.25, 0.48, -0.26, 0.53);
    s.lineTo(-0.28, 0.594);
    s.quadraticCurveTo(-0.28, 0.625, -0.23, 0.655);
    s.lineTo(-0.053, 0.795);
    s.quadraticCurveTo(0.005, 0.826, 0.077, 0.8);
    s.lineTo(0.095, 0.774);
    s.lineTo(0.095, 0.163);
    s.lineTo(0.237, 0.14);
    s.lineTo(0.24, 0.055);
    s.quadraticCurveTo(0.24, 0.023, 0.2, 0.023);
    s.lineTo(-0.21, 0.023);
    s.quadraticCurveTo(-0.245, 0.023, -0.245, 0.055);
  } else if (n === 9) {
    s.moveTo(-0.09, 0.018);
    s.quadraticCurveTo(-0.14, 0.029, -0.132, 0.064);
    s.lineTo(-0.12, 0.144);
    s.quadraticCurveTo(0.054, 0.185, 0.118, 0.358);
    s.bezierCurveTo(-0.11, 0.247, -0.31, 0.406, -0.31, 0.58);
    s.bezierCurveTo(-0.315, 0.748, -0.189, 0.83, -0.012, 0.833);
    s.bezierCurveTo(0.21, 0.84, 0.302, 0.7, 0.28, 0.506);
    s.bezierCurveTo(0.263, 0.25, 0.108, 0.045, -0.09, 0.018);
    const h = new T.Path();
    h.absellipse(-0.015, 0.586, 0.119, 0.107, 0, TAU, false, 0);
    s.holes.push(h);
  } else {
    // These outline paths are original miniature wax type. Each digit is
    // extruded with the same rounded rim and material as the original 19.
    const hole = (x, y, rx, ry) => {
      const h = new T.Path();
      h.absellipse(x, y, rx, ry, 0, TAU, false, 0);
      s.holes.push(h);
    };
    if (n === 0) {
      s.absellipse(0, 0.425, 0.29, 0.395, 0, TAU, true, 0);
      hole(0, 0.425, 0.134, 0.246);
    } else if (n === 2) {
      s.moveTo(-0.268, 0.03);
      s.lineTo(0.26, 0.03);
      s.lineTo(0.26, 0.17);
      s.lineTo(-0.055, 0.17);
      s.bezierCurveTo(0.006, 0.27, 0.287, 0.44, 0.259, 0.618);
      s.bezierCurveTo(0.246, 0.85, -0.09, 0.9, -0.267, 0.716);
      s.lineTo(-0.185, 0.602);
      s.bezierCurveTo(-0.052, 0.746, 0.114, 0.688, 0.101, 0.583);
      s.bezierCurveTo(0.106, 0.47, -0.16, 0.275, -0.268, 0.145);
      s.closePath();
    } else if (n === 3) {
      s.moveTo(-0.265, 0.103);
      s.lineTo(-0.196, 0.234);
      s.bezierCurveTo(-0.063, 0.131, 0.109, 0.155, 0.109, 0.277);
      s.quadraticCurveTo(0.107, 0.373, -0.101, 0.373);
      s.lineTo(-0.101, 0.502);
      s.bezierCurveTo(0.067, 0.499, 0.13, 0.566, 0.084, 0.633);
      s.bezierCurveTo(0.032, 0.715, -0.097, 0.688, -0.18, 0.628);
      s.lineTo(-0.254, 0.74);
      s.bezierCurveTo(-0.003, 0.938, 0.272, 0.79, 0.252, 0.611);
      s.quadraticCurveTo(0.249, 0.493, 0.139, 0.44);
      s.bezierCurveTo(0.283, 0.392, 0.321, 0.236, 0.21, 0.108);
      s.quadraticCurveTo(0.033, -0.048, -0.265, 0.103);
    } else if (n === 4) {
      s.moveTo(0.064, 0.03);
      s.lineTo(0.212, 0.03);
      s.lineTo(0.212, 0.199);
      s.lineTo(0.281, 0.199);
      s.lineTo(0.281, 0.324);
      s.lineTo(0.212, 0.324);
      s.lineTo(0.212, 0.807);
      s.lineTo(0.036, 0.807);
      s.lineTo(-0.289, 0.334);
      s.lineTo(-0.289, 0.199);
      s.lineTo(0.064, 0.199);
      s.closePath();
      const h = new T.Path();
      h.moveTo(0.064, 0.325);
      h.lineTo(-0.12, 0.325);
      h.lineTo(0.064, 0.604);
      h.closePath();
      s.holes.push(h);
    } else if (n === 5) {
      s.moveTo(-0.255, 0.11);
      s.lineTo(-0.191, 0.235);
      s.bezierCurveTo(-0.03, 0.137, 0.113, 0.162, 0.111, 0.294);
      s.bezierCurveTo(0.113, 0.429, -0.078, 0.465, -0.194, 0.389);
      s.lineTo(-0.234, 0.442);
      s.lineTo(-0.21, 0.806);
      s.lineTo(0.221, 0.806);
      s.lineTo(0.221, 0.662);
      s.lineTo(-0.076, 0.662);
      s.lineTo(-0.091, 0.526);
      s.bezierCurveTo(0.082, 0.579, 0.288, 0.494, 0.275, 0.283);
      s.bezierCurveTo(0.282, 0.027, -0.045, -0.038, -0.255, 0.11);
    } else if (n === 7) {
      s.moveTo(-0.142, 0.027);
      s.lineTo(0.025, 0.027);
      s.lineTo(0.274, 0.689);
      s.lineTo(0.274, 0.806);
      s.lineTo(-0.252, 0.806);
      s.lineTo(-0.252, 0.662);
      s.lineTo(0.087, 0.662);
      s.closePath();
    } else if (n === 8) {
      s.moveTo(0, 0.025);
      s.bezierCurveTo(0.274, 0.025, 0.368, 0.285, 0.163, 0.433);
      s.bezierCurveTo(0.341, 0.562, 0.245, 0.823, 0, 0.823);
      s.bezierCurveTo(-0.247, 0.823, -0.344, 0.572, -0.165, 0.433);
      s.bezierCurveTo(-0.369, 0.28, -0.263, 0.024, 0, 0.025);
      hole(0, 0.603, 0.104, 0.09);
      hole(0, 0.256, 0.122, 0.1);
    }
  }
  return new T.ExtrudeGeometry(s, {
    depth: 0.095,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.016,
    bevelThickness: 0.014,
    curveSegments: 20,
  });
}

function lathe(profile, sides = 96) {
  return new T.LatheGeometry(
    profile.map(([r, y]) => new T.Vector2(r, y)),
    sides,
  );
}

// The boundary rings share angular samples. Pleats and drips remain continuous
// around the back as the camera moves.
function ringSurface(getPoint, levels, slices) {
  const coordinates = [],
    indices = [];
  for (let j = 0; j <= levels; j++) {
    for (let i = 0; i < slices; i++)
      coordinates.push(...getPoint((i * TAU) / slices, j / levels));
  }
  for (let j = 0; j < levels; j++)
    for (let i = 0; i < slices; i++) {
      const a = j * slices + i,
        b = j * slices + ((i + 1) % slices);
      indices.push(a, a + slices, b, b, a + slices, b + slices);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(coordinates, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function icing(radius, height, count) {
  const drops = Array.from({ length: count }, (_, i) => ({
    at: (TAU * (i + 0.15 * Math.sin(i * 6.17 + 2.3))) / count,
    depth: 0.045 + 0.16 * (0.5 + 0.5 * Math.sin(i * 2.31 + 0.9)),
    width: 0.047 + 0.034 * (0.5 + 0.5 * Math.sin(i * 2.86)),
  }));
  return ringSurface(
    (a, t) => {
      let bottom = height - 0.115;
      for (const { at, depth, width } of drops) {
        const d = Math.atan2(Math.sin(a - at), Math.cos(a - at));
        bottom -= depth * Math.exp(-0.5 * (d / width) ** 2);
      }
      const k = Math.round(t * 8);
      const radii = [
        radius - 0.022,
        radius + 0.008,
        radius + 0.022,
        radius + 0.025,
        radius + 0.022,
        radius + 0.012,
        radius - 0.016,
        radius - 0.075,
        0,
      ];
      const ys = [
        bottom + 0.016,
        bottom,
        bottom + 0.009,
        bottom + 0.032,
        (bottom + height) / 2 + 0.023,
        height - 0.034,
        height - 0.006,
        height + 0.006,
        height + 0.008,
      ];
      return [radii[k] * Math.cos(a), ys[k], radii[k] * Math.sin(a)];
    },
    8,
    192,
  );
}

function rosette() {
  return ringSurface(
    (a, t) => {
      const base =
        0.12 *
        Math.pow(Math.max(0, 1 - t), 0.72) *
        (0.94 + 0.12 * Math.sin(t * Math.PI));
      const r = base * (1 + 0.19 * Math.cos(7 * a - 6.1 * t));
      return [
        r * Math.cos(a) + 0.051 * t ** 2,
        0.18 * t,
        r * Math.sin(a) - 0.025 * t ** 2,
      ];
    },
    14,
    49,
  );
}

function starCookie() {
  const shape = new T.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5,
      r = i % 2 ? 0.088 : 0.181;
    shape[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  return new T.ExtrudeGeometry(shape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelThickness: 0.012,
    bevelSize: 0.012,
  });
}

function berryRadius(t) {
  return 0.15 * Math.pow(Math.sin(Math.PI * t), 0.65) * (0.6 + 0.8 * t);
}

function leafShape() {
  const leaf = new T.Shape();
  leaf.moveTo(0, 0);
  leaf.quadraticCurveTo(0.051, 0.085, 0, 0.167);
  leaf.quadraticCurveTo(-0.036, 0.106, 0, 0);
  const g = new T.ShapeGeometry(leaf, 7);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setXYZ(
      i,
      pos.getX(i),
      0.033 * Math.sin((Math.PI * y) / 0.167) - 0.34 * y,
      y,
    );
  }
  g.computeVertexNormals();
  return g;
}

function glowMap(smoke = false) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const c = cv.getContext("2d"),
    grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, smoke ? "rgba(247,239,255,.9)" : "rgba(255,245,194,.9)");
  grad.addColorStop(
    0.12,
    smoke ? "rgba(239,235,247,.75)" : "rgba(255,207,104,.63)",
  );
  grad.addColorStop(
    0.4,
    smoke ? "rgba(236,227,245,.25)" : "rgba(255,174,71,.20)",
  );
  grad.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = grad;
  c.fillRect(0, 0, 64, 64);
  const tex = new T.CanvasTexture(cv);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

export class CakeView {
  constructor(
    host,
    { reduced = false, onError = () => {}, age = config.age } = {},
  ) {
    this.host = host;
    this.age = /^\d{1,3}$/.test(String(age)) ? String(Number(age)) : "19";
    this.reduced = reduced;
    this.onError = onError;
    this.blow = 0;
    this.elapsed = 0;
    this.smokeAge = Infinity;
    this.dead = false;
    this.listeners = [];
    this.resources = new Set();
    this.watch =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => this.resize())
        : null;
    this.onResize = () => this.resize();
    try {
      if (new URLSearchParams(location.search).get("flat") === "1")
        throw Error("2D preview selected");
      this.setup();
    } catch (error) {
      this.usePainting(error);
    }
    if (this.watch) this.watch.observe(host);
    else window.addEventListener("resize", this.onResize);
    this.resize();
  }

  own(resource) {
    this.resources.add(resource);
    return resource;
  }
  material(color, roughness = 0.56, other = {}) {
    return this.own(new T.MeshStandardMaterial({ color, roughness, ...other }));
  }
  mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
    this.own(geometry);
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  setup() {
    const ren = (this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    }));
    ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    ren.setClearColor(0x000000, 0);
    ren.outputColorSpace = T.SRGBColorSpace;
    ren.toneMapping = T.ACESFilmicToneMapping;
    ren.toneMappingExposure = 1.06;
    ren.shadowMap.enabled = true;
    ren.shadowMap.type = T.PCFSoftShadowMap;
    const canvas = ren.domElement;
    canvas.setAttribute(
      "aria-label",
      "立体双层奶油蛋糕、草莓和" + this.age + "岁数字蜡烛",
    );
    canvas.setAttribute("role", "img");
    canvas.style.cssText =
      "display:block;width:100%;height:100%;pointer-events:none";
    this.host.append(canvas);
    this.host.dataset.cakeRenderer = "webgl";
    const lost = (e) => {
      e.preventDefault();
      if (!this.dead) this.usePainting(Error("WebGL context lost"));
    };
    canvas.addEventListener("webglcontextlost", lost);
    this.listeners.push(() =>
      canvas.removeEventListener("webglcontextlost", lost),
    );
    const s = (this.scene = new T.Scene());
    this.camera = new T.OrthographicCamera(-3, 3, 3, -3, 0.1, 50);
    this.studio = new T.HemisphereLight(0xfff8ea, 0xaaa3bf, 1.8);
    s.add(this.studio);
    const key = (this.key = new T.DirectionalLight(0xffe3c5, 3.3));
    key.position.set(-3.5, 7, 4.7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.016;
    Object.assign(key.shadow.camera, {
      left: -3,
      right: 3,
      top: 3.5,
      bottom: -3,
      near: 0.1,
      far: 16,
    });
    key.target.position.set(0, 1, 0);
    s.add(key, key.target);
    const rim = new T.DirectionalLight(0xdacaff, 2.6);
    rim.position.set(3, 3, -4);
    s.add(rim);
    this.object = new T.Group();
    s.add(this.object);
    const m = {
      ceramic: this.material("#e4cfcb", 0.27),
      gold: this.material("#d3ae70", 0.31, { metalness: 0.39 }),
      vanilla: this.material("#fff0d5", 0.53),
      cream: this.material("#fff3e6", 0.43),
      lilac: this.material("#b39aca", 0.56),
      pink: this.material("#e4acb9", 0.54),
      rose: this.material("#eeb88c", 0.38),
      green: this.material("#67895b", 0.64, { side: T.DoubleSide }),
      berry: this.material("#d34858", 0.34),
      seed: this.material("#f0ad76", 0.42),
      one: this.material("#f7ca79", 0.32),
      nine: this.material("#e9a7b9", 0.34),
      wick: this.material("#463038", 0.85),
    };
    const obj = this.object,
      ball = this.own(new T.SphereGeometry(1, 14, 12));
    const create = (geo, mat, x = 0, y = 0, z = 0) =>
      this.mesh(obj, geo, mat, x, y, z);
    const turned = (profile, mat) => create(lathe(profile), mat);
    turned(
      [
        [0, 0.005],
        [0.73, 0.005],
        [0.81, 0.039],
        [0.84, 0.064],
        [0.82, 0.094],
        [0.47, 0.129],
        [0.32, 0.174],
        [0.27, 0.24],
        [0.35, 0.305],
        [0.66, 0.357],
        [1.53, 0.379],
        [1.71, 0.414],
        [1.73, 0.454],
        [1.71, 0.478],
        [1.64, 0.489],
        [1.45, 0.465],
        [0, 0.465],
      ],
      m.ceramic,
    );
    turned(
      [
        [1.7, 0.418],
        [1.732, 0.435],
        [1.734, 0.453],
        [1.714, 0.465],
      ],
      m.gold,
    );
    const tier = (r, base, top, mat, glaze, drops) => {
      turned(
        [
          [0, base],
          [r - 0.055, base],
          [r - 0.012, base + 0.023],
          [r, base + 0.068],
          [r, top - 0.053],
          [r - 0.029, top],
          [0, top],
        ],
        mat,
      );
      create(icing(r, top, drops), glaze);
    };
    tier(1.38, 0.462, 1.33, m.lilac, m.cream, 18);
    turned(
      [
        [1.371, 0.541],
        [1.392, 0.549],
        [1.395, 0.572],
        [1.382, 0.582],
      ],
      m.vanilla,
    );
    turned(
      [
        [1.382, 0.595],
        [1.389, 0.6],
        [1.389, 0.61],
        [1.382, 0.616],
      ],
      m.gold,
    );
    tier(0.929, 1.334, TOP, m.pink, m.vanilla, 14);
    const pipe = this.own(rosette());
    for (let i = 0; i < 26; i++) {
      const a = (i * TAU) / 26 + 0.03,
        q = create(
          pipe,
          m.cream,
          1.17 * Math.cos(a),
          1.333,
          1.17 * Math.sin(a),
        );
      q.rotation.y = -a;
      q.scale.setScalar(0.95 + 0.075 * Math.sin(i * 3.2));
    }
    for (let i = 0; i < 9; i++) {
      const a = -0.5 + (i * TAU) / 9,
        q = create(
          pipe,
          m.cream,
          0.76 * Math.cos(a),
          TOP + 0.003,
          0.76 * Math.sin(a),
        );
      q.rotation.y = a;
      q.scale.setScalar(1.06);
    }
    const berryG = this.own(
      ringSurface(
        (a, t) => [
          berryRadius(t) * Math.cos(a),
          0.38 * t,
          berryRadius(t) * Math.sin(a),
        ],
        26,
        32,
      ),
    );
    const leaf = this.own(leafShape()),
      seedData = [];
    const strawberries = [
      [-0.55, 0.26, 1.07, -0.26],
      [0.58, -0.18, 0.95, 0.3],
      [-0.57, -0.3, 0.89, 0.23],
      [0.7, 0.29, 0.72, 0.33],
      [1.04, 0.42, 0.68, 0.39],
      [-1.08, -0.29, 0.69, -0.35],
    ];
    strawberries.forEach(([x, z, size, lean], index) => {
      const group = new T.Group();
      group.position.set(x, index < 4 ? TOP - 0.022 : 1.3, z);
      group.scale.setScalar(size);
      group.rotation.set(0.12, 1.12 * index, lean);
      obj.add(group);
      this.mesh(group, berryG, m.berry);
      for (let j = 0; j < 6; j++) {
        const l = this.mesh(group, leaf, m.green, 0, 0.365, 0);
        l.rotation.y = (j * TAU) / 6 + 0.2 * index;
        l.scale.setScalar(0.8 + 0.18 * Math.sin(j));
      }
      const stalk = this.mesh(group, ball, m.green, 0, 0.388, 0);
      stalk.scale.set(0.018, 0.045, 0.016);
      stalk.rotation.z = -0.22;
      group.updateMatrix();
      for (let row = 1; row <= 5; row++) {
        const t = 0.08 + row * 0.145,
          n = row < 2 ? 5 : 8;
        for (let j = 0; j < n; j++) {
          const a = ((j + 0.49 * row) * TAU) / n,
            rad = berryRadius(t);
          const o = new T.Object3D();
          o.position.set(rad * Math.cos(a), t * 0.38, rad * Math.sin(a));
          o.rotation.set(0.15, a, 0.28);
          o.scale.set(0.007, 0.012, 0.007);
          o.updateMatrix();
          seedData.push(
            new T.Matrix4().multiplyMatrices(group.matrix, o.matrix),
          );
        }
      }
    });
    const seeds = new T.InstancedMesh(ball, m.seed, seedData.length);
    seedData.forEach((matrix, i) => seeds.setMatrixAt(i, matrix));
    obj.add(seeds);
    this.own(seeds);
    const cookie = this.own(starCookie());
    for (const [x, y, z, sz, tilt] of [
      [-0.68, TOP + 0.2, -0.34, 0.94, 0.22],
      [0.59, TOP + 0.17, 0.09, 0.8, -0.24],
      [0.89, 1.51, 0.81, 0.7, -0.52],
      [-1.05, 1.45, 0.62, 0.6, 0.23],
    ]) {
      const mstar = create(cookie, m.gold, x, y, z);
      mstar.scale.setScalar(sz);
      mstar.rotation.set(0.08, 0.1, tilt);
    }
    const pearls = [];
    for (let i = 0; i < 38; i++) {
      const top = i < 15,
        a = i * 2.3999632;
      const radius = top
        ? 0.49 + 0.34 * (0.5 + 0.5 * Math.sin(i * 9.31))
        : 1.015 + 0.3 * (0.5 + 0.5 * Math.sin(i * 3.93));
      const sz = 0.023 + 0.018 * (((i * 13) % 19) / 18),
        o = new T.Object3D();
      o.position.set(
        Math.cos(a) * radius,
        (top ? TOP : 1.34) + sz * 0.64,
        Math.sin(a) * radius,
      );
      o.scale.setScalar(sz);
      o.updateMatrix();
      pearls.push(o.matrix);
    }
    const pearlsMesh = new T.InstancedMesh(ball, m.gold, pearls.length);
    pearls.forEach((p, i) => pearlsMesh.setMatrixAt(i, p));
    pearlsMesh.castShadow = true;
    obj.add(pearlsMesh);
    this.own(pearlsMesh);
    this.flames = [];
    this.smoke = [];
    const glow = this.own(glowMap()),
      smokeMap = this.own(glowMap(true));
    const flameG = this.own(
      lathe(
        [
          [0, 0],
          [0.037, 0.025],
          [0.054, 0.065],
          [0.048, 0.111],
          [0.028, 0.165],
          [0.009, 0.208],
          [0, 0.229],
        ],
        20,
      ),
    );
    const emberMat = this.own(new T.MeshBasicMaterial({ color: 0xfff4ac })),
      flameMat = this.own(new T.MeshBasicMaterial({ color: 0xffbe5c }));
    const wicks = this.own(new T.CylinderGeometry(0.011, 0.015, 0.09, 9));
    const wooden = this.own(new T.CylinderGeometry(0.021, 0.021, 0.14, 8));
    for (const [index, digit] of [...this.age].entries()) {
      const i = Number(digit);
      const spacing = this.age.length > 2 ? 0.485 : 0.592;
      const x = (index - (this.age.length - 1) / 2) * spacing - 0.009;
      const candleMat = index % 2 ? m.nine : m.one;
      create(wooden, m.rose, x, TOP + 0.051, -0.1);
      const width = this.age.length > 2 ? 0.8 : 1;
      const wax = create(waxNumber(i), candleMat, x, TOP + 0.087, -0.145);
      wax.scale.x = width;
      const wickX = i === 4 ? 0.135 : i === 1 ? -0.004 : -0.014;
      const fx = x + wickX * width,
        fy = TOP + 1.002;
      create(wicks, m.wick, fx, fy - 0.04, -0.095);
      const f = new T.Group();
      f.position.set(fx, fy, -0.095);
      obj.add(f);
      const outer = this.mesh(f, flameG, flameMat);
      outer.castShadow = false;
      const inner = this.mesh(f, flameG, emberMat, 0, 0.004, 0.032);
      inner.scale.set(0.59, 0.72, 0.59);
      inner.castShadow = false;
      const halo = new T.Sprite(
        this.own(
          new T.SpriteMaterial({
            map: glow,
            transparent: true,
            opacity: 0.73,
            depthWrite: false,
            blending: T.AdditiveBlending,
          }),
        ),
      );
      halo.scale.set(0.78, 0.78, 1);
      halo.position.y = 0.092;
      f.add(halo);
      this.flames.push(f);
      const light = new T.PointLight(0xffab5a, 0.41, 2.9, 1.3);
      light.position.copy(f.position);
      light.position.y += 0.12;
      obj.add(light);
      f.userData.candleLight = light;
      for (let k = 0; k < 5; k++) {
        const mat = this.own(
          new T.SpriteMaterial({
            map: smokeMap,
            color: 0xede8f6,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
        );
        const puff = new T.Sprite(mat);
        puff.visible = false;
        obj.add(puff);
        this.smoke.push({ puff, x: fx, y: fy, z: -0.095, k });
      }
    }
    const shadow = this.mesh(
      s,
      new T.PlaneGeometry(14, 14),
      this.own(new T.ShadowMaterial({ opacity: 0.16 })),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.003;
    shadow.castShadow = false;
    this.pose(0, "cake");
  }

  pose(age, phase) {
    const easing = this.reduced ? 1 : 1 - Math.pow(1 - clamp(age / 5.2), 3);
    const a = 0.32 - 0.22 * easing;
    this.camera.position.set(
      Math.sin(a) * 8,
      4.48 - 0.27 * easing,
      Math.cos(a) * 8,
    );
    this.camera.lookAt(0, 1.62, 0);
    const soft = phase === "wish" || phase === "blow";
    this.lightMix =
      (this.lightMix || 0) +
      ((soft ? 1 : 0) - (this.lightMix || 0)) * (this.reduced ? 1 : 0.07);
    this.key.intensity = 3.3 - this.lightMix * 1.17;
    this.studio.intensity = 1.8 - this.lightMix * 0.55;
  }
  usePainting(error) {
    this.release3D();
    this.host.dataset.cakeRenderer = "2d";
    this.painting = new PaintedCake(this.host, this.reduced, this.age);
    this.painting.setBlowProgress(this.blow);
    try {
      this.onError(error);
    } catch {}
  }
  setBlowProgress(p) {
    p = clamp(Number(p) || 0);
    if (p >= 0.94 && this.blow < 0.94) this.smokeAge = 0;
    if (p < 0.94) this.smokeAge = Infinity;
    this.blow = p;
    this.painting?.setBlowProgress(p);
  }
  update(dt, time, phase = "cake") {
    if (this.dead || document.hidden) return;
    dt = clamp(Number(dt) || 0, 0, 0.08);
    this.elapsed += dt;
    this.smokeAge += dt;
    if (this.painting) {
      this.painting.update(dt, time, phase);
      return;
    }
    this.pose(this.elapsed, phase);
    this.flames.forEach((f, i) => {
      const flicker = this.reduced
        ? 0
        : Math.sin(this.elapsed * 6 + i) * 0.5 +
          Math.sin(this.elapsed * 9 + i * 2) * 0.5;
      const p = this.blow,
        sz = 1 - clamp((p - 0.18) / 0.76);
      f.visible = sz > 0.012;
      f.scale.set(sz * (1 + 0.037 * flicker), sz * (1 + 0.077 * flicker), sz);
      f.rotation.z = (0.042 + 0.11 * p) * flicker + 0.42 * p;
      f.userData.candleLight.intensity = sz * (0.41 + 0.05 * flicker);
    });
    for (const { puff, x, y, z, k } of this.smoke) {
      const age = this.smokeAge - k * 0.105,
        life = age / 1.59;
      puff.visible = life >= 0 && life < 1;
      if (!puff.visible) continue;
      puff.position.set(
        x + Math.sin(life * 6 + x * 4) * 0.077 * life + 0.06 * life,
        y + 0.57 * life,
        z + 0.03 * life,
      );
      puff.scale.set(0.055 + 0.24 * life, 0.095 + 0.23 * life, 1);
      puff.material.opacity = 0.41 * Math.sin(life * Math.PI);
    }
    try {
      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      this.usePainting(error);
    }
  }
  resize() {
    if (this.dead) return;
    if (this.painting) {
      this.painting.resize();
      return;
    }
    const w = Math.max(1, this.host.clientWidth),
      h = Math.max(1, this.host.clientHeight),
      ratio = w / h;
    const hView = Math.max(3.85, 3.84 / ratio);
    Object.assign(this.camera, {
      left: (-hView * ratio) / 2,
      right: (hView * ratio) / 2,
      top: hView / 2,
      bottom: -hView / 2,
    });
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }
  snapshot() {
    if (this.painting) return this.painting.snapshot();
    if (this.dead || !this.renderer) return null;
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL("image/png");
  }
  release3D() {
    this.listeners.splice(0).forEach((release) => release());
    if (this.key?.shadow.map) this.key.shadow.map.dispose();
    this.resources.forEach((r) => r.dispose?.());
    this.resources.clear();
    if (this.renderer) {
      this.renderer.domElement.remove();
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    }
    this.scene = null;
    this.flames = [];
    this.smoke = [];
  }
  dispose() {
    if (this.dead) return;
    this.dead = true;
    this.watch?.disconnect();
    window.removeEventListener("resize", this.onResize);
    this.release3D();
    this.painting?.dispose();
  }
}
