const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the actual authored snippets: a lesson edit must preserve its claims.
const manuscript = fs.readFileSync(path.join(__dirname, '..', '03-04-variables-objects-arrays.md'), 'utf8').replace(/\r\n/g, '\n');
const examples = new Map();
for (const match of manuscript.matchAll(/```javascript\s*\n\/\/ example: ([\w-]+)\n([\s\S]*?)\n```/g)) {
  assert.ok(!examples.has(match[1]), `duplicate example: ${match[1]}`);
  examples.set(match[1], match[2]);
}

function execute(name, expression) {
  assert.ok(examples.has(name), `missing teaching example: ${name}`);
  return vm.runInNewContext(`${examples.get(name)}\n${expression}`, Object.create(null), { timeout: 100 });
}

function value(name, expression) {
  return JSON.parse(execute(name, `JSON.stringify(${expression})`));
}

test('变量例子把标题关联为文本值', () => {
  assert.equal(value('variable', 'title'), '读一章书');
});

test('任务对象保留三个职责不同且类型正确的字段', () => {
  assert.deepEqual(value('object', 'task'), { id: 't01', title: '读一章书', done: false });
  assert.equal(execute('object', 'typeof task.done'), 'boolean');
});

test('数组包含同名但独立的两条记录，第二个位置索引为一', () => {
  assert.equal(value('array', 'tasks.length'), 2);
  assert.equal(value('array', 'tasks[1].id'), 't02');
  assert.equal(execute('array', 'tasks[0] === tasks[1]'), false);
  assert.equal(execute('array', 'tasks[0].title === tasks[1].title'), true);
});

test('按当前索引改标题的例子只改变第二条标题，其他内容保持', () => {
  assert.deepEqual(value('update-title', 'tasks'), [
    { id: 't01', title: '读一章书', done: false },
    { id: 't02', title: '读第二章', done: false }
  ]);
});

test('const 不阻止对象字段修改', () => {
  assert.deepEqual(value('const-object', 'task'), { id: 't01', title: '读一章书', done: true });
});

test('const 的名字仍不能重新赋给另一个对象', () => {
  assert.throws(() => execute('const-object', 'task = { id: "replacement" };'), { name: 'TypeError' });
});
