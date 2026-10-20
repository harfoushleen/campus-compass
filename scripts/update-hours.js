// Reads opening hours from LAU's official pages and writes them to src/data/hours.json.
// Run with:  npm run hours
// A GitHub Actions workflow (.github/workflows/update-hours.yml) runs it every week.
//
// Why a script and not the app itself? LAU's pages don't allow browsers on other sites to read
// them (no CORS headers), so the app can't fetch them directly. This script runs on a server
// (GitHub's), where that doesn't matter.
//
// If a page can't be fetched or its hours can't be found, the LAST KNOWN hours stay in hours.json,
// marked "stale": true, and the app shows them as "may be outdated". Hours are never blanked out.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const OUT = new URL('../src/data/hours.json', import.meta.url);
const TODAY = new Date().toISOString().slice(0, 10);
// Some LAU pages answer a plain script but block anything that looks like a browser.
const USER_AGENT = 'campus-compass-hours-bot (student project; https://github.com/harfoushleen/campus-compass)';

// ───────────────────────── helpers ─────────────────────────

/** HTML to plain text, one block per line (good enough for reading a few sentences). */
function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/(tr|p|div|li|h\d|table|ul|section)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;|&ndash;/g, '–').replace(/&#8217;|&#039;|&#39;/g, "'")
    .split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n');
}

/** "10 a.m." / "4:30 p.m." / "11:00AM" / "08:30" -> "10:00" / "16:30" / "11:00" / "8:30". */
function to24(text) {
  const m = text.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?m?\.?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ?? '00';
  if (m[3]) {
    const pm = m[3].toLowerCase() === 'p';
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
  }
  return `${h}:${min}`;
}

/** Every time range in a piece of text, e.g. "8:00 a.m.–4:30 p.m." or "08:30–12:00" -> ["8:00–16:30", "8:30–12:00"]. */
function ranges(text) {
  const t = '(\\d{1,2}(?::\\d{2})?\\s*(?:[ap]\\.?m\\.?)?)';
  const re = new RegExp(`${t}\\s*(?:–|-|to)\\s*${t}`, 'gi');
  return [...text.matchAll(re)].map((m) => {
    // "10 a.m. to 3 p.m." has the am/pm only after each number; "9:00–12:00 p.m." shares it
    const a = to24(m[1]), b = to24(m[2]);
    return a && b ? `${a}–${b}` : null;
  }).filter(Boolean);
}

/**
 * Downloads a page. This uses curl: LAU's Cloudflare protection answers curl (and a plain script
 * that says who it is) but refuses Node's built-in fetch with "403". curl is preinstalled on GitHub's
 * runners. If curl is missing, fetch is tried as a fallback.
 */
async function fetchPage(url) {
  let body, code;
  try {
    const { stdout } = await run('curl', ['-sSL', '--max-time', '30', '-A', USER_AGENT, '-w', '\n%{http_code}', url], { maxBuffer: 20 * 1024 * 1024 });
    const i = stdout.lastIndexOf('\n');
    body = stdout.slice(0, i);
    code = stdout.slice(i + 1).trim();
  } catch (e) {
    if (e.code !== 'ENOENT') throw new Error('download failed: ' + (e.stderr || e.message).trim().split('\n')[0]);
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30000) });
    body = await res.text();
    code = String(res.status);
  }
  if (code !== '200') throw new Error('HTTP ' + code);
  if (/Just a moment[.][.][.]|challenge-platform/i.test(body.slice(0, 4000))) throw new Error('blocked by a Cloudflare challenge');
  return body;
}

// ───────────────────────── Athletics tables ─────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** The weekly hours table on an Athletics facility page -> "Mon–Fri 7:00–20:00" (or one part per day). */
function athleticsHours(html) {
  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0];
  if (!table) return null;
  const rows = [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((r) => [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => toText(c[1]).replace(/\n/g, ', ')));
  const data = rows.find((r) => r.length >= 7 && /\d/.test(r.slice(2).join('')));
  if (!data) return null;
  const perDay = data.slice(2, 7).map((cell) =>
    [...cell.matchAll(/(\d{1,2}:\d{2}\s*[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s*[AP]M)\s*(?:\(([^)]*)\))?/gi)].map((m) => {
      const who = (m[3] ?? '').trim().toLowerCase();
      const note = !who || who === 'everyone' ? '' : who === 'females' ? ' (women)' : who === 'faculty & staff' ? ' (faculty & staff)' : ` (${who})`;
      return `${to24(m[1])}–${to24(m[2])}${note}`;
    }).join(', ')
  );
  if (perDay.every((d) => !d)) return null;
  // Join neighbouring days that have the same hours: "Mon–Thu 11:00–13:00 · Fri 12:00–15:00 (faculty & staff)"
  const parts = [];
  for (let i = 0; i < 5; ) {
    let j = i;
    while (j + 1 < 5 && perDay[j + 1] === perDay[i]) j++;
    if (perDay[i]) parts.push(`${i === j ? DAYS[i] : `${DAYS[i]}–${DAYS[j]}`} ${perDay[i]}`);
    i = j + 1;
  }
  return parts.join(' · ');
}

// ───────────────────────── what to read ─────────────────────────
// Each source: a page, and for each hours entry (key) a function that finds the hours in the page.
// A function returns the hours text, or null if it can't find them.
const SOURCES = [
  {
    url: 'https://registrar.lau.edu.lb/services-procedures/student-services/contact-us.php',
    keys: {
      registrar: (text) => {
        const winter = text.match(/([\d:–\-\sand]+)\(winter hours\)/i)?.[1];
        const summer = text.match(/([\d:–\-\s]+)\(summer hours\)/i)?.[1];
        const w = winter && ranges(winter).join(' and '), s = summer && ranges(summer)[0];
        return w && s ? `${w} (summer ${s})` : null;
      },
    },
  },
  {
    url: 'https://it.lau.edu.lb/contact-us/',
    keys: {
      'it-helpdesk': (text) => {
        const regular = text.match(/Monday[–-]Friday\s*([^\n(]*)\(regular schedule\)/i)?.[1];
        const summer = text.match(/Monday[–-]Friday\s*([^\n(]*)\(summer schedule\)/i)?.[1];
        const r = regular && ranges(regular)[0], s = summer && ranges(summer)[0];
        return r && s ? `Mon–Fri ${r} (summer ${s})` : null;
      },
    },
  },
  {
    url: 'https://studyabroad.lau.edu.lb/contact.php',
    keys: {
      isp: (text) => {
        const line = text.match(/Office hours:[^\n]*/i)?.[0];
        const r = line && ranges(line.replace(/from\s+/i, ''))[0];
        return r ? `${r}, Monday to Friday (except holidays)` : null;
      },
    },
  },
  {
    url: 'https://lau.edu.lb/parents/offices.php',
    keys: {
      // The cashier's window at the Business Office
      cashier: (text) => {
        const sentences = [...text.matchAll(/The cashier at the Business Office opens to the public from ([^\n]*)/gi)].map((m) => m[1]);
        if (sentences.length < 2) return null;
        const regular = ranges(sentences[0].replace(/(\d)\s*(a\.m\.|p\.m\.)\s*to/gi, '$1 $2 to').replace(/ and from /i, ' ; ')).join(' and ');
        const summer = ranges(sentences[1])[0];
        return regular && summer ? `Cashier: ${regular} (summer ${summer})` : null;
      },
      // Typical office hours of the administrative offices
      general: (text) => {
        const regular = text.match(/administrative offices typically open from [^\n]*/i)?.[0];
        const summer = text.match(/In summer [(][^)]*[)], the hours are from [^\n]*/i)?.[0];
        const r = regular && ranges(regular)[0], sm = summer && ranges(summer)[0];
        const breakAt = regular?.match(/break at (\d{1,2}:\d{2}\s*[ap]\.?m)/i)?.[1];
        const brk = breakAt && to24(breakAt);
        return r && sm ? 'Typically ' + r + (brk ? ', half-hour break from ' + brk : '') + ' (summer ' + sm + ')' : null;
      },
    },
  },
  ...[
    ['fitness-centers', 'fitness-center'],
    ['basketball-indoor-court', 'indoor-court'],
    ['swimming-pool', 'swimming-pool'],
  ].map(([slug, key]) => ({
    url: `https://athletics.lau.edu.lb/facility/${slug}/`,
    raw: true, // reads the HTML table, not the plain text
    keys: { [key]: (html) => athleticsHours(html) },
  })),
];

// ───────────────────────── run ─────────────────────────

const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { entries: {} };
const entries = {};
let ok = 0, failed = 0;

for (const source of SOURCES) {
  let html = null, error = null;
  try {
    html = await fetchPage(source.url);
  } catch (e) {
    error = e.message;
  }
  const text = html && !source.raw ? toText(html) : null;
  for (const [key, extract] of Object.entries(source.keys)) {
    let hours = null;
    if (html) {
      try {
        hours = extract(source.raw ? html : text);
      } catch (e) {
        error = e.message;
      }
      if (!hours) error ??= 'hours not found on the page';
    }
    if (hours) {
      entries[key] = { hours, checked: TODAY, source: source.url, stale: false };
      ok++;
      console.log(`ok     ${key}: ${hours}`);
    } else if (previous.entries?.[key]) {
      entries[key] = { ...previous.entries[key], source: source.url, stale: true };
      failed++;
      console.warn(`STALE  ${key}: ${error}. Keeping the last known hours.`);
    } else {
      failed++;
      console.warn(`MISSING ${key}: ${error}. No earlier hours to keep.`);
    }
  }
}

// Entries for places that no longer have a source stay as they were.
for (const [key, entry] of Object.entries(previous.entries ?? {})) if (!entries[key]) entries[key] = entry;

writeFileSync(OUT, JSON.stringify({ updated: TODAY, entries }, null, 2) + '\n');
console.log(`\nDone: ${ok} read, ${failed} not readable. Written to src/data/hours.json`);
