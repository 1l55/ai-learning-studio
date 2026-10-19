(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LessonCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const stages = ['guess', 'explain', 'experiment', 'practice'];
  const pieces = {
    audience: { text: '只给我个人使用，不需要账户登录。', check: '使用范围：个人使用，不做登录。' },
    actions: { text: '可以添加任务、标记完成，并按全部、待办、已完成筛选。', check: '核心操作：添加、完成、三种状态筛选。' },
    storage: { text: '任务保存在当前浏览器；刷新或关闭再打开后仍然保留，不要求跨设备同步。', check: '保存验收：刷新后任务和完成状态仍保留。' },
    noise: { text: '顺便说一句，我今天喝了一杯咖啡。' },
  };
  const questions = {
    guess: {
      correct: 'infer',
      explanations: {
        infer: '判断合理。需求没有写清的部分，模型可能根据现有信息和训练中学到的模式作出假设，也可能先追问。假设偶尔碰巧符合预期，但它并不知道你没有表达的具体想法。补充关键信息，再检查它的理解，可以减少这类偏差。',
        mind: '它不能直接读取你脑海中的具体需求。“任务工具”可以是个人清单，也可以是团队协作系统；两者都合理。能力再强，也不能仅凭这四个字确定你要哪一种。你需要提供会影响结果的区别。',
        short: '长度本身不能决定好坏。如果前文已经明确页面结构、功能和限制，“把按钮放到右侧”就可能足够清楚。相反，一大段无关背景也可能没有说明任务。关键是当前能参考的信息是否足以支持这个决定。',
      },
    },
    'transfer-short': {
      correct: 'context',
      explanations: {
        context: '对。短指令引用了已经明确的布局和对象，相关信息不必每次全部重写。不过任务切换、摘要或文件更新后，仍应确认双方指的是同一个版本。',
        length: '提示词不是越长越好。前文已有明确布局时，短句也能提供足够的修改信息。需要补的是缺失或变化的内容，而不是为了凑字数重复整段历史。',
      },
    },
    'transfer-file': {
      correct: 'read',
      explanations: {
        read: '对。先确认当前项目、文件路径及实际内容，明确要求参考该文件，再检查它的复述或实际读取记录。文件存在不等于每次回答都已经用上文件里的每一个细节。',
        exists: '项目里有文件，只说明资料可能可用。它是否被读取、哪些内容进入本次上下文，要看产品行为和实际操作。指出路径、说明用途，并检查读取或复述结果，才有可验证的依据。',
      },
    },
    'transfer-more': {
      correct: 'relevant',
      explanations: {
        relevant: '对。错误发生在保存策略上，最有帮助的是明确保存位置、是否跨设备，以及刷新后的验收条件。优先修补这个信息缺口，再重新检查结果。',
        all: '聊天记录更多不等于相关信息更多。粘贴无关历史会增加查找成本，也可能夹带旧要求。应先提供影响当前判断的资料，标明哪份要求有效。',
      },
    },
  };
  function buildExperiment(selected) {
    const ids = Array.isArray(selected) ? [...new Set(selected)].filter(id => Object.hasOwn(pieces, id)) : [];
    return {
      prompt: ['做一个任务管理工具。', ...ids.map(id => pieces[id].text)].join('\n'),
      checks: ids.filter(id => id !== 'noise').map(id => pieces[id].check),
      unknowns: ['audience', 'actions', 'storage'].filter(id => !ids.includes(id)),
      noise: ids.includes('noise'),
    };
  }
  function resolveStage(hash, current) {
    const requested = typeof hash === 'string' ? hash.replace(/^#/, '') : '';
    return stages.includes(requested) ? requested : stages.includes(current) ? current : 'guess';
  }
  function buildBrief(fields) {
    const source = fields && typeof fields === 'object' ? fields : {};
    const labels = { goal: '目标', audience: '使用者', features: '必须实现', constraints: '限制', acceptance: '验收条件' };
    return Object.entries(labels).map(([key, label]) => {
      const value = typeof source[key] === 'string' ? source[key].trim().slice(0, 2000) : '';
      return `${label}：${value || '待确认'}`;
    }).join('\n\n') + '\n\n请先复述你对需求的理解，区分已明确的要求和你作出的假设，列出待确认问题。先不要修改文件，等我确认后再开始实现。';
  }
  function gradeAnswer(id, answer) {
    const question = questions[id];
    if (!question || !Object.hasOwn(question.explanations, answer)) {
      return { correct: false, explanation: '先选择一个答案，再查看理由。' };
    }
    return { correct: answer === question.correct, explanation: question.explanations[answer] };
  }
  function readProgress(raw) {
    const empty = { version: 1, stage: 'guess', answers: {}, draft: {}, experiment: [], completed: false };
    let data;
    try { data = JSON.parse(raw); } catch { return empty; }
    if (!data || Array.isArray(data) || data.version !== 1) return empty;
    const answers = {};
    for (const [id, question] of Object.entries(questions)) {
      const value = data.answers && data.answers[id];
      if (typeof value === 'string' && Object.hasOwn(question.explanations, value)) answers[id] = value;
    }
    const draft = {};
    for (const key of ['goal', 'audience', 'features', 'constraints', 'acceptance']) {
      if (data.draft && typeof data.draft[key] === 'string') draft[key] = data.draft[key].slice(0, 2000);
    }
    return {
      version: 1,
      stage: stages.includes(data.stage) ? data.stage : 'guess',
      answers,
      draft,
      experiment: Array.isArray(data.experiment) ? [...new Set(data.experiment.filter(id => typeof id === 'string' && Object.hasOwn(pieces, id)))] : [],
      completed: data.completed === true && ['transfer-short', 'transfer-file', 'transfer-more'].every(id => gradeAnswer(id, answers[id]).correct),
    };
  }
  return { buildExperiment, buildBrief, gradeAnswer, readProgress, resolveStage };
});
