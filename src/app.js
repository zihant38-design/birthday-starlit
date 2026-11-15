import { config } from "./config.js";
import { Environment } from "./environment.js";
import { BirthdayAudio } from "./audio.js";
import { PerformanceBudget } from "./performance.js";
import { makeKeepsake } from "./keepsake.js";
import { SceneMotes } from "./scene-motes.js";

const $ = (selector) => document.querySelector(selector);
if (window.birthdayLetterChosen) throw Error("静态生日信已打开");
const scenes = ["gift", "cake", "fireworks", "ending"];
const greeting = `${config.name}，${config.age}岁生日快乐！`;
for (const [name, color] of Object.entries(config.colors))
  if (typeof color === "string")
    document.documentElement.style.setProperty("--birthday-" + name, color);
$(".recipient-mark").textContent = "FOR " + (config.romanName || config.name);
$(".wordmark-year").textContent = "/ " + config.age;
$(".gift-monogram").textContent = config.age;
$(".letter-seal").firstChild.nodeValue = config.age + " ";
$("#open-button").firstChild.nodeValue = `点击，开启你的${config.age}岁 `;
$("#cake-host").setAttribute(
  "aria-label",
  `草莓与星星装饰的${config.age}岁生日蛋糕`,
);
$("#card-image").alt = `${config.name}的${config.age}岁生日纪念图`;
$("#download-card").download = $("#card-image").alt + ".png";
document.title = `${config.name}的${config.age}岁 · ${config.title}`;
$("#gift-heading").replaceChildren();
const titleName = document.createElement("span");
titleName.className = "name";
titleName.textContent = config.name;
$("#gift-heading").append(titleName, `的${config.age}岁`);
const titleSubtitle = document.createElement("span");
titleSubtitle.className = "title-second";
titleSubtitle.textContent = config.title;
$("#gift-heading").append(titleSubtitle);
$(".intro").textContent = `${config.name}，有一份送给你的生日惊喜 🎁`;
$(".gift-tag").textContent = `TO. ${config.name} ♡`;
$("#cake-heading").textContent = greeting;
$(".scene-subtitle").textContent = config.greeting;
$("#fireworks-heading").textContent =
  `这场烟花，送给${config.age}岁的${config.name}。`;
$("#fireworks-subtitle").textContent = config.fireworksMessage;
$("#letter-heading").textContent = greeting;
$("#signature").textContent = config.signature;
$("#letter-copy").replaceChildren();
for (const line of config.letter) {
  const paragraph = document.createElement("p");
  paragraph.textContent = line;
  $("#letter-copy").append(paragraph);
}

let storageAvailable = true;
const preferenceKey = "jialei-starlit-preferences-v2";
let preferences = {
  reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  sound: true,
};
try {
  const previous = JSON.parse(localStorage.getItem(preferenceKey) || "{}");
  if (typeof previous.reduced === "boolean")
    preferences.reduced = previous.reduced;
  if (typeof previous.sound === "boolean") preferences.sound = previous.sound;
} catch {
  storageAvailable = false;
}

function savePreferences() {
  try {
    localStorage.setItem(preferenceKey, JSON.stringify(preferences));
  } catch {
    storageAvailable = false;
  }
}

const budget = new PerformanceBudget(preferences.reduced);
const environment = new Environment($("#universe"), {
  reduced: preferences.reduced,
});
if (!environment.context || !environment.skyContext) throw Error("No canvas");
const audio = new BirthdayAudio(config.audio);
const motes = new SceneMotes({ reduced: preferences.reduced });
let stage = "gift";
let sceneTime = 0;
let totalTime = 0;
let lastTimestamp = null;
let frameId = 0;
let transition = null;
let cake = null;
let fireworks = null;
let fireworksModule = null;
let cakeModule = null;
let loadEpoch = 0;
let disposed = false;
let imageReady = false;
let noticeTimeout = 0;
let fireworksCompleted = false;
let spentBeforeEnding = 0;
let gestures, surprises, littleGifts;
let hintIndex = -1;
let climaxShown = false;

function clearSky() {
  gestures?.dispose();
  surprises?.dispose();
  gestures = surprises = null;
  fireworks?.dispose();
  fireworks = null;
  hintIndex = -1;
}

async function attachSurprises(epoch) {
  // A missing optional effect must leave the main show and its letter usable.
  const current = () =>
    !disposed && epoch === loadEpoch && stage === "fireworks";
  const jobs = [
    import("./sky-gestures.js").then(({ SkyGestures }) => {
      if (!current()) return;
      gestures = new SkyGestures({
        surface: $("#sky-touch"),
        reduced: preferences.reduced,
        launch: (x, y, power) =>
          stage === "fireworks" &&
          !transition &&
          !!fireworks &&
          fireworks.launch(x, y, undefined, power),
        flash: (...args) => environment.flash(...args),
      });
    }),
    import("./sky-surprises.js").then(({ SkySurprises }) => {
      if (current())
        surprises = new SkySurprises({
          host: $("#fireworks-scene"),
          environment,
          config,
          reduced: preferences.reduced,
          sound: (kind) => audio.effect(kind),
        });
    }),
    import("./little-gifts.js").then(({ LittleGifts }) => {
      if (disposed) return;
      littleGifts ||= new LittleGifts({
        skyHost: $("#fireworks-scene"),
        letterHost: $(".birthday-letter"),
        config,
        audio,
        reduced: preferences.reduced,
      });
      littleGifts.setStage(stage);
    }),
  ];
  await Promise.all(jobs.map((job) => job.catch(() => {})));
}

function applyBudget(level) {
  environment.maxDpr = budget.dpr;
  environment.resize();
  fireworks?.setQuality(level);
  if (cake?.renderer) cake.renderer.setPixelRatio(budget.dpr);
}
budget.listeners.add(applyBudget);
applyBudget(budget.level);

function notice(message) {
  $("#status").textContent = message;
  $("#status").hidden = false;
  clearTimeout(noticeTimeout);
  noticeTimeout = setTimeout(() => ($("#status").hidden = true), 3200);
}

function updateControls() {
  const enabled = audio.enabled && audio.available;
  $("#sound-button").setAttribute("aria-pressed", String(enabled));
  $("#sound-button").setAttribute(
    "aria-label",
    enabled ? "关闭音乐" : "开启音乐",
  );
  $("#sound-label").textContent = audio.available
    ? enabled
      ? "音乐开"
      : "音乐关"
    : "静音";
  $("#motion-button").setAttribute("aria-pressed", String(preferences.reduced));
  $("#motion-button").setAttribute(
    "aria-label",
    preferences.reduced ? "恢复完整动态效果" : "减少动态效果",
  );
  document.body.classList.toggle("reduced", preferences.reduced);
}

async function beginAudio() {
  if (!preferences.sound) return;
  await audio.enable();
  if (stage === "opening") audio.effect("open");
  updateControls();
}

function setStage(next) {
  stage = next;
  littleGifts?.setStage(next);
  sceneTime = 0;
  document.body.dataset.stage = stage;
  const sceneName = ["wish", "blow"].includes(stage)
    ? "cake"
    : stage === "opening"
      ? "gift"
      : stage;
  for (const name of scenes) {
    const section = $(`#${name}-scene`);
    const active = name === sceneName;
    section.hidden = !active;
    section.classList.toggle("is-active", active);
  }
  motes.setStage(stage);
  $("#skip-button").hidden = ["gift", "ending"].includes(stage);
  $("#skip-button").textContent =
    stage === "fireworks" ? "跳过演出 →" : "跳到烟花 →";
  if (stage !== "blow") document.body.classList.remove("spark-rise");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function changeWithVeil(next, task) {
  if (transition) return;
  transition = { time: 0, next, task, switched: false };
  document.body.classList.add("veil");
}

function disposeCake() {
  cake?.dispose();
  cake = null;
  $("#cake-host").replaceChildren();
}

async function enterCake() {
  const epoch = ++loadEpoch;
  setStage("cake");
  $("#wish-button").disabled = true;
  $("#wish-status").textContent = "星光正在把蛋糕送来…";
  try {
    cakeModule ||= import("./cake.js");
    const { CakeView } = await cakeModule;
    if (disposed || epoch !== loadEpoch || !["cake", "wish"].includes(stage))
      return;
    disposeCake();
    cake = new CakeView($("#cake-host"), {
      reduced: preferences.reduced,
      onError: () => {},
    });
    if (cake.renderer) cake.renderer.setPixelRatio(budget.dpr);
    $("#wish-status").textContent = "愿望不用说出来，星星会听见。";
    $("#wish-button").disabled = false;
    setStage("wish");
  } catch {
    if (epoch !== loadEpoch) return;
    try {
      const { PaintedCake } = await import("./cake-fallback.js");
      if (disposed || epoch !== loadEpoch) return;
      disposeCake();
      cake = new PaintedCake(
        $("#cake-host"),
        preferences.reduced,
        String(config.age),
      );
      $("#cake-host").dataset.cakeRenderer = "2d";
      $("#wish-status").textContent = "愿望不用说出来，星星会听见。";
      $("#wish-button").disabled = false;
      setStage("wish");
    } catch {
      if (disposed || epoch !== loadEpoch) return;
      $("#wish-status").textContent = "星星替你留好了位置。";
      $("#wish-button").textContent = "去点亮星空 ✧";
      $("#wish-button").disabled = false;
    }
  }
}

function openGift() {
  if (stage !== "gift" || transition) return;
  beginAudio();
  $("#gift-button").disabled = true;
  $("#open-button").disabled = true;
  setStage("opening");
  // Fetch the heavy renderer only after the birthday gift has been opened.
  cakeModule ||= import("./cake.js");
  cakeModule.catch(() => {});
}

function makeWish() {
  if (!["cake", "wish"].includes(stage) || transition) return;
  if (!cake) {
    enterFireworks();
    return;
  }
  $("#wish-button").disabled = true;
  setStage("blow");
  audio.effect("blow");
}

async function enterFireworks() {
  const epoch = ++loadEpoch;
  disposeCake();
  clearSky();
  fireworksCompleted = false;
  climaxShown = false;
  $("#show-replay").hidden = true;
  $("#fireworks-heading").textContent =
    `这场烟花，送给${config.age}岁的${config.name}。`;
  $("#show-eyebrow").textContent = "A SKY FULL OF WISHES";
  $("#fireworks-subtitle").textContent = config.fireworksMessage;
  setStage("fireworks");
  $("#read-letter").className = "glass-button";
  attachSurprises(epoch);
  try {
    fireworksModule ||= import("./fireworks.js");
    const { Fireworks } = await fireworksModule;
    if (disposed || epoch !== loadEpoch || stage !== "fireworks") return;
    fireworks = new Fireworks({
      reduced: preferences.reduced,
      onSound: (kind) => audio.effect(kind),
      onBurst: (x, y, color, power) => environment.flash(x, y, color, power),
    });
    fireworks.resize(environment.width, environment.height);
    fireworks.setQuality(budget.level);
    fireworks.startShow();
    sceneTime = 0;
    $("#sky-hint").textContent = "也可以轻点天空，放一朵属于你的烟花。";
  } catch {
    $("#sky-hint").textContent = "烟花暂时迷路了，先拆开给你的生日祝福吧。";
  }
}

function endShow() {
  if (stage !== "fireworks" || transition) return;
  spentBeforeEnding = sceneTime;
  ++loadEpoch;
  changeWithVeil("ending", () => {
    clearSky();
  });
}

function restart() {
  ++loadEpoch;
  transition = null;
  document.body.classList.remove("veil", "spark-rise");
  disposeCake();
  clearSky();
  fireworksCompleted = false;
  audio.reset();
  $("#gift-button").disabled = false;
  $("#open-button").disabled = false;
  $("#wish-button").disabled = false;
  $("#wish-button").innerHTML = "我许好愿啦 <span>✦</span>";
  $("#wish-status").textContent = "愿望不用说出来，星星会听见。";
  setStage("gift");
}

function tick(timestamp) {
  if (disposed) return;
  if (document.hidden) {
    lastTimestamp = null;
    return;
  }
  try {
    advance(timestamp);
    frameId = requestAnimationFrame(tick);
  } catch {
    dispose();
    window.showBirthdayLetter();
  }
}

function advance(timestamp) {
  const dt =
    lastTimestamp === null
      ? 0
      : Math.min((timestamp - lastTimestamp) / 1000, 0.06);
  lastTimestamp = timestamp;
  sceneTime += dt;
  totalTime += dt;
  budget.observe(dt);
  motes.update(dt);
  littleGifts?.update(dt);
  audio.update(stage);
  if (transition) {
    transition.time += dt;
    const wait = preferences.reduced ? 0.16 : 0.6;
    if (!transition.switched && transition.time >= wait) {
      const pending = transition;
      transition = null;
      pending.task?.();
      setStage(pending.next);
      if (pending.next === "cake") enterCake();
      document.body.classList.remove("veil");
    }
  }
  if (
    stage === "opening" &&
    sceneTime > (preferences.reduced ? 0.9 : 2.5) &&
    !transition
  )
    changeWithVeil("cake");
  if (stage === "blow") {
    cake?.setBlowProgress(Math.min(1, sceneTime / 1.3));
    if (sceneTime > 2.0 && !document.body.classList.contains("spark-rise")) {
      document.body.classList.add("spark-rise");
      audio.effect("rise");
    }
    if (sceneTime > (preferences.reduced ? 2.5 : 4.3)) enterFireworks();
  }
  cake?.update(dt, sceneTime, stage);
  if (fireworks && stage === "fireworks") {
    gestures?.update(dt);
    surprises?.update(dt);
    const hint = Math.floor(sceneTime / 8) % config.skyHints.length;
    if (hint !== hintIndex) {
      hintIndex = hint;
      $("#sky-hint").textContent = config.skyHints[hint];
    }
    fireworks.update(dt, sceneTime);
    if (sceneTime > 36 && !climaxShown) {
      climaxShown = true;
      $("#fireworks-heading").textContent = greeting;
      $("#show-eyebrow").textContent = "OH, THE POSSIBILITIES";
      $("#fireworks-subtitle").textContent = "愿你所期待的美好，都在慢慢靠近。";
    }
    if (fireworks.done && !fireworksCompleted) {
      fireworksCompleted = true;
      $("#show-replay").hidden = false;
      $("#skip-button").hidden = true;
      $("#sky-hint").textContent = "星空还在，轻点一下，就有新的烟花。";
      $("#read-letter").classList.add("primary-button");
      $("#read-letter").classList.remove("glass-button");
    }
  }
  environment.update(
    dt,
    totalTime,
    stage === "wish" ? "cake" : stage,
    stage === "opening"
      ? sceneTime / 2.5
      : stage === "blow"
        ? sceneTime / 4.3
        : 0,
  );
  environment.quality = Math.min(
    environment.quality,
    [0.45, 0.72, 1][budget.level],
  );
  environment.render(
    fireworks && stage === "fireworks"
      ? (ctx, w, h) => {
          fireworks.draw(ctx);
          gestures?.draw(ctx, w, h);
        }
      : null,
  );
  motes.draw(environment.context, environment.width, environment.height);
}

$("#gift-button").addEventListener("click", openGift);
$("#open-button").addEventListener("click", openGift);
$("#wish-button").addEventListener("click", makeWish);
$("#read-letter").addEventListener("click", endShow);
$("#show-replay").addEventListener("click", () => {
  if (!fireworks || transition) return;
  fireworks.startShow();
  climaxShown = false;
  gestures?.reset();
  surprises?.reset();
  littleGifts?.setStage("gift");
  littleGifts?.setStage("fireworks");
  hintIndex = -1;
  $("#read-letter").className = "glass-button";
  sceneTime = 0;
  fireworksCompleted = false;
  $("#fireworks-heading").textContent =
    `这场烟花，送给${config.age}岁的${config.name}。`;
  $("#fireworks-subtitle").textContent = config.fireworksMessage;
  $("#show-eyebrow").textContent = "A SKY FULL OF WISHES";
  $("#show-replay").hidden = true;
  $("#skip-button").hidden = false;
});
$("#skip-button").addEventListener("click", () => {
  if (transition) return;
  if (stage === "fireworks") endShow();
  else if (stage !== "gift") enterFireworks();
});
$("#restart-button").addEventListener("click", restart);
$("#more-fireworks").addEventListener("click", enterFireworks);
$("#sound-button").addEventListener("click", async () => {
  if (audio.enabled) {
    preferences.sound = false;
    audio.disable();
  } else {
    preferences.sound = true;
    await audio.enable();
  }
  savePreferences();
  updateControls();
});
$("#motion-button").addEventListener("click", () => {
  preferences.reduced = !preferences.reduced;
  savePreferences();
  budget.reduced = preferences.reduced;
  budget.setLevel(preferences.reduced ? 0 : 1);
  environment.reduced = preferences.reduced;
  if (cake) cake.reduced = preferences.reduced;
  if (fireworks) fireworks.reduced = preferences.reduced;
  for (const effect of [gestures, surprises, littleGifts, motes])
    effect?.setReduced(preferences.reduced);
  updateControls();
  notice(
    preferences.reduced
      ? "星空轻轻亮着，动态效果已减少。"
      : "星光和烟花又活泼起来了。",
  );
});

$("#save-card").addEventListener("click", async () => {
  const button = $("#save-card");
  button.disabled = true;
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    if (!imageReady) {
      const url = makeKeepsake(config);
      $("#card-image").src = url;
      $("#download-card").href = url;
      imageReady = true;
    }
    const dialog = $("#card-dialog");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  } catch {
    notice("这张纪念图还没准备好，稍后再试一下。");
  } finally {
    button.disabled = false;
  }
});
function closeCard() {
  const dialog = $("#card-dialog");
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}
$("#close-card").addEventListener("click", closeCard);
$("#card-dialog").addEventListener("click", (event) => {
  if (event.target === $("#card-dialog")) {
    const r = event.target.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      closeCard();
  }
});

function resize() {
  environment.resize();
  cake?.resize();
  fireworks?.resize(environment.width, environment.height);
}
window.addEventListener("resize", resize, { passive: true });
document.addEventListener("visibilitychange", () => {
  lastTimestamp = null;
  cancelAnimationFrame(frameId);
  if (document.hidden) audio.pause();
  else if (!disposed) {
    audio.resume();
    frameId = requestAnimationFrame(tick);
  }
});
window.addEventListener("pagehide", (event) => {
  audio.pause();
  if (!event.persisted) dispose();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    lastTimestamp = null;
    if (!disposed && !document.hidden) {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(tick);
      audio.resume();
    }
  }
});
function dispose() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(frameId);
  clearTimeout(noticeTimeout);
  ++loadEpoch;
  disposeCake();
  clearSky();
  littleGifts?.dispose();
  motes.dispose();
  environment.dispose();
  audio.dispose();
  budget.dispose();
  window.removeEventListener("resize", resize);
}

// Read-only inspection surface for the delivered browser QA scripts.
window.__birthday = {
  get interactions() {
    return { gestures, surprises, littleGifts };
  },
  get stage() {
    return stage;
  },
  get time() {
    return sceneTime;
  },
  get fireworks() {
    return fireworks;
  },
  get cake() {
    return cake;
  },
  get metrics() {
    return {
      fps: 1 / budget.average,
      quality: budget.level,
      audioNodes: audio.nodes.size,
      storageAvailable,
      spentBeforeEnding,
    };
  },
};
updateControls();
resize();
frameId = requestAnimationFrame(tick);
window.finishBirthdayLoading();
if (window.birthdayGiftTapped) openGift();
