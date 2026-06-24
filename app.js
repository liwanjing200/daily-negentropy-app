const STORAGE_KEY = 'dailyRecords';
const SUPABASE_URL = 'https://jmfuujyeodhjhgxezqpv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zDXnDnWE665dD9kMmSqxOQ_U0Y_V5ib';
const SUPABASE_TABLE = 'shared_daily_data';
const SUPABASE_RECORD_ID = 'daily-negentropy';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  recordDate: $('#recordDate'), historyDate: $('#historyDate'), todayLabel: $('#todayLabel'),
  completionRate: $('#completionRate'), paymentTotal: $('#paymentTotal'), paymentMiniTotal: $('#paymentMiniTotal'), streakDays: $('#streakDays'),
  taskCount: $('#taskCount'), taskList: $('#taskList'), taskEmpty: $('#taskEmpty'), taskForm: $('#taskForm'), taskInput: $('#taskInput'),
  paymentForm: $('#paymentForm'), paymentList: $('#paymentList'), paymentEmpty: $('#paymentEmpty'),
  reviewForm: $('#reviewForm'), reviewDateLabel: $('#reviewDateLabel'), reviewSaveHint: $('#reviewSaveHint'),
  historyContent: $('#historyContent'), toast: $('#toast'), cloudStatus: $('#cloudStatus')
};

let selectedDate = localDateKey();
let records;
let toastTimer;
let cloudClient;
let cloudSyncTimer;
let cloudPullTimer;

const DAILY_TASK_TEMPLATE = [
  { key: 'm1', title: '身体激活', desc: '拉伸或散步 10 分钟，冷启动神经系统', category: '认知修炼' },
  { key: 'm2', title: '晨写', desc: '写下脑中所有浮现，只清空，不评判', category: '认知修炼' },
  { key: 'm3', title: '设定今日核心意图', desc: '今天只选一件真正要推进的事', category: '认知修炼' },
  { key: 'm4', title: '手机离开视线', desc: '关闭通知，为深度工作留出空间', category: '认知修炼' },
  { key: 'm5', title: '完成核心认知做功', desc: '深度写作、复杂问题或现实成果', category: '认知修炼' },
  { key: 'm6', title: '深度阅读', desc: '纸质书优先，标记真正触动的地方', category: '认知修炼' },
  { key: 'm7', title: '每天一个小产出', desc: '内容、笔记、工具测试或页面成果', category: '认知修炼' },
  { key: 'm8', title: '睡前复盘', desc: '完成、混乱、修正，留下三行也很好', category: '认知修炼' },
  { key: 'b1', title: '温和洁面', desc: '温水与温和洁面产品，不用力拉扯', category: '女性修炼' },
  { key: 'b2', title: '爽肤补水', desc: '轻拍或按压，照顾好今天的皮肤状态', category: '女性修炼' },
  { key: 'b3', title: '精华与面霜', desc: '由内向外轻拍，脖颈一并护理', category: '女性修炼' },
  { key: 'b4', title: '认真防晒', desc: '出门前完成面部与颈部防晒', category: '女性修炼' },
  { key: 'b5', title: '头发与衣着清爽', desc: '干净、舒展，更像理想中的自己', category: '女性修炼' },
  { key: 'b6', title: '晚间卸妆洁面', desc: '温柔清洁今天落在皮肤上的疲惫', category: '女性修炼' },
  { key: 'b7', title: '晚间补水', desc: '根据皮肤状态做简单、稳定的护理', category: '女性修炼' },
  { key: 'b8', title: '身体乳', desc: '洗澡后及时保湿，把它变成固定仪式', category: '女性修炼' },
  { key: 'b9', title: '整理明日形象', desc: '提前准备衣服与随身物品', category: '女性修炼' },
  { key: 'e1', title: '走路 20–40 分钟', desc: '规律步行，保持轻盈、干净、稳定', category: '女性修炼' },
  { key: 'e2', title: '臀桥 20 次', desc: '激活臀部和身体后侧线条', category: '女性修炼' },
  { key: 'e3', title: '深蹲 15 次', desc: '腿臀塑形，动作稳定优先', category: '女性修炼' },
  { key: 'e4', title: '平板支撑 30 秒', desc: '收紧核心，保持自然呼吸', category: '女性修炼' },
  { key: 'e5', title: '蝴蝶伸展 60 秒', desc: '打开髋部，增加身体柔韧感', category: '女性修炼' },
  { key: 'e6', title: '整理房间 10 分钟', desc: '空间清爽，人也更容易清醒', category: '女性修炼' }
];

records = loadRecords();

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nowTime() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function blankRecord() {
  return {
    tasks: DAILY_TASK_TEMPLATE.map((task) => ({ ...task, id: task.key, completed: false, completedAt: null })),
    review: {}, payments: []
  };
}

function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && typeof parsed === 'object') return parsed;

    const legacy = JSON.parse(localStorage.getItem('negentropy_v3'));
    if (!legacy || typeof legacy !== 'object') return {};
    const migrated = {};
    Object.entries(legacy).forEach(([date, day]) => {
      migrated[date] = blankRecord();
      migrated[date].tasks.forEach((task) => {
        const source = task.category === '女性修炼' ? day.body : day.mind;
        task.completed = Boolean(source && source[task.key]);
        task.completedAt = task.completed ? '原打卡记录' : null;
      });
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return {};
  }
}

function getRecord(date = selectedDate) {
  if (!records[date]) records[date] = blankRecord();
  records[date].tasks = Array.isArray(records[date].tasks) ? records[date].tasks : [];
  records[date].review = records[date].review || {};
  records[date].payments = Array.isArray(records[date].payments) ? records[date].payments : [];
  return records[date];
}

function saveRecords({ touch = true } = {}) {
  if (touch && records[selectedDate]) records[selectedDate].updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(syncCloud, 500);
}

function setCloudStatus(message, state = '') {
  elements.cloudStatus.textContent = message;
  elements.cloudStatus.dataset.state = state;
}

function mergeRecords(localRecords, cloudRecords) {
  const merged = { ...localRecords };
  Object.entries(cloudRecords || {}).forEach(([date, cloudDay]) => {
    const localDay = localRecords[date];
    if (!localDay) {
      merged[date] = cloudDay;
      return;
    }
    const localTime = Date.parse(localDay.updatedAt || 0);
    const cloudTime = Date.parse(cloudDay.updatedAt || 0);
    merged[date] = cloudTime > localTime ? cloudDay : localDay;
  });
  return merged;
}

async function syncCloud() {
  if (!cloudClient) return;
  setCloudStatus('正在同步…', 'syncing');
  try {
    const { error } = await cloudClient
      .from(SUPABASE_TABLE)
      .upsert({ id: SUPABASE_RECORD_ID, records, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) throw error;
    setCloudStatus('已同步到 Supabase', 'ok');
  } catch (error) {
    console.warn('Supabase sync unavailable:', error);
    setCloudStatus('已保存本地 · 云端稍后重试', 'error');
  }
}

async function pullCloud() {
  if (!cloudClient) return;
  const { data, error } = await cloudClient
    .from(SUPABASE_TABLE)
    .select('records')
    .eq('id', SUPABASE_RECORD_ID)
    .maybeSingle();
  if (error) throw error;
  const cloudRecords = data?.records || {};
  if (!cloudRecords || typeof cloudRecords !== 'object') return;
  const before = JSON.stringify(records);
  records = mergeRecords(records, cloudRecords);
  if (before === JSON.stringify(records)) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) renderAll();
}

async function initCloud() {
  if (!window.supabase?.createClient) {
    setCloudStatus('已保存在本地', 'error');
    return;
  }

  try {
    cloudClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    await pullCloud();
    renderAll();
    await syncCloud();
    clearInterval(cloudPullTimer);
    cloudPullTimer = setInterval(() => {
      if (document.visibilityState === 'visible') pullCloud().catch((error) => console.warn('Supabase pull unavailable:', error));
    }, 15000);
  } catch (error) {
    console.warn('Supabase sync unavailable:', error);
    setCloudStatus('已保存在本地 · 云端稍后重试', 'error');
  }
}

function displayDate(dateKey, withYear = true) {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat('zh-CN', {
    ...(withYear ? { year: 'numeric' } : {}), month: 'long', day: 'numeric', weekday: 'short'
  }).format(date);
}

function money(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function toast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 1800);
}

function setSelectedDate(date) {
  selectedDate = date || localDateKey();
  elements.recordDate.value = selectedDate;
  elements.historyDate.value = selectedDate;
  renderAll();
}

function renderAll() {
  elements.todayLabel.textContent = displayDate(selectedDate);
  elements.reviewDateLabel.textContent = displayDate(selectedDate).toUpperCase();
  renderTasks();
  renderPayments();
  fillReview();
  renderHistory();
}

function renderTasks() {
  const tasks = getRecord().tasks;
  const completed = tasks.filter((task) => task.completed).length;
  const rate = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  elements.completionRate.textContent = `${rate}%`;
  elements.streakDays.textContent = `${calculateStreak()} 天`;
  elements.taskCount.textContent = `${completed} / ${tasks.length}`;
  elements.taskEmpty.hidden = tasks.length > 0;
  elements.taskList.innerHTML = tasks.map((task) => `
    <li class="task-item ${task.completed ? 'done' : ''}" data-id="${task.id}">
      <input class="task-check" type="checkbox" ${task.completed ? 'checked' : ''} aria-label="标记任务完成">
      <div>
        <span class="task-title">${escapeHTML(task.title)}</span>
        ${task.desc ? `<span class="task-desc">${escapeHTML(task.desc)}</span>` : ''}
        ${task.category ? `<span class="task-category">${escapeHTML(task.category)}</span>` : ''}
        ${task.completedAt ? `<span class="task-time">完成于 ${escapeHTML(task.completedAt)}</span>` : ''}
      </div>
      <button class="delete-button" type="button" aria-label="删除任务">×</button>
    </li>
  `).join('');
}

function calculateStreak() {
  let streak = 0;
  const cursor = new Date(`${localDateKey()}T00:00:00`);
  while (true) {
    const key = localDateKey(cursor);
    const day = records[key];
    if (!day || !Array.isArray(day.tasks) || !day.tasks.some((task) => task.completed)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderPayments() {
  const payments = getRecord().payments;
  const total = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  elements.paymentTotal.textContent = money(total);
  elements.paymentMiniTotal.textContent = money(total);
  elements.paymentEmpty.hidden = payments.length > 0;
  elements.paymentList.innerHTML = payments.map((payment) => `
    <div class="payment-row" data-id="${payment.id}">
      <div>
        <span class="payment-name">${escapeHTML(payment.item)}</span>
        <span class="payment-meta">${escapeHTML(payment.time)} · ${escapeHTML(payment.method)}${payment.note ? ` · ${escapeHTML(payment.note)}` : ''}</span>
      </div>
      <span class="payment-amount">${money(payment.amount)}</span>
      <button class="delete-button" type="button" aria-label="删除付款记录">×</button>
    </div>
  `).join('');
}

function fillReview() {
  const review = getRecord().review;
  $('#reviewDone').value = review.done || '';
  $('#reviewUndone').value = review.undone || '';
  $('#reviewProblems').value = review.problems || '';
  $('#reviewImprove').value = review.improve || '';
  $('#reviewNote').value = review.note || '';
  $$('input[name="mood"]').forEach((input) => { input.checked = input.value === review.mood; });
}

function reviewDataFromForm() {
  return {
    done: $('#reviewDone').value.trim(),
    undone: $('#reviewUndone').value.trim(),
    problems: $('#reviewProblems').value.trim(),
    improve: $('#reviewImprove').value.trim(),
    mood: $('input[name="mood"]:checked')?.value || '',
    note: $('#reviewNote').value.trim(),
    updatedAt: new Date().toISOString()
  };
}

function switchPage(page) {
  $$('.page').forEach((section) => section.classList.toggle('active', section.id === `${page}Page`));
  $$('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.page === page));
  if (page === 'history') renderHistory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderHistory() {
  const record = getRecord(elements.historyDate.value || selectedDate);
  const completedTasks = record.tasks.filter((task) => task.completed);
  const review = record.review || {};
  const total = record.payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const reviewFields = [
    ['今天完成了什么', review.done], ['今天没完成什么', review.undone],
    ['今天的问题', review.problems], ['明天要改进什么', review.improve],
    ['今日心情', review.mood], ['今日备注', review.note]
  ].filter(([, value]) => value);

  elements.historyContent.innerHTML = `
    <section class="card history-card">
      <h3>已完成任务 · ${completedTasks.length}</h3>
      ${completedTasks.length ? `<ul class="history-list">${completedTasks.map((task) => `<li>${escapeHTML(task.title)} <span class="history-muted">${task.completedAt ? `· ${escapeHTML(task.completedAt)}` : ''}</span></li>`).join('')}</ul>` : '<p class="history-muted">这一天没有已完成的任务。</p>'}
    </section>
    <section class="card history-card">
      <h3>当日复盘</h3>
      ${reviewFields.length ? reviewFields.map(([label, value]) => `<div class="review-entry"><strong>${label}</strong><p>${escapeHTML(value)}</p></div>`).join('') : '<p class="history-muted">这一天还没有写复盘。</p>'}
    </section>
    <section class="card history-card">
      <h3>付款记录 · <span class="history-total">${money(total)}</span></h3>
      ${record.payments.length ? record.payments.map((payment) => `<div class="payment-row"><div><span class="payment-name">${escapeHTML(payment.item)}</span><span class="payment-meta">${escapeHTML(payment.time)} · ${escapeHTML(payment.method)}${payment.note ? ` · ${escapeHTML(payment.note)}` : ''}</span></div><span class="payment-amount">${money(payment.amount)}</span></div>`).join('') : '<p class="history-muted">这一天没有付款记录。</p>'}
    </section>
  `;
}

elements.taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = elements.taskInput.value.trim();
  if (!title) return;
  getRecord().tasks.push({ id: uid(), title, desc: '', category: '自定义', completed: false, completedAt: null, createdAt: new Date().toISOString() });
  elements.taskInput.value = '';
  saveRecords();
  renderTasks();
});

elements.taskList.addEventListener('change', (event) => {
  if (!event.target.matches('.task-check')) return;
  const task = getRecord().tasks.find((item) => item.id === event.target.closest('.task-item').dataset.id);
  if (!task) return;
  task.completed = event.target.checked;
  task.completedAt = task.completed ? nowTime() : null;
  saveRecords();
  renderTasks();
  renderHistory();
});

elements.taskList.addEventListener('click', (event) => {
  if (!event.target.matches('.delete-button')) return;
  const id = event.target.closest('.task-item').dataset.id;
  getRecord().tasks = getRecord().tasks.filter((item) => item.id !== id);
  saveRecords();
  renderTasks();
  renderHistory();
});

elements.paymentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  getRecord().payments.push({
    id: uid(), time: $('#paymentTime').value, item: $('#paymentItem').value.trim(),
    amount: Number($('#paymentAmount').value), method: $('#paymentMethod').value,
    note: $('#paymentNote').value.trim(), createdAt: new Date().toISOString()
  });
  elements.paymentForm.reset();
  $('#paymentTime').value = nowTime();
  saveRecords();
  renderPayments();
  renderHistory();
  toast('付款记录已保存');
});

elements.paymentList.addEventListener('click', (event) => {
  if (!event.target.matches('.delete-button')) return;
  const id = event.target.closest('.payment-row').dataset.id;
  getRecord().payments = getRecord().payments.filter((item) => item.id !== id);
  saveRecords();
  renderPayments();
  renderHistory();
});

elements.reviewForm.addEventListener('submit', (event) => {
  event.preventDefault();
  getRecord().review = reviewDataFromForm();
  saveRecords();
  elements.reviewSaveHint.textContent = `已保存 · ${nowTime()}`;
  renderHistory();
  toast('复盘已保存');
});

elements.recordDate.addEventListener('change', () => setSelectedDate(elements.recordDate.value));
elements.historyDate.addEventListener('change', () => setSelectedDate(elements.historyDate.value));

$$('[data-page]').forEach((button) => button.addEventListener('click', () => switchPage(button.dataset.page)));
$('#openReview').addEventListener('click', () => switchPage('review'));
$('#jumpToday').addEventListener('click', () => { setSelectedDate(localDateKey()); switchPage('today'); });

elements.recordDate.value = selectedDate;
elements.historyDate.value = selectedDate;
$('#paymentTime').value = nowTime();
renderAll();
initCloud();
