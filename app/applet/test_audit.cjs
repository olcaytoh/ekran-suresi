const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) res = res.concat(walk(p));
      else res.push(p);
    }
  } catch (e) {
    // ignore
  }
  return res;
}

const pub = new Set(walk('public').map(f => '/' + path.relative('public', f).replace(/\\/g, '/')));
const files = walk('src').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
const missingAssets = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const reg = /['"`](\/[a-zA-Z0-9_\-\.\/]+\.(png|jpg|jpeg|svg|webp|mp4))['"`]/g;
  let m;
  while ((m = reg.exec(content)) !== null) {
    const asset = m[1];
    if (!pub.has(asset) && !fs.existsSync(path.join('public', asset))) {
      missingAssets.push({ file: f, asset });
    }
  }
}

console.log('=== ASSET CHECK ===');
console.log('Total referenced static assets:', files.length, 'files inspected.');
console.log('Missing assets count:', missingAssets.length);
if (missingAssets.length) {
  console.log(JSON.stringify(missingAssets, null, 2));
}

console.log('\n=== LINT & BUILD CHECK ===');
