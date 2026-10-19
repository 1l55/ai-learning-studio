const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('独立练习复制到任意目录后，本地资源和链接仍可解析', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-lesson-portable-'));
  try {
    const copy = path.join(temporary, 'data-literacy');
    fs.cpSync(path.join(__dirname, '../examples/data-literacy'), copy, { recursive: true });
    const html = fs.readFileSync(path.join(copy, 'index.html'), 'utf8');
    for (const [, reference] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (/^[a-z]+:|^#/i.test(reference)) continue;
      const target = path.resolve(copy, reference.split('#')[0]);
      assert.ok(fs.existsSync(target), `portable resource is missing: ${reference}`);
    }
  } finally {
    const cleanupPath = fs.realpathSync(temporary);
    const tempRoot = fs.realpathSync(os.tmpdir());
    assert.ok(cleanupPath.startsWith(tempRoot + path.sep) && path.basename(cleanupPath).startsWith('ai-lesson-portable-'), 'cleanup must stay in the generated test directory');
    fs.rmSync(cleanupPath, { recursive: true, force: true });
  }
});
