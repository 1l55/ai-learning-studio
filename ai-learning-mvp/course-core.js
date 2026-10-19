(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CourseCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function getRoute(data, route = 'R3') {
    const modules = typeof route === 'string' && Object.hasOwn(data.routes, route) ? data.routes[route] : data.routes.R3;
    return modules.flatMap(id => data.lessons.filter(lesson => lesson.id.split('.')[0] === id));
  }
  function getLesson(data, id) { return data.lessons.find(lesson => lesson.id === id) || null; }
  function neighbors(data, id, route) {
    let lessons = getRoute(data, route);
    if (!lessons.some(l => l.id === id)) lessons = getRoute(data, 'R3');
    const index = lessons.findIndex(l => l.id === id);
    return { previous: index > 0 ? lessons[index - 1].id : null,
      next: index >= 0 && index < lessons.length - 1 ? lessons[index + 1].id : null };
  }
  function grade(question, index) {
    const option = Number.isInteger(index) ? question?.options?.[index] : null;
    return option ? { correct: option.correct === true, feedback: option.feedback }
      : { correct: false, feedback: '先选择一个判断，再核对理由。' };
  }
  function questions(lesson) {
    return [['predict', lesson.predict], ...lesson.experiment.cases.map((q, i) => [`case-${i}`, q]),
      ...lesson.checks.map((q, i) => [`check-${i}`, q])];
  }
  function canComplete(lesson, record) {
    return record?.read === true && questions(lesson).every(([key, q]) => grade(q, record.answers?.[key]).correct);
  }
  function emptyRecord() { return { read: false, answers: {}, practiced: false, notes: '', completed: false, stage: 'guess' }; }
  function readProgress(raw, data) {
    const empty = { version: 1, route: 'R3', lastLesson: data.lessons[0]?.id || '01.01', lessons: {}, support: {} };
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return empty; }
    if (!parsed || Array.isArray(parsed) || parsed.version !== 1) return empty;
    if (typeof parsed.route === 'string' && Object.hasOwn(data.routes, parsed.route)) empty.route = parsed.route;
    if (getLesson(data, parsed.lastLesson)) empty.lastLesson = parsed.lastLesson;
    for (const lesson of data.lessons) {
      const saved = parsed.lessons?.[lesson.id];
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) continue;
      const record = emptyRecord();
      record.read = saved.read === true;
      record.practiced = saved.practiced === true;
      record.notes = typeof saved.notes === 'string' ? saved.notes.slice(0, 8000) : '';
      record.stage = ['guess', 'explain', 'experiment', 'practice'].includes(saved.stage) ? saved.stage : 'guess';
      for (const [key, q] of questions(lesson)) {
        const answer = saved.answers?.[key];
        if (Number.isInteger(answer) && q.options[answer]) record.answers[key] = answer;
      }
      record.completed = saved.completed === true && canComplete(lesson, record);
      empty.lessons[lesson.id] = record;
    }
    for (const item of data.support || []) {
      const saved = parsed.support?.[item.id];
      if (saved && typeof saved === 'object') empty.support[item.id] = {
        checked: Array.isArray(saved.checked) ? [...new Set(saved.checked.filter(i => Number.isInteger(i) && i >= 0 && i < item.evidence.length))] : [],
        notes: typeof saved.notes === 'string' ? saved.notes.slice(0, 8000) : ''
      };
    }
    return empty;
  }
  function summarize(data, progress, route) {
    const lessons = getRoute(data, route);
    const completed = lessons.filter(l => progress.lessons[l.id]?.completed && canComplete(l, progress.lessons[l.id])).length;
    return { total: lessons.length, completed,
      read: lessons.filter(l => progress.lessons[l.id]?.read).length,
      practiced: lessons.filter(l => progress.lessons[l.id]?.practiced).length };
  }
  function mergeProgress(raw, current, scope, data) {
    const latest = readProgress(raw, data);
    if (scope.reset) return readProgress(JSON.stringify(current), data);
    if (scope.lessonId && getLesson(data, scope.lessonId)) {
      latest.lessons[scope.lessonId] = current.lessons[scope.lessonId];
      latest.lastLesson = scope.lessonId;
    }
    if (scope.supportId && (data.support || []).some(item => item.id === scope.supportId)) latest.support[scope.supportId] = current.support[scope.supportId];
    if (scope.route || scope.lessonId || scope.supportId) latest.route = current.route;
    return latest;
  }
  return { getRoute, getLesson, neighbors, grade, questions, canComplete, emptyRecord, readProgress, summarize, mergeProgress };
});
