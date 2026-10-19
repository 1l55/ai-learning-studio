const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const outline = fs.readFileSync(path.resolve(root, '../docs/curriculum/2026-10-15-ai-creation-curriculum-v3.md'), 'utf8');
const expected = [...outline.matchAll(/^\| (\d{2}\.\d{2}) ([^|]+?) \|/gm)].map(m => [m[1], m[2].trim()]);
const expectedCounts = [4, 6, 9, 7, 6, 7, 4, 7, 7, 5, 7, 5, 6];

function quiz(q, label) {
  assert.ok(q && typeof q.question === 'string' && q.question.length >= 12, `${label}: meaningful question`);
  assert.ok(Array.isArray(q.options) && q.options.length >= 3, `${label}: alternatives`);
  assert.equal(q.options.filter(o => o.correct === true).length, 1, `${label}: unique answer`);
  assert.equal(new Set(q.options.map(o => o.text)).size, q.options.length, `${label}: distinct answers`);
  for (const o of q.options) {
    assert.ok(typeof o.text === 'string' && o.text.trim(), `${label}: option`);
    assert.ok(typeof o.feedback === 'string' && o.feedback.length >= 18, `${label}: reason for each option`);
    assert.equal(typeof o.correct, 'boolean');
  }
}

test('80节课程与v3编号、名称、模块归属精确对应，不能用目录占位冒充内容', () => {
  assert.equal(expected.length, 80);
  const all = [];
  expectedCounts.forEach((count, index) => {
    const name = String(index + 1).padStart(2, '0');
    const file = path.join(root, 'content/modules', `${name}.json`);
    assert.ok(fs.existsSync(file), `module ${name} needs real authored content`);
    const lessons = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(lessons.length, count, name);
    lessons.forEach(lesson => assert.ok(lesson.id.startsWith(`${name}.`)));
    all.push(...lessons);
  });
  assert.deepEqual(all.map(l => [l.id, l.title]), expected);
  assert.equal(new Set(all.map(l => l.id)).size, 80);
});

for (let index = 1; index <= 13; index++) {
  const moduleId = String(index).padStart(2, '0');
  test(`模块 ${moduleId}：解释、条件变化、逐选项理由和独立实操齐全`, () => {
    const file = path.join(root, 'content/modules', `${moduleId}.json`);
    assert.ok(fs.existsSync(file), `${moduleId}: missing authored lessons`);
    const lessons = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const l of lessons) {
      assert.ok(l.lead?.length >= 25, `${l.id}: concrete starting problem`);
      assert.ok(l.goals?.length >= 2, `${l.id}: observable goals`);
      assert.ok(l.sections?.length >= 4, `${l.id}: mechanism depth`);
      for (const s of l.sections) {
        assert.ok(s.title && s.paragraphs?.length >= 2, `${l.id}: developed sections`);
      }
      const prose = l.sections.flatMap(s => s.paragraphs).join('');
      assert.ok(prose.length >= 600, `${l.id}: ${prose.length} chars of actual teaching`);
      assert.ok(l.glossary?.length >= 3, `${l.id}: in-place terminology`);
      quiz(l.predict, `${l.id} prediction`);
      assert.ok(l.experiment?.boundary?.length >= 12, `${l.id}: demonstrate honestly`);
      assert.ok(l.experiment.cases?.length >= 2, `${l.id}: condition variation`);
      assert.equal(new Set(l.experiment.cases.map(c => c.input)).size, l.experiment.cases.length);
      l.experiment.cases.forEach((c, i) => {
        quiz(c, `${l.id} case ${i}`);
        assert.ok(c.name && c.input?.length >= 20 && c.output?.length >= 35, `${l.id}: concrete input/outcome`);
        assert.ok(c.evidence?.length >= 2, `${l.id}: observable evidence`);
      });
      assert.ok(l.practice?.intro && l.practice.steps?.length >= 3, `${l.id}: actionable practice`);
      assert.ok(l.practice.prompt?.length >= 75, `${l.id}: concrete Codex instruction`);
      assert.ok(l.practice.evidence?.length >= 3, `${l.id}: actual evidence`);
      assert.ok(l.practice.troubleshooting?.length >= 2, `${l.id}: help`);
      l.practice.troubleshooting.forEach(t => assert.ok(t.symptom && t.check && t.action));
      assert.ok(l.checks?.length >= 2, `${l.id}: transfer checks`);
      l.checks.forEach((q, i) => quiz(q, `${l.id} transfer ${i}`));
      assert.ok(l.sources?.length, `${l.id}: traceable source`);
      l.sources.forEach(s => {
        assert.ok(s.label && /^https:\/\//.test(s.url), `${l.id}: source URL`);
        assert.match(s.checked, /^2026-10-16$/);
      });
    }
  });
}
