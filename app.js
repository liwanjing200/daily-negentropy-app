const STORAGE_KEY = 'dailyRecords';

const PAY_CATS = [
  { id: '餐饮', icon: '🍜' }, { id: '购物', icon: '🛍' }, { id: '交通', icon: '🚌' },
  { id: '娱乐', icon: '🎬' }, { id: '生活', icon: '🏠' }, { id: '学习', icon: '📚' },
  { id: '健康', icon: '💊' }, { id: '其他', icon: '💸' }
];
let selectedPayCat = '餐饮';

function catIcon(cat) {
  return PAY_CATS.find((c) => c.id === cat)?.icon || '💸';
}

function selectPayCat(el) {
  document.querySelectorAll('.payment-cat-chip').forEach((c) => c.classList.remove('active'));
  el.classList.add('active');
  selectedPayCat = el.dataset.cat;
}
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
    review: {}, payments: [], makeup: {}
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
  records[date].makeup = records[date].makeup || {};
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

const TASK_GROUP_META = {
  '认知修炼': { icon: '🧠', color: 'group-mind' },
  '女性修炼': { icon: '🌸', color: 'group-body' },
  '自定义':   { icon: '✦',  color: 'group-custom' },
};

function taskItemHTML(task) {
  return `
    <li class="task-item ${task.completed ? 'done' : ''}" data-id="${task.id}">
      <input class="task-check" type="checkbox" ${task.completed ? 'checked' : ''} aria-label="标记任务完成">
      <div style="flex:1;min-width:0">
        <span class="task-title">${escapeHTML(task.title)}</span>
        ${task.desc ? `<span class="task-desc">${escapeHTML(task.desc)}</span>` : ''}
        ${task.completedAt ? `<span class="task-time">完成于 ${escapeHTML(task.completedAt)}</span>` : ''}
      </div>
      <button class="delete-button" type="button" aria-label="删除任务">×</button>
    </li>`;
}

function renderTasks() {
  const tasks = getRecord().tasks;
  const completed = tasks.filter((t) => t.completed).length;
  const rate = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  elements.completionRate.textContent = `${rate}%`;
  elements.streakDays.textContent = `${calculateStreak()} 天`;
  elements.taskCount.textContent = `${completed} / ${tasks.length}`;

  // group by category
  const groups = {};
  tasks.forEach((t) => {
    const cat = t.category || '自定义';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(t);
  });

  const ORDER = ['认知修炼', '女性修炼', '自定义'];
  const cats = [...ORDER.filter((c) => groups[c]), ...Object.keys(groups).filter((c) => !ORDER.includes(c))];

  let html = '';
  cats.forEach((cat) => {
    const meta = TASK_GROUP_META[cat] || { icon: '●', color: 'group-custom' };
    const list = groups[cat];
    const done = list.filter((t) => t.completed).length;
    html += `
      <div class="task-group">
        <div class="task-group-header ${meta.color}">
          <span class="task-group-icon">${meta.icon}</span>
          <span class="task-group-name">${escapeHTML(cat)}</span>
          <span class="task-group-count">${done}/${list.length}</span>
        </div>
        <ul class="task-list">${list.map(taskItemHTML).join('')}</ul>
      </div>`;
  });

  $('#taskList').innerHTML = html || '<div class="empty-state">今天还没有任务，慢慢开始也很好。</div>';

  // show yesterday's improve note
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yKey = localDateKey(yesterday);
  const improve = records[yKey]?.review?.improve?.trim();
  const banner = $('#yesterdayImprove');
  if (improve) {
    $('#yesterdayImproveText').textContent = improve;
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
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
      <div class="pay-cat-icon">${catIcon(payment.category)}</div>
      <div style="flex:1;min-width:0">
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
      ${record.payments.length ? record.payments.map((payment) => `<div class="payment-row"><div class="pay-cat-icon">${catIcon(payment.category)}</div><div style="flex:1;min-width:0"><span class="payment-name">${escapeHTML(payment.item)}</span><span class="payment-meta">${escapeHTML(payment.time)} · ${escapeHTML(payment.method)}${payment.note ? ` · ${escapeHTML(payment.note)}` : ''}</span></div><span class="payment-amount">${money(payment.amount)}</span></div>`).join('') : '<p class="history-muted">这一天没有付款记录。</p>'}
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
    category: selectedPayCat,
    note: $('#paymentNote').value.trim(), createdAt: new Date().toISOString()
  });
  elements.paymentForm.reset();
  $('#paymentTime').value = nowTime();
  selectedPayCat = '餐饮';
  document.querySelectorAll('.payment-cat-chip').forEach((c) => c.classList.toggle('active', c.dataset.cat === '餐饮'));
  saveRecords();
  renderPayments();
  renderHistory();
  toast('付款记录已保存 ✓');
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

// ── Finance ──
let finYear = new Date().getFullYear();
let finMonth = new Date().getMonth();

function renderFinance() {
  const ml = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
  $('#finMonthLabel').textContent = `${finYear}年${ml[finMonth]}`;

  const todayKey = localDateKey();
  let monthTotal = 0, todayTotal = 0, count = 0;
  const catMap = {};
  const monthRecords = [];

  Object.entries(records).forEach(([date, day]) => {
    const d = new Date(`${date}T00:00:00`);
    if (!Array.isArray(day.payments)) return;
    day.payments.forEach((p) => {
      const amt = Number(p.amount || 0);
      if (date === todayKey) todayTotal += amt;
      if (d.getFullYear() === finYear && d.getMonth() === finMonth) {
        monthTotal += amt;
        count++;
        const cat = p.category || '其他';
        catMap[cat] = (catMap[cat] || 0) + amt;
        monthRecords.push({ ...p, date });
      }
    });
  });

  const daysInMonth = new Date(finYear, finMonth + 1, 0).getDate();
  const daysPassed = finYear === new Date().getFullYear() && finMonth === new Date().getMonth()
    ? new Date().getDate() : daysInMonth;
  const avg = daysPassed > 0 ? monthTotal / daysPassed : 0;

  $('#finMonthTotal').textContent = money(monthTotal);
  $('#finTodayTotal').textContent = money(todayTotal);
  $('#finMonthCount').textContent = `${count} 笔`;
  $('#finDailyAvg').textContent = money(avg);
  $('#finRecordBadge').textContent = `${count} 笔`;

  // category breakdown using PAY_CATS order
  const catSorted = PAY_CATS.map((c) => ({ ...c, amt: catMap[c.id] || 0 })).filter((c) => c.amt > 0).sort((a, b) => b.amt - a.amt);
  const maxAmt = catSorted[0]?.amt || 1;
  $('#finMethodBreakdown').innerHTML = catSorted.length
    ? `<div class="fin-method-row">${catSorted.map(({ id, icon, amt }) => {
        const pct = monthTotal > 0 ? Math.round(amt / monthTotal * 100) : 0;
        const w = Math.round(amt / maxAmt * 100);
        return `<div class="fin-method-item"><div class="fin-method-top"><span class="fin-method-name">${icon} ${escapeHTML(id)}</span><span><span class="fin-method-amt">${money(amt)}</span><span class="fin-method-pct">${pct}%</span></span></div><div class="fin-bar-track"><div class="fin-bar-fill" style="width:${w}%"></div></div></div>`;
      }).join('')}</div>`
    : '<p class="history-muted" style="margin:6px 0">本月暂无支出</p>';

  // records list
  monthRecords.sort((a, b) => b.date.localeCompare(a.date) || b.time?.localeCompare(a.time || '') || 0);
  $('#finEmpty').hidden = monthRecords.length > 0;
  $('#finRecordList').innerHTML = monthRecords.map((p) => `
    <div class="fin-record-row">
      <div class="fin-cat-icon">${catIcon(p.category)}</div>
      <div class="fin-record-info">
        <div class="fin-record-name">${escapeHTML(p.item)}</div>
        <div class="fin-record-meta">${p.category ? escapeHTML(p.category) + ' · ' : ''}${escapeHTML(p.method || '')}${p.note ? ` · ${escapeHTML(p.note)}` : ''}</div>
      </div>
      <div style="text-align:right">
        <div class="fin-record-amt">${money(p.amount)}</div>
        <div class="fin-record-date">${p.date} ${p.time || ''}</div>
      </div>
    </div>
  `).join('');
}

$('#finPrev').addEventListener('click', () => {
  finMonth--; if (finMonth < 0) { finMonth = 11; finYear--; }
  renderFinance();
});
$('#finNext').addEventListener('click', () => {
  const now = new Date();
  if (finYear > now.getFullYear() || (finYear === now.getFullYear() && finMonth >= now.getMonth())) return;
  finMonth++; if (finMonth > 11) { finMonth = 0; finYear++; }
  renderFinance();
});

$$('[data-page]').forEach((button) => button.addEventListener('click', () => {
  if (button.dataset.page === 'finance') renderFinance();
  if (button.dataset.page === 'makeup') renderMakeup();
  switchPage(button.dataset.page);
}));
$('#openReview').addEventListener('click', () => switchPage('review'));
$('#jumpToday').addEventListener('click', () => { setSelectedDate(localDateKey()); switchPage('today'); });

// ── Makeup album ──
const MAKEUP_BUCKET = 'makeup-photos';
const MAKEUP_NS = 'daily-negentropy';
let makeupKind = 'after';
const makeupUrlCache = {};

function getMakeup(date = selectedDate) {
  const rec = getRecord(date);
  rec.makeup = rec.makeup || {};
  return rec.makeup;
}

async function makeupSignedUrl(path) {
  if (!path || !cloudClient) return null;
  if (makeupUrlCache[path]) return makeupUrlCache[path];
  const { data, error } = await cloudClient.storage.from(MAKEUP_BUCKET).createSignedUrl(path, 3600);
  if (error) { console.warn('makeup signed url:', error); return null; }
  makeupUrlCache[path] = data.signedUrl;
  return data.signedUrl;
}

function compressImage(file, maxSize = 1080, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width >= height && width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
      else if (height > width && height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('compress failed'))), 'image/jpeg', quality);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadMakeup(file) {
  if (!cloudClient) { toast('云端未连接，稍后再试'); return; }
  toast('正在上传…');
  try {
    const blob = await compressImage(file);
    const path = `${MAKEUP_NS}/${selectedDate}-${makeupKind}-${Date.now()}.jpg`;
    const { error } = await cloudClient.storage.from(MAKEUP_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    getMakeup()[makeupKind] = path;
    saveRecords();
    renderMakeup();
    renderHistory();
    toast('照片已保存 ✓');
  } catch (error) {
    console.warn('makeup upload failed:', error);
    toast('上传失败，请重试');
  }
}

async function setMakeupSlot(selector, emoji, label, path) {
  const slot = $(selector);
  if (path) {
    const url = await makeupSignedUrl(path);
    slot.innerHTML = url
      ? `<img class="ms-photo" src="${url}" alt=""><span class="ms-retake">换一张</span>`
      : `<span class="ms-emoji">${emoji}</span><span class="ms-label">${label}</span>`;
  } else {
    slot.innerHTML = `<span class="ms-emoji">${emoji}</span><span class="ms-label">${label}</span>`;
  }
}

function makeupDays() {
  return Object.keys(records)
    .filter((d) => records[d]?.makeup && (records[d].makeup.before || records[d].makeup.after))
    .sort();
}

async function renderMakeup() {
  $('#makeupDateLabel').textContent = displayDate(selectedDate, false);
  const makeup = getMakeup();
  await setMakeupSlot('#slotBefore', '📷', '素颜 before', makeup.before);
  await setMakeupSlot('#slotAfter', '💄', '妆后 after', makeup.after);

  const days = makeupDays();
  const compareCard = $('#makeupCompareCard');
  const compare = $('#makeupCompare');
  if (days.length >= 2) {
    const first = days[0];
    const last = days[days.length - 1];
    const fu = await makeupSignedUrl(records[first].makeup.after || records[first].makeup.before);
    const lu = await makeupSignedUrl(records[last].makeup.after || records[last].makeup.before);
    compare.innerHTML = `<div class="makeup-compare">
      <figure><img src="${fu}" alt=""><figcaption>最早 · ${first}</figcaption></figure>
      <figure><img src="${lu}" alt=""><figcaption>最近 · ${last}</figcaption></figure>
    </div>`;
    compareCard.style.display = '';
  } else {
    compareCard.style.display = 'none';
  }

  const timeline = $('#makeupTimeline');
  if (!days.length) {
    timeline.innerHTML = '<p class="history-muted" style="margin:6px 0">还没有照片，上传今天的妆容开始吧 ✿</p>';
    return;
  }
  const items = await Promise.all(days.slice().reverse().map(async (d) => {
    const m = records[d].makeup;
    const url = await makeupSignedUrl(m.after || m.before);
    return `<button class="makeup-tl-item" type="button" data-url="${url}" data-date="${d}"><img src="${url}" alt=""><span>${d.slice(5)}</span></button>`;
  }));
  timeline.innerHTML = items.join('');
}

$('#slotBefore').addEventListener('click', () => { makeupKind = 'before'; $('#makeupFile').click(); });
$('#slotAfter').addEventListener('click', () => { makeupKind = 'after'; $('#makeupFile').click(); });
$('#makeupFile').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) uploadMakeup(file);
  event.target.value = '';
});
$('#makeupTimeline').addEventListener('click', (event) => {
  const item = event.target.closest('.makeup-tl-item');
  if (!item) return;
  $('#mlImg').src = item.dataset.url;
  $('#mlDate').textContent = item.dataset.date;
  $('#makeupLightbox').classList.add('show');
});
$('#mlClose').addEventListener('click', () => $('#makeupLightbox').classList.remove('show'));
$('#makeupLightbox').addEventListener('click', (event) => {
  if (event.target.id === 'makeupLightbox') $('#makeupLightbox').classList.remove('show');
});

elements.recordDate.value = selectedDate;
elements.historyDate.value = selectedDate;
$('#paymentTime').value = nowTime();
renderAll();
initCloud();
