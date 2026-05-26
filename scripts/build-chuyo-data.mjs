import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const today = '2026-05-26';

const dirs = [
  'data/region/chuyo/aed',
  'data/region/chuyo/shelters',
  'data/region/chuyo/recycle',
];

dirs.forEach((dir) => fs.mkdirSync(path.join(root, dir), { recursive: true }));

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function writeJson(relativePath, data) {
  fs.writeFileSync(path.join(root, relativePath), `${JSON.stringify(data, null, 2)}\n`);
}

function decodeCp932(relativePath) {
  return execFileSync('iconv', ['-f', 'CP932', '-t', 'UTF-8', path.join(root, relativePath)], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(value);
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      value = '';
    } else {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    if (row.some((cell) => cell !== '')) rows.push(row);
  }

  const header = rows.shift() || [];
  return rows.map((cells) => {
    const item = {};
    header.forEach((key, index) => {
      item[key] = (cells[index] || '').trim();
    });
    return item;
  });
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function availableHours(row) {
  const days = row['利用可能曜日'];
  const start = row['開始時間'];
  const end = row['終了時間'];
  const note = row['利用可能日時特記事項'];
  const base = days && start && end ? `${days} ${start}-${end}` : '';
  return [base, note].filter(Boolean).join(' / ');
}

function normalizeAed(row, options) {
  const lat = toNumber(row['緯度']);
  const lng = toNumber(row['経度']);
  if (lat === null || lng === null) return null;

  const name = row['名称'];
  if (!name) return null;

  return {
    id: `${options.prefix}-${String(options.index).padStart(3, '0')}`,
    type: 'aed',
    name,
    municipality: row['市区町村名'] || row['所在地_市区町村'] || options.municipality,
    lat,
    lng,
    address: row['住所'] || row['所在地_連結表記'] || '',
    facilityType: row['団体名'] || null,
    availableHours: availableHours(row) || '利用時間不明',
    indoor: null,
    verified: false,
    photo: '',
    note: row['備考'] || row['設置位置'] || '',
    sourceUrl: options.sourceUrl,
    lastChecked: today,
  };
}

function buildAedFromCsvFiles(files, options) {
  let index = 1;
  return files.flatMap((file) => {
    const rows = parseCsv(decodeCp932(file));
    return rows.map((row) => normalizeAed(row, {
      ...options,
      index: index++,
    })).filter(Boolean);
  });
}

const matsuyamaAed = readJson('data/aed-sites/matsuyama.json').map((spot) => ({
  ...spot,
  sourceUrl: spot.sourceUrl || 'https://www.city.matsuyama.ehime.jp/shisei/opendata/opendata/kosodate/aed.html',
  lastChecked: spot.lastChecked || today,
}));

const iyoFiles = Array.from({ length: 11 }, (_, index) =>
  `tmp-chuyo-data/iyo-aed-${String(index + 1).padStart(2, '0')}.csv`);

writeJson('data/region/chuyo/aed/matsuyama.json', matsuyamaAed);
writeJson('data/region/chuyo/aed/iyo.json', buildAedFromCsvFiles(iyoFiles, {
  prefix: 'aed-iyo',
  municipality: '伊予市',
  sourceUrl: 'https://www.city.iyo.lg.jp/shise/opendata/meta001.html',
}));
writeJson('data/region/chuyo/aed/toon.json', buildAedFromCsvFiles(['tmp-chuyo-data/toon-aed.csv'], {
  prefix: 'aed-toon',
  municipality: '東温市',
  sourceUrl: 'https://www.city.toon.ehime.jp/soshiki/6/1964.html',
}));
writeJson('data/region/chuyo/aed/kumakogen.json', buildAedFromCsvFiles(['tmp-chuyo-data/kumakogen-aed.csv'], {
  prefix: 'aed-kumakogen',
  municipality: '久万高原町',
  sourceUrl: 'https://data.bodik.jp/dataset/383864_aed',
}));

[
  'matsuyama',
  'tobe',
  'masaki',
  'toon',
  'iyo',
].forEach((name) => {
  writeJson(`data/region/chuyo/shelters/${name}.json`, readJson(`data/evacuation-sites/${name}.json`));
});

writeJson('data/region/chuyo/recycle/boxes.json', readJson('data/spots.json'));
