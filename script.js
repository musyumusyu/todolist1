let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let moveCompletedToBottom = true;
let showCompletedTasks = true;

const taskList = document.getElementById('task-list');
const newTaskInput = document.getElementById('new-task');
const deadlineInput = document.getElementById('deadline');
const addBtn = document.getElementById('add-btn');
const moveToggle = document.getElementById('move-toggle');
const hideToggle = document.getElementById('hide-toggle');
const deleteSelectedBtn = document.getElementById('delete-selected');
const completeSelectedBtn = document.getElementById('complete-selected');

let calendar;
let editingTask = null;

// モーダル要素
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalDeadline = document.getElementById('modal-deadline');
const modalRemaining = document.getElementById('modal-remaining');
const closeModal = document.getElementById('close-modal');

const editModal = document.getElementById('edit-modal');
const closeEdit = document.getElementById('close-edit');
const editTaskInput = document.getElementById('edit-task');
const editDeadlineInput = document.getElementById('edit-deadline');
const saveEditBtn = document.getElementById('save-edit');

closeModal.onclick = () => (modal.style.display = "none");
closeEdit.onclick = () => (editModal.style.display = "none");
window.onclick = (e) => {
  if (e.target === modal) modal.style.display = "none";
  if (e.target === editModal) editModal.style.display = "none";
};

// --- FullCalendar 初期化 ---
window.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(el, {
    initialView: 'dayGridMonth',
    locale: 'ja',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    displayEventTime: false,
    eventClick: (info) => {
      const task = tasks.find(t => t.text === info.event.title);
      if (task) showTaskDetails(task);
    }
  });
  calendar.render();

  renderTasks();
  updateCalendar();
});

// --- 保存 ---
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// --- タスク追加 ---
addBtn.addEventListener('click', () => {
  const text = newTaskInput.value.trim();
  const deadline = deadlineInput.value ? deadlineInput.value : null;
  if (!text) return alert('タスクを入力してください。');
  tasks.push({ text, deadline, done: false, pinned: false, selected: false });
  saveTasks();
  newTaskInput.value = '';
  deadlineInput.value = '';
  renderTasks();
  updateCalendar();
});

moveToggle.addEventListener('change', () => {
  moveCompletedToBottom = moveToggle.checked;
  renderTasks();
});

hideToggle.addEventListener('change', () => {
  showCompletedTasks = !hideToggle.checked;
  renderTasks();
});

// --- 一括削除 ---
deleteSelectedBtn.addEventListener('click', () => {
  const selectedCount = tasks.filter(t => t.selected).length;
  if (selectedCount === 0) {
    alert("削除するタスクを選択してください。");
    return;
  }
  if (confirm(`${selectedCount}件のタスクを削除しますか？`)) {
    tasks = tasks.filter(t => !t.selected);
    saveTasks();
    renderTasks();
    updateCalendar();
  }
});

// --- 一括完了 ---
completeSelectedBtn.addEventListener('click', () => {
  const selectedCount = tasks.filter(t => t.selected && !t.done).length;
  if (selectedCount === 0) {
    alert("完了にするタスクを選択してください。");
    return;
  }
  tasks.forEach(t => {
    if (t.selected) t.done = true;
  });
  saveTasks();
  renderTasks();
  updateCalendar();
});

// --- タスク表示 ---
function renderTasks() {
  taskList.innerHTML = '';

  const filtered = showCompletedTasks ? tasks : tasks.filter(t => !t.done);

  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    const aD = a.deadline ? new Date(a.deadline) : null;
    const bD = b.deadline ? new Date(b.deadline) : null;
    if (!aD && !bD) return 0;
    if (aD && !bD) return -1;
    if (!aD && bD) return 1;

    if (moveCompletedToBottom) {
      if (a.done && !b.done) return 1;
      if (!a.done && b.done) return -1;
    }
    return aD - bD;
  });

  sorted.forEach(task => {
    const li = document.createElement('li');
    li.classList.toggle('done', task.done);
    li.classList.toggle('pinned', task.pinned);

    const top = document.createElement('div');
    top.classList.add('task-top');

    const select = document.createElement('input');
    select.type = 'checkbox';
    select.checked = task.selected || false;
    select.classList.add('task-select');
    select.addEventListener('change', () => {
      task.selected = select.checked;
    });

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = task.done;
    check.classList.add('task-check');
    check.addEventListener('change', () => {
      task.done = check.checked;
      saveTasks();
      renderTasks();
      updateCalendar();
    });

    const text = document.createElement('span');
    text.textContent = task.text;
    text.classList.add('task-text');

    const pinBtn = document.createElement('button');
    pinBtn.innerHTML = task.pinned ? '📍' : '📌';
    pinBtn.addEventListener('click', () => {
      task.pinned = !task.pinned;
      saveTasks();
      renderTasks();
    });

    const editBtn = document.createElement('button');
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', () => openEditModal(task));

    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.addEventListener('click', () => {
      if (confirm('削除しますか？')) {
        tasks = tasks.filter(t => t !== task);
        saveTasks();
        renderTasks();
        updateCalendar();
      }
    });

    const main = document.createElement('div');
    main.classList.add('task-main');
    main.append(select, check, text);

    const btns = document.createElement('div');
    btns.append(pinBtn, editBtn, delBtn);

    top.append(main, btns);
    li.append(top);

    if (task.deadline) {
      const d = new Date(task.deadline);
      if (!isNaN(d)) {
        const now = new Date();
        const diffH = (d - now) / 1000 / 60 / 60;

        let label = '', cls = '';
        if (task.done) { label = '✅ 完了済み'; cls = 'done-deadline'; }
        else if (diffH <= 0) { label = '⏰ 期限切れ'; cls = 'overdue'; }
        else if (diffH <= 24) { label = `⚠️ 残り約${Math.floor(diffH)}時間`; cls = 'urgent'; }
        else { label = `🕒 残り${Math.floor(diffH / 24)}日`; cls = 'normal'; }

        const dSpan = document.createElement('span');
        dSpan.textContent = `${d.toLocaleString('ja-JP')}（${label}）`;
        dSpan.classList.add('deadline', cls);
        li.append(dSpan);
      }
    }

    taskList.append(li);
  });
}

// --- カレンダー更新 ---
function updateCalendar() {
  if (!calendar) return;
  calendar.removeAllEvents();
  tasks.forEach(task => {
    if (task.deadline && !isNaN(new Date(task.deadline))) {
      calendar.addEvent({
        title: task.text,
        start: task.deadline,
        color: task.done ? '#9ca3af' : (task.pinned ? '#facc15' : '#3b82f6')
      });
    }
  });
}

// --- 詳細モーダル ---
function showTaskDetails(task) {
  modalTitle.textContent = task.text;
  if (task.deadline) {
    const d = new Date(task.deadline);
    modalDeadline.textContent = `締め切り: ${d.toLocaleString('ja-JP')}`;
    const now = new Date();
    const diffH = (d - now) / 1000 / 60 / 60;
    if (task.done) modalRemaining.textContent = '✅ 完了済み';
    else if (diffH <= 0) modalRemaining.textContent = '⏰ 期限切れ';
    else if (diffH <= 24) modalRemaining.textContent = `⚠️ 残り約${Math.floor(diffH)}時間`;
    else modalRemaining.textContent = `🕒 残り${Math.floor(diffH / 24)}日`;
  } else {
    modalDeadline.textContent = '締め切りなし';
    modalRemaining.textContent = '';
  }
  modal.style.display = 'block';
}

// --- 編集モーダル ---
function openEditModal(task) {
  editingTask = task;
  editTaskInput.value = task.text;
  editDeadlineInput.value = task.deadline || '';
  editModal.style.display = 'block';
}

saveEditBtn.addEventListener('click', () => {
  if (!editingTask) return;
  editingTask.text = editTaskInput.value.trim();
  editingTask.deadline = editDeadlineInput.value || null;
  saveTasks();
  renderTasks();
  updateCalendar();
  editModal.style.display = 'none';
});
