const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../data-core.js');

test('按身份修改同名任务，保留其他记录及非目标字段', () => {
  const before = core.initialTasks();
  const result = core.run(before, { kind: 'update', id: 't02', field: 'title', value: '读第二章' }, 'target');
  assert.equal(result.ok, true);
  assert.equal(result.predictionCorrect, true);
  assert.deepEqual(result.tasks, [
    { id: 't01', title: '读一章书', done: false },
    { id: 't02', title: '读第二章', done: false }
  ]);
  assert.equal(before[1].title, '读一章书');
});

test('调序后仍按 ID 更新目标，而不是沿用第二个位置', () => {
  const reordered = core.run(core.initialTasks(), { kind: 'reverse' }, 'order');
  const result = core.run(reordered.tasks, { kind: 'update', id: 't02', field: 'done', value: true }, 'target');
  assert.deepEqual(result.tasks, [
    { id: 't02', title: '读一章书', done: true },
    { id: 't01', title: '读一章书', done: false }
  ]);
});

test('缺少预测不执行，错误预测仍执行并返回反证', () => {
  const operation = { kind: 'update', id: 't02', field: 'title', value: '新标题' };
  const before = core.initialTasks();
  assert.equal(core.run(before, operation, '').ok, false);
  const wrong = core.run(before, operation, 'all');
  assert.equal(wrong.ok, true);
  assert.equal(wrong.predictionCorrect, false);
  assert.equal(wrong.tasks[0].title, '读一章书');
  assert.equal(wrong.tasks[1].title, '新标题');
});

test('无效字段、未知身份、字符串布尔值和空标题都不改变数据', () => {
  for (const operation of [
    { kind: 'update', id: 't02', field: 'id', value: 't01' },
    { kind: 'update', id: 'missing', field: 'title', value: '新标题' },
    { kind: 'update', id: 't01', field: 'done', value: 'false' },
    { kind: 'update', id: 't01', field: 'title', value: '  ' }
  ]) {
    const before = core.initialTasks();
    const result = core.run(before, operation, 'target');
    assert.equal(result.ok, false);
    assert.deepEqual(result.tasks, before);
    assert.ok(result.message);
  }
});

test('新增记录保留旧记录，重复 ID 被拒绝且不部分写入', () => {
  const operation = { kind: 'append', id: 't03', title: '整理桌面' };
  const result = core.run(core.initialTasks(), operation, 'append');
  assert.deepEqual(result.tasks[2], { id: 't03', title: '整理桌面', done: false });
  const duplicate = core.run(result.tasks, operation, 'append');
  assert.equal(duplicate.ok, false);
  assert.deepEqual(duplicate.tasks, result.tasks);
});

test('无改动的运行不能充当完成实验的证据', () => {
  const result = core.run(core.initialTasks(), { kind: 'update', id: 't02', field: 'title', value: '读一章书' }, 'target');
  assert.equal(result.ok, true);
  assert.equal(result.changed, false);
});

test('换需求自检提供对应解释，缺答和未知题不通过', () => {
  assert.equal(core.grade('identity', 'stable').correct, true);
  assert.equal(core.grade('identity', 'position').correct, false);
  assert.ok(core.grade('identity', 'position').explanation.length > 15);
  assert.equal(core.grade('render', '').correct, false);
  assert.equal(core.grade('unknown', 'target').correct, false);
});

test('损坏或旧记录安全降级，伪造完成状态不绕过自检', () => {
  for (const raw of ['{', 'null', '[]', '{"version":99}', '{"version":1,"completed":true,"practice":true}']) {
    const result = core.readProgress(raw);
    assert.equal(result.completed, false);
    assert.equal('tasks' in result, false);
  }
});

test('学习记录只恢复有效学习证据，不持久化实验任务数据', () => {
  const raw = JSON.stringify({ version: 1, stage: 'practice', read: true,
    answers: { record: 'field', identity: 'stable', render: 'display', bad: '<script>' },
    passed: ['title', 'state', 'append', 'order', 'fake'], completed: true, practice: true,
    tasks: [{ id: 'bad' }] });
  const result = core.readProgress(raw);
  assert.equal(result.completed, true);
  assert.equal(result.practice, true);
  assert.deepEqual(result.passed, ['title', 'state', 'append', 'order']);
  assert.equal(result.answers.bad, undefined);
  assert.equal(result.tasks, undefined);
});
