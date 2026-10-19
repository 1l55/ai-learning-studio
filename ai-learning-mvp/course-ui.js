(function () {
  'use strict';
  const data = window.AICourseData;
  const core = window.CourseCore;
  if (!data || !core) {
    const message = document.createElement('p'); message.className = 'load-error';
    message.textContent = '课程内容未能载入。请确认 content/course-data.js 与页面在同一份完整目录中，再重新打开。';
    document.querySelector('main').replaceChildren(message); return;
  }
  const key = 'ai-learning:course:v1';
  let raw = null;
  try { raw = localStorage.getItem(key); } catch { /* The course still works without persistent storage. */ }
  const app = window.CourseApp = { data, core, progress: core.readProgress(raw, data) };
  app.el = (tag, text, attributes = {}) => {
    const node = document.createElement(tag);
    if (text !== undefined && text !== null) node.textContent = text;
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
    return node;
  };
  app.arrow = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 28 24'); svg.setAttribute('class', 'arrow-icon'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', 'M2 12H24M17 5L24 12L17 19');
    svg.append(path); return svg;
  };
  app.link = (id, route = app.progress.route, hash = '') => `learn.html?id=${encodeURIComponent(id)}&route=${encodeURIComponent(route)}${hash}`;
  app.save = (scope = {}) => {
    try { app.progress = core.mergeProgress(localStorage.getItem(key), app.progress, scope, data); localStorage.setItem(key, JSON.stringify(app.progress)); document.getElementById('save-state').textContent = '本地学习记录 · 无需登录'; }
    catch { document.getElementById('save-state').textContent = '无法持久保存，本页仍可继续学习'; }
  };
  app.reloadProgress = () => {
    try { app.progress = core.readProgress(localStorage.getItem(key), data); } catch { /* Keep current state if blocked. */ }
  };
  const menu = document.getElementById('menu-toggle');
  const rail = document.getElementById('course-rail');
  const backdrop = document.getElementById('rail-backdrop');
  const narrow = matchMedia('(max-width:850px)');
  app.closeMenu = () => {
    rail.classList.remove('is-open'); rail.inert = narrow.matches;
    if (narrow.matches) rail.setAttribute('aria-hidden', 'true'); else rail.removeAttribute('aria-hidden');
    backdrop.hidden = true; menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', document.body.classList.contains('overview-page') ? '打开课程目录' : '打开本课目录');
  };
  menu.addEventListener('click', () => {
    if (rail.classList.contains('is-open')) return app.closeMenu();
    rail.inert = false; rail.removeAttribute('aria-hidden'); rail.classList.add('is-open');
    backdrop.hidden = false; menu.setAttribute('aria-expanded', 'true'); menu.setAttribute('aria-label', '关闭课程目录');
  });
  backdrop.addEventListener('click', app.closeMenu);
  narrow.addEventListener('change', app.closeMenu);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && rail.classList.contains('is-open')) { app.closeMenu(); menu.focus(); }
  });
  app.closeMenu();
  const mobileProgress = app.el('button', '我的练习与学习记录 ↗', {class:'mobile-progress',type:'button','data-open':'progress-dialog'});
  document.querySelector('.rail-bottom').append(mobileProgress);
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.open === 'progress-dialog') app.renderProgress();
    document.getElementById(button.dataset.open).showModal();
  }));
  app.renderGlossary = lessons => {
    const glossary = document.getElementById('glossary-content');
    const terms = new Map();
    lessons.forEach(lesson => lesson.glossary?.forEach(item => { if (!terms.has(item.term)) terms.set(item.term, item.meaning); }));
    const list = app.el('dl', null, { class: 'definition-list' });
    terms.forEach((meaning, term) => list.append(app.el('dt', term), app.el('dd', meaning)));
    glossary.replaceChildren(list);
  };
  app.renderProgress = () => {
    const node = document.getElementById('progress-content'); node.replaceChildren(); node.className = 'progress-lines';
    const summary = core.summarize(data, app.progress, app.progress.route);
    node.append(app.el('p', `${data.routeInfo[app.progress.route].label}：课内完成 ${summary.completed} / ${summary.total}，阅读 ${summary.read}，外部实操自行验收 ${summary.practiced}。`));
    node.append(app.el('p', '课内完成要求阅读、预测、案例与迁移题通过。外部实操的勾选仅记录自行验收，不是系统认证。', { class: 'boundary-note' }));
    node.append(app.el('a', `继续学习 ${app.progress.lastLesson}`, { href: app.link(app.progress.lastLesson) }));
    node.append(app.el('a', '回看数据增强样课（历史记录独立保留）', { href: 'data-literacy.html#experiment' }));
    node.append(app.el('a', '回看上下文增强样课（历史记录独立保留）', { href: 'context-lesson.html#experiment' }));
    const details = app.el('details', null, { class: 'restart-section' });
    details.append(app.el('summary', '清除完整课程的新记录'));
    details.append(app.el('p', '只清除本网站的新课程进度与笔记；两节增强样课、下载的练习和你的项目文件不受影响。'));
    const reset = app.el('button', '清除新课程记录', { class: 'button-small', type: 'button' });
    reset.addEventListener('click', () => {
      app.progress = core.readProgress(null, data); app.save({reset:true});
      location.href = 'course.html';
    });
    details.append(reset); node.append(details);
  };
  app.copy = async (text, status, source) => {
    try { await navigator.clipboard.writeText(text); status.textContent = '已复制，请先核对当前练习项目再发送。'; }
    catch {
      const range = document.createRange(); range.selectNodeContents(source);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      source.focus(); status.textContent = '已选中文字，请按 Ctrl+C 或长按复制。';
    }
  };
  app.download = (filename, text) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    const a = app.el('a', '', { href: url, download: filename }); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
})();
