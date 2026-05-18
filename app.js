/* ── CONFIG ── (localStorage дан ўқилади) */
function getTG() {
  return {
    token:  localStorage.getItem("bz_tg_token")  || "",
    chatId: localStorage.getItem("bz_tg_chat")   || ""
  };
}

window.addEventListener("load", () => {
  const splash = document.getElementById("splash");
  setTimeout(() => {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 600);
  }, 1500); // 1.5 секунддан кейин йўқолади
});


/* ── KASSA BALANS ── */
function getCashBalance() {
  return +localStorage.getItem("bz_cash_balance") || 0;
}

function setCashBalance(amount) {
  localStorage.setItem("bz_cash_balance", amount);
  return amount;
}

function addToCashBalance() {
  const inp = document.getElementById("addCashBalance");
  const val = +inp.value;
  if (!val || val <= 0) { showToast("⚠️ Миқдорни киритинг"); return; }
  const newBalance = getCashBalance() + val;
  setCashBalance(newBalance);
  inp.value = "";
  updateStats();
  showToast("✅ Кассага " + fmt(val) + " сўм қўшилди");
}

/* ── STATE ── */
let cashItems = [];
let debtItems = [];
let period    = "week";
let barInst   = null;
let pieInst   = null;
let selectedMarket = "";

/* ── FORMAT ── */
const fmt    = n => Math.round(n).toLocaleString("ru-RU");
const today  = () => new Date().toISOString().split("T")[0];
const fmtD   = s => { if (!s) return "—"; const [y,m,d]=s.split("-"); return `${d}.${m}.${y}`; };
const esc    = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

/* ── MARKET SELECT ── */
function selectMarket(btn, name) {
  document.querySelectorAll(".market-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  selectedMarket = name;
  const customInput = document.getElementById("customMarket");
  if (name === "Бошқа") {
    customInput.style.display = "block";
    customInput.focus();
  } else {
    customInput.style.display = "none";
  }
}
function getMarket() {
  if (selectedMarket === "Бошқа") {
    const custom = document.getElementById("customMarket").value.trim();
    return custom || "Бошқа";
  }
  return selectedMarket || "Куйлик";
}

/* ── DARK MODE ── */
function toggleDark() {
  const d = document.body.classList.toggle("dark");
  localStorage.setItem("bz_dark", d ? "1" : "0");
  document.getElementById("dark-btn").textContent = d ? "☀️" : "🌙";
  document.getElementById("tc").content = d ? "#0f1117" : "#007aff";
  if (barInst || pieInst) updateCharts();
}
function initDark() {
  if (localStorage.getItem("bz_dark") === "1") {
    document.body.classList.add("dark");
    document.getElementById("dark-btn").textContent = "☀️";
    document.getElementById("tc").content = "#0f1117";
  }
}

/* ── TABS ── */
function goTab(name) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + name).classList.add("active");
  document.getElementById("ni-" + name).classList.add("active");
  if (name === "debt")    renderAllDebts();
  if (name === "history") renderHistory();
  if (name === "chart")   updateCharts();
}

/* ── PARSE ── */
function parse(input) {
  const m1 = input.match(/^(.+?)\s+([\d.]+)кг\s+\((\d[\d ]*)\)\s+(\d[\d ]*)$/i);
  if (m1) return { name: m1[1], kg: m1[2], unitPrice: +m1[3].replace(/\s/g,""), totalPrice: +m1[4].replace(/\s/g,"") };
  const m2 = input.match(/^(.+?)\s+(\d[\d ]*)$/);
  if (m2) return { name: m2[1], kg: null, unitPrice: null, totalPrice: +m2[2].replace(/\s/g,"") };
  return null;
}

/* ── CASH (НАҚД ТОВАР) ── */
function addCash() {
  const inp = document.getElementById("cashInp");
  const t = inp.value.trim(); if (!t) return;
  const p = parse(t);
  if (!p) { showToast("⚠️ Формат: Мош 10кг (15000) 150000"); return; }
  
  cashItems.push(p);
  inp.value = "";
  inp.focus();
  renderCash();
  updateStats();
}
function delCash(i) {
  cashItems.splice(i, 1);
  renderCash();
  updateStats();
}
function editCash(i) {
  const it = cashItems[i];
  document.getElementById("cashInp").value = it.kg
    ? `${it.name} ${it.kg}кг (${it.unitPrice}) ${it.totalPrice}` : `${it.name} ${it.totalPrice}`;
  delCash(i);
  document.getElementById("cashInp").focus();
}
function renderCash() {
  const list = document.getElementById("cashList");
  const cnt  = cashItems.length;
  document.getElementById("cash-count").textContent = cnt;
  if (!cnt) { list.innerHTML = `<div class="empty-state"><span class="empty-icon">📦</span>Ҳали нақд товар йўқ</div>`; document.getElementById("cashSub").style.display="none"; return; }
  list.innerHTML = cashItems.map((it,i) => `
    <div class="item-row">
      <div class="item-body">
        <div class="item-name">${esc(it.name)}${it.kg?` <span style="font-weight:400;color:var(--text2);font-size:.78rem">${it.kg}кг</span>`:""}</div>
        ${it.unitPrice?`<div class="item-sub">1кг = ${fmt(it.unitPrice)} сўм</div>`:""}
      </div>
      <span class="item-price">${fmt(it.totalPrice)}</span>
      <div class="row-btns">
        <button class="row-btn edit" onclick="editCash(${i})">✏️</button>
        <button class="row-btn" onclick="delCash(${i})">✕</button>
      </div>
    </div>`).join("");
  const total = cashItems.reduce((s,it)=>s+it.totalPrice,0);
  document.getElementById("cashSub").style.display = "block";
  document.getElementById("cashSubVal").textContent = fmt(total);
}

/* ── DEBT (ҚАРЗ ТОВАР) ── */
function addDebt() {
  const inp  = document.getElementById("debtInp");
  const t    = inp.value.trim(); 
  if (!t) { 
    showToast("⚠️ Товар номини киритинг"); 
    return; 
  }
  const p    = parse(t);
  if (!p) { 
    showToast("⚠️ Формат: Кийим 150000 ёки Мош 10кг (15000) 150000"); 
    return; 
  }
  const date = document.getElementById("debtDate").value  || today();
  const who  = document.getElementById("debtWho").value.trim();
  const market = getMarket();
  
  const newDebt = {
    ...p, 
    date, 
    who, 
    market: market,
    savedAt: today(),
    id: Date.now() + Math.random()
  };
  
  // FAQAT BARCHA QARZLARGA qo'shamiz (joriy debtItems ga EMAS!)
  const allDebts = JSON.parse(localStorage.getItem("bz_debts") || "[]");
  allDebts.push(newDebt);
  localStorage.setItem("bz_debts", JSON.stringify(allDebts));
  
  // Formani tozalash
  inp.value = "";
  document.getElementById("debtWho").value = "";
  document.getElementById("debtDate").value = today();
  inp.focus();
  
  // Faqat barcha qarzlar ro'yxatini yangilaymiz
  renderAllDebts();
  
  showToast("✅ Қарз сақланди: " + p.name + " - " + fmt(p.totalPrice) + " сўм");
}
function delDebt(i) {
  debtItems.splice(i,1);
  renderDebt();
  updateStats();
}
function editDebt(i) {
  const it = debtItems[i];
  document.getElementById("debtInp").value = it.kg
    ? `${it.name} ${it.kg}кг (${it.unitPrice}) ${it.totalPrice}` : `${it.name} ${it.totalPrice}`;
  document.getElementById("debtDate").value = it.date || today();
  document.getElementById("debtWho").value  = it.who  || "";
  delDebt(i);
  document.getElementById("debtInp").focus();
}
function renderDebt() {
  const list = document.getElementById("debtList");
  const cnt  = debtItems.length;
  document.getElementById("debt-count").textContent = cnt;
  if (!cnt) { 
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span>Ҳали қарз товар йўқ</div>`; 
    document.getElementById("debtSub").style.display="none"; 
    document.getElementById("debtSelectActions").style.display = "none";
    return; 
  }
  list.innerHTML = debtItems.map((it,i) => `
    <div class="item-row debt-row">
      <input type="checkbox" class="debt-checkbox" data-index="${i}" onchange="updateDebtSelectAll()">
      <div class="item-body">
        <div class="item-name">${esc(it.name)}${it.kg?` <span style="font-weight:400;color:var(--text2);font-size:.78rem">${it.kg}кг</span>`:""}</div>
        <div class="item-sub">📅 ${fmtD(it.date)}${it.who?" · 👤 "+esc(it.who):""}</div>
      </div>
      <span class="item-price dp">${fmt(it.totalPrice)}</span>
      <div class="row-btns">
        <button class="row-btn edit" onclick="editDebt(${i})">✏️</button>
        <button class="row-btn" onclick="delDebt(${i})">✕</button>
      </div>
    </div>`).join("");
  const total = debtItems.reduce((s,it)=>s+it.totalPrice,0);
  document.getElementById("debtSub").style.display = "block";
  document.getElementById("debtSubVal").textContent = fmt(total);
  document.getElementById("debtSelectActions").style.display = "flex";
  updateDebtSelectAll();
}

/* ── DEBT SELECTION FUNCTIONS (жорий қарзлар) ── */
function getSelectedDebtIndexes() {
  const checkboxes = document.querySelectorAll("#debtList .debt-checkbox");
  const selected = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      selected.push(parseInt(cb.dataset.index));
    }
  });
  return selected;
}

function deleteSelectedDebts() {
  const selected = getSelectedDebtIndexes();
  if (selected.length === 0) {
    showToast("⚠️ Ҳеч қандай қарз танланмаган");
    return;
  }
  if (!confirm(`${selected.length} та қарзни ўчиришни хохлайсизми?`)) return;
  
  selected.sort((a,b) => b - a);
  selected.forEach(idx => {
    debtItems.splice(idx, 1);
  });
  renderDebt();
  updateStats();
  showToast(`✅ ${selected.length} та қарз ўчирилди`);
}

function selectAllDebts() {
  const checkboxes = document.querySelectorAll("#debtList .debt-checkbox");
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
  });
  updateDebtSelectAll();
}

function updateDebtSelectAll() {
  const checkboxes = document.querySelectorAll("#debtList .debt-checkbox");
  const selectAllBtn = document.getElementById("debtSelectAllBtn");
  if (!selectAllBtn) return;
  const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
  const someChecked = Array.from(checkboxes).some(cb => cb.checked);
  if (checkboxes.length === 0) {
    selectAllBtn.textContent = "☐ Ҳаммасини танлаш";
  } else if (allChecked) {
    selectAllBtn.textContent = "✓ Ҳаммасини бекор қилиш";
  } else if (someChecked) {
    selectAllBtn.textContent = "☑ Қисман танланган";
  } else {
    selectAllBtn.textContent = "☐ Ҳаммасини танлаш";
  }
}

/* ── ALL DEBTS (БАРЧА ҚАРЗЛАР) ── */
let allDebtsArray = [];

function loadAllDebts() {
  allDebtsArray = JSON.parse(localStorage.getItem("bz_debts")||"[]");
}

function saveAllDebtsToStorage() {
  localStorage.setItem("bz_debts", JSON.stringify(allDebtsArray));
}

function renderAllDebts() {
  loadAllDebts();
  const list = document.getElementById("allDebtList");
  const tot  = allDebtsArray.reduce((s,d)=>s+d.totalPrice,0);
  document.getElementById("allDebtTotal").textContent = fmt(tot);
  document.getElementById("allDebtCnt").textContent   = allDebtsArray.length;
  
  if (!allDebtsArray.length) { 
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span>Ҳали қарз йўқ</div>`;
    document.getElementById("allDebtSelectActions").style.display = "none";
    return; 
  }
  
  list.innerHTML = [...allDebtsArray].reverse().map((d, idx) => {
    const originalIdx = allDebtsArray.length - 1 - idx;
    return `
    <div class="debt-hist-item">
      <input type="checkbox" class="all-debt-checkbox" data-idx="${originalIdx}" onchange="updateAllDebtSelectAll()">
      <div style="flex:1">
        <div class="dhi-top">
          <span class="dhi-name">${esc(d.name)}${d.kg?` ${d.kg}кг`:""}</span>
          <span class="dhi-amt">${fmt(d.totalPrice)} сўм</span>
        </div>
        <div class="dhi-meta">📅 ${fmtD(d.date)}${d.who?" · 👤 "+esc(d.who):""} · 📍 ${esc(d.market||"—")}</div>
      </div>
      <div class="row-btns">
        <button class="row-btn edit" onclick="editAllDebt(${originalIdx})">✏️</button>
        <button class="row-btn" onclick="deleteAllDebt(${originalIdx})">✕</button>
      </div>
    </div>`;
  }).join("");
  
  document.getElementById("allDebtSelectActions").style.display = "flex";
  updateAllDebtSelectAll();
}

function deleteAllDebt(idx) {
  if (!confirm("Қарзни ўчиришни хохлайсизми?")) return;
  allDebtsArray.splice(idx, 1);
  saveAllDebtsToStorage();
  renderAllDebts();
  showToast("✅ Қарз ўчирилди");
}

function editAllDebt(idx) {
  const it = allDebtsArray[idx];
  // Таҳрирлаш учун асосий қарзларга ўтказиш
  document.getElementById("debtInp").value = it.kg
    ? `${it.name} ${it.kg}кг (${it.unitPrice}) ${it.totalPrice}` : `${it.name} ${it.totalPrice}`;
  document.getElementById("debtDate").value = it.date || today();
  document.getElementById("debtWho").value  = it.who  || "";
  showToast("✏️ Қарзни таҳрирлаш учун 'Қарзга товар' бўлимига ўтинг");
  goTab('main');
  document.getElementById("debtInp").focus();
}

/* Барча қарзларни танлаб ўчириш функциялари */
function getAllSelectedDebtIndexes() {
  const checkboxes = document.querySelectorAll("#allDebtList .all-debt-checkbox");
  const selected = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      selected.push(parseInt(cb.dataset.idx));
    }
  });
  return selected;
}

function deleteSelectedAllDebts() {
  const selected = getAllSelectedDebtIndexes();
  if (selected.length === 0) {
    showToast("⚠️ Ҳеч қандай қарз танланмаган");
    return;
  }
  if (!confirm(`${selected.length} та қарзни ўчиришни хохлайсизми?`)) return;
  
  selected.sort((a,b) => b - a);
  selected.forEach(idx => {
    allDebtsArray.splice(idx, 1);
  });
  saveAllDebtsToStorage();
  renderAllDebts();
  showToast(`✅ ${selected.length} та қарз ўчирилди`);
}

function selectAllAllDebts() {
  const checkboxes = document.querySelectorAll("#allDebtList .all-debt-checkbox");
  const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
  });
  updateAllDebtSelectAll();
}

function updateAllDebtSelectAll() {
  const checkboxes = document.querySelectorAll("#allDebtList .all-debt-checkbox");
  const selectAllBtn = document.getElementById("allDebtSelectAllBtn");
  if (!selectAllBtn) return;
  const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
  const someChecked = Array.from(checkboxes).some(cb => cb.checked);
  if (checkboxes.length === 0) {
    selectAllBtn.textContent = "☐ Ҳаммасини танлаш";
  } else if (allChecked) {
    selectAllBtn.textContent = "✓ Ҳаммасини бекор қилиш";
  } else if (someChecked) {
    selectAllBtn.textContent = "☑ Қисман танланган";
  } else {
    selectAllBtn.textContent = "☐ Ҳаммасини танлаш";
  }
}

function clearAllDebts() {
  if(!confirm("БАРЧА қарзлар ўчирилсинми? Бу амални қайтариб бўлмайди!")) return;
  allDebtsArray = [];
  saveAllDebtsToStorage();
  renderAllDebts();
  showToast("✅ Барча қарзлар тозаланди");
}

function saveDebts(arr) {
  const market = getMarket();
  arr.forEach(d => {
    allDebtsArray.push({...d, market, savedAt: today()});
  });
  saveAllDebtsToStorage();
  renderAllDebts();
}

/* ── STATS ── */
function updateStats() {
  const cashBalance = getCashBalance();
  const cashTotal = cashItems.reduce((s,it) => s + it.totalPrice, 0);
  const debtTotal = debtItems.reduce((s,it) => s + it.totalPrice, 0);
  const spent = cashTotal;  // ФАҚАТ НАҚД ХАРАЖАТ (қарз ҚЎШИЛМАЙДИ!)
  const balance = cashBalance - spent;  // Қолдиқ = Касса - Нақд

  document.getElementById("income").value = cashBalance;

  if (cashItems.length || debtItems.length || cashBalance > 0) {
    document.getElementById("statsRow").style.display  = "grid";
    document.getElementById("progTrack").style.display = "block";
    document.getElementById("sc-kassa").textContent  = fmt(cashBalance) + " сўм";
    document.getElementById("sc-cash").textContent   = fmt(cashTotal) + " сўм";
    document.getElementById("sc-debt").textContent   = fmt(debtTotal) + " сўм";
    document.getElementById("sc-remain").textContent = fmt(balance) + " сўм";
    const chip = document.getElementById("sc-remain-chip");
    chip.className = "stat-chip " + (balance < 0 ? "red" : balance < cashBalance * 0.2 ? "orange" : "green");
    const pct = cashBalance > 0 ? Math.min(cashTotal / cashBalance * 100, 100) : 0;  // Фақат нақд бўйича процент
    document.getElementById("progFill").style.width      = pct + "%";
    document.getElementById("progFill").style.background = pct > 80 ? "var(--red)" : pct > 50 ? "var(--orange)" : "var(--blue)";
  } else {
    document.getElementById("statsRow").style.display  = "none";
    document.getElementById("progTrack").style.display = "none";
  }
}

/* ── FINISH ── */
function finish() {
  if (!cashItems.length) { 
    showToast("⚠️ Товарлар йўқ!"); 
    return; 
  }
  if (!selectedMarket) { 
    showToast("⚠️ Бозорни танланг!"); 
    return; 
  }
  
  const market = getMarket();
  const cashBalance = getCashBalance();
  const cashTotal = cashItems.reduce((s,it) => s + it.totalPrice, 0);
  const debtTotal = 0; // Joriy qarzlar yo'q (addDebt da qo'shilmaydi)
  const spent = cashTotal;
  const balance = cashBalance - spent;
  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"});
  const timeStr = now.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
  const note = getNote();

  let r = `Расход · ${dateStr}\n📍 Бозор: ${market}\n💵 Касса: ${fmt(cashBalance)} сўм\n`;
  if (cashItems.length) {
    cashItems.forEach(it => { r += `• ${it.name}`; if(it.kg) r+=` ${it.kg}кг (${fmt(it.unitPrice)})`; r+=` — ${fmt(it.totalPrice)} сўм\n`; });
    r += "\n";
  }
  r += `\n📊 Обший: ${fmt(cashTotal)} сўм`;
  r += `\n✅ Колди: ${fmt(balance)} сўм`;

  saveHistory({ market, cashBalance, cashTotal, spent, balance, cashItems:[...cashItems], date:today(), time:timeStr, note: note });

  setCashBalance(balance);

  const pre = document.getElementById("report");
  pre.textContent = r;
  pre.style.display = "block";
  pre.scrollIntoView({ behavior:"smooth", block:"nearest" });
  sendTG(r);

  cashItems = [];
  renderCash();
  updateStats();
  clearNote();
  showToast("✅ Тугатилди!");
}

/* ── TELEGRAM ── */
function sendTG(text) {
  const cfg = getTG();
  if (!cfg.token || !cfg.chatId) return;
  fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ chat_id: cfg.chatId, text })
  }).then(r=>r.json()).then(d=>{ if(d.ok) showToast("✈️ Телеграмга юборилди!"); else showToast("⚠️ TG: "+d.description); })
    .catch(()=>showToast("⚠️ Телеграм хатолик"));
}
function openTgModal() {
  const c = getTG();
  document.getElementById("tgToken").value  = c.token;
  document.getElementById("tgChatId").value = c.chatId;
  document.getElementById("tgModal").classList.add("open");
}
function closeTgModal(e) {
  if (!e || e.target === document.getElementById("tgModal"))
    document.getElementById("tgModal").classList.remove("open");
}
function saveTg() {
  const t = document.getElementById("tgToken").value.trim();
  const c = document.getElementById("tgChatId").value.trim();
  if (!t || !c) { showToast("⚠️ Токен ва Chat ID киритинг"); return; }
  localStorage.setItem("bz_tg_token", t);
  localStorage.setItem("bz_tg_chat",  c);
  updateTgPill(); closeTgModal();
  showToast("✅ Созламалар сақланди");
}
function updateTgPill() {
  const c = getTG();
  const pill = document.getElementById("tg-pill");
  if (c.token && c.chatId) { pill.textContent = "✈️ TG ✓"; pill.classList.add("connected"); }
  else { pill.textContent = "✈️ TG"; pill.classList.remove("connected"); }
}

/* ── HISTORY ── */
function saveHistory(entry) {
  const h = JSON.parse(localStorage.getItem("bz_history")||"[]");
  h.unshift(entry); if(h.length>300) h.splice(300);
  localStorage.setItem("bz_history", JSON.stringify(h));
}
function renderHistory() {
  const h     = JSON.parse(localStorage.getItem("bz_history")||"[]");
  const mon   = document.getElementById("histMonth").value;
  const filt  = mon ? h.filter(e=>e.date&&e.date.startsWith(mon)) : h;
  const cont  = document.getElementById("histList");
  if (!filt.length) { cont.innerHTML=`<div class="empty-state"><span class="empty-icon">📅</span>Тарих йўқ</div>`; return; }
  const grps = {};
  filt.forEach(e=>{ const d=e.date||"?"; if(!grps[d]) grps[d]=[]; grps[d].push(e); });
  cont.innerHTML = Object.keys(grps).sort((a,b)=>b.localeCompare(a)).map(day=>{
    const es = grps[day];
    const dt = es.reduce((s,e)=>s+(e.spent||e.cashTotal||0),0);
    return `<div class="hist-day">
      <div class="hist-day-hdr"><span>📅 ${fmtD(day)}</span><span>${fmt(dt)} сўм харажат</span></div>
      ${es.map(e=>`<div class="hist-entry">
        <div class="hist-top"><span class="hist-mkt">📍 ${esc(e.market)}</span><span class="hist-rem ${(e.balance??e.remain??0)<0?'neg':''}">Қолдиқ: ${fmt(e.balance??e.remain??0)} сўм</span></div>
        <div class="hist-meta">💵 Касса: ${fmt(e.cashBalance??e.kassa??0)} · 💰 Харажат: ${fmt(e.spent??e.cashTotal??0)} сўм${e.debtTotal?` · 📋 Қарз: ${fmt(e.debtTotal)} сўм`:""} · 🕐 ${e.time||""}</div>
        ${e.cashItems&&e.cashItems.length?`<div class="hist-items">${e.cashItems.slice(0,3).map(i=>esc(i.name)).join(", ")}${e.cashItems.length>3?"…":""}</div>`:""}
      </div>`).join("")}
    </div>`;
  }).join("");
}
function clearHistory() {
  if(!confirm("Барча тарих ўчирилсинми?")) return;
  localStorage.removeItem("bz_history"); renderHistory();
}

/* ── CHARTS ── */
function setPeriod(p) {
  period = p;
  document.querySelectorAll(".period-btn").forEach(b=>b.classList.remove("active"));
  document.getElementById("pb-"+p).classList.add("active");
  updateCharts();
}
function filteredHist() {
  const h = JSON.parse(localStorage.getItem("bz_history")||"[]");
  const now = new Date();
  if (period==="week") { const wa=new Date(now-7*86400000).toISOString().split("T")[0]; return h.filter(e=>e.date>=wa); }
  if (period==="month"){ const m=now.toISOString().slice(0,7); return h.filter(e=>e.date&&e.date.startsWith(m)); }
  return h;
}
function updateCharts() {
  const hist = filteredHist();
  const isDark = document.body.classList.contains("dark");
  const tc = isDark ? "#94a3b8" : "#6b7280";
  const gc = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const cb = isDark ? "#1c1f26" : "#ffffff";

  const byDay = {};
  hist.forEach(e=>{ byDay[e.date]=(byDay[e.date]||0)+(e.spent||e.cashTotal||0); });
  const days = Object.keys(byDay).sort();

  if (barInst) barInst.destroy();
  barInst = new Chart(document.getElementById("barChart").getContext("2d"), {
    type:"bar",
    data:{
      labels: days.map(d=>fmtD(d)),
      datasets:[{ label:"Жами харажат", data:days.map(d=>byDay[d]),
        backgroundColor:"rgba(37,99,235,0.75)", borderRadius:6, borderSkipped:false }]
    },
    options:{ responsive:true, plugins:{ legend:{labels:{color:tc,font:{size:12}}}, tooltip:{callbacks:{label:c=>fmt(c.raw)+" сўм"}} },
      scales:{ x:{ticks:{color:tc},grid:{color:gc}}, y:{ticks:{color:tc,callback:v=>fmt(v)},grid:{color:gc}} } }
  });

  const byMkt = {};
  hist.forEach(e=>{ byMkt[e.market]=(byMkt[e.market]||0)+(e.spent||e.cashTotal||0); });
  const mkts = Object.keys(byMkt);
  if (pieInst) pieInst.destroy();
  if (!mkts.length) return;
  pieInst = new Chart(document.getElementById("pieChart").getContext("2d"), {
    type:"doughnut",
    data:{
      labels:mkts,
      datasets:[{ data:mkts.map(m=>byMkt[m]),
        backgroundColor:["#2563eb","#16a34a","#ea580c","#7c3aed","#dc2626","#0891b2"],
        borderWidth:3, borderColor:cb }]
    },
    options:{ responsive:true, plugins:{
      legend:{labels:{color:tc,font:{size:12}}},
      tooltip:{callbacks:{label:c=>c.label+": "+fmt(c.raw)+" сўм"}}
    }}
  });
}

/* ── TOAST ── */
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 2500);
}

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", ()=>{
  initDark(); updateTgPill();
  document.getElementById("debtDate").value = today();
  document.getElementById("histMonth").value = new Date().toISOString().slice(0,7);
  renderCash(); renderDebt();
  loadAllDebts();
  renderAllDebts();
  
  const cashBalance = getCashBalance();
  document.getElementById("income").value = cashBalance;
  document.getElementById("income").readOnly = true;
  document.getElementById("income").style.background = "var(--bg)";
  updateStats();
  
  const firstMarketBtn = document.querySelector(".market-btn");
  if (firstMarketBtn) {
    firstMarketBtn.classList.add("selected");
    selectedMarket = "Куйлик";
  }
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
