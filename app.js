/* ── CONFIG ── (localStorage дан ўқилади) */
function getTG() {
  return {
    token:  localStorage.getItem("bz_tg_token")  || "",
    chatId: localStorage.getItem("bz_tg_chat")   || ""
  };
}

/* ── GOOGLE SHEETS CONFIG ── */
function getGS() {
  return {
    url: localStorage.getItem("bz_gs_url") || ""
  };
}

function saveGS(url) {
  localStorage.setItem("bz_gs_url", url);
}

/* Google Sheets га маълумот юбориш */
async function sendToGoogleSheets(data) {
  const cfg = getGS();
  if (!cfg.url) return;
  try {
    await fetch(cfg.url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(data)
    });
    showToast("📊 Google Sheets га сақланди!");
  } catch (e) {
    showToast("⚠️ Google Sheets хатолик");
  }
}

/* Қарзни Google Sheets га юбориш */
async function sendDebtToGoogleSheets(debt) {
  const cfg = getGS();
  if (!cfg.url) return;
  try {
    const data = {
      type: "debt",
      date: debt.date,
      who: debt.who || "",
      market: debt.market || "",
      name: debt.name,
      kg: debt.kg || "",
      unitPrice: debt.unitPrice || "",
      totalPrice: debt.totalPrice,
      savedAt: debt.savedAt
    };
    await fetch(cfg.url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(data)
    });
  } catch (e) {
    // silent
  }
}

async function deleteDebtFromGoogleSheets(debt, clearAll = false) {
  const cfg = getGS();
  if (!cfg.url) return;
  try {
    const data = clearAll
      ? { type: "delete_debt", clearAll: true }
      : {
          type:       "delete_debt",
          id:         debt.id,
          name:       debt.name,
          who:        debt.who        || "",
          date:       debt.date       || "",
          totalPrice: debt.totalPrice || 0
        };
    await fetch(cfg.url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(data)
    });
  } catch (e) {
    // silent
  }
}

function updateGsPill() {
  const cfg = getGS();
  const pill = document.getElementById("gs-pill");
  if (!pill) return;
  if (cfg.url) {
    pill.textContent = "📊 GS ✓";
    pill.classList.add("connected");
  } else {
    pill.textContent = "📊 GS";
    pill.classList.remove("connected");
  }
}

function openGsModal() {
  const cfg = getGS();
  document.getElementById("gsUrl").value = cfg.url;
  document.getElementById("gsModal").classList.add("open");
}

function closeGsModal(e) {
  if (!e || e.target === document.getElementById("gsModal"))
    document.getElementById("gsModal").classList.remove("open");
}

function saveGs() {
  const url = document.getElementById("gsUrl").value.trim();
  if (!url) { showToast("⚠️ Web App URL киритинг"); return; }
  if (!url.startsWith("https://script.google.com")) {
    showToast("⚠️ Google Apps Script URL бўлиши керак");
    return;
  }
  saveGS(url);
  updateGsPill();
  closeGsModal();
  showToast("✅ Google Sheets улашди!");
}

window.addEventListener("load", () => {
  const splash = document.getElementById("splash");
  setTimeout(() => {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 600);
  }, 1500);
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
  if (!val || val <= 0) { 
    showToast("⚠️ Миқдорни киритинг"); 
    return; 
  }
  const newBalance = getCashBalance() + val;
  setCashBalance(newBalance);
  inp.value = "";
  updateStats();
  showToast("✅ Кассага " + fmt(val) + " сўм қўшилди");
}

/* ── STATE ── */
let cashItems = [];
let period    = "week";
let barInst   = null;
let pieInst   = null;
let selectedMarket = "";

/* ── Yangi: Izoh maydoni uchun ── */
function getNote() {
  const noteField = document.getElementById("noteField");
  return noteField ? noteField.value.trim() : "";
}

function clearNote() {
  const noteField = document.getElementById("noteField");
  if (noteField) noteField.value = "";
}

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
const TABS = ["main", "debt", "history", "chart"];

function goTab(name) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + name).classList.add("active");
  document.getElementById("ni-" + name).classList.add("active");
  if (name === "debt")    renderAllDebts();
  if (name === "history") renderHistory();
  if (name === "chart")   { updateCharts(); renderMonthCompare(); renderPriceHistory(); renderTopExpenses(); }
}

function currentTabIndex() {
  const active = document.querySelector(".tab.active");
  if (!active) return 0;
  const name = active.id.replace("tab-", "");
  return TABS.indexOf(name);
}

function initSwipe() {
  const el = document.querySelector(".main-scroll");
  let startX = 0, startY = 0, moved = false;

  el.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    moved  = false;
  }, { passive: true });

  el.addEventListener("touchmove", e => {
    moved = true;
  }, { passive: true });

  el.addEventListener("touchend", e => {
    if (!moved) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;

    // Горизонтал свайп бўлиши учун: dx кўпроқ, минимум 60px
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7) return;

    const idx = currentTabIndex();
    if (dx < 0 && idx < TABS.length - 1) goTab(TABS[idx + 1]); // чапга → кейинги
    if (dx > 0 && idx > 0)               goTab(TABS[idx - 1]); // ўнгга → олдинги
  }, { passive: true });
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
    <div class="item-row" id="item-row-${i}">
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
  // Охирги қўшилган элементга анимация
  const lastEl = document.getElementById(`item-row-${cnt - 1}`);
  animateItemAdd(lastEl);
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
  
  const allDebts = JSON.parse(localStorage.getItem("bz_debts") || "[]");
  allDebts.push(newDebt);
  localStorage.setItem("bz_debts", JSON.stringify(allDebts));
  
  inp.value = "";
  document.getElementById("debtWho").value = "";
  document.getElementById("debtDate").value = today();
  inp.focus();
  
  renderAllDebts();
  
  showToast("✅ Қарз сақланди: " + p.name + " - " + fmt(p.totalPrice) + " сўм");
  sendDebtToGoogleSheets(newDebt);
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
  const debt = allDebtsArray[idx];
  allDebtsArray.splice(idx, 1);
  saveAllDebtsToStorage();
  renderAllDebts();
  showToast("✅ Қарз ўчирилди");
  deleteDebtFromGoogleSheets(debt);
}

function editAllDebt(idx) {
  const it = allDebtsArray[idx];
  document.getElementById("debtInp").value = it.kg
    ? `${it.name} ${it.kg}кг (${it.unitPrice}) ${it.totalPrice}` : `${it.name} ${it.totalPrice}`;
  document.getElementById("debtDate").value = it.date || today();
  document.getElementById("debtWho").value  = it.who  || "";
  deleteAllDebt(idx);
  document.getElementById("debtInp").focus();
  showToast("✏️ Қарзни таҳрирлаб, 'Қўшиш' тугмасини босинг");
}

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
  const deletedDebts = selected.map(idx => allDebtsArray[idx]);
  selected.forEach(idx => {
    allDebtsArray.splice(idx, 1);
  });
  saveAllDebtsToStorage();
  renderAllDebts();
  showToast(`✅ ${selected.length} та қарз ўчирилди`);
  deletedDebts.forEach(debt => deleteDebtFromGoogleSheets(debt));
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
  const deletedDebts = [...allDebtsArray];
  allDebtsArray = [];
  saveAllDebtsToStorage();
  renderAllDebts();
  showToast("✅ Барча қарзлар тозаланди");
  deleteDebtFromGoogleSheets(null, true); // bulk delete
}

/* ── STATS ── */
function updateStats() {
  const cashBalance = getCashBalance();
  const cashTotal = cashItems.reduce((s,it) => s + it.totalPrice, 0);
  const spent = cashTotal;
  const balance = cashBalance - spent;

  document.getElementById("income").value = fmt(cashBalance) + " сўм";
  
  document.getElementById("sc-kassa").textContent = fmt(cashBalance) + " сўм";
  document.getElementById("sc-cash").textContent = fmt(cashTotal) + " сўм";
  document.getElementById("sc-debt").textContent = "0 сўм";
  document.getElementById("sc-remain").textContent = fmt(balance) + " сўм";
  
  const chip = document.getElementById("sc-remain-chip");
  chip.className = "stat-chip " + (balance < 0 ? "red" : balance < cashBalance * 0.2 ? "orange" : "green");
  
  const pct = cashBalance > 0 ? Math.min(cashTotal / cashBalance * 100, 100) : 0;
  const progFill = document.getElementById("progFill");
  if (progFill) {
    progFill.style.width = pct + "%";
    progFill.style.background = pct > 80 ? "var(--red)" : pct > 50 ? "var(--orange)" : "var(--blue)";
  }
  
  const statsRow = document.getElementById("statsRow");
  const progTrack = document.getElementById("progTrack");
  if (statsRow) statsRow.style.display = "grid";
  if (progTrack) progTrack.style.display = "block";

  // Dashboard виджетини янгилаш
  updateDashboard();

  // 100% га етганда конфетти 🎉
  if (pct >= 100 && cashBalance > 0) launchConfetti();
}

/* ── FINISH ── */
function finish() {
  if (!cashItems.length) { 
    showToast("⚠️ Нақд товарлар йўқ!"); 
    return; 
  }
  if (!selectedMarket) { 
    showToast("⚠️ Бозорни танланг!"); 
    return; 
  }
  
  const market = getMarket();
  const cashBalance = getCashBalance();
  const cashTotal = cashItems.reduce((s,it) => s + it.totalPrice, 0);
  const balance = cashBalance - cashTotal;
  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU", {day: "2-digit", month: "2-digit", year: "numeric"});
  const timeStr = now.toLocaleTimeString("ru-RU", {hour: "2-digit", minute: "2-digit"});
  const note = getNote();

  let r = `Расход · ${dateStr}\n`;
  r += `📍 Бозор: ${market}\n`;
  r += `💵 Касса: ${fmt(cashBalance)} сўм\n`;
  r += `\n`;
  r += `💰 Нақд товарлар:\n`;
  
  cashItems.forEach(it => { 
    r += `• ${it.name}`; 
    if (it.kg) r += ` ${it.kg}кг`; 
    if (it.unitPrice) r += ` (${fmt(it.unitPrice)})`; 
    r += ` — ${fmt(it.totalPrice)} сўм\n`; 
  });
  
  r += `\n`;
  if (note) {
    r += `📝 Изоҳ: ${note}\n`;
    r += `\n`;
  }
  r += `💰 Общий: ${fmt(cashTotal)} сўм\n`;
  r += `✅ Қолди: ${fmt(balance)} сўм`;

  saveHistory({ 
    market, cashBalance, cashTotal, spent: cashTotal, balance, 
    cashItems: [...cashItems], date: today(), time: timeStr, note 
  });

  // Чек учун маълумот сақлаш
  lastReceiptData = { market, cashBalance, cashTotal, balance, cashItems: [...cashItems], date: today(), time: timeStr, note };
  const receiptBtn = document.getElementById("receiptBtn");
  if (receiptBtn) receiptBtn.style.display = "";

  /* Google Sheets га юбориш */
  const gsData = {
    type: "purchase",
    date: today(),
    time: timeStr,
    market,
    cashBalance,
    cashTotal,
    balance,
    note,
    items: cashItems.map(it => ({
      name: it.name,
      kg: it.kg || "",
      unitPrice: it.unitPrice || "",
      totalPrice: it.totalPrice
    }))
  };
  sendToGoogleSheets(gsData);

  setCashBalance(balance);

  const pre = document.getElementById("report");
  if (pre) {
    pre.textContent = r;
    pre.style.display = "block";
    pre.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  
  sendTG(r);

  cashItems = [];
  renderCash();
  updateStats();
  clearNote();
  
  showToast("✅ Тугатилди!");
  launchConfetti();
  updateDashboard();
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
  const h   = JSON.parse(localStorage.getItem("bz_history")||"[]");
  const mon = document.getElementById("histMonth").value;
  const selMkt = window._histMktFilter || "";

  // Бозор фильтр тугмалари
  const allMkts = [...new Set(h.map(e=>e.market).filter(Boolean))];
  const mf = document.getElementById("histMarketFilter");
  if (mf) {
    mf.innerHTML = allMkts.map(m=>`<button onclick="window._histMktFilter='${m}'===window._histMktFilter?'':'${m}';renderHistory()" style="padding:5px 12px;border-radius:99px;border:none;font-size:.75rem;font-weight:600;cursor:pointer;font-family:inherit;background:${selMkt===m?'var(--blue)':'var(--bg)'};color:${selMkt===m?'#fff':'var(--text2)'}">${m}</button>`).join("");
  }

  let filt = mon ? h.filter(e=>e.date&&e.date.startsWith(mon)) : h;
  if (selMkt) filt = filt.filter(e=>e.market===selMkt);

  const cont = document.getElementById("histList");

  // Статистика
  const statsCard = document.getElementById("histStatsCard");
  const statsRow  = document.getElementById("histStatsRow");
  if (filt.length && mon && statsCard && statsRow) {
    const total   = filt.reduce((s,e)=>s+(e.spent||e.cashTotal||0),0);
    const avg     = Math.round(total / filt.length);
    const mktMap  = {};
    filt.forEach(e=>{ mktMap[e.market]=(mktMap[e.market]||0)+(e.spent||e.cashTotal||0); });
    const topMkt  = Object.entries(mktMap).sort((a,b)=>b[1]-a[1])[0];
    statsCard.style.display = "";
    statsRow.innerHTML = `
      <div class="stat-chip blue"><span class="sc-label">Жами харажат</span><span class="sc-val">${fmt(total)} сўм</span></div>
      <div class="stat-chip orange"><span class="sc-label">Ўртача закупка</span><span class="sc-val">${fmt(avg)} сўм</span></div>
      <div class="stat-chip green"><span class="sc-label">Закупка сони</span><span class="sc-val">${filt.length} та</span></div>
      <div class="stat-chip purple"><span class="sc-label">Энг кўп бозор</span><span class="sc-val">${topMkt?topMkt[0]:"—"}</span></div>
    `;
  } else if (statsCard) {
    statsCard.style.display = "none";
  }

  if (!filt.length) { cont.innerHTML=`<div class="empty-state"><span class="empty-icon">📅</span>Тарих йўқ</div>`; return; }

  const grps = {};
  filt.forEach(e=>{ const d=e.date||"?"; if(!grps[d]) grps[d]=[]; grps[d].push(e); });

  cont.innerHTML = Object.keys(grps).sort((a,b)=>b.localeCompare(a)).map(day=>{
    const es = grps[day];
    const dt = es.reduce((s,e)=>s+(e.spent||e.cashTotal||0),0);
    return `<div class="hist-day">
      <div class="hist-day-hdr"><span>📅 ${fmtD(day)}</span><span>${fmt(dt)} сўм</span></div>
      ${es.map((e,ei)=>{
        const entryId = `hentry-${day}-${ei}`;
        const items = e.cashItems||[];
        const itemsHtml = items.map(i=>`
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border);font-size:.78rem;">
            <span style="color:var(--text)">${esc(i.name)}${i.kg?` ${i.kg}кг`:""}${i.unitPrice?` (${fmt(i.unitPrice)})`:""}</span>
            <span style="color:var(--orange);font-weight:600">${fmt(i.totalPrice)} сўм</span>
          </div>`).join("");
        const tgReport = buildEntryReport(e);
        return `<div class="hist-entry">
          <div class="hist-top">
            <span class="hist-mkt">📍 ${esc(e.market)}</span>
            <span class="hist-rem ${(e.balance??e.remain??0)<0?'neg':''}">Қолди: ${fmt(e.balance??e.remain??0)} сўм</span>
          </div>
          <div class="hist-meta">💵 ${fmt(e.cashBalance??e.kassa??0)} · 💰 ${fmt(e.spent??e.cashTotal??0)} сўм · 🕐 ${e.time||""}</div>
          ${e.note?`<div class="hist-note">📝 ${esc(e.note)}</div>`:""}
          <div style="display:flex;gap:6px;margin-top:8px;align-items:center">
            ${items.length?`<button onclick="toggleHistItems('${entryId}')" style="padding:4px 11px;border-radius:99px;border:none;font-size:.72rem;font-weight:600;cursor:pointer;background:var(--blue-bg);color:var(--blue);font-family:inherit" id="btn-${entryId}">📋 ${items.length} та товар</button>`:""}
            <button onclick="resendEntryTG(${JSON.stringify(tgReport).replace(/"/g,'&quot;')})" style="padding:4px 11px;border-radius:99px;border:none;font-size:.72rem;font-weight:600;cursor:pointer;background:var(--bg);color:var(--text2);font-family:inherit">✈️ TG</button>
          </div>
          ${items.length?`<div id="${entryId}" style="display:none;margin-top:6px;border-radius:var(--radius-xs);background:var(--bg);padding:6px 10px">${itemsHtml}</div>`:""}
        </div>`;
      }).join("")}
    </div>`;
  }).join("");
}

function toggleHistItems(id) {
  const el = document.getElementById(id);
  const btn = document.getElementById("btn-"+id);
  if (!el) return;
  const open = el.style.display !== "none";
  el.style.display = open ? "none" : "block";
  if (btn) btn.style.background = open ? "var(--blue-bg)" : "var(--green-bg)";
  if (btn) btn.style.color = open ? "var(--blue)" : "var(--green)";
}

function buildEntryReport(e) {
  const items = e.cashItems||[];
  let r = `Расход · ${e.date||""}\n`;
  r += `📍 Бозор: ${e.market||""}\n`;
  r += `💵 Касса: ${fmt(e.cashBalance??e.kassa??0)} сўм\n\n`;
  if (items.length) {
    r += `💰 Нақд товарлар:\n`;
    items.forEach(i=>{ r+=`• ${i.name}`; if(i.kg) r+=` ${i.kg}кг`; if(i.unitPrice) r+=` (${fmt(i.unitPrice)})`; r+=` — ${fmt(i.totalPrice)} сўм\n`; });
    r += `\n`;
  }
  if (e.note) r += `📝 Изоҳ: ${e.note}\n\n`;
  r += `💰 Общий: ${fmt(e.spent||e.cashTotal||0)} сўм\n`;
  r += `✅ Қолди: ${fmt(e.balance??e.remain??0)} сўм`;
  return r;
}

function resendEntryTG(text) {
  const cfg = getTG();
  if (!cfg.token || !cfg.chatId) { showToast("⚠️ TG уланмаган"); return; }
  fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ chat_id: cfg.chatId, text })
  }).then(r=>r.json()).then(d=>{ if(d.ok) showToast("✈️ TG га юборилди!"); else showToast("⚠️ "+d.description); })
    .catch(()=>showToast("⚠️ Телеграм хатолик"));
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

/* ══════════════════════════════════════════
   📌 ШАБЛОНЛАР — тез-тез харид товарлар
══════════════════════════════════════════ */
function getTemplates() {
  return JSON.parse(localStorage.getItem("bz_templates") || "[]");
}
function saveTemplates(arr) {
  localStorage.setItem("bz_templates", JSON.stringify(arr));
}
function addTemplate() {
  const val = document.getElementById("cashInp").value.trim();
  if (!val) { showToast("⚠️ Аввал товар номини киритинг"); return; }
  const p = parse(val);
  if (!p) { showToast("⚠️ Формат тўғри эмас"); return; }
  const templates = getTemplates();
  if (templates.find(t => t.name === p.name)) { showToast("⚠️ Бу шаблон аллақачон бор"); return; }
  templates.push({ name: p.name, kg: p.kg, unitPrice: p.unitPrice, totalPrice: p.totalPrice, raw: val });
  saveTemplates(templates);
  renderTemplates();
  showToast("📌 Шаблон сақланди: " + p.name);
}
function useTemplate(raw) {
  document.getElementById("cashInp").value = raw;
  document.getElementById("cashInp").focus();
  showToast("✏️ Нархни янгилаб + босинг");
}
function deleteTemplate(i) {
  const templates = getTemplates();
  templates.splice(i, 1);
  saveTemplates(templates);
  renderTemplates();
}
function renderTemplates() {
  const templates = getTemplates();
  const cont = document.getElementById("templateList");
  if (!cont) return;
  if (!templates.length) {
    cont.innerHTML = `<div style="color:var(--text2);font-size:.8rem;padding:8px 0">Ҳали шаблон йўқ. Товар киритиб 📌 босинг</div>`;
    return;
  }
  cont.innerHTML = templates.map((t, i) => `
    <div class="template-item" onclick="useTemplate('${t.raw.replace(/'/g,"\\'")}')">
      <span class="tmpl-name">${esc(t.name)}${t.kg ? ` ${t.kg}кг` : ""}</span>
      <span class="tmpl-price">${fmt(t.totalPrice)} сўм</span>
      <button class="row-btn" onclick="event.stopPropagation();deleteTemplate(${i})" style="margin-left:6px">✕</button>
    </div>`).join("");
}

/* ══════════════════════════════════════════
   📈 ТОВАР НАРХ ТАРИХИ
══════════════════════════════════════════ */
let priceChartInst = null;

function buildPriceHistory() {
  const h = JSON.parse(localStorage.getItem("bz_history") || "[]");
  const map = {}; // { "Мош": [{date, price}] }
  h.forEach(entry => {
    if (!entry.cashItems) return;
    entry.cashItems.forEach(it => {
      const key = it.name.trim();
      if (!map[key]) map[key] = [];
      map[key].push({ date: entry.date, price: it.unitPrice || it.totalPrice });
    });
  });
  return map;
}

function renderPriceHistory() {
  const sel = document.getElementById("priceItemSel");
  const map = buildPriceHistory();
  const keys = Object.keys(map).sort();
  if (!keys.length) { 
    sel.innerHTML = `<option>Тарих йўқ</option>`; 
    return; 
  }
  sel.innerHTML = keys.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join("");
  drawPriceChart(keys[0], map);
}

function onPriceItemChange() {
  const sel = document.getElementById("priceItemSel");
  const map = buildPriceHistory();
  drawPriceChart(sel.value, map);
}

function drawPriceChart(name, map) {
  const data = (map[name] || []).sort((a, b) => a.date.localeCompare(b.date));
  const isDark = document.body.classList.contains("dark");
  const tc = isDark ? "#94a3b8" : "#6b7280";
  const gc = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const infoEl = document.getElementById("priceChangeInfo");
  if (data.length >= 2) {
    const first = data[0].price, last = data[data.length-1].price;
    const diff = last - first;
    const pct = first > 0 ? ((diff / first) * 100).toFixed(1) : 0;
    const arrow = diff > 0 ? "📈" : diff < 0 ? "📉" : "➡️";
    const color = diff > 0 ? "var(--red)" : diff < 0 ? "var(--green)" : "var(--text2)";
    infoEl.innerHTML = `<span style="color:${color}">${arrow} ${diff > 0 ? "+" : ""}${fmt(diff)} сўм (${pct}%)</span> — ${fmtD(data[0].date)} дан ${fmtD(data[data.length-1].date)} гача`;
  } else {
    infoEl.innerHTML = data.length === 1 ? `Фақат 1 та маълумот` : `Маълумот йўқ`;
  }

  if (priceChartInst) priceChartInst.destroy();
  priceChartInst = new Chart(document.getElementById("priceLineChart").getContext("2d"), {
    type: "line",
    data: {
      labels: data.map(d => fmtD(d.date)),
      datasets: [{ label: name, data: data.map(d => d.price),
        borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.1)",
        tension: 0.3, pointRadius: 5, fill: true }]
    },
    options: { responsive: true,
      plugins: { legend: { labels: { color: tc } }, tooltip: { callbacks: { label: c => fmt(c.raw) + " сўм" } } },
      scales: { x: { ticks: { color: tc }, grid: { color: gc } }, y: { ticks: { color: tc, callback: v => fmt(v) }, grid: { color: gc } } }
    }
  });
}

/* ══════════════════════════════════════════
   🏆 ЭНГ КЎП ХАРАЖАТ (товар + бозор)
══════════════════════════════════════════ */
function renderTopExpenses() {
  const h = JSON.parse(localStorage.getItem("bz_history") || "[]");
  const itemMap = {}, mktMap = {};
  h.forEach(entry => {
    mktMap[entry.market] = (mktMap[entry.market] || 0) + (entry.spent || entry.cashTotal || 0);
    if (entry.cashItems) {
      entry.cashItems.forEach(it => {
        itemMap[it.name] = (itemMap[it.name] || 0) + it.totalPrice;
      });
    }
  });

  const topItems = Object.entries(itemMap).sort((a,b) => b[1]-a[1]).slice(0, 8);
  const topMkts  = Object.entries(mktMap).sort((a,b) => b[1]-a[1]);
  const maxItem  = topItems[0]?.[1] || 1;
  const maxMkt   = topMkts[0]?.[1] || 1;

  const itemEl = document.getElementById("topItemsList");
  const mktEl  = document.getElementById("topMktsList");

  if (!topItems.length) {
    itemEl.innerHTML = `<div style="color:var(--text2);font-size:.85rem;padding:12px 0">Тарих йўқ</div>`;
  } else {
    itemEl.innerHTML = topItems.map(([name, sum], i) => `
      <div class="top-row">
        <span class="top-rank">${["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"][i]}</span>
        <div style="flex:1">
          <div class="top-name">${esc(name)}</div>
          <div class="top-bar-wrap"><div class="top-bar" style="width:${(sum/maxItem*100).toFixed(1)}%"></div></div>
        </div>
        <span class="top-sum">${fmt(sum)} сўм</span>
      </div>`).join("");
  }

  if (!topMkts.length) {
    mktEl.innerHTML = `<div style="color:var(--text2);font-size:.85rem;padding:12px 0">Тарих йўқ</div>`;
  } else {
    mktEl.innerHTML = topMkts.map(([name, sum], i) => `
      <div class="top-row">
        <span class="top-rank">${["🥇","🥈","🥉","4️⃣","5️⃣"][i]||"·"}</span>
        <div style="flex:1">
          <div class="top-name">${esc(name)}</div>
          <div class="top-bar-wrap"><div class="top-bar mkt-bar" style="width:${(sum/maxMkt*100).toFixed(1)}%"></div></div>
        </div>
        <span class="top-sum">${fmt(sum)} сўм</span>
      </div>`).join("");
  }
}

/* ══════════════════════════════════════════
   📥 CSV ЭКСПОРТ
══════════════════════════════════════════ */
function exportCSV() {
  const h = JSON.parse(localStorage.getItem("bz_history") || "[]");
  const debts = JSON.parse(localStorage.getItem("bz_debts") || "[]");

  let csv = "\uFEFF"; // BOM for Excel UTF-8
  csv += "ЗАКУПКА ТАРИХИ\n";
  csv += "Сана,Вақт,Бозор,Касса (сўм),Харажат (сўм),Қолдиқ (сўм),Товарлар,Изоҳ\n";
  h.forEach(e => {
    const items = (e.cashItems || []).map(i => i.name + (i.kg ? " " + i.kg + "кг" : "") + " - " + i.totalPrice + " сўм").join(" | ");
    csv += [e.date, e.time || "", e.market, e.cashBalance || 0, e.cashTotal || e.spent || 0, e.balance || 0, `"${items}"`, `"${(e.note||"").replace(/"/g,'""')}"`].join(",") + "\n";
  });

  csv += "\nҚАРЗЛАР\n";
  csv += "Сана,Ким,Бозор,Товар,кг,Нарх,Жами (сўм)\n";
  debts.forEach(d => {
    csv += [d.date, d.who || "", d.market || "", d.name, d.kg || "", d.unitPrice || "", d.totalPrice].join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const date = new Date().toISOString().slice(0,10);
  a.href = url; a.download = `bozorlik_${date}.csv`;
  a.click(); URL.revokeObjectURL(url);
  showToast("📥 CSV юклаб олинди!");
}



/* ══════════════════════════════════════════
   💾 JSON EXPORT / IMPORT — Backup & Restore
══════════════════════════════════════════ */

/* Барча маълумотларни JSON га экспорт */
function exportJSON() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    history:   JSON.parse(localStorage.getItem("bz_history")   || "[]"),
    debts:     JSON.parse(localStorage.getItem("bz_debts")     || "[]"),
    templates: JSON.parse(localStorage.getItem("bz_templates") || "[]"),
    cashBalance: getCashBalance(),
    tgToken:   localStorage.getItem("bz_tg_token") || "",
    tgChat:    localStorage.getItem("bz_tg_chat")  || "",
    gsUrl:     localStorage.getItem("bz_gs_url")   || "",
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url; a.download = `bozorlik_backup_${date}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast("💾 Backup юклаб олинди!");
}

/* JSON файлдан маълумотларни тиклаш */
function importJSON() {
  const input = document.createElement("input");
  input.type = "file"; input.accept = ".json";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.version) throw new Error("Нотўғри файл формати");

        const existing = {
          history:   JSON.parse(localStorage.getItem("bz_history")   || "[]"),
          debts:     JSON.parse(localStorage.getItem("bz_debts")     || "[]"),
          templates: JSON.parse(localStorage.getItem("bz_templates") || "[]"),
        };

        // Тарихни бирлаштириш (дубликатсиз)
        const mergedHistory = [...existing.history];
        (data.history || []).forEach(newEntry => {
          const dup = mergedHistory.find(e => e.date === newEntry.date && e.time === newEntry.time && e.market === newEntry.market);
          if (!dup) mergedHistory.push(newEntry);
        });

        // Қарзларни бирлаштириш (id бўйича)
        const mergedDebts = [...existing.debts];
        (data.debts || []).forEach(newDebt => {
          if (!mergedDebts.find(d => d.id === newDebt.id)) mergedDebts.push(newDebt);
        });

        // Шаблонларни бирлаштириш
        const mergedTmpl = [...existing.templates];
        (data.templates || []).forEach(t => {
          if (!mergedTmpl.find(x => x.name === t.name)) mergedTmpl.push(t);
        });

        localStorage.setItem("bz_history",   JSON.stringify(mergedHistory));
        localStorage.setItem("bz_debts",     JSON.stringify(mergedDebts));
        localStorage.setItem("bz_templates", JSON.stringify(mergedTmpl));
        if (data.cashBalance) setCashBalance(data.cashBalance);
        if (data.tgToken) localStorage.setItem("bz_tg_token", data.tgToken);
        if (data.tgChat)  localStorage.setItem("bz_tg_chat",  data.tgChat);
        if (data.gsUrl)   localStorage.setItem("bz_gs_url",   data.gsUrl);

        renderTemplates(); renderAllDebts(); loadAllDebts(); updateStats();
        updateTgPill(); updateGsPill(); renderHistory();
        showToast(`✅ Тикланди! Тарих: +${mergedHistory.length - existing.history.length} та, Қарз: +${mergedDebts.length - existing.debts.length} та`);
      } catch(err) {
        showToast("❌ Хатолик: " + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

/* ══════════════════════════════════════════
   ☁️ АВТОМАТИК KUNLIK BACKUP → Google Sheets
══════════════════════════════════════════ */

async function autoBackupToSheets() {
  const cfg = getGS();
  if (!cfg.url) return;

  const lastBackup = localStorage.getItem("bz_last_backup") || "";
  const todayStr   = today();
  if (lastBackup === todayStr) return; // бугун аллақачон backup қилинган

  const history   = JSON.parse(localStorage.getItem("bz_history")   || "[]");
  const debts     = JSON.parse(localStorage.getItem("bz_debts")     || "[]");

  if (!history.length && !debts.length) return;

  try {
    const payload = {
      type:        "full_backup",
      backupDate:  todayStr,
      cashBalance: getCashBalance(),
      historyCount: history.length,
      debtCount:   debts.length,
      debtTotal:   debts.reduce((s, d) => s + d.totalPrice, 0),
      // Охирги 30 та тарих юборамиз (katta payload bo'lmasin)
      recentHistory: history.slice(0, 30),
      debts: debts
    };

    await fetch(cfg.url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    });

    localStorage.setItem("bz_last_backup", todayStr);
    showToast("☁️ Автоматик backup юборилди!");
  } catch(e) {
    // тин олиб backup қилмаслик учун уриниш кейинга қолдирилади
  }
}

/* Backup статусини кўрсатиш */
function getBackupStatus() {
  const last = localStorage.getItem("bz_last_backup") || null;
  const el = document.getElementById("backupStatusText");
  if (!el) return;
  if (!last) {
    el.textContent = "Ҳали backup қилинмаган";
    el.style.color = "var(--red)";
  } else if (last === today()) {
    el.textContent = "✅ Бугун backup қилинди (" + fmtD(last) + ")";
    el.style.color = "var(--green)";
  } else {
    const diff = Math.round((new Date(today()) - new Date(last)) / 86400000);
    el.textContent = `⚠️ ${diff} кун олdin (${fmtD(last)})`;
    el.style.color = "var(--orange)";
  }
}

async function manualBackup() {
  const cfg = getGS();
  if (!cfg.url) { showToast("⚠️ Аввал Google Sheets улаш керак (📊 GS тугмаси)"); return; }
  // Кунлик лимитни олиб ташлаб мажбурий backup
  localStorage.removeItem("bz_last_backup");
  await autoBackupToSheets();
  getBackupStatus();
}


/* ══════════════════════════════════════════
   🔔 ПУШ НОТИФИКАЦИЯ
══════════════════════════════════════════ */
function updateNotifUI() {
  const enabled = localStorage.getItem("bz_notif_enabled") === "1";
  const time    = localStorage.getItem("bz_notif_time") || "08:00";
  const badge   = document.getElementById("notif-badge");
  const enBtn   = document.getElementById("notifEnableBtn");
  const disBtn  = document.getElementById("notifDisableBtn");
  const status  = document.getElementById("notifStatus");
  const timeEl  = document.getElementById("notifTime");
  if (timeEl) timeEl.value = time;
  if (badge)  { badge.textContent = enabled ? "ON" : "OFF"; badge.style.background = enabled ? "var(--green)" : "var(--text2)"; }
  if (enBtn)  enBtn.style.display  = enabled ? "none" : "";
  if (disBtn) disBtn.style.display = enabled ? "" : "none";
  if (status) status.textContent   = enabled ? `✅ Ҳар куни соат ${time} да эслатма келади` : "Эслатма ўчирилган";
}

async function enableNotifications() {
  if (!("Notification" in window)) { showToast("⚠️ Браузер нотификацияни қўллаб-қувватламайди"); return; }
  if (!("serviceWorker" in navigator)) { showToast("⚠️ Service Worker керак"); return; }

  const perm = await Notification.requestPermission();
  if (perm !== "granted") { showToast("⚠️ Рухсат берилмади. Браузер созламаларини текширинг"); return; }

  const time = document.getElementById("notifTime").value || "08:00";
  localStorage.setItem("bz_notif_enabled", "1");
  localStorage.setItem("bz_notif_time", time);
  updateNotifUI();
  scheduleNotification(time);
  showToast("🔔 Эслатма ёқилди! Ҳар куни " + time + " да");
}

function disableNotifications() {
  localStorage.setItem("bz_notif_enabled", "0");
  updateNotifUI();
  showToast("🔕 Эслатма ўчирилди");
}

function scheduleNotification(timeStr) {
  // Бугун учун вақт ҳисоблаш
  const [h, m] = timeStr.split(":").map(Number);
  const now    = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1); // Эртага

  const msUntil = target - now;
  const templates = getTemplates();
  const msg = templates.length
    ? `🛒 Бозорга бориш вақти! Шаблонда ${templates.length} та товар бор.`
    : "🛒 Бугун бозорга боришни унутманг!";

  setTimeout(() => {
    if (Notification.permission === "granted" && localStorage.getItem("bz_notif_enabled") === "1") {
      new Notification("BOZORLIK 🛒", { body: msg, icon: "icon-192.png" });
      // Кейинги кун учун қайта режалаштириш
      scheduleNotification(localStorage.getItem("bz_notif_time") || "08:00");
    }
  }, msUntil);
}

function initNotifications() {
  updateNotifUI();
  if (localStorage.getItem("bz_notif_enabled") === "1" && Notification.permission === "granted") {
    scheduleNotification(localStorage.getItem("bz_notif_time") || "08:00");
  }
}

/* ══════════════════════════════════════════
   📊 ОЙМА-ОЙ СОЛИШТИРИШ
══════════════════════════════════════════ */
let monthCompareChartInst = null;

function renderMonthCompare() {
  const h = JSON.parse(localStorage.getItem("bz_history") || "[]");
  const monthMap = {};

  h.forEach(entry => {
    const ym = (entry.date || "").slice(0, 7); // "2025-05"
    if (!ym) return;
    monthMap[ym] = (monthMap[ym] || 0) + (entry.cashTotal || entry.spent || 0);
  });

  const months = Object.keys(monthMap).sort();
  const infoEl = document.getElementById("monthCompareInfo");

  if (months.length < 2) {
    if (infoEl) infoEl.innerHTML = `<span style="color:var(--text2)">Солиштириш учун камида 2 ой тарих керак</span>`;
    return;
  }

  // Охирги 2 ой солиштириш
  const lastM  = months[months.length - 1];
  const prevM  = months[months.length - 2];
  const lastV  = monthMap[lastM];
  const prevV  = monthMap[prevM];
  const diff   = lastV - prevV;
  const pct    = prevV > 0 ? ((diff / prevV) * 100).toFixed(1) : 0;
  const arrow  = diff > 0 ? "📈" : diff < 0 ? "📉" : "➡️";
  const color  = diff > 0 ? "var(--red)" : diff < 0 ? "var(--green)" : "var(--text2)";

  if (infoEl) infoEl.innerHTML = `
    <span style="color:${color};font-size:1rem;font-weight:700">${arrow} ${diff > 0 ? "+" : ""}${fmt(diff)} сўм (${pct}%)</span><br/>
    <span style="color:var(--text2);font-size:.8rem">${fmtMonth(prevM)}: ${fmt(prevV)} сўм → ${fmtMonth(lastM)}: ${fmt(lastV)} сўм</span>`;

  const isDark = document.body.classList.contains("dark");
  const tc = isDark ? "#94a3b8" : "#6b7280";
  const gc = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  if (monthCompareChartInst) monthCompareChartInst.destroy();
  const ctx = document.getElementById("monthCompareChart");
  if (!ctx) return;

  monthCompareChartInst = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels: months.map(fmtMonth),
      datasets: [{
        label: "Жами харажат",
        data: months.map(m => monthMap[m]),
        backgroundColor: months.map((m, i) => i === months.length - 1 ? "rgba(37,99,235,0.8)" : "rgba(37,99,235,0.35)"),
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmt(c.raw) + " сўм" } } },
      scales: {
        x: { ticks: { color: tc }, grid: { color: gc } },
        y: { ticks: { color: tc, callback: v => fmt(v) }, grid: { color: gc } }
      }
    }
  });
}

function fmtMonth(ym) {
  const months = ["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"];
  const [y, m] = ym.split("-");
  return (months[parseInt(m) - 1] || m) + " " + y;
}

/* ══════════════════════════════════════════
   🧾 ЧЕК / КВИТАНЦИЯ
══════════════════════════════════════════ */
let lastReceiptData = null;

function showReceipt() {
  if (!lastReceiptData) { showToast("⚠️ Аввал тугатиш керак"); return; }
  const d = lastReceiptData;
  const lines = (d.cashItems || []).map((it, i) =>
    `<tr>
      <td>${i+1}. ${esc(it.name)}${it.kg ? " " + it.kg + "кг" : ""}</td>
      <td style="text-align:right;white-space:nowrap">${it.unitPrice ? fmt(it.unitPrice) + " × " + it.kg + "кг = " : ""}${fmt(it.totalPrice)} сўм</td>
    </tr>`).join("");

  document.getElementById("receiptContent").innerHTML = `
    <div class="receipt-header">
      <div class="receipt-logo">🛒</div>
      <div class="receipt-title">BOZORLIK</div>
      <div class="receipt-sub">${esc(d.market)} · ${d.date} ${d.time || ""}</div>
    </div>
    <div class="receipt-divider">────────────────────</div>
    <table class="receipt-table">${lines}</table>
    <div class="receipt-divider">────────────────────</div>
    <div class="receipt-row"><span>Касса:</span><span>${fmt(d.cashBalance)} сўм</span></div>
    <div class="receipt-row total-row"><span>Жами харажат:</span><span>${fmt(d.cashTotal)} сўм</span></div>
    <div class="receipt-row remain-row"><span>Қолдиқ:</span><span>${fmt(d.balance)} сўм</span></div>
    ${d.note ? `<div class="receipt-note">📝 ${esc(d.note)}</div>` : ""}
    <div class="receipt-footer">Rahmat! 🙏</div>`;

  document.getElementById("receiptModal").classList.add("open");
}

function closeReceiptModal(e) {
  if (!e || e.target === document.getElementById("receiptModal"))
    document.getElementById("receiptModal").classList.remove("open");
}

async function shareReceipt() {
  if (!lastReceiptData) return;
  const d = lastReceiptData;
  const lines = (d.cashItems || []).map((it, i) =>
    `${i+1}. ${it.name}${it.kg ? " " + it.kg + "кг" : ""}${it.unitPrice ? " (" + fmt(it.unitPrice) + " × " + it.kg + ")" : ""} — ${fmt(it.totalPrice)} сўм`).join("\n");

  const text = `🧾 ЧЕК — BOZORLIK\n📍 ${d.market} · ${d.date} ${d.time||""}\n${"─".repeat(24)}\n${lines}\n${"─".repeat(24)}\n💵 Касса: ${fmt(d.cashBalance)} сўм\n🛒 Жами: ${fmt(d.cashTotal)} сўм\n✅ Қолдиқ: ${fmt(d.balance)} сўм${d.note ? "\n📝 " + d.note : ""}`;

  const tgToken = localStorage.getItem("bz_tg_token");
  const tgChat  = localStorage.getItem("bz_tg_chat");
  if (!tgToken || !tgChat) { showToast("⚠️ Телеграм улаш керак"); return; }

  try {
    await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: tgChat, text, parse_mode: "HTML" })
    });
    showToast("✈️ Чек Телеграмга юборилди!");
    closeReceiptModal();
  } catch(e) {
    showToast("❌ Хатолик: " + e.message);
  }
}


/* ══════════════════════════════════════════
   🏠 БОШ САҲИФА ВИДЖЕТИ (DASHBOARD)
══════════════════════════════════════════ */
function updateDashboard() {
  const kassa = getCashBalance();
  const h     = JSON.parse(localStorage.getItem("bz_history") || "[]");
  // Бугунги харажат
  const todayStr  = today();
  const todaySpent = h.filter(e => e.date === todayStr)
                      .reduce((s, e) => s + (e.cashTotal || e.spent || 0), 0);

  // Охирги бозор
  const last = h.length ? h[h.length - 1] : null;
  const lastMkt = last ? (last.market || "—") + " " + fmtD(last.date) : "—";

  const kwEl = document.getElementById("dw-kassa");
  const twEl = document.getElementById("dw-today");
  const lwEl = document.getElementById("dw-last");

  if (kwEl) kwEl.textContent = fmt(kassa) + " сўм";
  if (twEl) twEl.textContent = todaySpent ? fmt(todaySpent) + " сўм" : "0 сўм";
  if (lwEl) lwEl.textContent = lastMkt;
}

/* ══════════════════════════════════════════
   🎤 ОВОЗЛИ КИРИТИШ
══════════════════════════════════════════ */
let recognition = null;
let voiceActive = false;

function toggleVoice() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    showToast("⚠️ Браузер овозни қўллаб-қувватламайди. Chrome ишлатинг.");
    return;
  }
  if (voiceActive) {
    stopVoice();
  } else {
    startVoice();
  }
}

function startVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = "uz-UZ";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    voiceActive = true;
    document.getElementById("micBtn").textContent = "⏹";
    document.getElementById("micBtn").style.background = "var(--red)";
    const vs = document.getElementById("voiceStatus");
    if (vs) vs.style.display = "block";
  };

  recognition.onresult = e => {
    let transcript = e.results[0][0].transcript;
    // Ўзбекча сонларни рақамга айлантириш
    transcript = transcript
      .replace(/ўн беш минг/gi, "15000")
      .replace(/ўн минг/gi, "10000")
      .replace(/йигирма минг/gi, "20000")
      .replace(/ўттиз минг/gi, "30000")
      .replace(/қирқ минг/gi, "40000")
      .replace(/эллик минг/gi, "50000")
      .replace(/юз минг/gi, "100000")
      .replace(/икки юз минг/gi, "200000")
      .replace(/беш юз минг/gi, "500000")
      .replace(/бир миллион/gi, "1000000")
      .replace(/ўн килограмм/gi, "10кг")
      .replace(/беш килограмм/gi, "5кг")
      .replace(/йигирма килограмм/gi, "20кг")
      .replace(/ўттиз килограмм/gi, "30кг")
      .replace(/бир килограмм/gi, "1кг");

    const inp = document.getElementById("cashInp");
    if (inp) { inp.value = transcript; inp.focus(); }
    showToast("🎤 " + transcript);
    stopVoice();
  };

  recognition.onerror = () => { stopVoice(); showToast("⚠️ Овоз танилмади, яна уриниб кўринг"); };
  recognition.onend   = () => stopVoice();
  recognition.start();
}

function stopVoice() {
  voiceActive = false;
  if (recognition) { try { recognition.stop(); } catch(e) {} recognition = null; }
  const btn = document.getElementById("micBtn");
  if (btn) { btn.textContent = "🎤"; btn.style.background = ""; }
  const vs = document.getElementById("voiceStatus");
  if (vs) vs.style.display = "none";
}

/* ══════════════════════════════════════════
   🎉 КОНФЕТТИ АНИМАЦИЯ
══════════════════════════════════════════ */
function launchConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;
  canvas.style.display = "block";
  const ctx = canvas.getContext("2d");
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ["#007aff","#34c759","#ff9500","#ff3b30","#af52de","#5ac8fa","#ffcc00"];
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 100,
    r: 4 + Math.random() * 6,
    c: colors[Math.floor(Math.random() * colors.length)],
    vy: 2 + Math.random() * 4,
    vx: (Math.random() - 0.5) * 3,
    rot: Math.random() * 360,
    rSpeed: (Math.random() - 0.5) * 6
  }));

  let frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    pieces.forEach(p => {
      p.y += p.vy; p.x += p.vx; p.rot += p.rSpeed;
      if (p.y < canvas.height + 20) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      ctx.restore();
    });
    if (alive) { frame = requestAnimationFrame(draw); }
    else { canvas.style.display = "none"; cancelAnimationFrame(frame); }
  }
  draw();
  setTimeout(() => { canvas.style.display = "none"; cancelAnimationFrame(frame); }, 4000);
}

/* ══════════════════════════════════════════
   ✨ ТОВАР ҚЎШИШ АНИМАЦИЯСИ
══════════════════════════════════════════ */
function animateItemAdd(itemEl) {
  if (!itemEl) return;
  itemEl.style.opacity = "0";
  itemEl.style.transform = "translateY(-12px) scale(0.95)";
  itemEl.style.transition = "all 0.3s cubic-bezier(.34,1.56,.64,1)";
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      itemEl.style.opacity = "1";
      itemEl.style.transform = "translateY(0) scale(1)";
    });
  });
}

function animateItemRemove(itemEl, cb) {
  if (!itemEl) { cb && cb(); return; }
  itemEl.style.transition = "all 0.22s ease";
  itemEl.style.opacity = "0";
  itemEl.style.transform = "translateX(40px)";
  itemEl.style.maxHeight = itemEl.offsetHeight + "px";
  setTimeout(() => {
    itemEl.style.maxHeight = "0";
    itemEl.style.marginBottom = "0";
    itemEl.style.padding = "0";
  }, 180);
  setTimeout(() => { cb && cb(); }, 350);
}

/* ══════════════════════════════════════════
   📬 ҲАФТАЛИК / ОЙЛИК ҲИСОБОТ → TG
══════════════════════════════════════════ */
function buildReport(days, label) {
  const h = JSON.parse(localStorage.getItem("bz_history") || "[]");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutStr = cutoff.toISOString().slice(0, 10);

  const period = h.filter(e => (e.date || "") >= cutStr);
  if (!period.length) return null;

  const total   = period.reduce((s, e) => s + (e.cashTotal || e.spent || 0), 0);
  const markets = {};
  const items   = {};

  period.forEach(e => {
    markets[e.market] = (markets[e.market] || 0) + (e.cashTotal || e.spent || 0);
    (e.cashItems || []).forEach(it => {
      items[it.name] = (items[it.name] || 0) + it.totalPrice;
    });
  });

  const topMarket = Object.entries(markets).sort((a,b) => b[1]-a[1])[0];
  const topItem   = Object.entries(items).sort((a,b) => b[1]-a[1])[0];
  const topItems  = Object.entries(items).sort((a,b) => b[1]-a[1]).slice(0, 5);

  let txt = `📊 ${label} ҲИСОБОТ — BOZORLIK\n`;
  txt += `📅 ${fmtD(cutStr)} — ${fmtD(today())}\n`;
  txt += `${"─".repeat(26)}\n`;
  txt += `🛒 Бозор сони: ${period.length} та\n`;
  txt += `💰 Жами харажат: ${fmt(total)} сўм\n`;
  txt += `📍 Энг кўп: ${topMarket ? topMarket[0] + " — " + fmt(topMarket[1]) + " сўм" : "—"}\n`;
  txt += `${"─".repeat(26)}\n`;
  txt += `🏆 Топ товарлар:\n`;
  topItems.forEach((it, i) => {
    txt += `  ${i+1}. ${it[0]} — ${fmt(it[1])} сўм\n`;
  });
  txt += `${"─".repeat(26)}\n`;
  txt += `📈 Ўртача кунлик: ${fmt(Math.round(total / days))} сўм`;
  return txt;
}

async function sendWeeklyReport() {
  const txt = buildReport(7, "ҲАФТАЛИК");
  if (!txt) { showToast("⚠️ Ҳафтада маълумот йўқ"); return; }
  await sendTGText(txt);
  const gsData = buildReportData(7);
  if (gsData) { gsData.type = "weekly_report"; sendToGoogleSheets(gsData); }
}

async function sendMonthlyReport() {
  const txt = buildReport(30, "ОЙЛИК");
  if (!txt) { showToast("⚠️ Ойда маълумот йўқ"); return; }
  await sendTGText(txt);
  const gsData = buildReportData(30);
  if (gsData) { gsData.type = "monthly_report"; sendToGoogleSheets(gsData); }
}

function buildReportData(days) {
  const h = JSON.parse(localStorage.getItem("bz_history") || "[]");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutStr = cutoff.toISOString().slice(0, 10);
  const period = h.filter(e => (e.date || "") >= cutStr);
  if (!period.length) return null;
  const total = period.reduce((s, e) => s + (e.cashTotal || e.spent || 0), 0);
  const markets = {}, items = {};
  period.forEach(e => {
    markets[e.market] = (markets[e.market] || 0) + (e.cashTotal || e.spent || 0);
    (e.cashItems || []).forEach(it => { items[it.name] = (items[it.name] || 0) + it.totalPrice; });
  });
  const topMarket = Object.entries(markets).sort((a,b) => b[1]-a[1])[0];
  const topItem   = Object.entries(items).sort((a,b) => b[1]-a[1])[0];
  return {
    generatedAt: today(),
    fromDate: cutStr,
    toDate: today(),
    tripCount: period.length,
    totalSpent: total,
    topMarket: topMarket ? topMarket[0] + " — " + fmt(topMarket[1]) + " сўм" : "—",
    topItem: topItem ? topItem[0] + " — " + fmt(topItem[1]) + " сўм" : "—",
    avgDaily: Math.round(total / days)
  };
}

async function sendTGText(text) {
  const cfg = getTG();
  if (!cfg.token || !cfg.chatId) { showToast("⚠️ Телеграм улаш керак"); return; }
  try {
    await fetch(`https://api.telegram.org/bot${cfg.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: cfg.chatId, text })
    });
    showToast("✈️ Ҳисобот Телеграмга юборилди!");
  } catch(e) {
    showToast("❌ Хатолик: " + e.message);
  }
}


document.addEventListener("DOMContentLoaded", () => {
  initDark();
  updateTgPill();
  updateGsPill();
  document.getElementById("debtDate").value = today();
  document.getElementById("histMonth").value = new Date().toISOString().slice(0,7);
  renderCash();
  renderTemplates();
  loadAllDebts();
  renderAllDebts();

  const cashBalance = getCashBalance();
  document.getElementById("income").value = fmt(cashBalance) + " сўм";
  document.getElementById("income").readOnly = true;

  updateStats();

  const firstMarketBtn = document.querySelector(".market-btn");
  if (firstMarketBtn) {
    firstMarketBtn.classList.add("selected");
    selectedMarket = "Куйлик";
  }

  // Свайп жести
  initSwipe();

  // Нотификация
  initNotifications();

  // Dashboard
  updateDashboard();

  // Автоматик кунлик backup
  setTimeout(() => {
    autoBackupToSheets();
    getBackupStatus();
  }, 2000);
});

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
