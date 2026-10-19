(function () {
  'use strict';
  const core = window.LessonCore;
  const storageKey = 'ai-learning:context-lesson:v1';
  const stageIds = ['guess', 'explain', 'experiment', 'practice'];
  const transferIds = ['transfer-short', 'transfer-file', 'transfer-more'];
  const byId = id => document.getElementById(id);
  let saved = null;
  let canSave = true;
  try { saved = localStorage.getItem(storageKey); } catch { canSave = false; }
  const state = core.readProgress(saved);
  const narrowScreen = window.matchMedia('(max-width: 850px)');

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); canSave = true; }
    catch { canSave = false; }
    byId('save-state').textContent = canSave ? '记录保存在当前浏览器' : '无法持久保存，当前仍可学习';
  }

  function closeMenu() {
    byId('course-rail').classList.remove('is-open');
    byId('menu-toggle').setAttribute('aria-expanded', 'false');
    byId('menu-toggle').setAttribute('aria-label', '打开本课目录');
    byId('rail-backdrop').hidden = true;
    byId('course-rail').inert = narrowScreen.matches;
    if (narrowScreen.matches) byId('course-rail').setAttribute('aria-hidden', 'true');
    else byId('course-rail').removeAttribute('aria-hidden');
  }

  function showStage(id, moveFocus) {
    const stage = stageIds.includes(id) ? id : 'guess';
    state.stage = stage;
    stageIds.forEach(item => { byId(`stage-${item}`).hidden = item !== stage; });
    document.querySelectorAll('[data-stage]').forEach(button => {
      const active = button.dataset.stage === stage;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    closeMenu();
    save();
    if (moveFocus) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      byId('lesson-panel').focus({ preventScroll: true });
    }
  }

  function navigate(stage) {
    if (!stageIds.includes(stage)) return;
    if (location.hash !== `#${stage}`) history.pushState({ lessonStage: stage }, '', `#${stage}`);
    showStage(stage, true);
  }

  function renderFeedback(id, answer) {
    const result = core.gradeAnswer(id, answer);
    const node = byId(`feedback-${id}`);
    const title = document.createElement('strong');
    title.textContent = !answer ? '先作出你的判断' : result.correct ? '理解方向正确' : '再想一想';
    const body = document.createElement('span');
    body.textContent = result.explanation;
    node.replaceChildren(title, body);
    node.hidden = false;
    node.classList.toggle('needs-retry', !result.correct);
  }

  function renderCompletion() {
    const passed = transferIds.filter(id => core.gradeAnswer(id, state.answers[id]).correct).length;
    if (passed !== 3) state.completed = false;
    byId('transfer-progress').textContent = `理解自检：${passed} / 3`;
    byId('completion-state').textContent = state.completed ? '本课已完成 ✓' : '本课尚未完成';
    const button = byId('complete-lesson');
    button.disabled = passed !== 3 || state.completed;
    button.textContent = state.completed ? '本课已完成 ✓' : '标记本课完成 ✓';
    byId('completion-message').textContent = state.completed ? '已记录。下一次做项目时，试着先写出目标、背景、限制和验收条件，再检查 AI 的理解。' : passed === 3 ? '三题已通过。你可以标记完成，也可以返回讲解和实验复习。' : '';
  }

  function fillList(id, lines) {
    byId(id).replaceChildren(...lines.map(text => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    }));
  }

  function renderExperiment() {
    const result = core.buildExperiment(state.experiment);
    byId('experiment-prompt').textContent = result.prompt;
    fillList('experiment-checks', result.checks.length ? result.checks : ['还没有明确本实验审阅的三个决定。']);
    const unknownLabels = {
      audience: '使用范围：给谁用，是否需要账户登录？',
      actions: '核心操作：任务需要哪些具体操作？',
      storage: '保存策略：存在哪里，刷新后应该怎样？',
    };
    fillList('experiment-unknowns', result.unknowns.length ? result.unknowns.map(id => unknownLabels[id]) : ['本实验的三项决定已明确；完整项目仍需继续讨论。']);
    byId('noise-note').hidden = !result.noise;
  }

  function renderBrief() { byId('brief-preview').textContent = core.buildBrief(state.draft); }

  document.querySelectorAll('[data-stage]').forEach(button => {
    button.addEventListener('click', () => navigate(button.dataset.stage));
  });
  function handleHistory(event) {
    const nextStage = core.resolveStage(location.hash, event.state?.lessonStage || state.stage);
    history.replaceState({ lessonStage: nextStage }, '', location.href);
    if (nextStage !== state.stage) showStage(nextStage, true);
  }
  window.addEventListener('popstate', handleHistory);
  window.addEventListener('hashchange', handleHistory);

  byId('menu-toggle').addEventListener('click', () => {
    const open = byId('course-rail').classList.toggle('is-open');
    byId('menu-toggle').setAttribute('aria-expanded', String(open));
    byId('menu-toggle').setAttribute('aria-label', open ? '关闭本课目录' : '打开本课目录');
    byId('rail-backdrop').hidden = !open;
    byId('course-rail').inert = !open && narrowScreen.matches;
    if (!open && narrowScreen.matches) byId('course-rail').setAttribute('aria-hidden', 'true');
    else byId('course-rail').removeAttribute('aria-hidden');
  });
  narrowScreen.addEventListener('change', closeMenu);
  byId('rail-backdrop').addEventListener('click', closeMenu);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  document.querySelectorAll('.question-form').forEach(form => {
    const id = form.dataset.question;
    if (state.answers[id]) {
      form.querySelector(`input[value="${state.answers[id]}"]`).checked = true;
      renderFeedback(id, state.answers[id]);
    }
    form.addEventListener('change', () => {
      delete state.answers[id];
      byId(`feedback-${id}`).hidden = true;
      renderCompletion();
      save();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const answer = form.querySelector('input:checked')?.value || '';
      if (answer) state.answers[id] = answer;
      renderFeedback(id, answer);
      renderCompletion();
      save();
    });
  });

  document.querySelectorAll('input[name="context-piece"]').forEach(input => {
    input.checked = state.experiment.includes(input.value);
    input.addEventListener('change', () => {
      state.experiment = [...document.querySelectorAll('input[name="context-piece"]:checked')].map(item => item.value);
      renderExperiment();
      save();
    });
  });

  const briefInputs = [...byId('brief-form').querySelectorAll('input, textarea')];
  byId('brief-form').addEventListener('submit', event => event.preventDefault());
  briefInputs.forEach(input => {
    input.value = state.draft[input.name] || '';
    input.addEventListener('input', () => {
      state.draft[input.name] = input.value;
      renderBrief();
      save();
    });
  });
  byId('load-example').addEventListener('click', () => {
    state.draft = {
      goal: '做一个个人任务管理工具，集中记录每天需要完成的事情。',
      audience: '我自己，在电脑和手机浏览器里使用。',
      features: '添加任务；标记完成和取消完成；按全部、待办、已完成筛选。',
      constraints: '不做账户登录和跨设备同步；只保存在当前浏览器；先讨论需求，不修改文件。',
      acceptance: '添加两个任务，完成其中一个；筛选结果正确。刷新页面后，任务和完成状态仍然保留。',
    };
    briefInputs.forEach(input => { input.value = state.draft[input.name]; });
    renderBrief();
    save();
  });
  byId('copy-brief').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(byId('brief-preview').textContent);
      byId('copy-status').textContent = '已复制。发送到 Codex 前，请先通读并确认。';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(byId('brief-preview'));
      selection.removeAllRanges();
      selection.addRange(range);
      byId('brief-preview').focus();
      byId('copy-status').textContent = '无法自动复制，已选中文字。请按 Ctrl+C，或长按选择复制。';
    }
  });

  byId('complete-lesson').addEventListener('click', () => {
    if (transferIds.every(id => core.gradeAnswer(id, state.answers[id]).correct)) {
      state.completed = true;
      renderCompletion();
      save();
    }
  });

  document.querySelectorAll('[data-dialog]').forEach(button => {
    button.addEventListener('click', () => byId(button.dataset.dialog).showModal());
  });
  document.querySelectorAll('[data-close-dialog]').forEach(button => {
    button.addEventListener('click', () => button.closest('dialog').close());
  });
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  });
  byId('open-screenshot').addEventListener('click', () => byId('screenshot-dialog').showModal());

  byId('restart-lesson').addEventListener('click', () => {
    Object.assign(state, core.readProgress(null));
    document.querySelectorAll('.question-form input').forEach(input => { input.checked = false; });
    document.querySelectorAll('.feedback').forEach(node => { node.hidden = true; });
    document.querySelectorAll('input[name="context-piece"]').forEach(input => { input.checked = false; });
    briefInputs.forEach(input => { input.value = ''; });
    byId('copy-status').textContent = '草稿随输入保存在当前浏览器。';
    renderExperiment();
    renderBrief();
    renderCompletion();
    navigate('guess');
  });

  renderExperiment();
  renderBrief();
  renderCompletion();
  const initialStage = core.resolveStage(location.hash, state.stage);
  history.replaceState({ lessonStage: initialStage }, '', `#${initialStage}`);
  showStage(initialStage, false);
})();
