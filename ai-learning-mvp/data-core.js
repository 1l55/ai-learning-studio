(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DataLessonCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const stages = ['guess', 'explain', 'experiment', 'practice'];
  const experiments = ['title', 'state', 'append', 'order'];
  const questions = {
    guess: { answer: 'id', reasons: {
      title: '标题描述内容。同名时可能匹配多条，不能保证只修改你想要的记录。',
      id: '目标身份、要改的字段和保持项都明确了；还需保证 ID 在当前列表中唯一。',
      position: '位置可能碰巧正确，但排序以后第二个位置可能换成另一条任务。'
    } },
    record: { answer: 'field', reasons: {
      field: 'name 是记录的一个字段。修改书名不会自动更换 id，也不会自动修改 finished。',
      identity: '书名是内容，id 是身份。书名纠错后，这仍然可以是原先那条记录。',
      group: '大括号表示这里的一条对象记录；方括号才用来组织本例中的一组记录。'
    } },
    identity: { answer: 'stable', reasons: {
      stable: '用稳定且唯一的 ID 定位，并检查修改前后对应关系，才能适应排序变化。',
      position: '位置取决于当前排序。先核对身份，不能沿用上一次的第二个位置。',
      title: '标题可能重复，也可能被改名，不能先当作唯一身份。'
    } },
    render: { answer: 'display', reasons: {
      display: '先核对当前数据，再查同一页面是否读取新数据并更新显示。两处证据能区分数据与显示问题。',
      assignment: '仅凭页面没变不能证明赋值失败；需要查看数据和显示更新各自的证据。',
      save: '保存关系到重新加载后的数据来源，不能替代本次显示更新的检查。'
    } }
  };
  function initialTasks() {
    return [{ id: 't01', title: '读一章书', done: false }, { id: 't02', title: '读一章书', done: false }];
  }
  function grade(id, answer) {
    const question = questions[id];
    return question && Object.hasOwn(question.reasons, answer)
      ? { correct: answer === question.answer, explanation: question.reasons[answer] }
      : { correct: false, explanation: '先选择一个判断，再查看理由。' };
  }
  function run(source, operation, prediction) {
    const tasks = source.map(task => ({ ...task }));
    const fail = message => ({ ok: false, tasks, changed: false, predictionCorrect: false, message });
    const kind = operation?.kind;
    const expected = kind === 'update' ? 'target' : kind === 'append' ? 'append' : kind === 'reverse' ? 'order' : '';
    const choices = kind === 'update' ? ['target', 'all', 'both'] : kind === 'append' ? ['append', 'replace', 'rename'] : ['order', 'identity', 'count'];
    if (!expected) return fail('未识别操作，请恢复起点后重试。');
    if (!choices.includes(prediction)) return fail('先选一个预测，再运行观察。');
    let message;
    if (kind === 'update') {
      if (!['title', 'done'].includes(operation.field)) return fail('本实验只能修改标题或完成状态，不能改写身份。');
      const matches = tasks.filter(task => task.id === operation.id);
      if (matches.length !== 1) return fail('找不到唯一的目标 ID，数据没有改变。');
      let value = operation.value;
      if (operation.field === 'title') {
        if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) return fail('请输入 1—80 字的标题，原数据未改变。');
        value = value.trim();
      } else if (typeof value !== 'boolean') return fail('完成状态必须是布尔值，请使用已完成 / 未完成选项。');
      matches[0][operation.field] = value;
      message = `按 ID 定位 ${operation.id}，只更新 ${operation.field}。请核对另一条记录、ID 和其他字段保持不变。`;
    } else if (kind === 'append') {
      if (typeof operation.id !== 'string' || !/^[a-zA-Z0-9_-]{1,30}$/.test(operation.id)) return fail('需要有效的新 ID，原数据未改变。');
      if (tasks.some(task => task.id === operation.id)) return fail('这个 ID 已存在，原数据未改变。');
      if (typeof operation.title !== 'string' || !operation.title.trim() || operation.title.trim().length > 80) return fail('请输入 1—80 字的标题，原数据未改变。');
      tasks.push({ id: operation.id, title: operation.title.trim(), done: false });
      message = `增加 ${operation.id}，现在有 ${tasks.length} 条记录；原有任务保持不变。`;
    } else {
      tasks.reverse();
      message = '只对调位置：字段和数量保持不变。接着按 t02 修改，检查身份与位置的区别。';
    }
    const changed = JSON.stringify(source) !== JSON.stringify(tasks);
    const predictionCorrect = prediction === expected;
    const reason = predictionCorrect ? '预测与本次结果一致。' : kind === 'update'
      ? prediction === 'all' ? '同名不等于同一条记录，本次按 ID 定位。' : '修改一个字段，不会自动改变另一个字段。'
      : kind === 'append' ? '追加对象会增加一条记录，不覆盖或改名原有记录。' : '交换顺序改变位置，不改变身份或数量。';
    return { ok: true, tasks, changed, predictionCorrect, message: `${reason}${message}${changed ? '' : '新值与原值相同，本轮没有实际变化。请恢复初始数据后重新预测，或换一个新值再试。'}` };
  }
  function readProgress(raw) {
    const empty = { version: 1, stage: 'guess', answers: {}, passed: [], read: false, completed: false, practice: false };
    let data;
    try { data = JSON.parse(raw); } catch { return empty; }
    if (!data || Array.isArray(data) || data.version !== 1) return empty;
    const answers = {};
    for (const [id, question] of Object.entries(questions)) {
      const answer = data.answers?.[id];
      if (typeof answer === 'string' && Object.hasOwn(question.reasons, answer)) answers[id] = answer;
    }
    const passed = Array.isArray(data.passed) ? [...new Set(data.passed.filter(id => experiments.includes(id)))] : [];
    const read = data.read === true;
    return { ...empty, stage: stages.includes(data.stage) ? data.stage : 'guess', answers, passed, read,
      completed: data.completed === true && read && passed.length === 4 && ['record', 'identity', 'render'].every(id => grade(id, answers[id]).correct),
      practice: data.practice === true };
  }
  function compareTasks(before, after) {
    const oldRecords = new Map(before.map(task => [task.id, task]));
    const newRecords = new Map(after.map(task => [task.id, task]));
    const changes = [];
    const unchangedIds = [];
    for (const task of before) {
      const next = newRecords.get(task.id);
      if (!next) continue;
      const fields = ['title', 'done'].filter(field => task[field] !== next[field]);
      if (!fields.length) unchangedIds.push(task.id);
      fields.forEach(field => changes.push({ id: task.id, field, before: task[field], after: next[field] }));
    }
    const commonBefore = before.filter(task => newRecords.has(task.id)).map(task => task.id);
    const commonAfter = after.filter(task => oldRecords.has(task.id)).map(task => task.id);
    return { changes, unchangedIds,
      added: after.filter(task => !oldRecords.has(task.id)).map(task => ({ ...task })),
      removed: before.filter(task => !newRecords.has(task.id)).map(task => ({ ...task })),
      countBefore: before.length, countAfter: after.length,
      orderChanged: commonBefore.some((id, index) => id !== commonAfter[index]) };
  }
  function assessExperiment(task, phase, operation, result) {
    const retry = { passed: false, next: 'retry' };
    if (!result.ok || !result.changed || !result.predictionCorrect) return retry;
    if (task === 'order' && phase === 'reverse') {
      return operation.kind === 'reverse' ? { passed: false, next: 'continue-order' } : retry;
    }
    const updateGoal = operation.kind === 'update' && operation.id === (task === 'state' ? 't01' : 't02')
      && operation.field === (task === 'state' ? 'done' : 'title') && (task !== 'state' || operation.value === true);
    const goal = task === 'append' ? operation.kind === 'append' && operation.id === 't03' : updateGoal;
    if (!goal) return retry;
    const next = { title: 'state', state: 'append', append: 'order', order: 'practice' }[task];
    return next ? { passed: true, next } : retry;
  }
  return { initialTasks, grade, run, readProgress, compareTasks, assessExperiment };
});
