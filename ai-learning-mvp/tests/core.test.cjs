const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const corePath = path.join(__dirname, '..', 'lesson-core.js');
const core = fs.existsSync(corePath) ? require(corePath) : {};

test('正文锚点保留当前环节，真正的课程链接才切换环节', () => {
  assert.equal(typeof core.resolveStage, 'function');
  assert.equal(core.resolveStage('#lesson-panel', 'explain'), 'explain');
  assert.equal(core.resolveStage('#experiment', 'guess'), 'experiment');
  assert.equal(core.resolveStage('#unknown', 'invalid'), 'guess');
});

test('实验没有选择保存条件时，不把持久化当成已经明确的需求', () => {
  assert.equal(typeof core.buildExperiment, 'function');
  const result = core.buildExperiment(['audience', 'actions']);
  assert.deepEqual(result.unknowns, ['storage']);
  assert.equal(result.checks.length, 2);
  assert.equal(result.noise, false);
});

test('相关信息逐项消除对应歧义，无关信息不增加功能约束', () => {
  assert.equal(typeof core.buildExperiment, 'function');
  const result = core.buildExperiment(['audience', 'actions', 'storage', 'noise', 'storage']);
  assert.deepEqual(result.unknowns, []);
  assert.equal(result.checks.length, 3);
  assert.equal(result.noise, true);
  assert.ok(result.prompt.includes('刷新'));
});

test('空白需求字段保留待确认项，不为学习者捏造需求', () => {
  assert.equal(typeof core.buildBrief, 'function');
  const result = core.buildBrief({ goal: '  读书记录工具  ', audience: '', features: '记录书名\n标记读完' });
  assert.ok(result.includes('目标：读书记录工具'));
  assert.ok(result.includes('使用者：待确认'));
  assert.ok(result.includes('记录书名\n标记读完'));
  assert.ok(result.includes('限制：待确认'));
});

test('错误判断得到针对性解释，不能通过迁移自检', () => {
  assert.equal(typeof core.gradeAnswer, 'function');
  const result = core.gradeAnswer('transfer-short', 'length');
  assert.equal(result.correct, false);
  assert.ok(result.explanation.length > 30);
  assert.equal(core.gradeAnswer('transfer-short', 'context').correct, true);
  assert.equal(core.gradeAnswer('transfer-short', '').correct, false);
});

test('损坏、旧版和非法记录降级为可学习的初始状态', () => {
  assert.equal(typeof core.readProgress, 'function');
  for (const raw of ['broken json', 'null', '[]', '{"version":99}', '{"version":1,"stage":"invalid"}']) {
    const result = core.readProgress(raw);
    assert.equal(result.stage, 'guess');
    assert.equal(result.completed, false);
  }
});

test('不能仅修改 completed 就绕过理解自检', () => {
  assert.equal(typeof core.readProgress, 'function');
  const result = core.readProgress(JSON.stringify({ version: 1, completed: true, answers: { 'transfer-short': 'context' } }));
  assert.equal(result.completed, false);
});

test('真实通过的答案和原始草稿可以刷新恢复，未知字段被丢弃', () => {
  assert.equal(typeof core.readProgress, 'function');
  const result = core.readProgress(JSON.stringify({
    version: 1, stage: 'practice', completed: true,
    answers: { 'transfer-short': 'context', 'transfer-file': 'read', 'transfer-more': 'relevant', unknown: 'admin' },
    draft: { goal: '<script>alert(1)</script>', secret: 'drop' },
    experiment: ['storage', 'fake'],
  }));
  assert.equal(result.completed, true);
  assert.equal(result.stage, 'practice');
  assert.equal(result.draft.goal, '<script>alert(1)</script>');
  assert.equal(result.draft.secret, undefined);
  assert.equal(result.answers.unknown, undefined);
  assert.deepEqual(result.experiment, ['storage']);
});
