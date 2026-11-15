// Constellation shells are described in normalized units. The renderer maps one
// unit to the shell radius and applies the same drag/gravity model on every screen.
import { config } from "./config.js";

export const COLORS = Object.freeze([...config.colors.fireworks]);
export const SHAPES = Object.freeze([
  { id: "peony", label: "牡丹", description: "圆润饱满的珠光花球" },
  { id: "chrysanthemum", label: "菊花", description: "从花心射出的纤长花丝" },
  { id: "willow", label: "金柳", description: "向下垂落的鎏金枝条" },
  { id: "palm", label: "棕榈", description: "粗亮的金枝向四周舒展" },
  { id: "rings", label: "同心环", description: "三圈不同颜色的光轮" },
  { id: "spiral", label: "螺旋", description: "两条相绕的星尘旋臂" },
  { id: "star", label: "五角星", description: "由光点勾勒的五个尖角" },
  { id: "flower", label: "花瓣", description: "内外两层错落的七瓣花" },
  { id: "butterfly", label: "蝴蝶", description: "上下两对渐变色的蝶翼" },
  { id: "crossette", label: "交叉", description: "星芒飞出后再次四向分裂" },
  { id: "beads", label: "串珠", description: "沿抛物线依次点亮的珠串" },
  { id: "crackle", label: "碎星", description: "十余簇细碎的小型星爆" },
  { id: "meteors", label: "流星雨", description: "斜穿天空的数道光轨" },
  { id: "fan", label: "扇形", description: "低空逐束展开的彩色扇面" },
  { id: "double", label: "二次绽放", description: "中心的花球迟一步再次盛开" },
  { id: "text", label: "文字", description: "星光排成生日数字或姓名" },
]);
const ALIASES = new Map([
  ["球形", "peony"],
  ["牡丹球状", "peony"],
  ["环形", "rings"],
  ["柳树", "willow"],
  ["柳树形", "willow"],
  ["星形", "star"],
  ["双层", "double"],
  ["19", "text"],
  ["name", "text"],
  [config.name, "text"],
  [String(config.age), "text"],
]);
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const between = (min, max) => min + Math.random() * (max - min);
const jitter = (width) => between(-width, width);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const alternate = (shell, num = 1) =>
  COLORS[(shell.colorIndex + num) % COLORS.length];

export function resolveShape(type) {
  if (typeof type === "number" && Number.isInteger(type)) {
    return SHAPES[((type % SHAPES.length) + SHAPES.length) % SHAPES.length].id;
  }
  const known = SHAPES.find((item) => item.id === type || item.label === type);
  return known?.id || ALIASES.get(type) || "peony";
}

// Every recipe receives a density-adjusted count. For landmark outlines, keep a
// minimum number of contour vertices so that the shape survives on small phones.
function count(shell, ideal, minimum = 8) {
  return Math.max(minimum, Math.round(ideal * shell.density));
}

function polar(emit, angle, speed, style) {
  emit({
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    ...style,
  });
}

function peony(shell, emit) {
  const total = count(shell, 134, 35);
  // Sample a sphere with equal-area latitude bands. The projected limb gets
  // denser than the interior, unlike a plain set of uniformly random spokes.
  const rotation = between(0, TAU);
  for (let index = 0; index < total; index++) {
    const depth = 1 - ((index + 0.5) * 2) / total;
    const latitude = Math.sqrt(1 - depth * depth);
    const angle = index * GOLDEN_ANGLE + rotation;
    polar(emit, angle, latitude * between(1.5, 1.7), {
      life: between(1.15, 1.75),
      drag: 1.14,
      gravity: 0.21,
      width: 1.05 + (depth + 1) * 0.48,
      trail: 0.18,
      color: depth > 0.72 ? alternate(shell, 1) : shell.color,
      glint: index % 6 === 0,
    });
  }
}

function chrysanthemum(shell, emit) {
  const rays = count(shell, 68, 27);
  const start = between(0, 0.5);
  for (let index = 0; index < rays; index++) {
    const angle = start + (TAU * index) / rays;
    const outer = index % 3 !== 0;
    polar(emit, angle, outer ? 1.95 : 1.35, {
      life: outer ? 2 : 1.65,
      gravity: 0.1,
      drag: 1.05,
      width: outer ? 0.98 : 0.78,
      trail: 0.61,
      color: outer ? shell.color : "#ffda99",
      hot: 0.5,
      glint: false,
    });
  }
}

function willow(shell, emit) {
  const rays = count(shell, 102, 31);
  for (let index = 0; index < rays; index++) {
    const angle = -Math.PI + (Math.PI * (index + Math.random())) / rays;
    const speed = between(1.18, 2.15);
    polar(emit, angle, speed, {
      vx: Math.cos(angle) * speed * 0.82,
      life: between(2.3, 3.85),
      gravity: between(0.94, 1.15),
      drag: 1.45,
      trail: 0.59,
      width: between(0.83, 1.48),
      color: index % 5 ? "#ffc575" : "#fff0b6",
      shed: "gold",
      shedPeriod: between(0.11, 0.23),
      flicker: 0.14,
    });
  }
}

function palm(shell, emit) {
  const branches = shell.density > 0.6 ? 8 : 6;
  for (let index = 0; index < branches; index++) {
    const angle = -Math.PI + 0.09 + (index / (branches - 1)) * (Math.PI - 0.18);
    const k = index % 2 === 0 ? 1.95 : 1.64;
    polar(emit, angle, k, {
      life: 2.3,
      drag: 0.82,
      gravity: 0.66,
      trail: 0.54,
      width: 3.3,
      color: index % 3 ? shell.color : "#ffd984",
      glint: true,
      shed: "leaf",
      shedPeriod: 0.077,
    });
  }
}

function rings(shell, emit) {
  const tilt = between(-0.22, 0.22);
  const cos = Math.cos(tilt),
    sin = Math.sin(tilt);
  const ringColors = [shell.color, "#fff1bf", alternate(shell, 2)];
  for (let band = 0; band < 3; band++) {
    const radius = [0.68, 1.21, 1.73][band];
    const dots = count(shell, 28 + 18 * band, 16 + 4 * band);
    for (let index = 0; index < dots; index++) {
      const angle = (TAU * (index + band * 0.35)) / dots;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.85;
      emit({
        vx: x * cos - y * sin,
        vy: x * sin + y * cos,
        color: ringColors[band],
        life: 1.82 + band * 0.1,
        width: band === 1 ? 1.65 : 1.25,
        gravity: 0.08,
        trail: 0.11,
        drag: 1.26,
      });
    }
  }
}

function spiral(shell, emit) {
  const points = count(shell, 69, 24);
  const phase = between(0, TAU);
  for (let arm = 0; arm < 2; arm++) {
    const color = arm === 0 ? shell.color : alternate(shell, 1);
    for (let index = 0; index < points; index++) {
      const fraction = (index + 0.4) / points;
      const angle = arm * Math.PI + phase + fraction * TAU * 1.23;
      polar(emit, angle, 0.16 + fraction * 1.68, {
        spin: 0.23,
        gravity: 0.085,
        drag: 1.05,
        color,
        width: 0.85 + fraction * 1.12,
        trail: 0.21,
        life: 1.48 + fraction * 0.72,
        glint: index % 10 === 0,
      });
    }
  }
}

function star(shell, emit) {
  const perEdge = count(shell, 11, 5);
  const offset = -Math.PI / 2;
  function vertex(index) {
    const a = offset + (index * Math.PI) / 5;
    const r = index % 2 ? 0.68 : 1.76;
    return [Math.cos(a) * r, Math.sin(a) * r];
  }
  for (let edge = 0; edge < 10; edge++) {
    const [ax, ay] = vertex(edge);
    const [bx, by] = vertex(edge + 1);
    for (let index = 0; index < perEdge; index++) {
      const u = index / perEdge;
      emit({
        vx: ax + (bx - ax) * u,
        vy: ay + (by - ay) * u,
        life: 2,
        drag: 1.08,
        gravity: 0.06,
        color: index === 0 && edge % 2 === 0 ? "#fff2bf" : shell.color,
        width: index === 0 ? 2 : 1.23,
        trail: 0.12,
        glint: index === 0 && edge % 2 === 0,
      });
    }
  }
}

function flower(shell, emit) {
  const petals = 7;
  for (let tier = 0; tier < 2; tier++) {
    const total = count(shell, tier ? 105 : 84, 42);
    for (let index = 0; index < total; index++) {
      const a = (index / total) * TAU;
      const angle = a + (tier ? 0 : Math.PI / petals);
      const petal = Math.pow(0.5 + 0.5 * Math.cos(a * petals), 0.65);
      const radius = (0.68 + petal * 1.04) * (tier ? 1 : 0.6);
      polar(emit, angle, radius, {
        color: tier ? shell.color : alternate(shell, 1),
        life: tier ? 2.03 : 1.75,
        drag: 1.15,
        width: tier ? 1.18 : 1.46,
        gravity: 0.07,
        trail: 0.17,
        glint: index % 15 === 0,
      });
    }
  }
}

function butterfly(shell, emit) {
  const points = count(shell, 39, 18);
  // Each wing follows a tilted closed lobe with its root at the central body.
  // Both sides share the same parameterization, preserving bilateral symmetry.
  for (const side of [-1, 1]) {
    for (let upper = 0; upper < 2; upper++) {
      const cx = upper ? 0.82 : 0.55;
      const cy = upper ? -0.55 : 0.52;
      const length = Math.hypot(cx, cy);
      const nx = -cy / length,
        ny = cx / length;
      const width = upper ? 0.62 : 0.43;
      for (let i = 0; i < points; i++) {
        const a = (TAU * i) / points;
        const root = 1 - Math.cos(a);
        const bulge = Math.sin(a) * width;
        emit({
          vx: side * (cx * root + nx * bulge),
          vy: cy * root + ny * bulge,
          color: upper ? shell.color : alternate(shell, 2),
          life: 2.1,
          drag: 1.23,
          gravity: 0.05,
          width: 1.26,
          trail: 0.1,
          glint: i % 15 === 0,
        });
      }
    }
  }
  for (let i = 0; i < 12; i++) {
    emit({
      vx: 0,
      vy: -0.63 + i * 0.115,
      color: "#ffe0b0",
      life: 1.96,
      drag: 1.23,
      gravity: 0.05,
      width: 1.75,
      trail: 0.08,
    });
  }
}

function crossette(shell, emit) {
  const countArms = count(shell, 12, 7);
  const phase = 0.28;
  for (let index = 0; index < countArms; index++) {
    const a = phase + (index / countArms) * TAU;
    polar(emit, a, 1.43 + (index % 2) * 0.25, {
      color: shell.color,
      life: 0.92,
      drag: 0.92,
      gravity: 0.17,
      width: 2.25,
      trail: 0.31,
      split: "cross",
      splitAt: 0.54 + (index % 3) * 0.075,
    });
  }
}

function beads(shell, emit) {
  const stems = count(shell, 15, 8);
  for (let index = 0; index < stems; index++) {
    const a = (index / stems) * TAU - Math.PI / 2;
    polar(emit, a, 1.73, {
      color: index % 2 ? shell.color : alternate(shell, 1),
      life: 2.2,
      drag: 0.96,
      gravity: 0.4,
      trail: 0.1,
      width: 2.55,
      shed: "bead",
      shedPeriod: 0.11,
    });
  }
}

function crackle(shell, emit) {
  const clusters = count(shell, 17, 8);
  for (let index = 0; index < clusters; index++) {
    const a = GOLDEN_ANGLE * index;
    polar(emit, a, between(0.8, 1.8), {
      color: index % 3 ? shell.color : "#ffdb98",
      life: 1.25,
      drag: 0.94,
      gravity: 0.14,
      width: 1.33,
      trail: 0.24,
      split: "crackle",
      splitAt: between(0.39, 0.96),
    });
  }
}

function meteors(shell, emit) {
  const streaks = count(shell, 18, 9);
  for (let index = 0; index < streaks; index++) {
    const u = index / (streaks - 1);
    const speed = between(0.85, 1.24);
    emit({
      x: -1.18 + u * 2.47 + jitter(0.09),
      y: -0.43 + jitter(0.13),
      vx: -0.87 * speed,
      vy: 1.2 * speed,
      delay: index * 0.071,
      life: between(0.95, 1.55),
      color: index % 3 ? shell.color : "#c3e7ff",
      width: between(1.25, 2.18),
      drag: 0.26,
      gravity: 0.35,
      trail: 0.47,
      shed: "dust",
      shedPeriod: 0.128,
      glint: true,
    });
  }
}

function fan(shell, emit) {
  const jets = count(shell, 15, 9);
  for (let index = 0; index < jets; index++) {
    const t = index / (jets - 1);
    const a = -Math.PI * (0.91 - t * 0.82);
    const speed = 1.6 + Math.sin(t * Math.PI) * 0.55;
    for (let f = -1; f <= 1; f++) {
      polar(emit, a + f * 0.023, speed * (1 - Math.abs(f) * 0.095), {
        x: (t - 0.5) * 0.15,
        y: 0.52,
        delay: index * 0.042,
        life: 1.95,
        gravity: 0.6,
        color: f ? alternate(shell, Math.floor(t * 3) + 1) : shell.color,
        width: f ? 1.06 : 1.94,
        drag: 0.95,
        trail: 0.53,
        glint: f === 0,
      });
    }
  }
}

function doubleBurst(shell, emit) {
  const total = count(shell, 89, 30);
  for (let index = 0; index < total; index++) {
    const a = (index / total) * TAU + jitter(0.012);
    polar(emit, a, between(1.19, 1.7), {
      color: shell.color,
      life: between(1.47, 1.92),
      drag: 1.12,
      gravity: 0.17,
      width: 1.25,
      trail: 0.27,
    });
  }
  // A single time fuse ignites a later, differently colored inner flower.
  emit({
    vx: 0,
    vy: -0.06,
    gravity: 0.08,
    drag: 1.1,
    width: 0.82,
    life: 1.06,
    trail: 0,
    color: alternate(shell, 1),
    split: "secondary",
    splitAt: 0.78,
  });
}

// For a named shell, sample glyph coverage from an off-screen canvas once. A
// deterministic grid preserves thin strokes. Numeric glyphs also have a vector
// fallback for canvas implementations that do not expose readable pixel data.
const glyphCache = new Map();
const DOT_DIGITS = Object.freeze({
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "010", "010", "010"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
});

function digitPoints(text) {
  const chars = Array.from(text).filter((ch) => DOT_DIGITS[ch]);
  const base = chars.length ? chars : ["1", "9"];
  const width = 4 * base.length - 1;
  const points = [];
  base.forEach((ch, k) => {
    DOT_DIGITS[ch].forEach((row, y) => {
      Array.from(row).forEach((bit, x) => {
        if (bit === "1")
          points.push([
            ((k * 4 + x - (width - 1) / 2) / width) * 2,
            ((y - 2) / width) * 2,
          ]);
      });
    });
  });
  return points;
}

function sampleGlyph(text) {
  if (typeof document === "undefined") return digitPoints(text);
  if (glyphCache.has(text)) return glyphCache.get(text);
  try {
    const canvas = document.createElement("canvas");
    const englishDigits = /^\d+$/.test(text);
    canvas.width = englishDigits ? 220 : 350;
    canvas.height = 128;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.font = englishDigits
      ? "bold 108px Georgia, serif"
      : 'bold 96px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      text,
      canvas.width / 2,
      canvas.height / 2 + 4,
      canvas.width - 10,
    );
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const points = [];
    const grid = englishDigits ? 4 : 3;
    for (let y = 1; y < canvas.height; y += grid) {
      for (let x = 1; x < canvas.width; x += grid) {
        if (pixels[(y * canvas.width + x) * 4 + 3] > 105) points.push([x, y]);
      }
    }
    if (!points.length) return digitPoints(text);
    const xs = points.map((p) => p[0]),
      ys = points.map((p) => p[1]);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const width = Math.max(1, maxX - minX);
    const originX = (maxX + minX) / 2,
      originY = (maxY + minY) / 2;
    const normalized = points.map(([x, y]) => [
      ((x - originX) * 2) / width,
      ((y - originY) * 2) / width,
    ]);
    if (glyphCache.size > 12) glyphCache.clear();
    glyphCache.set(text, normalized);
    return normalized;
  } catch {
    return digitPoints(text);
  }
}

function lettering(shell, emit) {
  const text = shell.text || String(config.age);
  const points = sampleGlyph(text);
  // Hold long enough to actually read the glyphs before they fall into embers.
  const isName = text === config.name;
  const limit = isName ? count(shell, 800, 325) : count(shell, 355, 100);
  const n = Math.min(points.length, limit);
  const scale = isName ? 1.68 : 1.22;
  for (let i = 0; i < n; i++) {
    const [tx, ty] = points[Math.floor((i * points.length) / n)];
    const delay = (Math.abs(tx) + 0.3 * Math.abs(ty)) * 0.13;
    emit({
      vx: jitter(0.22),
      vy: -between(0.05, 0.31),
      targetX: tx * scale,
      targetY: ty * scale,
      delay,
      life: between(3.25, 3.9),
      gravity: 0.16,
      color: i % 8 === 0 ? "#fff3c8" : shell.color,
      width: isName ? 1.02 : 1.38,
      trail: 0.12,
      hold: isName ? 2.7 : 2.43,
      glint: i % 29 === 0,
    });
  }
}

const recipes = {
  peony,
  chrysanthemum,
  willow,
  palm,
  rings,
  spiral,
  star,
  flower,
  butterfly,
  crossette,
  beads,
  crackle,
  meteors,
  fan,
  double: doubleBurst,
  text: lettering,
};

export function emitShape(id, shell, emit) {
  recipes[resolveShape(id)](shell, emit);
}

export function chooseColor(value, fallback = 0) {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) return value;
  const index = Number.isInteger(value) ? value : fallback;
  return COLORS[clamp(index, 0, COLORS.length - 1)];
}
