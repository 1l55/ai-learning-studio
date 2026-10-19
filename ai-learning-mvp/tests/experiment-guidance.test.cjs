const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../data-core.js');

test('结果证据来自实际前后数据，只指出真正改变的字段', () => {
  const before = core.initialTasks();
  const after = [{ id: 't01', title: '读一章书', done: false }, { id: 't02', title: '新标题', done: false }];
  const evidence = core.compareTasks(before, after);
  assert.deepEqual(evidence.changes, [{ id: 't02', field: 'title', before: '读一章书', after: '新标题' }]);
  assert.deepEqual(evidence.unchangedIds, ['t01']);
  assert.equal(evidence.countBefore, 2);
  assert.equal(evidence.countAfter, 2);
  assert.equal(evidence.orderChanged, false);
});

test('新增证据区分新记录与已有记录，不伪称原任务字段被修改', () => {
  const evidence = core.compareTasks(core.initialTasks(), [
    { id: 't01', title: '读一章书', done: false },
    { id: 't02', title: '读一章书', done: false },
    { id: 't03', title: '整理桌面', done: false }
  ]);
  assert.deepEqual(evidence.added, [{ id: 't03', title: '整理桌面', done: false }]);
  assert.deepEqual(evidence.changes, []);
  assert.deepEqual(evidence.unchangedIds, ['t01', 't02']);
  assert.equal(evidence.orderChanged, false);
});

test('调序只产生位置证据，不能伪造字段变化', () => {
  const evidence = core.compareTasks(core.initialTasks(), [
    { id: 't02', title: '读一章书', done: false }, { id: 't01', title: '读一章书', done: false }
  ]);
  assert.equal(evidence.orderChanged, true);
  assert.deepEqual(evidence.changes, []);
  assert.deepEqual(evidence.unchangedIds, ['t01', 't02']);
  assert.deepEqual(evidence.added, []);
});

test('错误预测、未执行、无变化均引导重试，不能直接进入下一实验', () => {
  const op = { kind: 'update', id: 't02', field: 'title', value: '新标题' };
  for (const result of [
    { ok: false, changed: false, predictionCorrect: false },
    { ok: true, changed: true, predictionCorrect: false },
    { ok: true, changed: false, predictionCorrect: true }
  ]) {
    assert.deepEqual(core.assessExperiment('title', 'reverse', op, result), { passed: false, next: 'retry' });
  }
});

test('完成前三实验只引导下一实验，不提前去 Codex', () => {
  const result = { ok: true, changed: true, predictionCorrect: true };
  for (const [task, operation, next] of [
    ['title', { kind: 'update', id: 't02', field: 'title', value: '新标题' }, 'state'],
    ['state', { kind: 'update', id: 't01', field: 'done', value: true }, 'append'],
    ['append', { kind: 'append', id: 't03', title: '整理桌面' }, 'order']
  ]) assert.deepEqual(core.assessExperiment(task, 'reverse', operation, result), { passed: true, next });
});

test('修改其他任务或字段即使猜对结果，也没有完成本轮目标', () => {
  const result = { ok: true, changed: true, predictionCorrect: true };
  for (const operation of [
    { kind: 'update', id: 't01', field: 'title', value: '新标题' },
    { kind: 'update', id: 't02', field: 'done', value: true }
  ]) assert.deepEqual(core.assessExperiment('title', 'reverse', operation, result), { passed: false, next: 'retry' });
});

test('调序实验先继续按身份修改，完成后才引导外部实操', () => {
  const result = { ok: true, changed: true, predictionCorrect: true };
  assert.deepEqual(core.assessExperiment('order', 'reverse', { kind: 'reverse' }, result), { passed: false, next: 'continue-order' });
  assert.deepEqual(core.assessExperiment('order', 'update', { kind: 'update', id: 't02', field: 'title', value: '新标题' }, result), { passed: true, next: 'practice' });
});
