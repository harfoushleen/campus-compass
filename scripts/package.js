// Builds the offline "campus-app" package: a zip that runs on a library laptop with no installation.
//
//   npm run package
//
// Output (in release/):
//   campus-app/              the folder that goes in the zip
//     app/                   the built website (no service worker, no outside files)
//     start.bat, server.ps1  Windows: a tiny web server in PowerShell + the double-click launcher
//     start.command, server.pl   Mac: the same, in Perl (both ship with the operating system)
//     README.txt
//   campus-app.zip           the same folder, zipped (start.command keeps its "executable" flag)
//
// This does not touch the normal website build (npm run build -> dist/), so deploying to Vercel works as before.
import { execFileSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, cpSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import yazl from 'yazl';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist-offline');
const releaseDir = join(root, 'release');
const folder = join(releaseDir, 'campus-app');
const zipPath = join(releaseDir, 'campus-app.zip');
const templates = join(root, 'scripts', 'package');

const step = (text) => console.log(`\n▶ ${text}`);
const fail = (text) => {
  console.error(`\n✖ ${text}`);
  process.exit(1);
};

// ── 1. Build ──
step('Building the app (offline mode, no service worker)');
rmSync(dist, { recursive: true, force: true });
execFileSync(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--mode', 'offline'], { cwd: root, stdio: 'inherit' });

// ── 2. Check that it really works offline ──
step('Checking that nothing is loaded from the internet');
const allFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? allFiles(join(dir, e.name)) : [join(dir, e.name)]));
const files = allFiles(dist);
const problems = [];

// No service worker or web manifest in this build.
for (const f of files) if (/(^|[\\/])(sw\.js|workbox-[^\\/]*\.js|registerSW\.js|manifest\.webmanifest)$/.test(f)) problems.push(`PWA file found: ${relative(dist, f)}`);

// index.html and the CSS must only point at local files.
const html = readFileSync(join(dist, 'index.html'), 'utf8');
for (const m of html.matchAll(/<(?:script|link|img|source|iframe)\b[^>]*\b(?:src|href)\s*=\s*["']((?:https?:)?\/\/[^"']+)["']/gi)) problems.push(`index.html loads ${m[1]}`);
for (const f of files.filter((f) => f.endsWith('.css'))) {
  for (const m of readFileSync(f, 'utf8').matchAll(/url\(\s*["']?((?:https?:)?\/\/[^)"']+)/gi)) problems.push(`${relative(dist, f)} loads ${m[1]}`);
  if (/@import\s+(?:url\()?["']?(?:https?:)?\/\//i.test(readFileSync(f, 'utf8'))) problems.push(`${relative(dist, f)} imports an outside stylesheet`);
}
// The JavaScript must not contain the well-known places libraries download fonts, models or maps from.
const outsideHosts = /fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|unpkg\.com|cdnjs\.cloudflare|raw\.githack|githubusercontent|esm\.sh|tile\.openstreetmap|googleapis\.com\/ajax/i;
for (const f of files.filter((f) => /\.(js|html|css)$/.test(f))) {
  const hit = readFileSync(f, 'utf8').match(outsideHosts);
  if (hit) problems.push(`${relative(dist, f)} mentions ${hit[0]}`);
}
if (problems.length) fail(`The build is not fully offline:\n  - ${problems.join('\n  - ')}`);
console.log(`  OK: ${files.length} files, no service worker, nothing loaded from the internet.`);

// ── 3. Assemble the folder ──
step('Assembling release/campus-app');
rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(folder, { recursive: true });
cpSync(dist, join(folder, 'app'), { recursive: true });

// Windows scripts need CRLF line endings, Mac scripts need LF (git may have changed them on checkout).
const copyScript = (name, eol, mode = 0o644) => {
  const text = readFileSync(join(templates, name), 'utf8').replace(/\r\n/g, '\n');
  writeFileSync(join(folder, name), eol === 'crlf' ? text.replace(/\n/g, '\r\n') : text, { mode });
};
copyScript('start.bat', 'crlf');
copyScript('server.ps1', 'crlf');
copyScript('start.command', 'lf', 0o755);
copyScript('server.pl', 'lf', 0o755);
copyScript('README.txt', 'crlf');

// ── 4. Zip ──
step('Creating release/campus-app.zip');
const zip = new yazl.ZipFile();
const executable = new Set(['start.command', 'server.pl']); // so the Mac can run them after unzipping
for (const f of allFiles(folder).sort()) {
  const inside = 'campus-app/' + relative(folder, f).split(sep).join('/');
  const name = relative(folder, f);
  zip.addFile(f, inside, { mode: executable.has(name) ? 0o100755 : 0o100644, mtime: statSync(f).mtime });
}
await new Promise((resolve, reject) => {
  zip.outputStream.pipe(createWriteStream(zipPath)).on('close', resolve).on('error', reject);
  zip.end();
});

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
console.log(`\n✔ Done.\n  Folder: ${folder}\n  Zip:    ${zipPath}  (${mb(statSync(zipPath).size)})`);
if (!existsSync(zipPath)) fail('The zip was not created.');
