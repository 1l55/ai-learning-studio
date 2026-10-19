// 读取 tasks.js 的初始数据，更新页面；这不是数据库或保存机制。
const list = document.getElementById('tasks');
for (const task of tasks) {
  const li = document.createElement('li');
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox'; checkbox.checked = task.done;
  checkbox.setAttribute('aria-label', `${task.id} ${task.title} 的完成状态`);
  const title = document.createElement('span'); title.textContent = task.title;
  const meta = document.createElement('small'); meta.textContent = `${task.id} · ${task.done ? '已完成' : '未完成'}`;
  checkbox.addEventListener('change', () => {
    task.done = checkbox.checked;
    meta.textContent = `${task.id} · ${task.done ? '已完成' : '未完成'}`;
    li.classList.toggle('done', task.done);
  });
  li.classList.toggle('done', task.done);
  li.append(checkbox, title, meta); list.append(li);
}
