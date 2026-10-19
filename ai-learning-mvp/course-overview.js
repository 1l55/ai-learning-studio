(function () {
  'use strict';
  const app = window.CourseApp; if (!app) return;
  const { data, core, el } = app;
  const query = new URLSearchParams(location.search);
  let route = Object.hasOwn(data.routes, query.get('route')) ? query.get('route') : app.progress.route;
  let selectedModule = data.routes[route][0];
  const requested = location.hash.match(/^#module-(\d{2})$/)?.[1];
  if (data.routes[route].includes(requested)) selectedModule = requested;
  function activate(id, scroll = false) {
    selectedModule = id;
    document.querySelectorAll('[data-module-link]').forEach(link => {
      const active = link.dataset.moduleLink === id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
    const block = document.getElementById(`module-${id}`);
    if (scroll && block) { block.open = true; block.scrollIntoView({ block: 'start', behavior: 'instant' }); }
  }
  function render() {
    app.progress.route = route; app.save({route:true});
    const tabs = document.getElementById('route-tabs'); tabs.replaceChildren();
    for (const id of ['R1', 'R2', 'R3']) {
      const button = el('button', `${data.routeInfo[id].label} · ${core.getRoute(data, id).length} 课`, { type: 'button', 'aria-pressed': route === id });
      button.addEventListener('click', () => {
        route = id; selectedModule = data.routes[id][0];
        const url = new URL(location.href); url.searchParams.set('route', id); url.hash = '';
        history.replaceState({}, '', url); render();
      }); tabs.append(button);
    }
    document.getElementById('route-caption').textContent = `当前路线：${data.routeInfo[route].description}`;
    const nav = document.getElementById('module-nav'); nav.replaceChildren();
    const list = document.getElementById('module-list'); list.replaceChildren();
    for (const id of data.routes[route]) {
      const module = data.modules.find(m => m.id === id);
      const link = el('a', null, { href: `#module-${id}`, 'data-module-link': id });
      link.append(el('span', id), document.createTextNode(module.short));
      link.addEventListener('click', () => { activate(id, true); app.closeMenu(); }); nav.append(link);
      const details = el('details', null, { class: 'module-block', id: `module-${id}` }); details.open = id === selectedModule;
      const summary = el('summary'); const description = el('div');
      description.append(el('h2', module.displayTitle), el('p', module.description, { class: 'module-description' }));
      summary.append(el('span', id, { class: 'module-number' }), description, el('span', `${module.count} 节`, { class: 'module-count' }), el('span', '', { class: 'caret', 'aria-hidden': 'true' }));
      summary.addEventListener('click', () => activate(id)); details.append(summary);
      const lessons = el('ol', null, { class: 'module-lessons' });
      module.lessons.forEach((lesson, index) => {
        const li = el('li'); const a = el('a', null, { href: app.link(lesson.id, route) });
        const completed = app.progress.lessons[lesson.id]?.completed;
        a.append(el('span', lesson.id, { class: 'lesson-id' }), el('span', lesson.title, { class: 'lesson-row-title' }),
          el('span', completed ? '课内已完成' : index === 0 ? '开始学习' : '', { class: 'lesson-row-action' }), app.arrow());
        li.append(a); lessons.append(li);
      }); details.append(lessons); list.append(details);
    }
    activate(selectedModule);
    app.renderGlossary(core.getRoute(data, route));
    const supports = document.getElementById('support-list'); supports.replaceChildren();
    for (const [prefix, title] of [['P', '4 项入门准备'], ['G', '5 次阶段验收'], ['E', '5 个可选拓展']]) {
      const details = el('details', null, { class: 'support-group' }); details.append(el('summary', title));
      const nav = el('nav', null, { 'aria-label': title });
      data.support.filter(item => item.id.startsWith(prefix)).forEach(item => nav.append(el('a', `${item.id} ${item.title}`, { href: app.link(item.id, route) })));
      details.append(nav); supports.append(details);
    }
  }
  render();
  if (requested) activate(selectedModule, true);
  window.addEventListener('pageshow', () => { app.reloadProgress(); render(); });
})();
