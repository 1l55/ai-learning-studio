(function () {
  'use strict';
  const app = window.CourseApp; if (!app) return;
  const { data, core, el } = app;
  const query = new URLSearchParams(location.search);
  const id = query.get('id') || '01.01';
  const lesson = core.getLesson(data, id);
  const support = data.support.find(item => item.id === id);
  const panel = document.getElementById('lesson-panel');
  const route = Object.hasOwn(data.routes, query.get('route')) ? query.get('route') : app.progress.route;
  app.progress.route = route;
  document.getElementById('overview-link').href = `course.html?route=${route}${lesson ? `#module-${id.split('.')[0]}` : '#resources'}`;
  if (!lesson && !support) {
    document.title = '未找到课程 · AI 学习'; document.getElementById('lesson-title').textContent = '没有找到这节课';
    document.getElementById('lesson-lead').textContent = '请从课程总览选择现有课程。链接中的编号不会被当作页面代码执行。';
    panel.append(el('a', '返回课程总览', { href: 'course.html', class: 'enhanced-link' }));
    document.getElementById('lesson-tabs').hidden = true; return;
  }
  if (support) {
    renderSupport(support);
    window.addEventListener('pageshow', () => {
      app.reloadProgress(); panel.replaceChildren(); renderSupport(support);
    });
    return;
  }
  let record = app.progress.lessons[id] || core.emptyRecord();
  app.progress.lessons[id] = record; app.progress.lastLesson = id;
  const stages = [['guess', '先猜一猜'], ['explain', '看懂原理'], ['experiment', '动手实验'], ['practice', '实践与自检']];
  let stage = stages.some(([key]) => location.hash === `#${key}`) ? location.hash.slice(1) : record.stage;
  let caseIndex = 0;
  const module = data.modules.find(m => m.id === id.split('.')[0]);
  document.title = `${id} ${lesson.title} · AI 学习`;
  document.getElementById('lesson-title').textContent = lesson.title;
  document.getElementById('lesson-context').textContent = `${module.title} / ${id}`;
  document.getElementById('lesson-lead').textContent = lesson.lead;
  document.getElementById('rail-module').textContent = module.short;
  const nearby = document.getElementById('nearby-nav');
  module.lessons.forEach(l => {
    const a = el('a', `${l.id} ${l.title}`, { href: app.link(l.id, route) });
    if (l.id === id) a.setAttribute('aria-current', 'page'); nearby.append(a);
  });
  app.renderGlossary([lesson]);
  const tabs = document.getElementById('lesson-tabs'); const nav = document.getElementById('stage-nav');
  stages.forEach(([key, label], index) => {
    for (const target of [tabs, nav]) {
      const button = el('button', null, { type: 'button', 'data-stage': key });
      if (target === nav) button.append(el('span', `0${index + 1}`)); button.append(document.createTextNode(label));
      button.addEventListener('click', () => navigate(key)); target.append(button);
    }
  });
  const pair = core.neighbors(data, id, route); const neighbors = document.getElementById('lesson-neighbors');
  for (const [key, label] of [['previous', '← 上一课'], ['next', '下一课 →']]) if (pair[key]) {
    const item = core.getLesson(data, pair[key]); neighbors.append(el('a', `${label} ${item.id} ${item.title}`, { href: app.link(item.id, route) }));
  }
  function persist() {
    if (!core.canComplete(lesson, record)) record.completed = false;
    app.save({lessonId:id}); document.getElementById('lesson-status').textContent = record.completed ? '课内学习已完成 ✓' : '本课尚未完成';
    const complete = document.getElementById('complete-course-lesson');
    if (complete) {
      complete.disabled = !core.canComplete(lesson, record) || record.completed;
      complete.textContent = record.completed ? '课内学习已完成 ✓' : '记录本课课内完成';
    }
    const progress = document.getElementById('current-progress');
    if (progress) {
      const count = core.questions(lesson).filter(([key, q]) => core.grade(q, record.answers[key]).correct).length;
      progress.textContent = `原理阅读：${record.read ? '已记录' : '未记录'} · 课内练习：${count} / ${core.questions(lesson).length} · 外部实操：${record.practiced ? '已自行验收' : '未自行验收'}`;
    }
  }
  function navigate(next, focus = true) {
    stage = next; record.stage = next;
    if (location.hash !== `#${next}`) history.pushState({}, '', `#${next}`);
    render(); app.closeMenu();
    if (focus) { panel.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  }
  function action(next, text, note) {
    const row = el('div', null, { class: 'stage-action' }); row.append(el('p', note));
    const button = el('button', text, { class: 'button-primary', type: 'button' });
    button.addEventListener('click', () => navigate(next)); row.append(button); return row;
  }
  function quiz(question, key, submitText = '提交判断', onSubmit) {
    const form = el('form', null, { class: 'question-form', 'data-question': key });
    const fieldset = el('fieldset'); fieldset.append(el('legend', question.question));
    const feedback = el('div', null, { class: 'feedback', role: 'status' }); feedback.hidden = true;
    question.options.forEach((option, index) => {
      const label = el('label', null, { class: 'answer' });
      const input = el('input', null, { type: 'radio', name: key, value: index }); input.checked = record.answers[key] === index;
      label.append(input, el('span', option.text)); fieldset.append(label);
      input.addEventListener('change', () => {
        delete record.answers[key]; feedback.hidden = true;
        if (onSubmit) onSubmit(null); persist();
      });
    });
    const button = el('button', submitText, { class: 'button-small', type: 'submit' });
    function show(answer) {
      const result = core.grade(question, answer);
      feedback.replaceChildren(el('strong', result.correct ? '判断与案例相符' : answer === undefined ? '先选择一个判断' : '再核对一下条件'), document.createTextNode(result.feedback));
      feedback.classList.toggle('needs-retry', !result.correct); feedback.hidden = false;
      if (onSubmit) onSubmit(answer);
    }
    form.append(fieldset, button, feedback);
    if (record.answers[key] !== undefined) show(record.answers[key]);
    form.addEventListener('submit', event => {
      event.preventDefault(); const selected = form.querySelector('input:checked');
      if (!selected) { show(undefined); form.querySelector('input').focus(); return; }
      const answer = Number(selected.value); record.answers[key] = answer; show(answer); persist();
    });
    return form;
  }
  function render() {
    document.querySelectorAll('[data-stage]').forEach(button => {
      const active = button.dataset.stage === stage; button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
    });
    panel.replaceChildren(); const section = el('section', null, { class: 'reader-stage', 'aria-label': stages.find(([key]) => key === stage)[1] });
    if (stage === 'guess') {
      section.append(el('h2', '先判断，再带着问题往下学'));
      const goals = el('details', null, { class: 'help-disclosure' }); goals.append(el('summary', '本课起点与学习目标'));
      const ul = el('ul', null, { class: 'goal-list' }); lesson.goals.forEach(goal => ul.append(el('li', goal))); goals.append(ul);
      goals.append(el('p', `前置模块：${module.prerequisites.length ? module.prerequisites.join('、') : '无，可先做入门准备'}。不认识的术语可在本课手册中查看。`));
      section.append(goals, quiz(lesson.predict, 'predict'), action('explain', '继续：看懂原理 →', '先作出自己的判断，后面用案例和机制解释核对。'));
    } else if (stage === 'explain') {
      const body = el('div', null, { class: 'reading-body' });
      lesson.sections.forEach((item, index) => {
        body.append(el('h2', `${index + 1}. ${item.title}`));
        item.paragraphs.forEach(text => body.append(el('p', text)));
        if (item.code) body.append(el('pre', item.code, { tabindex: '0' }));
      });
      const terms = el('details', null, { class: 'help-disclosure' }); terms.append(el('summary', '用本课例子再解释几个术语'));
      const dl = el('dl', null, { class: 'definition-list' }); lesson.glossary.forEach(item => dl.append(el('dt', item.term), el('dd', item.meaning))); terms.append(dl); body.append(terms);
      const label = el('label', null, { class: 'inline-check' }); const input = el('input', null, { type: 'checkbox' }); input.checked = record.read;
      input.addEventListener('change', () => { record.read = input.checked; persist(); });
      label.append(input, el('span', '我已阅读，并能指出一个关键原因和一个适用边界。')); body.append(label);
      const sources = el('details', null, { class: 'help-disclosure' }); sources.append(el('summary', '资料来源与核对日期'));
      const ul = el('ul', null, { class: 'source-list' }); lesson.sources.forEach(s => { const li = el('li'); li.append(el('a', s.label, { href: s.url, target: '_blank', rel: 'noopener noreferrer' }), document.createTextNode(` · 核对 ${s.checked}`)); ul.append(li); }); sources.append(ul); body.append(sources);
      section.append(body, action('experiment', '继续：动手实验 →', '接下来换一个条件，检查解释能否预测结果。'));
    } else if (stage === 'experiment') {
      section.append(el('h2', lesson.experiment.title), el('p', lesson.experiment.brief));
      section.append(el('p', `情境推演：${lesson.experiment.boundary}`, { class: 'boundary-note' }));
      if (id === '03.04') section.append(el('a', '打开可实际修改数据的增强实验 →', { href: 'data-literacy.html#experiment', class: 'enhanced-link' }));
      if (id === '05.02') section.append(el('a', '打开可切换背景条件的增强实验 →', { href: 'context-lesson.html#experiment', class: 'enhanced-link' }));
      if (window.mountCourseLab) window.mountCourseLab(section, id);
      const cases = el('div', null, { class: 'case-nav', role: 'group', 'aria-label': '切换实验条件' });
      lesson.experiment.cases.forEach((item, index) => {
        const button = el('button', `${index + 1} · ${item.name}`, { type: 'button', 'aria-pressed': index === caseIndex });
        button.addEventListener('click', () => { caseIndex = index; render(); }); cases.append(button);
      }); section.append(cases);
      const item = lesson.experiment.cases[caseIndex]; const input = el('div', item.input, { class: 'case-input' });
      const result = el('div', null, { class: 'case-output' }); result.hidden = true;
      result.append(el('h3', '核对案例结果'), el('p', item.output));
      const evidence = el('ul', null, { class: 'evidence-list' }); item.evidence.forEach(text => evidence.append(el('li', text))); result.append(evidence);
      section.append(input, quiz(item, `case-${caseIndex}`, '提交预测并核对案例', answer => { result.hidden = !Number.isInteger(answer); }), result);
      const next = el('button', caseIndex < lesson.experiment.cases.length - 1 ? '换一个条件，再判断 →' : '继续：实践与自检 →', { class: 'button-primary', type: 'button' });
      next.addEventListener('click', () => { if (caseIndex < lesson.experiment.cases.length - 1) { caseIndex++; render(); } else navigate('practice'); });
      const row = el('div', null, { class: 'stage-action' }); row.append(el('p', '案例中的正确判断仍需用自己的实际操作验证。'), next); section.append(row);
    } else {
      section.append(el('h2', '在自己的练习副本中验证'), el('p', lesson.practice.intro));
      if (['08', '09'].includes(id.split('.')[0])) section.append(el('a', '下载本机 HTTP + SQLite 练习包（模块 08—09） →', { href: 'examples/08-09-backend-lab.zip', download: '', class: 'enhanced-link' }));
      if (id === '03.04') section.append(el('a', '下载两条同名任务的独立练习包 →', { href: 'examples/03-04-data-literacy.zip', download: '', class: 'enhanced-link' }));
      const steps = el('ol', null, { class: 'practice-steps' }); lesson.practice.steps.forEach(text => steps.append(el('li', text))); section.append(steps);
      section.append(el('h3', '把说明带到 Codex'));
      const prompt = el('pre', lesson.practice.prompt, { class: 'practice-prompt', tabindex: '0' });
      const copyRow = el('div', null, { class: 'copy-row' }); const copy = el('button', '复制本课任务说明', { class: 'button-small', type: 'button' });
      const status = el('span', '', { class: 'copy-state', role: 'status' }); copy.addEventListener('click', () => app.copy(lesson.practice.prompt, status, prompt)); copyRow.append(copy, status); section.append(prompt, copyRow);
      section.append(el('h3', '交出这些证据，再判断是否完成'));
      const evidence = el('ul', null, { class: 'evidence-list' }); lesson.practice.evidence.forEach(text => evidence.append(el('li', text))); section.append(evidence);
      const help = el('details', null, { class: 'help-disclosure' }); help.append(el('summary', '遇到不一致？按现象找下一步'));
      lesson.practice.troubleshooting.forEach(t => { const details = el('details'); details.append(el('summary', t.symptom), el('p', `先核对：${t.check}`), el('p', `下一步：${t.action}`)); help.append(details); }); section.append(help);
      const shots = el('details', null, { class: 'help-disclosure' }); shots.append(el('summary', '实操配图与当前材料范围'), el('p', '当前提供正文、案例、任务说明与证据清单。本课对应的 Codex 原生操作图尚未采集；生成的设计稿与学习网站截图不能证明外部操作已经完成。两节增强样课保留已有材料及来源。')); section.append(shots);
      const notes = el('div', null, { class: 'evidence-notes' }); notes.append(el('label', '我的证据与仍不理解的地方', { for: 'evidence-notes' }));
      const textarea = el('textarea', null, { id: 'evidence-notes', maxlength: '8000', placeholder: '记录练习文件、预期、实际、复现步骤和自己的解释。只保存在当前浏览器。' }); textarea.value = record.notes;
      textarea.addEventListener('input', () => { record.notes = textarea.value; persist(); }); notes.append(textarea); section.append(notes);
      const practiced = el('label', null, { class: 'inline-check' }); const check = el('input', null, { type: 'checkbox' }); check.checked = record.practiced;
      check.addEventListener('change', () => { record.practiced = check.checked; persist(); }); practiced.append(check, el('span', '我已在自己的练习中核对上述证据（仅记录自行验收）。')); section.append(practiced);
      section.append(el('h3', '换个条件，检查是否读懂'));
      lesson.checks.forEach((q, index) => section.append(quiz(q, `check-${index}`)));
      const completion = el('div', null, { class: 'completion-area' }); completion.append(el('p', '', { id: 'current-progress' }));
      const button = el('button', '记录本课课内完成', { class: 'button-primary', id: 'complete-course-lesson', type: 'button' });
      button.addEventListener('click', () => { if (core.canComplete(lesson, record)) { record.completed = true; persist(); } }); completion.append(button);
      completion.append(el('p', '完成条件：阅读已记录，预测、两个案例与迁移题均通过。它记录课内学习，不代替真实作品和外部实操验收。'));
      const download = el('button', '导出本课学习与证据笔记', { class: 'text-link', type: 'button' });
      download.addEventListener('click', () => app.download(`${id}-learning-notes.md`, `# ${id} ${lesson.title}\n\n课内完成：${record.completed}\n外部实操：${record.practiced ? '自行验收' : '未记录'}\n\n## 我的证据\n${record.notes}\n\n## 需要检查\n${lesson.practice.evidence.map(e => `- ${e}`).join('\n')}\n`)); completion.append(download);
      section.append(completion);
    }
    panel.append(section); persist();
  }
  window.addEventListener('popstate', () => { const next = location.hash.slice(1); if (stages.some(([key]) => key === next) && next !== stage) navigate(next, false); });
  window.addEventListener('hashchange', () => { const next = location.hash.slice(1); if (stages.some(([key]) => key === next) && next !== stage) navigate(next, false); });
  window.addEventListener('pageshow', () => {
    app.reloadProgress(); record = app.progress.lessons[id] || core.emptyRecord();
    app.progress.lessons[id] = record; app.progress.route = route;
    const restored = location.hash.slice(1);
    if (stages.some(([key]) => key === restored)) stage = restored;
    render();
  });
  render(); history.replaceState({}, '', `#${stage}`);

  function renderSupport(item) {
    document.title = `${item.id} ${item.title} · AI 学习`;
    document.getElementById('lesson-title').textContent = item.title;
    document.getElementById('lesson-context').textContent = `${item.kind} / ${item.id}`;
    document.getElementById('lesson-lead').textContent = item.lead;
    document.getElementById('rail-module').textContent = item.kind;
    document.getElementById('lesson-tabs').hidden = true;
    app.progress.support[item.id] ||= { checked: [], notes: '' }; const record = app.progress.support[item.id];
    const body = el('section', null, { class: 'support-body' });
    body.append(el('p', `前置：${item.prerequisites}`, { class: 'support-kind' }));
    item.sections.forEach(s => { body.append(el('h2', s.title)); s.paragraphs.forEach(p => body.append(el('p', p))); });
    const steps = el('ol', null, { class: 'practice-steps' }); item.steps.forEach(step => steps.append(el('li', step))); body.append(el('h2', '动手完成一次'));
    if (item.id === 'P01') body.append(el('a', '下载本节使用的独立练习包 →', {href:'examples/03-04-data-literacy.zip',download:'',class:'enhanced-link'}));
    body.append(steps);
    body.append(el('h2', '证据清单（自行核对）'));
    const list = el('ul', null, { class: 'practice-checks' });
    item.evidence.forEach((e, i) => {
      const li = el('li'); const label = el('label'); const input = el('input', null, { type: 'checkbox' }); input.checked = record.checked.includes(i);
      input.addEventListener('change', () => { record.checked = input.checked ? [...new Set([...record.checked, i])] : record.checked.filter(n => n !== i); app.save({supportId:item.id}); });
      label.append(input, el('span', e)); li.append(label); list.append(li);
    }); body.append(list, el('p', item.boundary, { class: 'boundary-note' }));
    body.append(el('h2', '卡住时怎么继续'));
    item.help.forEach(text => body.append(el('p', text)));
    const links = el('nav', null, { class: 'lesson-neighbors' }); item.related.forEach(related => links.append(el('a', `返回 ${related} 补练 →`, { href: app.link(related, route) }))); body.append(links);
    panel.append(body); app.renderGlossary(data.lessons); app.save({supportId:item.id});
    document.getElementById('lesson-status').textContent = '独立操作需自行验收';
  }
})();
