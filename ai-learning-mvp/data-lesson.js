(function () {
  'use strict';
  const core = window.DataLessonCore;
  const $ = id => document.getElementById(id);
  const storageKey = 'ai-learning:data-literacy:v1';
  const stages = ['guess', 'explain', 'experiment', 'practice'];
  let raw = null;
  try { raw = localStorage.getItem(storageKey); } catch { /* Learning remains usable. */ }
  let progress = core.readProgress(raw);
  const narrow = matchMedia('(max-width: 850px)');

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); $('save-state').textContent = '学习记录保存在当前浏览器'; }
    catch { $('save-state').textContent = '无法持久保存，当前仍可学习'; }
  }
  function closeMenu() {
    $('course-rail').classList.remove('is-open');
    $('course-rail').inert = narrow.matches;
    if (narrow.matches) $('course-rail').setAttribute('aria-hidden', 'true');
    else $('course-rail').removeAttribute('aria-hidden');
    $('rail-backdrop').hidden = true;
    $('menu-toggle').setAttribute('aria-expanded', 'false');
    $('menu-toggle').setAttribute('aria-label', '打开本课目录');
  }
  function showStage(stage, focus) {
    if (!stages.includes(stage)) stage = progress.stage;
    progress.stage = stage;
    document.body.classList.toggle('is-experiment', stage === 'experiment');
    stages.forEach(id => { $(`stage-${id}`).hidden = id !== stage; });
    document.querySelectorAll('[data-stage]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.stage === stage);
      if (button.dataset.stage === stage) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    closeMenu(); save();
    if (focus) { window.scrollTo({ top: 0, behavior: 'instant' }); $('lesson-panel').focus({ preventScroll: true }); }
  }
  function navigate(stage) {
    if (stages.includes(stage)) {
      if (location.hash !== `#${stage}`) history.pushState({ stage }, '', `#${stage}`);
      showStage(stage, true);
    }
  }
  document.querySelectorAll('[data-stage]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.stage)));
  function historyChange(event) {
    const hash = location.hash.slice(1);
    const next = stages.includes(hash) ? hash : event.state?.stage || progress.stage;
    if (next !== progress.stage) showStage(next, true);
  }
  window.addEventListener('popstate', historyChange);
  window.addEventListener('hashchange', historyChange);
  $('menu-toggle').addEventListener('click', () => {
    const open = !$('course-rail').classList.contains('is-open');
    if (!open) return closeMenu();
    $('course-rail').classList.add('is-open'); $('course-rail').inert = false;
    $('course-rail').removeAttribute('aria-hidden'); $('rail-backdrop').hidden = false;
    $('menu-toggle').setAttribute('aria-expanded', 'true'); $('menu-toggle').setAttribute('aria-label', '关闭本课目录');
  });
  $('rail-backdrop').addEventListener('click', closeMenu);
  narrow.addEventListener('change', closeMenu);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && $('course-rail').classList.contains('is-open')) { closeMenu(); $('menu-toggle').focus(); }
  });

  function renderProgress() {
    const count = ['record', 'identity', 'render'].filter(id => core.grade(id, progress.answers[id]).correct).length;
    const ready = progress.read && progress.passed.length === 4 && count === 3;
    if (!ready) progress.completed = false;
    $('completion-state').textContent = progress.completed ? '阅读与课内练习已完成 ✓' : '本课尚未完成';
    $('learning-progress').textContent = `原理阅读：${progress.read ? '已记录' : '未记录'} · 实验：${progress.passed.length} / 4 · 理解自检：${count} / 3 · Codex 实操：${progress.practice ? '已自行验收' : '未自行验收'}`;
    $('complete-lesson').disabled = !ready || progress.completed;
    $('complete-lesson').textContent = progress.completed ? '阅读与课内练习已完成 ✓' : '标记阅读与课内练习完成';
    $('completion-message').textContent = progress.completed ? '已记录课内学习，外部操作仍以自己的证据核对。' : ready ? '可以记录本课学习。' : '';
  }
  const experiment = window.initDataExperiment({
    getProgress: () => progress,
    onProgress: () => { renderProgress(); save(); },
    navigate
  });

  function feedback(id) {
    const result = core.grade(id, progress.answers[id]);
    const node = $(`feedback-${id}`); node.textContent = result.explanation; node.hidden = false;
    node.classList.toggle('needs-retry', !result.correct);
  }
  document.querySelectorAll('[data-question]').forEach(form => {
    const id = form.dataset.question;
    if (progress.answers[id]) { form.querySelector(`input[value="${progress.answers[id]}"]`).checked = true; feedback(id); }
    form.addEventListener('change', () => {
      delete progress.answers[id]; $(`feedback-${id}`).hidden = true; renderProgress(); save();
    });
    form.addEventListener('submit', event => {
      event.preventDefault(); const answer = form.querySelector('input:checked')?.value;
      if (answer) progress.answers[id] = answer;
      feedback(id); renderProgress(); save();
    });
  });
  $('read-check').checked = progress.read; $('practice-check').checked = progress.practice;
  $('read-check').addEventListener('change', () => { progress.read = $('read-check').checked; renderProgress(); save(); });
  $('practice-check').addEventListener('change', () => { progress.practice = $('practice-check').checked; renderProgress(); save(); });
  $('complete-lesson').addEventListener('click', () => { progress.completed = true; renderProgress(); save(); });
  document.querySelectorAll('[data-help]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.help-box>details').forEach(details => { details.hidden = details.id !== button.dataset.help; });
    const details = $(button.dataset.help); details.hidden = false; details.open = true; details.querySelector('summary').focus(); details.scrollIntoView({ block: 'nearest' });
  }));
  document.querySelectorAll('[data-dialog]').forEach(button => button.addEventListener('click', () => $(button.dataset.dialog).showModal()));
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  const prompts = [
    '请只阅读当前练习目录，先不要修改。找到两条任务的数据和负责显示它们的代码，用中文指出 tasks、每条任务对象、id、title、done 的用途。说明你实际读取的文件路径，给出与解释有关的短代码。指出哪一项决定任务身份，哪一项只是当前显示文字。',
    '请只把 ID 为 t02 的任务标题改为“读第二章”。保留它的 ID 和 done，保留 t01 的全部字段和两条记录的数量。不要按标题批量替换，不要改变布局或引入新功能。说明修改的是初始数据、运行状态还是保存的数据，并给出我应该怎样打开和检查结果。'
  ];
  document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => {
    $('codex-prompt').textContent = prompts[Number(button.dataset.prompt)]; $('copy-status').textContent = '';
  }));
  $('copy-prompt').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('codex-prompt').textContent); $('copy-status').textContent = '已复制，发送前请先确认当前练习目录。'; }
    catch {
      const range = document.createRange(); range.selectNodeContents($('codex-prompt'));
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      $('codex-prompt').focus(); $('copy-status').textContent = '无法自动复制，已选中文字；请按 Ctrl+C 或长按复制。';
    }
  });
  $('restart-lesson').addEventListener('click', () => {
    progress = core.readProgress(null);
    document.querySelectorAll('[data-question] input').forEach(input => { input.checked = false; });
    document.querySelectorAll('[data-question] .feedback').forEach(node => { node.hidden = true; });
    $('read-check').checked = false; $('practice-check').checked = false;
    experiment.reset(); renderProgress(); navigate('guess');
  });
  document.querySelectorAll('.help-box>details').forEach(details => { details.hidden = true; });
  renderProgress();
  const initial = location.hash.slice(1);
  showStage(stages.includes(initial) ? initial : progress.stage, false);
  history.replaceState({ stage: progress.stage }, '', `#${progress.stage}`);
})();
