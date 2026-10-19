(function () {
  'use strict';
  window.initDataExperiment = function ({ getProgress, onProgress, navigate }) {
    const core = window.DataLessonCore;
    const $ = id => document.getElementById(id);
    const taskIds = ['title', 'state', 'append', 'order'];
    const names = { title: '改标题', state: '改完成状态', append: '增加记录', order: '调序再修改' };
    let tasks = core.initialTasks();
    let taskId = 'title';
    let phase = 'reverse';
    let attempt = null;
    let orderBeforeUpdate = null;

    function operation() {
      if (taskId === 'order' && phase === 'reverse') return { kind: 'reverse' };
      if (taskId === 'append') return { kind: 'append', id: 't03', title: $('new-value').value };
      const field = $('target-field').value;
      return { kind: 'update', id: $('target-task').value, field,
        value: field === 'done' ? $('new-state').value === 'true' : $('new-value').value };
    }
    function syntax(node, text) {
      const tokens = /"(?:\\.|[^"\\])*"|\b(?:const|true|false)\b/g;
      let start = 0;
      for (const match of text.matchAll(tokens)) {
        node.append(document.createTextNode(text.slice(start, match.index)));
        const span = document.createElement('span');
        span.className = match[0][0] === '"' ? 'syntax-string' : 'syntax-keyword';
        span.textContent = match[0]; node.append(span); start = match.index + match[0].length;
      }
      node.append(document.createTextNode(text.slice(start)));
    }
    function line(container, text, options = {}) {
      const row = document.createElement('span'); row.className = 'code-line';
      if (options.number) {
        const number = document.createElement('span'); number.className = 'code-number';
        number.setAttribute('aria-hidden', 'true'); number.textContent = options.number; row.append(number);
      }
      const content = document.createElement('span'); content.className = 'code-content';
      if (options.selected) {
        row.classList.add('is-target');
        const index = text.lastIndexOf(options.selected);
        syntax(content, text.slice(0, index));
        const mark = document.createElement('mark'); mark.textContent = options.selected;
        content.append(mark); syntax(content, text.slice(index + options.selected.length));
      } else syntax(content, text);
      row.append(content); container.append(row);
    }
    function renderSource(node, data, selected) {
      node.replaceChildren(); let n = 1;
      line(node, 'const tasks = [', { number: n++ });
      data.forEach((task, index) => {
        const titleLine = `  { id: ${JSON.stringify(task.id)}, title: ${JSON.stringify(task.title)},`;
        const stateLine = `    done: ${task.done} }${index < data.length - 1 ? ',' : ''}`;
        line(node, titleLine, { number: n++, selected: selected?.id === task.id && selected.field === 'title' ? JSON.stringify(task.title) : null });
        line(node, stateLine, { number: n++, selected: selected?.id === task.id && selected.field === 'done' ? String(task.done) : null });
      });
      line(node, '];', { number: n });
    }
    function renderDiff() {
      const node = $('current-data'); node.replaceChildren();
      const evidence = attempt.evidence;
      if (evidence.changes.length) {
        const record = attempt.after.find(item => item.id === evidence.changes[0].id);
        line(node, '{'); line(node, `  id: ${JSON.stringify(record.id)},`);
        ['title', 'done'].forEach(field => {
          const change = evidence.changes.find(item => item.id === record.id && item.field === field);
          if (change) {
            for (const [symbol, value, className, label] of [
              ['−', change.before, 'diff-before', '修改前'], ['+', change.after, 'diff-after', '修改后']
            ]) {
              const row = document.createElement('span'); row.className = `code-line ${className}`;
              row.setAttribute('aria-label', `${label}：${field} ${JSON.stringify(value)}`);
              const sign = document.createElement('span'); sign.className = 'diff-sign'; sign.textContent = symbol;
              sign.setAttribute('aria-hidden', 'true');
              const code = document.createElement('span'); code.textContent = `  ${field}: ${JSON.stringify(value)}${field === 'title' ? ',' : ''}`;
              row.append(sign, code); node.append(row);
            }
          } else line(node, `  ${field}: ${JSON.stringify(record[field])}${field === 'title' ? ',' : ''}`);
        });
        line(node, '}');
      } else if (evidence.added.length) {
        line(node, '// 本次新增的记录（原有记录保留）');
        evidence.added.forEach(record => {
          line(node, '{');
          line(node, `  id: ${JSON.stringify(record.id)},`);
          line(node, `  title: ${JSON.stringify(record.title)},`);
          line(node, `  done: ${record.done}`);
          line(node, '}');
        });
      }
      else if (evidence.orderChanged) {
        line(node, '// 只看位置：字段仍属于原来的 ID');
        attempt.before.forEach((old, index) => line(node, `tasks[${index}]  ${old.id} → ${attempt.after[index].id}`));
      } else renderSource(node, tasks);
    }
    function renderPreview() {
      const selected = operation();
      $('task-preview').replaceChildren(...tasks.map(task => {
        const li = document.createElement('li'); li.classList.toggle('is-done', task.done);
        const changed = attempt && (attempt.evidence.changes.some(item => item.id === task.id) || attempt.evidence.added.some(item => item.id === task.id));
        li.classList.toggle('is-target-record', attempt ? changed : selected.id === task.id);
        const mark = document.createElement('span'); mark.className = 'preview-mark'; mark.textContent = task.done ? '✓' : '';
        mark.setAttribute('role', 'img'); mark.setAttribute('aria-label', task.done ? '已完成' : '未完成');
        const label = document.createElement('span'); label.className = 'task-label'; label.textContent = task.title;
        const id = document.createElement('span'); id.className = 'task-id'; id.textContent = task.id;
        li.append(mark, label, id);
        if (attempt) {
          const note = document.createElement('span'); note.className = 'record-note';
          note.textContent = changed ? attempt.evidence.added.some(item => item.id === task.id) ? '新增记录' : attempt.operation.field === 'done' ? '状态已更新' : '标题已更新' : '未改动';
          li.append(note);
        }
        return li;
      }));
    }
    function targetOptions() {
      const selected = $('target-task').value || 't02';
      $('target-task').replaceChildren(...tasks.map((task, index) => {
        const option = document.createElement('option'); option.value = task.id;
        option.textContent = `${task.id}（第 ${index + 1} 条）`; return option;
      }));
      $('target-task').value = tasks.some(task => task.id === selected) ? selected : tasks[0].id;
    }
    function renderGoal() {
      const goals = {
        title: ['把 ID 为 t02 的任务标题改成“读第二章”。', '保留它的 ID、完成状态，以及另一条任务。'],
        state: ['把 ID 为 t01 的任务改为“已完成”。', '只改变 done，保留标题、ID，以及另一条任务。'],
        append: ['加入一条新任务：t03“整理桌面”。', '原有两条任务保持不变；新记录默认未完成。'],
        order: phase === 'reverse' ? ['先对调两条任务的位置。', '观察位置变化是否改变了记录的 ID、标题或完成状态。']
          : ['调序以后，仍然只改 t02 的标题。', '它现在位于第一行。按 ID 定位，保留另一条任务。']
      };
      $('experiment-context').textContent = `变量、对象与数组 / 实验 ${taskIds.indexOf(taskId) + 1} / 4 · ${names[taskId]}`;
      $('experiment-title').textContent = '先看数据，再预测这次改动';
      $('experiment-goal').textContent = goals[taskId][0]; $('experiment-preserve').textContent = goals[taskId][1];
    }
    function renderSteps(result) {
      const op = operation();
      const ready = op.kind === 'reverse' || (op.kind === 'append' ? op.title.trim().length > 0 && op.title.trim().length <= 80 : op.field === 'done' || op.value.trim().length > 0 && op.value.trim().length <= 80);
      const active = result ? 3 : ready ? 2 : 1;
      document.querySelectorAll('[data-flow-step]').forEach(node => {
        const index = Number(node.dataset.flowStep); node.classList.toggle('is-current', index === active);
        node.classList.toggle('is-done', index < active);
        node.querySelector('.flow-number').textContent = index < active ? '✓' : index;
        if (index === active) node.setAttribute('aria-current', 'step'); else node.removeAttribute('aria-current');
      });
    }
    function predictionChoices() {
      const op = operation(); const done = op.field === 'done';
      const options = op.kind === 'reverse' ? [['order', '只对调位置'], ['identity', '任务的 ID 也互换'], ['count', '记录数量改变']]
        : op.kind === 'append' ? [['append', '多一条记录，原有保持'], ['replace', '覆盖原来的第二条'], ['rename', '给原任务改名']]
        : [['target', `只有 ${op.id} 的${done ? '完成状态' : '标题'}`], ['all', `两条任务的${done ? '完成状态' : '标题'}`], ['both', `${op.id} 的标题和完成状态`]];
      const legend = document.createElement('legend'); legend.textContent = '你预计运行后，哪部分会变？';
      $('prediction-group').replaceChildren(legend, ...options.map(([value, text]) => {
        const label = document.createElement('label'); const input = document.createElement('input');
        input.type = 'radio'; input.name = 'prediction'; input.value = value;
        const span = document.createElement('span'); span.textContent = text; label.append(input, span); return label;
      }));
    }
    function renderReviewNav() {
      $('experiment-review').hidden = getProgress().passed.length === 0;
      document.querySelectorAll('[data-task]').forEach(button => {
        button.classList.toggle('is-active', button.dataset.task === taskId);
        button.textContent = `${taskIds.indexOf(button.dataset.task) + 1} · ${names[button.dataset.task]}${getProgress().passed.includes(button.dataset.task) ? ' ✓' : ''}`;
      });
    }
    function prepare({ rebuild = false } = {}) {
      attempt = null; $('index-comparison').hidden = true; $('experiment-feedback').hidden = true;
      $('duplicate-test').hidden = true; $('duplicate-test').open = false;
      $('duplicate-feedback').textContent = '';
      $('new-value').removeAttribute('aria-invalid');
      const op = operation(); const reverse = op.kind === 'reverse'; const append = op.kind === 'append';
      $('target-control').hidden = reverse || append; $('field-control').hidden = reverse || append;
      $('new-value-control').hidden = reverse || !append && op.field === 'done';
      $('new-state-control').hidden = reverse || append || op.field !== 'done'; $('new-id-control').hidden = !append;
      $('experiment-controls').hidden = false; $('execution-summary').hidden = true;
      $('prediction-area').hidden = false; $('verification-area').hidden = true;
      $('data-title').textContent = '当前数据'; $('preview-title').textContent = '当前页面';
      $('data-focus').textContent = reverse ? '看这里：数组中的位置' : append ? '看这里：现有两条记录' : `看这里：${op.id} 的 ${op.field}`;
      $('data-caption').textContent = '';
      $('preview-note').textContent = tasks.length === 2 && tasks[0].title === tasks[1].title ? '标题相同，ID 不同。' : '按 ID 核对对应记录。';
      renderGoal(); renderSteps(false); renderSource($('current-data'), tasks, op); renderPreview(); renderReviewNav();
      if (rebuild) predictionChoices();
      else document.querySelectorAll('[name="prediction"]').forEach(input => { input.checked = false; });
    }
    function selectTask(id, focus = false) {
      taskId = id; phase = 'reverse'; tasks = core.initialTasks(); orderBeforeUpdate = null;
      targetOptions(); $('target-task').value = id === 'state' ? 't01' : 't02';
      $('target-field').value = id === 'state' ? 'done' : 'title'; $('new-state').value = 'true';
      $('new-value').value = id === 'append' ? '整理桌面' : '读第二章';
      prepare({ rebuild: true }); if (focus) focusTop();
    }
    function focusTop() {
      $('experiment-title').focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    function verification(evidence, op) {
      const lines = [];
      if (evidence.changes.length) {
        lines.push(`改变了：${evidence.changes.map(item => `${item.id} 的 ${item.field}`).join('、')}`);
        const unchangedFields = ['id', 'title', 'done'].filter(field => !evidence.changes.some(item => item.id === op.id && item.field === field));
        lines.push(`保持不变：${op.id} 的 ${unchangedFields.join(' 和 ')}`);
        lines.push(`保持不变：${evidence.unchangedIds.join('、') || '其余记录'}${evidence.countBefore === evidence.countAfter ? ' 与记录数量' : ''}`);
      } else if (evidence.added.length) {
        lines.push(`新增了：${evidence.added.map(item => item.id).join('、')}`,
          `保持不变：${evidence.unchangedIds.join('、')} 的全部字段`, `记录数量：${evidence.countBefore} → ${evidence.countAfter}`);
      } else if (evidence.orderChanged) lines.push('改变了：数组中的排列位置', '保持不变：每条任务的 ID、标题和完成状态', `保持不变：记录数量 ${evidence.countAfter}`);
      else lines.push('没有实际数据变化', '新值与当前值相同', '本轮不增加完成记录');
      $('verification-list').replaceChildren(...lines.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
    }
    function renderResult() {
      const { result, operation: op, evidence, action } = attempt;
      $('experiment-controls').hidden = true; $('execution-summary').hidden = false;
      $('execution-values').replaceChildren(...(op.kind === 'update' ? [op.id, op.field, String(op.value)]
        : op.kind === 'append' ? [op.id, '新增记录', op.title] : ['数组位置', 't01 / t02', 't02 / t01']).map((value, index) => {
          const span = document.createElement('span'); span.textContent = value; span.className = index === 2 ? 'execution-new' : ''; return span;
        }));
      $('prediction-area').hidden = true; $('verification-area').hidden = false;
      $('experiment-title').textContent = !result.changed ? '这次没有数据变化' : evidence.changes.length === 1
        ? `只有 ${evidence.changes[0].id} 的${evidence.changes[0].field === 'title' ? '标题' : '完成状态'}变了`
        : evidence.added.length ? `${evidence.added[0].id} 已加入任务列表` : '位置变了，任务身份没有变';
      $('experiment-goal').textContent = !result.changed ? '没有新变化可以核对。恢复起点，再尝试一次。'
        : !result.predictionCorrect ? '预测与结果不同。先看实际差异，再回到修改前重新预测。'
        : action.next === 'retry' ? '预测范围正确，但还没有完成本轮目标。请核对指定的任务与字段。'
        : '预测与结果一致。现在核对改动范围，再继续下一实验。';
      $('experiment-preserve').textContent = ''; $('data-title').textContent = '数据变化';
      $('data-focus').textContent = evidence.changes.length === 1 ? '只看这一个字段' : '对照修改前与修改后';
      $('preview-title').textContent = '运行后的页面'; $('preview-note').textContent = '';
      $('data-caption').textContent = evidence.unchangedIds.length ? `${evidence.unchangedIds.join('、')} 的所有字段保持原样。` : '';
      renderSteps(true); renderDiff(); renderPreview(); verification(evidence, op);
      $('verification-title').textContent = result.changed ? '再核对这三处，就能解释结果' : '先区分“运行过”和“真的有变化”';
      $('result-detail').textContent = result.message;
      $('result-detail').hidden = result.predictionCorrect && result.changed && action.next !== 'retry';
      $('duplicate-test').hidden = evidence.added.length === 0;
      $('duplicate-test').open = false; $('duplicate-feedback').textContent = '';
      const nextCopy = { state: '继续实验 2：改完成状态 →', append: '继续实验 3：增加记录 →', order: '继续实验 4：调序再修改 →',
        'continue-order': '继续：按 ID 修改 t02 →', practice: '到 Codex 中试一试 →', retry: '回到修改前，重新预测 →' };
      $('experiment-next').textContent = nextCopy[action.next];
      $('next-explanation').textContent = { state: '下一轮，只改变完成状态，观察标题是否保留。', append: '下一轮，加入新记录，核对原来的两条任务。',
        order: '下一轮，对调位置，再按身份定位。', 'continue-order': 't02 已移到第一行；接着只改它的标题。', practice: '四个实验之后，用独立练习核对真实文件与页面。', retry: '本次数据会回到执行之前，保留你的输入。' }[action.next];
      $('retry-title').textContent = op.kind === 'update' && op.field === 'title' ? '再试一个不同标题' : '再试一次';
      $('index-comparison').hidden = true;
      if (taskId === 'order' && phase === 'update' && orderBeforeUpdate && evidence.changes.length) {
        const comparison = core.run(orderBeforeUpdate, { ...op, id: orderBeforeUpdate[1].id }, 'target');
        const details = document.createElement('details'); const summary = document.createElement('summary');
        summary.textContent = '不明白？看按索引修改的独立对照';
        const note = document.createElement('p'); note.textContent = `索引 1 此时指向 ${orderBeforeUpdate[1].id}；这个副本没有覆盖上方按 ID 修改的结果。`;
        const code = document.createElement('pre'); renderSource(code, comparison.tasks);
        details.append(summary, note, code); $('index-comparison').replaceChildren(details); $('index-comparison').hidden = false;
      }
      renderReviewNav();
    }
    function retry(focusValue) {
      if (attempt) { tasks = attempt.before.map(item => ({ ...item })); targetOptions(); }
      prepare({ rebuild: true }); focusTop();
      if (focusValue && !$('new-value-control').hidden) $('new-value').focus();
      else document.querySelector('#prediction-group input').focus();
    }
    $('target-task').addEventListener('change', () => prepare({ rebuild: true }));
    $('target-field').addEventListener('change', () => prepare({ rebuild: true }));
    $('new-value').addEventListener('input', () => prepare());
    $('new-state').addEventListener('change', () => prepare());
    $('reset-data').addEventListener('click', () => selectTask(taskId, true));
    $('result-reset').addEventListener('click', () => selectTask(taskId, true));
    $('retry-title').addEventListener('click', () => retry(true));
    document.querySelectorAll('[data-task]').forEach(button => button.addEventListener('click', () => { selectTask(button.dataset.task, true); $('experiment-review').open = false; }));
    $('experiment-form').addEventListener('submit', event => {
      event.preventDefault(); const op = operation();
      const result = core.run(tasks, op, document.querySelector('[name="prediction"]:checked')?.value || '');
      if (!result.ok) {
        $('experiment-feedback').textContent = result.message; $('experiment-feedback').hidden = false;
        if (op.kind !== 'reverse' && typeof (op.value ?? op.title) === 'string' && !(op.value ?? op.title).trim()) {
          $('new-value').setAttribute('aria-invalid', 'true'); $('new-value').focus();
        } else if (!document.querySelector('[name="prediction"]:checked')) document.querySelector('#prediction-group input').focus();
        return;
      }
      attempt = { before: tasks.map(item => ({ ...item })), after: result.tasks, operation: op, result,
        evidence: core.compareTasks(tasks, result.tasks), action: core.assessExperiment(taskId, phase, op, result) };
      $('experiment-feedback').hidden = true;
      tasks = result.tasks;
      if (attempt.action.passed && !getProgress().passed.includes(taskId)) getProgress().passed.push(taskId);
      renderResult(); onProgress(); focusTop();
    });
    $('experiment-next').addEventListener('click', () => {
      if (!attempt) return;
      const next = attempt.action.next;
      if (next === 'retry') retry(false);
      else if (next === 'continue-order') {
        phase = 'update'; orderBeforeUpdate = tasks.map(item => ({ ...item })); targetOptions();
        $('target-task').value = 't02'; $('target-field').value = 'title'; $('new-value').value = '读第二章';
        prepare({ rebuild: true }); focusTop();
      } else if (next === 'practice') navigate('practice');
      else selectTask(next, true);
    });
    $('check-duplicate').addEventListener('click', () => {
      if (attempt?.operation.kind !== 'append') return;
      const duplicate = core.run(tasks, attempt.operation, 'append');
      $('duplicate-feedback').textContent = `${duplicate.message}当前仍有 ${tasks.length} 条任务。`;
    });
    selectTask('title');
    return { reset: () => selectTask('title') };
  };
})();
