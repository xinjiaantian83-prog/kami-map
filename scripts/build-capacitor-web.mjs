import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const copyItems = [
  "index.html",
  "privacy.html",
  "manifest.webmanifest",
  "favicon.ico",
  "css",
  "js",
  "images",
  "data",
];

const targetPlatform = process.env.CAP_PLATFORM || "web";
const weatherEnabled = targetPlatform === "ios" || targetPlatform === "android" || targetPlatform === "web";

const weatherWidgetMarkup = `
    <button class="weather-chip is-loading" id="weather-chip" type="button" aria-label="天気予報を開く" aria-live="polite">
      <span class="weather-chip__date" id="weather-chip-date">--/--</span>
      <span class="weather-chip__icon" id="weather-chip-icon" aria-hidden="true">☁️</span>
      <span class="weather-chip__temp"><span id="weather-chip-temp">--</span>°</span>
      <span class="weather-chip__status" id="weather-chip-status">天気取得中…</span>
      <span class="weather-chip__chevron" aria-hidden="true">›</span>
    </button>
    <div class="weather-sheet-backdrop" id="weather-sheet-backdrop" hidden></div>
    <section class="weather-sheet" id="weather-sheet" aria-hidden="true" aria-label="天気予報">
      <div class="weather-sheet__handle" aria-hidden="true"></div>
      <button class="weather-sheet__close" id="weather-sheet-close" type="button" aria-label="天気予報を閉じる">×</button>
      <div class="weather-sheet__header">
        <div>
          <p class="weather-sheet__place" id="weather-place">現在地</p>
          <h2><span id="weather-icon" aria-hidden="true">☁️</span> <span id="weather-summary">天気</span></h2>
        </div>
        <div class="weather-sheet__current"><span id="weather-current">--</span><span>℃</span></div>
      </div>
      <div class="weather-sheet__meta">
        <span id="weather-range">最高 --℃ / 最低 --℃</span>
        <span id="weather-pop">降水 --%</span>
        <span id="weather-updated">更新 --:--</span>
      </div>
      <div class="weather-forecast" id="weather-forecast" aria-label="1週間の天気予報"></div>
      <p class="weather-sheet__error" id="weather-error" hidden>天気情報なし</p>
      <p class="weather-sheet__source">天気データ：<a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a></p>
    </section>`

function removeBlock(source, name) {
  const pattern = new RegExp(`\\n?/\\* ${name}_START \\*/[\\s\\S]*?/\\* ${name}_END \\*/`, "g");
  return source.replace(pattern, "");
}

await rm("www", { recursive: true, force: true });
await mkdir("www", { recursive: true });

for (const item of copyItems) {
  await cp(item, `www/${item}`, { recursive: true });
}

const indexPath = "www/index.html";
let indexHtml = await readFile(indexPath, "utf8");
indexHtml = indexHtml.replace("<!-- __WEATHER_WIDGET__ -->", weatherEnabled ? weatherWidgetMarkup : "");
await writeFile(indexPath, indexHtml);

const appPath = "www/js/app.js";
let appJs = await readFile(appPath, "utf8");
appJs = appJs.replace("var WEATHER_ENABLED = false;", `var WEATHER_ENABLED = ${weatherEnabled ? "true" : "false"};`);
await writeFile(appPath, appJs);

const stylePath = "www/css/style.css";
let styleCss = await readFile(stylePath, "utf8");
if (!weatherEnabled) styleCss = removeBlock(styleCss, "WEATHER_CSS");
await writeFile(stylePath, styleCss);

console.log(`Built Capacitor web assets in www (${targetPlatform})`);
