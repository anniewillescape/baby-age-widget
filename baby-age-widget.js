// 子どもの月齢ウィジェット（Scriptable）
// 名前・誕生日などはウィジェットの「Parameter」欄から読み込みます。
// Parameterの書き方（カンマ区切り、名前以降は省略可）:
//   誕生日,名前,絵文字,テーマ
//   例) 2025-04-01,赤ちゃん,👶,peach
// テーマ: peach / mint / lavender / sky / night

const DEFAULTS = {
  birthday: "2025-01-01",
  name: "サンプル",
  emoji: "",
  theme: "peach",
};

function isValidDate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function loadConfig() {
  const param = (args.widgetParameter || "").trim();
  if (!param) {
    // アプリ内で▶実行したときはParameterが空なのでサンプル表示
    return {
      cfg: DEFAULTS,
      notice: config.runsInWidget ? "⚠️ Parameterを設定してください" : null,
    };
  }
  const [birthday, name, emoji, theme] = param.split(",").map((v) => v.trim());
  if (!isValidDate(birthday)) {
    return { cfg: DEFAULTS, notice: "⚠️ 誕生日の形式を確認してください" };
  }
  return {
    cfg: {
      birthday,
      name: name || DEFAULTS.name,
      emoji: emoji || DEFAULTS.emoji,
      theme: theme || DEFAULTS.theme,
    },
    notice: null,
  };
}

const { cfg, notice } = loadConfig();
const BIRTHDAY = cfg.birthday;
const NAME = cfg.name;
const EMOJI = cfg.emoji;
const THEME = cfg.theme;

// ===== テーマ =====
const THEMES = {
  peach: {
    bg: ["#FFE1D6", "#FFB4A2"],
    text: "#5A2E22",
    bar: "#FFFFFF",
    card: 0.35,
  },
  mint: {
    bg: ["#D9F7EC", "#8FD9C1"],
    text: "#1F4D40",
    bar: "#FFFFFF",
    card: 0.35,
  },
  lavender: {
    bg: ["#EEE8FF", "#B9A7F5"],
    text: "#3B2E6B",
    bar: "#FFFFFF",
    card: 0.35,
  },
  sky: {
    bg: ["#E1F0FF", "#9CC9F5"],
    text: "#1E3A5F",
    bar: "#FFFFFF",
    card: 0.35,
  },
  night: {
    bg: ["#34406A", "#151B2E"],
    text: "#FFFFFF",
    bar: "#F2C879",
    card: 0.12,
  },
};
const T = THEMES[THEME] || THEMES.peach;
const textColor = new Color(T.text);
const subColor = new Color(T.text, 0.7);

// ===== 日付計算 =====
function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addMonths(base, n) {
  const t = new Date(base.getFullYear(), base.getMonth() + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(base.getDate(), last));
  return t;
}
const DAY = 86400000;
const birth = parseDate(BIRTHDAY);
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

const totalDays = Math.round((today - birth) / DAY);
const weeks = Math.floor(totalDays / 7);
const restDays = totalDays % 7;

let y = today.getFullYear() - birth.getFullYear();
let m = today.getMonth() - birth.getMonth();
let d = today.getDate() - birth.getDate();
if (d < 0) {
  m--;
  d += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
}
if (m < 0) {
  y--;
  m += 12;
}

const months = y * 12 + m;
const lastMark = addMonths(birth, months);
const nextMark = addMonths(birth, months + 1);
const ratio = Math.min(
  1,
  Math.max(0, (today - lastMark) / (nextMark - lastMark)),
);
const daysLeft = Math.round((nextMark - today) / DAY);

let caption = `次の月誕生日まで あと${daysLeft}日`;
if (d === 0 && totalDays > 0) {
  caption =
    m === 0
      ? `🎂 ${y}歳のお誕生日！`
      : `🎉 今日で${y > 0 ? y + "歳" : ""}${m}ヶ月！`;
}
if (notice) caption = notice;

// ===== パーツ =====
function txt(stack, str, font, color) {
  const t = stack.addText(str);
  t.font = font;
  t.textColor = color;
  t.lineLimit = 1;
  return t;
}

function progressBar(width, height) {
  const ctx = new DrawContext();
  ctx.size = new Size(width, height);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const r = height / 2;
  const bg = new Path();
  bg.addRoundedRect(new Rect(0, 0, width, height), r, r);
  ctx.addPath(bg);
  ctx.setFillColor(new Color(T.text, 0.15));
  ctx.fillPath();
  const fg = new Path();
  fg.addRoundedRect(
    new Rect(0, 0, Math.max(height, width * ratio), height),
    r,
    r,
  );
  ctx.addPath(fg);
  ctx.setFillColor(new Color(T.bar));
  ctx.fillPath();
  return ctx.getImage();
}

function addHeader(stack) {
  const h = stack.addStack();
  h.centerAlignContent();
  txt(h, `${EMOJI} ${NAME}`, Font.boldRoundedSystemFont(13), textColor);
  h.addSpacer();
}

function addAge(stack, size) {
  const row = stack.addStack();
  row.bottomAlignContent();
  const parts =
    y > 0
      ? [
          [y, "歳", 1],
          [m, "ヶ月", 1],
          [d, "日", 0.6],
        ]
      : [
          [m, "ヶ月", 1],
          [d, "日", 1],
        ];
  parts.forEach(([num, unit, scale], i) => {
    txt(row, String(num), Font.heavyRoundedSystemFont(size * scale), textColor);
    row.addSpacer(1);
    txt(row, unit, Font.boldRoundedSystemFont(size * scale * 0.42), textColor);
    if (i < parts.length - 1) row.addSpacer(4);
  });
}

function addBar(stack, width) {
  const img = stack.addImage(progressBar(width, 6));
  img.imageSize = new Size(width, 6);
  stack.addSpacer(4);
  const c = txt(stack, caption, Font.mediumRoundedSystemFont(10), subColor);
  c.minimumScaleFactor = 0.7;
}

function addCard(stack, label, value) {
  const c = stack.addStack();
  c.layoutVertically();
  c.backgroundColor = new Color("#FFFFFF", T.card);
  c.cornerRadius = 10;
  c.setPadding(6, 10, 6, 10);
  txt(c, label, Font.mediumRoundedSystemFont(10), subColor);
  txt(c, value, Font.boldRoundedSystemFont(15), textColor);
}

// ===== ウィジェット =====
const w = new ListWidget();
const g = new LinearGradient();
g.colors = T.bg.map((c) => new Color(c));
g.locations = [0, 1];
g.startPoint = new Point(0, 0);
g.endPoint = new Point(1, 1);
w.backgroundGradient = g;
w.setPadding(14, 14, 14, 14);

const family = config.widgetFamily || "small";

if (family === "medium") {
  addHeader(w);
  w.addSpacer();
  const body = w.addStack();
  body.centerAlignContent();
  const left = body.addStack();
  left.layoutVertically();
  addAge(left, 40);
  body.addSpacer();
  const right = body.addStack();
  right.layoutVertically();
  addCard(right, "週数", `${weeks}週${restDays}日`);
  right.addSpacer(6);
  addCard(right, "生後", `${totalDays}日`);
  w.addSpacer();
  addBar(w, 300);
} else {
  addHeader(w);
  w.addSpacer();
  addAge(w, 32);
  w.addSpacer(2);
  const info = txt(
    w,
    `${weeks}週${restDays}日 · 生後${totalDays}日`,
    Font.semiboldRoundedSystemFont(11),
    subColor,
  );
  info.minimumScaleFactor = 0.7;
  w.addSpacer();
  addBar(w, 128);
}

w.refreshAfterDate = new Date(today.getTime() + DAY);

if (config.runsInWidget) {
  Script.setWidget(w);
} else if (family === "medium") {
  await w.presentMedium();
} else {
  await w.presentSmall();
}
Script.complete();
