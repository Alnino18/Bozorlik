/* ── CONFIG ── (localStorage дан ўқилади) */
function getTG() {
  return {
    token:  localStorage.getItem("bz_tg_token")  || "",
    chatId: localStorage.getItem("bz_tg_chat")   || ""
  };
}

/* ── GOOGLE SHEETS CONFIG ── */









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

/* ── KARTA BALANS ── */
function getCardBalance() {
  return +localStorage.getItem("bz_card_balance") || 0;
}

function setCardBalance(amount) {
  localStorage.setItem("bz_card_balance", amount);
  return amount;
}

function addToCardBalance() {
  const inp = document.getElementById("addCardBalance");
  const val = +inp.value;
  if (!val || val <= 0) { 
    showToast("⚠️ Миқдорни киритинг"); 
    return; 
  }
  const newBalance = getCardBalance() + val;
  setCardBalance(newBalance);
  inp.value = "";
  updateStats();
  showToast("✅ Картага " + fmt(val) + " сўм қўшилди");
}

/* ── STATE ── */
let cashItems = [];
let cardItems = [];
let itemSeq = 0;
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

/* ── SAFE JSON HELPER ── */
function safeGetJSON(key, defaultVal) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : defaultVal;
  } catch(e) {
    console.warn("safeGetJSON parse error for " + key, e);
    return defaultVal;
  }
}

/* ── FORMAT ── */
const fmt    = n => Math.round(n || 0).toLocaleString("ru-RU");
function toLocalDateStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function today() {
  return toLocalDateStr();
}
window.today = today;
window.toLocalDateStr = toLocalDateStr;
const fmtD   = s => { if (!s) return "—"; const [y,m,d]=s.split("-"); return `${d}.${m}.${y}`; };
const esc    = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

/* ── MARKET SELECT ── */
function selectMarket(btn, name) {
  document.querySelectorAll(".market-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  selectedMarket = name;
  localStorage.setItem("bz_active_market", name); // TG Bot uchun
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



/* ══════════════════════════════════════════
   🤖 TELEGRAM BOT — botga yozsa ilova kiritadi
   Bot: @BotFather da yaratilgan bot
   Webhook o'rniga polling ishlatamiz
══════════════════════════════════════════ */
let _bzTgPollTimer = null;
let _bzTgLastUpdate = 0;

function bzStartTgBot() {
  const token = localStorage.getItem("bz_tg_token");
  if (!token || token.length < 10) return;

  // Avval eski timerni tozalaymiz
  if (_bzTgPollTimer) clearInterval(_bzTgPollTimer);

  // Har 5 soniyada yangi xabarlarni tekshiramiz
  _bzTgPollTimer = setInterval(bzTgPoll, 5000);
  console.log("🤖 Telegram bot polling boshlandi");
}

function bzStopTgBot() {
  if (_bzTgPollTimer) {
    clearInterval(_bzTgPollTimer);
    _bzTgPollTimer = null;
    console.log("🤖 Telegram bot polling to'xtatildi");
  }
}

async function bzTgPoll() {
  const token = localStorage.getItem("bz_tg_token");
  if (!token) return;

  try {
    const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${_bzTgLastUpdate + 1}&limit=5&timeout=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok || !data.result.length) return;

    for (const update of data.result) {
      _bzTgLastUpdate = update.update_id;
      const msg = update.message;
      if (!msg || !msg.text) continue;

      const chatId = String(localStorage.getItem("bz_tg_chat") || "");
      if (chatId && String(msg.chat.id) !== chatId) continue; // Faqat o'z chatidan

      bzTgHandleMessage(msg, token);
    }
  } catch(e) {
    // Tarmoq xatosi — jimgina o'tkazib yuboramiz
  }
}

async function bzTgHandleMessage(msg, token) {
  const text = (msg.text || "").trim();
  const chatId = msg.chat.id;

  // Buyruqlar
  if (text === "/start" || text === "/help") {
    await bzTgReply(token, chatId,
      "👋 *Bozorlik Bot*\n\n" +
      "Xarajat kiritish uchun yozing:\n" +
      "`Tovar nomi narx`\n\n" +
      "Masalan:\n" +
      "`Go'sht 50000`\n" +
      "`Un 5kg 45000`\n\n" +
      "Boshqa buyruqlar:\n" +
      "/balans — hozirgi balans\n" +
      "/oxirgi — oxirgi xarajat"
    );
    return;
  }

  if (text === "/balans") {
    const cash = getCashBalance();
    const card = getCardBalance();
    await bzTgReply(token, chatId,
      `💵 Нақд: *${fmt(cash)} сўм*\n💳 Карта: *${fmt(card)} сўм*`
    );
    return;
  }

  if (text === "/oxirgi") {
    const h = safeGetJSON("bz_history", []);
    const last = h.length ? h.reduce((a,b) => {
      return ((b.date||"")+(b.time||"")) > ((a.date||"")+(a.time||"")) ? b : a;
    }) : null;
    if (last) {
      await bzTgReply(token, chatId,
        `🕐 Oxirgi: *${last.market}* — ${last.date}\n💰 ${fmt((last.cashTotal||0)+(last.cardTotal||0))} сўм`
      );
    } else {
      await bzTgReply(token, chatId, "Tarix bo'sh");
    }
    return;
  }

  // Tovar kiritish: "Go'sht 50000" yoki "Un 5kg 45000"
  const match = text.match(/^(.+?)\s+(\d+(?:[.,]\d+)?(?:kg|кг))?\s*(\d{3,})$/i);
  if (match) {
    const name  = match[1].trim();
    const kg    = match[2] ? parseFloat(match[2].replace(",", ".")) : null;
    const price = parseInt(match[3].replace(/[.,]/g,""), 10);
    const unitPrice = (kg && kg > 0) ? Math.round(price / kg) : price;

    // Deduct from cash balance
    const curCash = getCashBalance();
    const newCash = curCash - price;
    setCashBalance(newCash);

    // localStorage ga qo'shamiz (aktiv bozor bo'lsa)
    const market = localStorage.getItem("bz_active_market") || "Telegram";

    // Quick add sifatida saqlaymiz
    const h = safeGetJSON("bz_history", []);
    const today2 = today();

    // Bugungi bozor bor bo'lsa unga qo'shamiz
    const todayEntry = h.find(e => e.date === today2 && e.market === market);
    if (todayEntry) {
      if (!todayEntry.cashItems) todayEntry.cashItems = [];
      todayEntry.cashItems.push({ name, kg: kg||"", unitPrice: unitPrice, totalPrice: price });
      todayEntry.cashTotal = (todayEntry.cashItems||[]).reduce((s,i)=>s+(i.totalPrice||0),0);
      todayEntry.spent = todayEntry.cashTotal;
      todayEntry.balance = newCash;
      localStorage.setItem("bz_history", JSON.stringify(h));
      if (typeof bzSaveHistoryEntry === "function") bzSaveHistoryEntry(todayEntry);
    } else {
      // Yangi entry
      const newEntry = {
        date: today2,
        time: new Date().toTimeString().slice(0,5),
        market,
        cashItems: [{ name, kg: kg||"", unitPrice: unitPrice, totalPrice: price }],
        cashTotal: price,
        spent: price,
        cardItems: [],
        cardTotal: 0,
        cashBalance: curCash,
        cardBalance: getCardBalance(),
        balance: newCash,
        fbKey: null
      };
      h.push(newEntry);
      localStorage.setItem("bz_history", JSON.stringify(h));
      if (typeof bzSaveHistoryEntry === "function") bzSaveHistoryEntry(newEntry);
    }

    if (typeof renderHistory === "function") renderHistory();
    if (typeof updateDashboard === "function") updateDashboard();
    if (typeof updateStats === "function") updateStats();

    await bzTgReply(token, chatId,
      `✅ Kiritildi: *${name}*${kg ? ` ${kg}кг` : ""} — *${fmt(price)} сўм*`
    );
    return;
  }

  // Tushunmadim
  await bzTgReply(token, chatId,
    "❓ Tushunmadim. /help ni bosing"
  );
}

async function bzTgReply(token, chatId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
    });
  } catch(e) {}
}



/* ══════════════════════════════════════════
   📍 GPS BOZOR REJIMI
   Bozorga yaqinlashganda avtomatik tanlaydi
══════════════════════════════════════════ */

// Bozor koordinatalari — o'zingizning bozorlaringizni qo'shing
const BZ_MARKETS_GEO = [
  { name: "Куйлик",   lat: 41.3285, lng: 69.3575, radius: 500 },
  { name: "Фут Сити", lat: 41.2995, lng: 69.2401, radius: 400 },
  { name: "Эко",      lat: 41.3123, lng: 69.2789, radius: 300 },
];

let _bzGpsWatcher = null;
let _bzLastGpsMarket = null;

function bzStartGps() {
  if (!navigator.geolocation) return;

  _bzGpsWatcher = navigator.geolocation.watchPosition(
    bzOnGpsUpdate,
    () => {}, // xatoni jimgina o'tkazib yuboramiz
    { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
  );
}

function bzStopGps() {
  if (_bzGpsWatcher !== null) {
    navigator.geolocation.clearWatch(_bzGpsWatcher);
    _bzGpsWatcher = null;
  }
}

function bzOnGpsUpdate(pos) {
  const { latitude: lat, longitude: lng } = pos.coords;

  let closestMarket = null;
  let closestDist = Infinity;

  BZ_MARKETS_GEO.forEach(m => {
    const dist = bzCalcDistance(lat, lng, m.lat, m.lng);
    if (dist < m.radius && dist < closestDist) {
      closestDist = dist;
      closestMarket = m;
    }
  });

  if (closestMarket && closestMarket.name !== _bzLastGpsMarket) {
    _bzLastGpsMarket = closestMarket.name;
    bzAutoSelectMarket(closestMarket.name);
    bzHaptic("success");
    showToast("📍 " + closestMarket.name + " — avtomatik tanlandi!");
  } else if (!closestMarket && _bzLastGpsMarket) {
    _bzLastGpsMarket = null;
  }
}

function bzCalcDistance(lat1, lng1, lat2, lng2) {
  // Haversine formula — metrda
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function bzAutoSelectMarket(name) {
  const btn = Array.from(document.querySelectorAll(".market-btn"))
    .find(b => b.querySelector(".mb-name")?.textContent.trim() === name);
  if (btn) {
    selectMarket(btn, name);
    // Zakupka tabiga o'tamiz
    // GPS: zakupka tabiga o'tish
  }
}

// GPS sozlamasi — koordinatlarni saqlash
window.bzSaveMarketGeo = function(marketName) {
  if (!navigator.geolocation) { showToast("GPS yo'q"); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const saved = safeGetJSON("bz_market_geo", {});
    saved[marketName] = { lat: pos.coords.latitude, lng: pos.coords.longitude, radius: 300 };
    localStorage.setItem("bz_market_geo", JSON.stringify(saved));
    showToast("📍 " + marketName + " joylashuvi saqlandi!");
    // BZ_MARKETS_GEO ni yangilash
    const idx = BZ_MARKETS_GEO.findIndex(m => m.name === marketName);
    if (idx >= 0) {
      BZ_MARKETS_GEO[idx].lat = pos.coords.latitude;
      BZ_MARKETS_GEO[idx].lng = pos.coords.longitude;
    } else {
      BZ_MARKETS_GEO.push({ name: marketName, lat: pos.coords.latitude, lng: pos.coords.longitude, radius: 300 });
    }
  }, () => showToast("GPS xato"));
};

// Saqlangan koordinatlarni yuklash
function bzLoadMarketGeo() {
  const saved = safeGetJSON("bz_market_geo", {});
  Object.entries(saved).forEach(([name, geo]) => {
    const idx = BZ_MARKETS_GEO.findIndex(m => m.name === name);
    if (idx >= 0) {
      BZ_MARKETS_GEO[idx].lat = geo.lat;
      BZ_MARKETS_GEO[idx].lng = geo.lng;
      BZ_MARKETS_GEO[idx].radius = geo.radius || 300;
    } else {
      BZ_MARKETS_GEO.push({ name, ...geo, radius: geo.radius || 300 });
    }
  });
}

function bzInitMarketLongPress() {
  document.querySelectorAll(".market-btn").forEach(btn => {
    let timer = null;
    const nameEl = btn.querySelector(".mb-name");
    const name = nameEl ? nameEl.textContent.trim() : "";
    if (!name || name === "Бошқа") return;

    const start = () => {
      timer = setTimeout(() => {
        if (confirm(`📍 ${name} joylashuvini GPS orqali saqlaysizmi?`)) {
          bzSaveMarketGeo(name);
        }
      }, 900);
    };
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };

    btn.addEventListener("touchstart", start, { passive: true });
    btn.addEventListener("touchend", cancel, { passive: true });
    btn.addEventListener("touchcancel", cancel, { passive: true });
    btn.addEventListener("mousedown", start);
    btn.addEventListener("mouseup", cancel);
    btn.addEventListener("mouseleave", cancel);
  });
}

/* ══════════════════════════════════════════
   📸 KAMERA + AI — TOVAR NARXINI TAXMIN QILISH
   Tovarni ko'rsating — AI narxni aniqlaydi
══════════════════════════════════════════ */

function bzOpenCameraAI() {
  let existing = document.getElementById("bzCameraModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "bzCameraModal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9990;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px";
  modal.innerHTML = `
    <div style="background:var(--card);border-radius:20px;padding:18px;width:100%;max-width:420px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <p style="font-weight:700;font-size:1rem;margin:0">📸 Tovarni surating</p>
        <button onclick="document.getElementById('bzCameraModal').remove()" 
          style="border:none;background:var(--bg);border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:1rem">✕</button>
      </div>
      
      <video id="bzCamVideo" autoplay playsinline muted
        style="width:100%;border-radius:12px;background:#000;max-height:280px;object-fit:cover"></video>
      
      <canvas id="bzCamCanvas" style="display:none"></canvas>
      
      <div id="bzCamResult" style="margin-top:12px;min-height:60px;display:none;background:var(--bg);border-radius:12px;padding:12px">
        <div id="bzCamResultText" style="font-size:.85rem;color:var(--text)"></div>
        <div id="bzCamResultBtns" style="margin-top:10px;display:flex;gap:8px"></div>
      </div>
      
      <div style="display:flex;gap:10px;margin-top:14px">
        <button onclick="bzCamCapture()" id="bzCamBtn"
          style="flex:1;padding:13px;border-radius:12px;border:none;background:var(--blue);color:#fff;font-weight:700;cursor:pointer;font-size:.95rem;font-family:inherit">
          📸 Suratga ol
        </button>
        <label style="flex:1;padding:13px;border-radius:12px;border:none;background:var(--bg);color:var(--text);font-weight:700;cursor:pointer;font-size:.95rem;text-align:center;display:flex;align-items:center;justify-content:center">
          🖼️ Galereya
          <input type="file" accept="image/*" onchange="bzCamFromFile(this)" style="display:none"/>
        </label>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) { bzStopCamera(); modal.remove(); } });

  bzStartCamera();
}

let _bzStream = null;

async function bzStartCamera() {
  try {
    _bzStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    const video = document.getElementById("bzCamVideo");
    if (video) video.srcObject = _bzStream;
  } catch(e) {
    showToast("📷 Kameraga ruxsat bering");
  }
}

function bzStopCamera() {
  if (_bzStream) {
    _bzStream.getTracks().forEach(t => t.stop());
    _bzStream = null;
  }
}

function bzCamCapture() {
  const video = document.getElementById("bzCamVideo");
  const canvas = document.getElementById("bzCamCanvas");
  if (!video || !canvas) return;

  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext("2d").drawImage(video, 0, 0);

  const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
  bzStopCamera();
  bzAnalyzeImage(base64);
}

function bzCamFromFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const base64 = e.target.result.split(",")[1];
    bzStopCamera();
    bzAnalyzeImage(base64);
  };
  reader.readAsDataURL(file);
}

async function bzAnalyzeImage(base64) {
  const resultDiv  = document.getElementById("bzCamResult");
  const resultText = document.getElementById("bzCamResultText");
  const resultBtns = document.getElementById("bzCamResultBtns");

  if (!resultDiv || !resultText) return;

  resultDiv.style.display = "block";
  resultText.innerHTML = "<span style='color:var(--blue)'>🤖 AI tahlil qilyapti...</span>";
  resultBtns.innerHTML = "";

  const apiKey = localStorage.getItem("bz_ai_key");
  if (!apiKey) {
    resultText.innerHTML = `
      <div style="font-size:.85rem;color:var(--text2);margin-bottom:8px">AI bilan aniqlash uchun API kalitini kiriting:</div>
      <input id="bzAiKeyInp" class="field" type="password" placeholder="sk-ant-..." style="margin-bottom:8px"/>
      <button onclick="localStorage.setItem('bz_ai_key', document.getElementById('bzAiKeyInp').value.trim()); showToast('API kalit saqlandi');"
        style="padding:8px 14px;border-radius:8px;border:none;background:var(--blue);color:#fff;cursor:pointer;font-weight:600;font-family:inherit">Saqlash</button>
    `;
    return;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: base64 }
            },
            {
              type: "text",
              text: "Bu rasmda nima ko'rinyapti? Agar bu oziq-ovqat yoki bozor mahsuloti bo'lsa, O'zbekistondagi taxminiy narxini so'mda ayt. JSON formatida javob ber: {tovar: nom, narx: 50000, izoh: izoh}. Agar mahsulot ko'rinmasa: {tovar: null, narx: null, izoh: izoh}."
            }
          ]
        }]
      })
    });

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    let parsed = null;
    try {
      const jsonMatch = text.match(/\{[^}]+\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch(e) {}

    if (parsed && parsed.tovar) {
      resultText.innerHTML = 
        "<b>" + parsed.tovar + "</b><br>" +
        (parsed.narx ? "💰 Taxminiy narx: <b>" + fmt(parsed.narx) + " сўм</b><br>" : "") +
        "<span style='font-size:.75rem;color:var(--text2)'>" + (parsed.izoh || "") + "</span>";

      // Tovar qo'shish tugmasi
      if (parsed.tovar && parsed.narx) {
        resultBtns.innerHTML = `
          <button onclick="bzCamAddItem('${parsed.tovar.replace(/'/g,"\\'")}', ${parsed.narx}, 'cash')"
            style="width:100%;padding:10px;border-radius:10px;border:none;background:var(--blue);color:#fff;font-weight:600;cursor:pointer;font-family:inherit;font-size:.85rem">
            💰 Саватга қўшиш (${fmt(parsed.narx)} сўм)
          </button>
        `;
      }
    } else {
      resultText.innerHTML = "<span style='color:var(--text2)'>" + (parsed?.izoh || "Mahsulot aniqlanmadi") + "</span>";
    }
  } catch(e) {
    resultText.innerHTML = "<span style='color:var(--red)'>❌ AI xato: " + e.message + "</span>";
  }
}

function bzCamAddItem(name, price, type) {
  const inp = document.getElementById(type === "cash" ? "cashInp" : "cardInp");
  if (inp) {
    inp.value = name + " " + price;
    if (type === "cash") {
      if (typeof addCash === "function") addCash();
      else if (typeof addCashItem === "function") addCashItem();
    } else {
      if (typeof addCard === "function") addCard();
      else if (typeof addCardItem === "function") addCardItem();
    }
  }
  document.getElementById("bzCameraModal")?.remove();
  showToast("✅ " + name + " qo'shildi!");
  bzHaptic("success");
}

/* ══════════════════════════════════════════
   📈 TOVAR NARX TARIXI
   Tovar qo'shilganda narxini ko'rsatadi
══════════════════════════════════════════ */
function bzGetLastPrice(itemName) {
  if (!itemName || itemName.length < 2) return null;
  const h = safeGetJSON("bz_history", []);
  const name = itemName.trim().toLowerCase();

  // Barcha tarixdan ushbu tovarni qidirish
  const found = [];
  h.forEach(entry => {
    const allItems = [...(entry.cashItems||[]), ...(entry.cardItems||[])];
    allItems.forEach(item => {
      const itPrice = item.unitPrice || item.totalPrice;
      if (item.name && item.name.toLowerCase().includes(name) && itPrice) {
        found.push({ date: entry.date, price: itPrice, market: entry.market || "" });
      }
    });
  });

  if (!found.length) return null;
  // Eng so'nggi
  found.sort((a,b) => (b.date||"").localeCompare(a.date||""));
  return found[0];
}

function bzShowPriceHint(inputEl, nameEl) {
  // nameEl — tovar nomi input
  const val = (nameEl ? nameEl.value : inputEl.value || "").trim();
  // Tovarning nom qismini ajratib olamiz (masalan: "Мош 10кг..." dan "Мош")
  const name = val.replace(/\s+[\d.,]+.*$/, "").trim();
  if (name.length < 2) { bzRemovePriceHint(inputEl); return; }

  const last = bzGetLastPrice(name);
  if (!last) { bzRemovePriceHint(inputEl); return; }

  let hint = document.getElementById("bzPriceHint_" + inputEl.id);
  if (!hint) {
    hint = document.createElement("div");
    hint.id = "bzPriceHint_" + inputEl.id;
    hint.style.cssText = "font-size:.72rem;color:var(--blue);padding:3px 8px;background:var(--blue-bg);border-radius:8px;margin-top:3px;display:inline-block";
    inputEl.parentNode.insertBefore(hint, inputEl.nextSibling);
  }
  hint.textContent = `📅 Oxirgi: ${fmt(last.price)} сўм (${last.date}${last.market ? " · " + last.market : ""})`;
}

function bzRemovePriceHint(inputEl) {
  const hint = document.getElementById("bzPriceHint_" + inputEl.id);
  if (hint) hint.remove();
}

// Tovar nomi yozilganda narx tarixini ko'rsatish
function bzAttachPriceHints() {
  // Naqd tovar input
  const cashInp = document.getElementById("cashInp");
  if (cashInp && !cashInp._bzHintAttached) {
    cashInp._bzHintAttached = true;
    cashInp.addEventListener("input", () => bzShowPriceHint(cashInp, cashInp));
    cashInp.addEventListener("blur",  () => setTimeout(() => bzRemovePriceHint(cashInp), 2000));
  }
  // Karta tovar input
  const cardInp = document.getElementById("cardInp");
  if (cardInp && !cardInp._bzHintAttached) {
    cardInp._bzHintAttached = true;
    cardInp.addEventListener("input", () => bzShowPriceHint(cardInp, cardInp));
    cardInp.addEventListener("blur",  () => setTimeout(() => bzRemovePriceHint(cardInp), 2000));
  }
}

/* ══════════════════════════════════════════
   📊 HAFTALIK/OYLIK HISOBOT — TG ga avtomatik
══════════════════════════════════════════ */
let _bzReportTimer = null;

function bzStartReportScheduler() {
  // Har 1 soatda tekshiramiz
  if (_bzReportTimer) clearInterval(_bzReportTimer);
  _bzReportTimer = setInterval(bzCheckReportSchedule, 60 * 60 * 1000);
  // Sahifa ochilganda ham tekshiramiz
  bzCheckReportSchedule();
}

function bzCheckReportSchedule() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Yakshanba, 1=Dushanba
  const hour = now.getHours();
  const dateStr = today();

  const lastWeekly  = localStorage.getItem("bz_last_weekly_report");
  const lastMonthly = localStorage.getItem("bz_last_monthly_report");

  // Haftalik: Dushanba kuni soat 9:00 da
  if (dayOfWeek === 1 && hour >= 9 && lastWeekly !== dateStr) {
    localStorage.setItem("bz_last_weekly_report", dateStr);
    bzSendWeeklyReport();
  }

  // Oylik: Har oyning 1-kuni soat 10:00 da
  const monthStr = today().slice(0, 7);
  if (now.getDate() === 1 && hour >= 10 && lastMonthly !== monthStr) {
    localStorage.setItem("bz_last_monthly_report", monthStr);
    bzSendMonthlyReport();
  }
}

async function bzSendWeeklyReport() {
  const tg = getTG();
  if (!tg.token || !tg.chatId) return;

  const h = safeGetJSON("bz_history", []);
  const now = new Date();
  // O'tgan hafta
  const dAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const weekAgo = toLocalDateStr(dAgo);
  const thisWeek = h.filter(e => (e.date || "") >= weekAgo);

  if (!thisWeek.length) return;

  const total = thisWeek.reduce((s, e) => s + (e.cashTotal||0) + (e.cardTotal||0), 0);
  const count = thisWeek.length;

  // Bozorlar bo'yicha
  const mkts = {};
  thisWeek.forEach(e => {
    const m = e.market || "Boshqa";
    mkts[m] = (mkts[m] || 0) + (e.cashTotal||0) + (e.cardTotal||0);
  });
  const mktLines = Object.entries(mkts)
    .sort((a,b) => b[1]-a[1])
    .map(([m,s]) => '  ' + m + ': ' + fmt(s) + ' сўм').join('\n');

  // TOP tovarlar
  const items = {};
  thisWeek.forEach(e => {
    [...(e.cashItems||[]), ...(e.cardItems||[])].forEach(i => {
      if (!i.name) return;
      items[i.name] = (items[i.name] || 0) + (i.totalPrice || 0);
    });
  });
  const topItems = Object.entries(items)
    .sort((a,b) => b[1]-a[1]).slice(0, 5)
    .map(([n,s]) => '  ' + n + ': ' + fmt(s) + ' сўм').join('\n');

  const text = `📊 *HAFTALIK HISOBOT*\n\n` +
    `📅 ${weekAgo} — ${today()}\n\n` +
    `💰 Jami xarajat: *${fmt(total)} сўм*\n` +
    `🛒 Bozor soni: *${count} ta*\n\n` +
    `📍 Bozorlar:\n${mktLines}\n\n` +
    `🏆 TOP tovarlar:\n${topItems}`;

  await bzTgReply(tg.token, tg.chatId, text);
  showToast("📊 Haftalik hisobot yuborildi!");
}

async function bzSendMonthlyReport() {
  const tg = getTG();
  if (!tg.token || !tg.chatId) return;

  const h = safeGetJSON("bz_history", []);
  const now = new Date();
  // O'tgan oy
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth()+1).padStart(2,"0")}`;
  const thisMonth = h.filter(e => (e.date || "").startsWith(lastMonthStr));

  if (!thisMonth.length) return;

  const total = thisMonth.reduce((s,e) => s + (e.cashTotal||0) + (e.cardTotal||0), 0);
  const cash  = thisMonth.reduce((s,e) => s + (e.cashTotal||0), 0);
  const card  = thisMonth.reduce((s,e) => s + (e.cardTotal||0), 0);
  const count = thisMonth.length;
  const avg   = Math.round(total / count);

  const items = {};
  thisMonth.forEach(e => {
    [...(e.cashItems||[]), ...(e.cardItems||[])].forEach(i => {
      if (!i.name) return;
      items[i.name] = (items[i.name] || 0) + (i.totalPrice || 0);
    });
  });
  const topItems = Object.entries(items)
    .sort((a,b) => b[1]-a[1]).slice(0, 5)
    .map(([n,s]) => '  ' + n + ': ' + fmt(s) + ' сўм').join('\n');

  const monthNames = ["Yanvar","Fevral","Mart","Aprel","May","Iyun",
                      "Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
  const mName = monthNames[lastMonth.getMonth()];

  const text = `📅 *${mName.toUpperCase()} OY HISOBOTI*

` +
    `💰 Jami: *${fmt(total)} сўм*
` +
    `💵 Нақд: ${fmt(cash)} сўм
` +
    `💳 Карта: ${fmt(card)} сўм
` +
    `🛒 Bozor: ${count} ta
` +
    `📊 O'rtacha: ${fmt(avg)} сўм

` +
    `🏆 TOP 5 tovar:
${topItems}`;

  await bzTgReply(tg.token, tg.chatId, text);
  showToast("📅 Oylik hisobot yuborildi!");
}

// Qo'lda hisobot yuborish
window.bzSendManualWeeklyReport  = bzSendWeeklyReport;
window.bzSendManualMonthlyReport = bzSendMonthlyReport;

/* ══════════════════════════════════════════
   👆 SWIPE GESTURE — tarix kartasi
   Chapga: o'chirish | O'ngga: tahrirlash
══════════════════════════════════════════ */
function bzAddSwipe(el, onLeft, onRight) {
  let startX = 0, startY = 0, moved = false;
  const THRESHOLD = 60;

  el.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    moved = false;
    el.style.transition = "none";
  }, { passive: true });

  el.addEventListener("touchmove", e => {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dy) > Math.abs(dx)) return; // Vertikal scroll
    moved = true;
    const clamped = Math.max(-120, Math.min(120, dx));
    el.style.transform = `translateX(${clamped}px)`;
    // Rang ko'rsatish
    if (dx < -20) el.style.background = "var(--red-bg, #fff0f0)";
    else if (dx > 20) el.style.background = "var(--green-bg, #f0fff4)";
    else el.style.background = "";
  }, { passive: true });

  el.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - startX;
    el.style.transition = "transform .25s ease, background .25s";
    el.style.transform = "translateX(0)";
    el.style.background = "";
    if (!moved) return;
    if (dx < -THRESHOLD) { bzHaptic("medium"); onLeft && onLeft(); }
    else if (dx > THRESHOLD) { bzHaptic("light"); onRight && onRight(); }
  }, { passive: true });
}

/* ══════════════════════════════════════════
   📳 HAPTIC FEEDBACK
══════════════════════════════════════════ */

function bzAttachSwipes() {
  document.querySelectorAll(".hist-entry[data-idx]").forEach(el => {
    const idx = +el.getAttribute("data-idx");
    bzAddSwipe(
      el,
      // Chapga — o'chirish
      () => {
        if (!confirm("Bu yozuvni o'chirasizmi?")) return;
        const h = safeGetJSON("bz_history", []);
        const entry = h[idx]; // Firebase uchun oldin olamiz
        h.splice(idx, 1);
        localStorage.setItem("bz_history", JSON.stringify(h));
        // Firebase dan ham o'chirish
        if (entry && entry.fbKey && typeof bzRef === "function") {
          const ref = bzRef("history/" + entry.fbKey);
          if (ref) ref.remove();
        }
        renderHistory();
        updateStats();
        if (typeof updateDashboard === "function") updateDashboard();
        showToast("🗑️ O'chirildi");
      },
      // O'ngga — tahrirlash
      () => {
        if (typeof editHistEntry === "function") editHistEntry(idx);
      }
    );
  });
}

function bzHaptic(type) {
  if (!navigator.vibrate) return;
  const patterns = {
    light:   [10],
    medium:  [20],
    heavy:   [30],
    success: [10, 50, 10],
    error:   [50, 30, 50],
    warning: [20, 30, 20]
  };
  navigator.vibrate(patterns[type] || patterns.light);
}

function toggleDark() {
  const d = document.body.classList.toggle("dark");
  localStorage.setItem("bz_dark", d ? "1" : "0");
  document.getElementById("dark-btn").textContent = d ? "☀️" : "🌙";
  document.getElementById("tc").content = d ? "#0f1117" : "#007aff";
  if (barInst || pieInst) updateCharts();
  // Haptic feedback
  bzHaptic("light");
}
function initDark() {
  // Foydalanuvchi qo'lda o'zgartirganmi?
  const manual = localStorage.getItem("bz_dark");
  if (manual !== null) {
    // Qo'lda o'rnatilgan
    if (manual === "1") {
      document.body.classList.add("dark");
      document.getElementById("dark-btn").textContent = "☀️";
      document.getElementById("tc").content = "#0f1117";
    }
  } else {
    // Vaqtga qarab avtomatik: 20:00 - 07:00 dark
    const hour = new Date().getHours();
    const autoDark = hour >= 20 || hour < 7;
    if (autoDark) {
      document.body.classList.add("dark");
      document.getElementById("dark-btn").textContent = "☀️";
      document.getElementById("tc").content = "#0f1117";
    }
  }
  // Har 1 daqiqada tekshirish (qo'lda o'rnatilmagan bo'lsa)
  setInterval(() => {
    if (localStorage.getItem("bz_dark") !== null) return;
    const hour = new Date().getHours();
    const autoDark = hour >= 20 || hour < 7;
    const isDark = document.body.classList.contains("dark");
    if (autoDark && !isDark) {
      document.body.classList.add("dark");
      document.getElementById("dark-btn").textContent = "☀️";
      document.getElementById("tc").content = "#0f1117";
      if (barInst || pieInst) updateCharts();
    } else if (!autoDark && isDark) {
      document.body.classList.remove("dark");
      document.getElementById("dark-btn").textContent = "🌙";
      document.getElementById("tc").content = "#007aff";
      if (barInst || pieInst) updateCharts();
    }
  }, 60000);
}

/* ── TABS ── */
const TABS = ["main", "debt", "history", "chart"];

function goTab(name) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + name).classList.add("active");
  document.getElementById("ni-" + name).classList.add("active");
  if (name === "main")    { updateStats(); updateDashboard(); }
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
  if (!input || typeof input !== "string") return null;
  const s = input.trim();
  // 1. Format: Nomi 10кг (15000) 150000 yoki 1,5 kg (15 000) 22 500
  const m1 = s.match(/^(.+?)\s+([\d.,]+)\s*(?:кг|kg)\s+\((\d[\d ]*)\)\s+(\d[\d ]*)$/i);
  if (m1) {
    const kg = m1[2].replace(',', '.');
    const unitPrice = +m1[3].replace(/\s/g, '');
    const totalPrice = +m1[4].replace(/\s/g, '');
    if (totalPrice <= 0 || isNaN(totalPrice)) return null;
    return { name: m1[1].trim(), kg, unitPrice, totalPrice };
  }

  // 2. Format: Nomi 10 * 15000 yoki 1.5*15000 yoki 1,5 * 15 000
  const mMul = s.match(/^(.+?)\s+([\d.,]+)\s*(?:кг|kg)?\s*\*\s*(\d[\d ]*)$/i);
  if (mMul) {
    const kg = mMul[2].replace(',', '.');
    const unitPrice = +mMul[3].replace(/\s/g, '');
    const totalPrice = Math.round(+kg * unitPrice);
    if (totalPrice <= 0 || isNaN(totalPrice)) return null;
    return { name: mMul[1].trim(), kg, unitPrice, totalPrice };
  }

  // 3. Format: Nomi 5кг 200000 yoki 2.5 kg 200000
  const mKgOnly = s.match(/^(.+?)\s+([\d.,]+)\s*(?:кг|kg)\s+(\d[\d ]*)$/i);
  if (mKgOnly) {
    const kg = mKgOnly[2].replace(',', '.');
    const totalPrice = +mKgOnly[3].replace(/\s/g, '');
    if (totalPrice <= 0 || isNaN(totalPrice)) return null;
    const numKg = +kg;
    const unitPrice = numKg > 0 ? Math.round(totalPrice / numKg) : null;
    return { name: mKgOnly[1].trim(), kg, unitPrice, totalPrice };
  }

  // 4. Format: Nomi 150000 yoki Nomi 150 000
  const m2 = s.match(/^(.+?)\s+(\d[\d ]*)$/);
  if (m2) {
    const totalPrice = +m2[2].replace(/\s/g, '');
    if (totalPrice <= 0 || isNaN(totalPrice)) return null;
    return { name: m2[1].trim(), kg: null, unitPrice: null, totalPrice };
  }

  return null;
}

function formatItemForInput(it) {
  if (!it) return "";
  if (it.kg && it.unitPrice) {
    return `${it.name} ${it.kg}кг (${it.unitPrice}) ${it.totalPrice}`;
  } else if (it.kg) {
    return `${it.name} ${it.kg}кг ${it.totalPrice}`;
  } else {
    return `${it.name} ${it.totalPrice}`;
  }
}

/* ── CASH (НАҚД ТОВАР) ── */
function addCash() {
  const inp = document.getElementById("cashInp");
  const t = inp.value.trim(); if (!t) return;
  const p = parse(t);
  if (!p) { showToast("⚠️ Формат: Мош 10кг (15000) 150000 ёки Кийим 80000"); return; }
  
  p.seq = itemSeq++;
  p.market = getMarket();
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
  if (!it) return;
  document.getElementById("cashInp").value = formatItemForInput(it);
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

/* ── CARD ITEMS (КАРТА ТОВАР) ── */
function addCard() {
  const inp = document.getElementById("cardInp");
  const t = inp.value.trim(); if (!t) return;
  const p = parse(t);
  if (!p) { showToast("⚠️ Формат: Гўшт 200000 ёки Гўшт 5кг (40000) 200000"); return; }
  
  p.seq = itemSeq++;
  p.market = getMarket();
  cardItems.push(p);
  inp.value = "";
  inp.focus();
  renderCard();
  updateStats();
}
function delCard(i) {
  cardItems.splice(i, 1);
  renderCard();
  updateStats();
}
function editCard(i) {
  const it = cardItems[i];
  if (!it) return;
  document.getElementById("cardInp").value = formatItemForInput(it);
  delCard(i);
  document.getElementById("cardInp").focus();
}
function renderCard() {
  const list = document.getElementById("cardList");
  if (!list) return;
  const cnt  = cardItems.length;
  const countEl = document.getElementById("card-count");
  if (countEl) countEl.textContent = cnt;
  if (!cnt) {
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">💳</span>Ҳали карта товар йўқ</div>`;
    const sub = document.getElementById("cardSub");
    if (sub) sub.style.display="none";
    return;
  }
  list.innerHTML = cardItems.map((it,i) => `
    <div class="item-row" id="card-row-${i}" style="border-left:3px solid var(--purple);padding-left:10px">
      <div class="item-body">
        <div class="item-name">${esc(it.name)}${it.kg?` <span style="font-weight:400;color:var(--text2);font-size:.78rem">${it.kg}кг</span>`:""}</div>
        ${it.unitPrice?`<div class="item-sub">1кг = ${fmt(it.unitPrice)} сўм</div>`:""}
      </div>
      <span class="item-price" style="color:var(--purple)">${fmt(it.totalPrice)}</span>
      <div class="row-btns">
        <button class="row-btn edit" onclick="editCard(${i})">✏️</button>
        <button class="row-btn" onclick="delCard(${i})">✕</button>
      </div>
    </div>`).join("");
  const lastEl = document.getElementById(`card-row-${cnt - 1}`);
  animateItemAdd(lastEl);
  const total = cardItems.reduce((s,it)=>s+it.totalPrice,0);
  document.getElementById("cardSub").style.display = "block";
  document.getElementById("cardSubVal").textContent = fmt(total);
}
function addDebt() {
  bzHaptic("medium");
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
  
  loadAllDebts();
  allDebtsArray.push(newDebt);
  saveAllDebtsToStorage();
  
  inp.value = "";
  document.getElementById("debtWho").value = "";
  document.getElementById("debtDate").value = today();
  inp.focus();
  
  renderAllDebts();
  updateStats();
  
  showToast("✅ Қарз сақланди: " + p.name + " - " + fmt(p.totalPrice) + " сўм");
}

/* ── ALL DEBTS (БАРЧА ҚАРЗЛАР) ── */
var allDebtsArray = [];
window.allDebtsArray = allDebtsArray;

function loadAllDebts() {
  allDebtsArray = safeGetJSON("bz_debts", []);
  window.allDebtsArray = allDebtsArray;
}

function saveAllDebtsToStorage() {
  localStorage.setItem("bz_debts", JSON.stringify(allDebtsArray));
  window.allDebtsArray = allDebtsArray;
}

function renderAllDebts() {
  loadAllDebts();
  const list = document.getElementById("allDebtList");
  const tot  = allDebtsArray.reduce((s,d)=>s+(d.totalPrice||0),0);
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
  if (!confirm("Қарзни ўчиришни хохлайсизми?")) return false;
  loadAllDebts();
  const debt = allDebtsArray[idx];
  allDebtsArray.splice(idx, 1);
  saveAllDebtsToStorage();
  renderAllDebts();
  updateStats();
  showToast("✅ Қарз ўчирилди");
  return debt || true;
}

function editAllDebt(idx) {
  loadAllDebts();
  const it = allDebtsArray[idx];
  if (!it) return;
  document.getElementById("debtInp").value = formatItemForInput(it);
  document.getElementById("debtDate").value = it.date || today();
  document.getElementById("debtWho").value  = it.who  || "";
  // Silently remove from list and Firebase for editing without confusing delete prompt
  allDebtsArray.splice(idx, 1);
  saveAllDebtsToStorage();
  if (it && it.fbKey && typeof bzDeleteDebt === "function") {
    bzDeleteDebt(it);
  }
  renderAllDebts();
  updateStats();
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
    return false;
  }
  if (!confirm(`${selected.length} та қарзни ўчиришни хохлайсизми?`)) return false;
  
  loadAllDebts();
  selected.sort((a,b) => b - a);
  const deletedDebts = selected.map(idx => allDebtsArray[idx]);
  selected.forEach(idx => {
    allDebtsArray.splice(idx, 1);
  });
  saveAllDebtsToStorage();
  renderAllDebts();
  updateStats();
  showToast(`✅ ${selected.length} та қарз ўчирилди`);
  return deletedDebts;
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
  const deleteBtn = document.querySelector(".delete-selected-btn");
  const bar = document.getElementById("selectedDebtBar");
  const countEl = document.getElementById("selDebtCount");
  const sumEl = document.getElementById("selDebtSum");

  const selectedIdxs = getAllSelectedDebtIndexes();
  let selTotal = 0;
  selectedIdxs.forEach(idx => {
    const d = allDebtsArray[idx];
    if (d && d.totalPrice) selTotal += d.totalPrice;
  });

  if (bar && countEl && sumEl) {
    if (selectedIdxs.length > 0) {
      bar.style.display = "flex";
      countEl.textContent = selectedIdxs.length;
      sumEl.textContent = fmt(selTotal) + " сўм";
    } else {
      bar.style.display = "none";
    }
  }

  if (deleteBtn) {
    if (selectedIdxs.length > 0) {
      deleteBtn.textContent = `🗑 Танланганларни ўчириш (${selectedIdxs.length} та · ${fmt(selTotal)} сўм)`;
    } else {
      deleteBtn.textContent = "🗑 Танланганларни ўчириш";
    }
  }

  if (!selectAllBtn) return;
  const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
  const someChecked = Array.from(checkboxes).some(cb => cb.checked);
  if (checkboxes.length === 0) {
    selectAllBtn.textContent = "☐ Ҳаммасини танлаш";
  } else if (allChecked) {
    selectAllBtn.textContent = "✓ Ҳаммасини бекор қилиш";
  } else if (someChecked) {
    selectAllBtn.textContent = `☑ Танланди (${selectedIdxs.length})`;
  } else {
    selectAllBtn.textContent = "☐ Ҳаммасини танлаш";
  }
}

function buildDebtSummaryReport() {
  const t = today();
  const hist = safeGetJSON("bz_history", []);
  const spendToday = hist.filter(e => e.date === t)
    .reduce((s,e) => s + (e.cashTotal ?? e.spent ?? 0) + (e.cardTotal || 0), 0);

  const remain = getCashBalance() + getCardBalance();

  const debts = safeGetJSON("bz_debts", []);
  const debtToday = debts.filter(d => d.date === t).reduce((s,d) => s + (d.totalPrice||0), 0);
  const debtOld   = debts.filter(d => d.date !== t).reduce((s,d) => s + (d.totalPrice||0), 0);

  const dateStr = new Date().toLocaleDateString("ru-RU", {day:"2-digit", month:"2-digit", year:"numeric"});

  let r = `${dateStr}.\n`;
  r += ` Расход - ${fmt(spendToday)}\n`;
  r += ` Колди - ${fmt(remain)} \n\n`;
  r += ` Карз - ${fmt(debtToday)} \n`;
  r += `Эски карз - ${fmt(debtOld)} \n\n`;
  r += `Общий карз - ${fmt(debtToday + debtOld)}`;
  return r;
}

function sendDebtSummary() {
  const cfg = getTG();
  if (!cfg.token || !cfg.chatId) { showToast("⚠️ TG уланмаган"); return; }
  const r = buildDebtSummaryReport();
  sendTG(r);
}

function clearAllDebts() {
  if(!confirm("БАРЧА қарзлар ўчирилсинми? Бу амални қайтариб бўлмайди!")) return false;
  allDebtsArray = [];
  saveAllDebtsToStorage();
  renderAllDebts();
  updateStats();
  showToast("✅ Барча қарзлар тозаланди");
  return true;
}

/* ── STATS ── */
function updateStats() {
  const cashBalance = getCashBalance();
  const cashTotal   = cashItems.reduce((s,it) => s + it.totalPrice, 0);
  const totalRemain = cashBalance - cashTotal;

  const incEl = document.getElementById("income");
  if (incEl) incEl.value = fmt(cashBalance) + " сўм";
  
  const scKassa = document.getElementById("sc-kassa");
  if (scKassa) scKassa.textContent = fmt(cashBalance) + " сўм";

  const scCash = document.getElementById("sc-cash");
  if (scCash) scCash.textContent = fmt(cashTotal) + " сўм";

  const debtsTotal = safeGetJSON("bz_debts", []).reduce((s,d) => s + (d.totalPrice||0), 0);
  const scDebt = document.getElementById("sc-debt");
  if (scDebt) scDebt.textContent = fmt(debtsTotal) + " сўм";

  const scRemain = document.getElementById("sc-remain");
  if (scRemain) scRemain.textContent = fmt(totalRemain) + " сўм";
  
  const chip = document.getElementById("sc-remain-chip");
  if (chip) {
    chip.className = "stat-chip " + (totalRemain < 0 ? "red" : totalRemain < cashBalance * 0.2 ? "orange" : "green");
  }
  
  // Progress bar: naqd xarajatni kassa balansiga nisbatan
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

  updateDashboard();
}

/* ── FINISH ── */
function buildDebtSectionText(market, date) {
  const debts = safeGetJSON("bz_debts", [])
    .filter(d => d.date === date && d.market === market)
    .sort((a,b) => (a.id||0) - (b.id||0));

  if (!debts.length) {
    return `\n\nКарзга товар олинмади`;
  }

  let s = `\n\nКарзга товар:\n`;
  debts.forEach(d => {
    s += `• ${d.name}`;
    if (d.kg) s += ` ${d.kg}кг`;
    if (d.unitPrice) s += ` (${fmt(d.unitPrice)})`;
    s += ` — ${fmt(d.totalPrice)} сўм\n`;
  });
  const debtTotal = debts.reduce((sum,d) => sum + (d.totalPrice||0), 0);
  s += `Жами қарз: ${fmt(debtTotal)} сўм`;
  return s;
}

function finish() {
  bzHaptic("success");
  if (!cashItems.length && !cardItems.length) { 
    showToast("⚠️ Товарлар йўқ!"); 
    return; 
  }
  if (!selectedMarket) { 
    showToast("⚠️ Точкани танланг!"); 
    return; 
  }
  
  const currentMarket = getMarket();
  const cashBalanceStart = getCashBalance();
  const cardBalanceStart = getCardBalance();
  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU", {day: "2-digit", month: "2-digit", year: "numeric"});
  const timeStr = now.toLocaleTimeString("ru-RU", {hour: "2-digit", minute: "2-digit"});
  const note = getNote();

  // Eski (market belgisi yo'q) tovarlarni joriy bozorga bog'laymiz
  cashItems.forEach(it => { if (!it.market) it.market = currentMarket; });
  cardItems.forEach(it => { if (!it.market) it.market = currentMarket; });

  // Tovarlarni bozorlar bo'yicha guruhlaymiz (birinchi qo'shilgan tartibda)
  const marketOrder = [];
  const groups = {};
  [...cashItems, ...cardItems].forEach(it => {
    if (!groups[it.market]) { groups[it.market] = { cash: [], card: [] }; marketOrder.push(it.market); }
  });
  cashItems.forEach(it => groups[it.market].cash.push(it));
  cardItems.forEach(it => groups[it.market].card.push(it));

  const cashTotal   = cashItems.reduce((s,it) => s + it.totalPrice, 0);
  const cardTotal   = cardItems.reduce((s,it) => s + it.totalPrice, 0);
  const totalBalance = cashBalanceStart + cardBalanceStart;
  const totalSpent    = cashTotal + cardTotal;
  const totalRemain   = totalBalance - totalSpent;

  let r = `Расход · ${dateStr}\n`;
  r += `💰 Касса: ${fmt(totalBalance)} сўм\n`;
  r += `\n`;

  marketOrder.forEach(m => {
    const g = groups[m];
    const items = [...g.cash, ...g.card].sort((a,b) => (a.seq||0) - (b.seq||0));
    const mTotal = g.cash.reduce((s,it)=>s+it.totalPrice,0) + g.card.reduce((s,it)=>s+it.totalPrice,0);
    r += `📍 ${m}\n`;
    items.forEach(it => {
      r += `• ${it.name}`;
      if (it.kg) r += ` ${it.kg}кг`;
      if (it.unitPrice) r += ` (${fmt(it.unitPrice)})`;
      r += ` — ${fmt(it.totalPrice)} сўм\n`;
    });
    r += `Расход: ${fmt(mTotal)} сўм\n`;
    r += `\n`;
  });

  if (note) {
    r += `📝 Изоҳ: ${note}\n`;
    r += `\n`;
  }
  r += `💰 Обший: ${fmt(totalSpent)} сўм\n`;
  r += `✅ Қолди: ${fmt(totalRemain)} сўм`;
  if (marketOrder.length === 1) {
    r += buildDebtSectionText(marketOrder[0], today());
  } else {
    marketOrder.forEach(m => {
      const debtText = buildDebtSectionText(m, today())
        .replace("Карзга товар олинмади", `${m}: карзга товар олинмади`)
        .replace("Карзга товар:", `${m} — карзга товар:`);
      r += debtText;
    });
  }

  // Har bir bozor uchun alohida tarix yozuvi (statistikalar to'g'ri hisoblanishi uchun)
  let runningCash = cashBalanceStart;
  let runningCard = cardBalanceStart;
  marketOrder.forEach(m => {
    const g = groups[m];
    const mCashTotal = g.cash.reduce((s,it)=>s+it.totalPrice,0);
    const mCardTotal = g.card.reduce((s,it)=>s+it.totalPrice,0);
    const entryCashBalance = runningCash;
    const entryCardBalance = runningCard;
    runningCash -= mCashTotal;
    runningCard -= mCardTotal;

    saveHistory({
      market: m, cashBalance: entryCashBalance, cardBalance: entryCardBalance,
      cashTotal: mCashTotal, cardTotal: mCardTotal,
      spent: mCashTotal, balance: runningCash,
      cashItems: [...g.cash], cardItems: [...g.card],
      date: today(), time: timeStr, note
    });
  });

  lastReceiptData = {
    market: marketOrder.join(", "),
    cashBalance: cashBalanceStart,
    cardBalance: cardBalanceStart,
    cashTotal,
    cardTotal,
    balance: runningCash,
    cashItems: [...cashItems],
    cardItems: [...cardItems],
    date: today(),
    time: timeStr,
    note
  };

  const receiptBtn = document.getElementById("receiptBtn");
  if (receiptBtn) receiptBtn.style.display = "";

  setCashBalance(runningCash);
  setCardBalance(runningCard);

  const pre = document.getElementById("report");
  if (pre) {
    pre.textContent = r;
    pre.style.display = "block";
    pre.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  
  sendTG(r);

  cashItems = [];
  cardItems = [];
  renderCash();
  renderCard();
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
  const h = safeGetJSON("bz_history", []);
  h.unshift(entry); if(h.length>300) h.splice(300);
  localStorage.setItem("bz_history", JSON.stringify(h));
}

function resendEntryTGByIndex(idx) {
  const h = safeGetJSON("bz_history", []);
  const e = h[idx];
  if (!e) { showToast("⚠️ Топилмади"); return; }
  const report = buildEntryReport(e);
  resendEntryTG(report);
}

function renderHistory() {
  const h   = safeGetJSON("bz_history", []);
  const mon = document.getElementById("histMonth").value;
  const selMkt = window._histMktFilter || "";

  // Точка фильтр тугмалари
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
    const total   = filt.reduce((s,e)=>s+(e.spent||e.cashTotal||0)+(e.cardTotal||0),0);
    const avg     = Math.round(total / filt.length);
    const mktMap  = {};
    filt.forEach(e=>{ mktMap[e.market]=(mktMap[e.market]||0)+(e.spent||e.cashTotal||0)+(e.cardTotal||0); });
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
    const dt = es.reduce((s,e)=>s+(e.spent||e.cashTotal||0)+(e.cardTotal||0),0);
    return `<div class="hist-day">
      <div class="hist-day-hdr"><span>📅 ${fmtD(day)}</span><span>${fmt(dt)} сўм</span></div>
      ${es.map((e,ei)=>{
        const entryId = `hentry-${day}-${ei}`;
        const realIdx = h.indexOf(e);
        if (realIdx < 0) return "";
        const cashItemsArr = e.cashItems||[];
        const cardItemsArr = e.cardItems||[];
        const totalItems = cashItemsArr.length + cardItemsArr.length;
        const cashHtml = cashItemsArr.map(i=>`
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border);font-size:.78rem;">
            <span style="color:var(--text)">💰 ${esc(i.name)}${i.kg?` ${i.kg}кг`:""}${i.unitPrice?` (${fmt(i.unitPrice)})`:""}</span>
            <span style="color:var(--orange);font-weight:600">${fmt(i.totalPrice)} сўм</span>
          </div>`).join("");
        const cardHtml = cardItemsArr.map(i=>`
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border);font-size:.78rem;">
            <span style="color:var(--text)">💳 ${esc(i.name)}${i.kg?` ${i.kg}кг`:""}${i.unitPrice?` (${fmt(i.unitPrice)})`:""}</span>
            <span style="color:var(--purple);font-weight:600">${fmt(i.totalPrice)} сўм</span>
          </div>`).join("");
        const cashBal  = e.cashBalance ?? e.kassa ?? 0;
        const cardBal  = e.cardBalance ?? 0;
        const cashSpent = e.spent ?? e.cashTotal ?? 0;
        const cardSpent = e.cardTotal ?? 0;
        const cashLeft  = e.balance ?? e.remain ?? 0;
        const cardLeft  = cardBal - cardSpent;
        const totalBal  = cashBal + cardBal;
        const totalSpent = cashSpent + cardSpent;
        const totalLeft = totalBal - totalSpent;
        return `<div class="hist-entry" data-idx="${realIdx}">
          <div class="hist-top">
            <span class="hist-mkt">📍 ${esc(e.market)}</span>
            <span class="hist-rem ${cashLeft<0?'neg':''}" style="font-size:.7rem">🕐 ${e.time||""}</span>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:6px 0;font-size:.75rem;">
            <div style="background:var(--blue-bg);border-radius:8px;padding:6px 8px">
              <div style="color:var(--text2);font-size:.68rem">💵 Нақд касса</div>
              <div style="font-weight:700;color:var(--blue)">${fmt(cashBal)} сўм</div>
            </div>
            ${cardBal>0?`<div style="background:var(--purple-bg);border-radius:8px;padding:6px 8px">
              <div style="color:var(--text2);font-size:.68rem">💳 Карта</div>
              <div style="font-weight:700;color:var(--purple)">${fmt(cardBal)} сўм</div>
            </div>`:`<div></div>`}
            <div style="background:var(--orange-bg);border-radius:8px;padding:6px 8px">
              <div style="color:var(--text2);font-size:.68rem">💰 Нақд харажат</div>
              <div style="font-weight:700;color:var(--orange)">${fmt(cashSpent)} сўм</div>
            </div>
            ${cardSpent>0?`<div style="background:var(--purple-bg);border-radius:8px;padding:6px 8px">
              <div style="color:var(--text2);font-size:.68rem">💳 Карта харажат</div>
              <div style="font-weight:700;color:var(--purple)">${fmt(cardSpent)} сўм</div>
            </div>`:`<div></div>`}
            <div style="background:var(--green-bg);border-radius:8px;padding:6px 8px">
              <div style="color:var(--text2);font-size:.68rem">✅ Нақд қолди</div>
              <div style="font-weight:700;color:var(--green)">${fmt(cashLeft)} сўм</div>
            </div>
            ${cardBal>0?`<div style="background:var(--purple-bg);border-radius:8px;padding:6px 8px">
              <div style="color:var(--text2);font-size:.68rem">💳 Карта қолди</div>
              <div style="font-weight:700;color:var(--purple)">${fmt(cardLeft)} сўм</div>
            </div>`:`<div></div>`}
          </div>

          ${(cardBal>0 || cardSpent>0)?`<div style="background:var(--bg);border-radius:8px;padding:6px 10px;font-size:.76rem;display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="color:var(--text2)">📊 Умумий касса: <b style="color:var(--text)">${fmt(totalBal)} сўм</b></span>
            <span style="color:var(--text2)">Жами қолди: <b style="color:var(--green)">${fmt(totalLeft)} сўм</b></span>
          </div>`:""}

          ${e.note?`<div class="hist-note">📝 ${esc(e.note)}</div>`:""}
          <div style="display:flex;gap:6px;margin-top:6px;align-items:center;flex-wrap:wrap">
            ${totalItems?`<button onclick="toggleHistItems('${entryId}')" style="padding:4px 11px;border-radius:99px;border:none;font-size:.72rem;font-weight:600;cursor:pointer;background:var(--blue-bg);color:var(--blue);font-family:inherit" id="btn-${entryId}">📋 ${totalItems} та товар</button>`:""}
            <button onclick="resendEntryTGByIndex(${realIdx})" style="padding:4px 11px;border-radius:99px;border:none;font-size:.72rem;font-weight:600;cursor:pointer;background:var(--bg);color:var(--text2);font-family:inherit">✈️ TG</button>
            <button onclick="editHistMarketByIndex(${realIdx})" style="padding:4px 11px;border-radius:99px;border:none;font-size:.72rem;font-weight:600;cursor:pointer;background:var(--orange-bg);color:var(--orange);font-family:inherit">✏️ Точка</button>
            <button onclick="editHistEntry(${realIdx})" style="padding:4px 11px;border-radius:99px;border:none;font-size:.72rem;font-weight:600;cursor:pointer;background:var(--green-bg);color:var(--green);font-family:inherit">✏️ Таҳрир</button>
          </div>
          ${totalItems?`<div id="${entryId}" style="display:none;margin-top:6px;border-radius:var(--radius-xs);background:var(--bg);padding:6px 10px">${cashHtml}${cardHtml}</div>`:""}
        </div>`;
      }).join("")}
    </div>`;
  }).join("");
  setTimeout(bzAttachSwipes, 100);
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

function editHistMarketByIndex(realIdx) {
  const h = safeGetJSON("bz_history", []);
  const e = h[realIdx];
  if (!e) return;
  const markets = safeGetJSON("bz_markets", ["Куйлик","Фут Сити","Эко","Бошқа"]);
  
  // Modal яратамиз
  let existing = document.getElementById("editMarketModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "editMarketModal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-end;justify-content:center";
  modal.innerHTML = `
    <div style="background:var(--card);border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:480px;max-height:70vh;overflow-y:auto">
      <p style="font-weight:700;font-size:1rem;margin:0 0 4px">✏️ Точкани ўзгартириш</p>
      <p style="color:var(--text2);font-size:.8rem;margin:0 0 14px">Ҳозирги: <b style="color:var(--orange)">${esc(e.market)}</b> · ${e.date}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        ${markets.map(m => `
          <button onclick="confirmEditMarket(${realIdx},'${m.replace(/'/g,"\\'")}',this)"
            style="padding:12px;border-radius:12px;border:2px solid ${m===e.market?'var(--orange)':'var(--border)'};background:${m===e.market?'var(--orange-bg)':'var(--card)'};font-size:.85rem;font-weight:600;cursor:pointer;color:var(--text);font-family:inherit">
            ${m}
          </button>`).join("")}
      </div>
      <div style="display:flex;gap:8px">
        <input id="editMarketInp" class="field" placeholder="Бошқа бозор номи..." style="flex:1" value=""/>
        <button onclick="confirmEditMarket(${realIdx},document.getElementById('editMarketInp').value,null)"
          style="padding:10px 16px;border-radius:12px;border:none;background:var(--orange);color:#fff;font-weight:700;cursor:pointer;font-family:inherit">✓</button>
      </div>
      <button onclick="document.getElementById('editMarketModal').remove()"
        style="width:100%;margin-top:10px;padding:12px;border-radius:12px;border:none;background:var(--bg);color:var(--text2);font-weight:600;cursor:pointer;font-family:inherit">Бекор қилиш</button>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", ev => { if (ev.target === modal) modal.remove(); });
}

function editHistMarket(day, idx) {
  const h = safeGetJSON("bz_history", []);
  const grps = {};
  h.forEach((e, i) => {
    const d = e.date || "";
    if (!grps[d]) grps[d] = [];
    grps[d].push({ e, i });
  });
  if (!grps[day] || !grps[day][idx]) return;
  editHistMarketByIndex(grps[day][idx].i);
}

function confirmEditMarket(idx, newMarket, btn) {
  newMarket = (newMarket || "").trim();
  if (!newMarket) { showToast("⚠️ Точка номини киритинг"); return; }
  const h = safeGetJSON("bz_history", []);
  if (!h[idx]) return;
  const old = h[idx].market;
  h[idx].market = newMarket;
  localStorage.setItem("bz_history", JSON.stringify(h));
  document.getElementById("editMarketModal")?.remove();
  renderHistory();
  showToast(`✅ ${old} → ${newMarket}`);
}

/* ══════════════════════════════════════════
   ✏️ ТАРИХ ЁЗУВИНИ ТО'ЛИҚ ТАҲРИРЛАШ
══════════════════════════════════════════ */
function editHistEntry(idx) {
  const h = safeGetJSON("bz_history", []);
  if (!h[idx]) return;
  const e = h[idx];

  let existing = document.getElementById("editHistModal");
  if (existing) existing.remove();

  const cashRows = (e.cashItems || []).map((item, i) => `
    <div style="background:var(--bg);border-radius:10px;padding:8px 10px;margin-bottom:6px" id="cash-item-${i}">
      <div style="font-size:.72rem;color:var(--text2);margin-bottom:4px">💰 Нақд товар ${i+1}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <input class="field" style="flex:2;min-width:100px" placeholder="Товар номи" id="c-name-${i}" value="${esc(item.name||'')}"/>
        <input class="field" style="flex:1;min-width:70px" type="number" step="any" placeholder="кг" id="c-kg-${i}" value="${item.kg||''}"/>
        <input class="field" style="flex:1;min-width:80px" type="number" placeholder="Нарх" id="c-price-${i}" value="${item.unitPrice||''}"/>
        <input class="field" style="flex:1;min-width:80px" type="number" placeholder="Жами" id="c-total-${i}" value="${item.totalPrice||''}"/>
      </div>
    </div>`).join("");

  const cardRows = (e.cardItems || []).map((item, i) => `
    <div style="background:var(--bg);border-radius:10px;padding:8px 10px;margin-bottom:6px" id="card-item-${i}">
      <div style="font-size:.72rem;color:var(--text2);margin-bottom:4px">💳 Карта товар ${i+1}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <input class="field" style="flex:2;min-width:100px" placeholder="Товар номи" id="d-name-${i}" value="${esc(item.name||'')}"/>
        <input class="field" style="flex:1;min-width:70px" type="number" step="any" placeholder="кг" id="d-kg-${i}" value="${item.kg||''}"/>
        <input class="field" style="flex:1;min-width:80px" type="number" placeholder="Нарх" id="d-price-${i}" value="${item.unitPrice||''}"/>
        <input class="field" style="flex:1;min-width:80px" type="number" placeholder="Жами" id="d-total-${i}" value="${item.totalPrice||''}"/>
      </div>
    </div>`).join("");

  const modal = document.createElement("div");
  modal.id = "editHistModal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center;overflow-y:auto";
  modal.innerHTML = `
    <div style="background:var(--card);border-radius:20px 20px 0 0;padding:18px 16px 30px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto">
      <p style="font-weight:700;font-size:1rem;margin:0 0 2px">✏️ Ёзувни таҳрирлаш</p>
      <p style="color:var(--text2);font-size:.78rem;margin:0 0 14px">${e.date||''} · ${esc(e.market||'')}</p>

      <label style="font-size:.75rem;color:var(--text2);font-weight:600">📝 Изоҳ</label>
      <input class="field" id="eh-note" style="margin-bottom:12px" placeholder="Изоҳ..." value="${esc(e.note||'')}"/>

      ${cashRows ? `<div style="font-weight:600;font-size:.8rem;margin-bottom:8px;color:var(--text)">💰 Нақд товарлар</div>${cashRows}` : ""}
      ${cardRows ? `<div style="font-weight:600;font-size:.8rem;margin-bottom:8px;color:var(--text)">💳 Карта товарлар</div>${cardRows}` : ""}

      <div style="display:flex;gap:8px;margin-top:14px">
        <button onclick="document.getElementById('editHistModal').remove()"
          style="flex:1;padding:12px;border-radius:12px;border:none;background:var(--bg);color:var(--text2);font-weight:600;cursor:pointer;font-family:inherit">Бекор</button>
        <button onclick="saveHistEntry(${idx})"
          style="flex:2;padding:12px;border-radius:12px;border:none;background:var(--blue);color:#fff;font-weight:700;cursor:pointer;font-family:inherit">✅ Сақлаш</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", ev => { if (ev.target === modal) modal.remove(); });
}

function saveHistEntry(idx) {
  const h = safeGetJSON("bz_history", []);
  if (!h[idx]) return;
  const e = h[idx];

  // Izoh
  const noteEl = document.getElementById("eh-note");
  if (noteEl) e.note = noteEl.value.trim();

  // Naqd tovarlar
  (e.cashItems || []).forEach((item, i) => {
    const nameEl  = document.getElementById(`c-name-${i}`);
    const kgEl    = document.getElementById(`c-kg-${i}`);
    const priceEl = document.getElementById(`c-price-${i}`);
    const totalEl = document.getElementById(`c-total-${i}`);
    if (nameEl)  item.name       = nameEl.value.trim();
    if (kgEl)    item.kg         = kgEl.value ? +kgEl.value : "";
    if (priceEl) item.unitPrice  = +priceEl.value || 0;
    if (totalEl) item.totalPrice = +totalEl.value || item.totalPrice;
  });

  // Karta tovarlar
  (e.cardItems || []).forEach((item, i) => {
    const nameEl  = document.getElementById(`d-name-${i}`);
    const kgEl    = document.getElementById(`d-kg-${i}`);
    const priceEl = document.getElementById(`d-price-${i}`);
    const totalEl = document.getElementById(`d-total-${i}`);
    if (nameEl)  item.name       = nameEl.value.trim();
    if (kgEl)    item.kg         = kgEl.value ? +kgEl.value : "";
    if (priceEl) item.unitPrice  = +priceEl.value || 0;
    if (totalEl) item.totalPrice = +totalEl.value || item.totalPrice;
  });

  // Yangilangan jami
  e.cashTotal = (e.cashItems||[]).reduce((s,i)=>s+(i.totalPrice||0),0);
  e.cardTotal = (e.cardItems||[]).reduce((s,i)=>s+(i.totalPrice||0),0);
  e.spent     = e.cashTotal;
  e.balance   = (e.cashBalance ?? 0) - e.cashTotal;

  h[idx] = e;
  localStorage.setItem("bz_history", JSON.stringify(h));

  // Firebase ga yuborish
  if (typeof bzSaveHistoryEntry === "function") bzSaveHistoryEntry(e);

  document.getElementById("editHistModal")?.remove();
  renderHistory();
  if (typeof updateDashboard === "function") updateDashboard();
  showToast("✅ Ёзув янгиланди!");
}


function buildEntryReport(e) {
  const cashBalance = e.cashBalance??e.kassa??0;
  const cardBalance = e.cardBalance||0;
  const cashTotal    = e.cashTotal||e.spent||0;
  const cardTotal    = e.cardTotal||0;
  const totalBalance = cashBalance + cardBalance;
  const totalSpent   = cashTotal + cardTotal;
  const totalRemain  = e.balance!=null ? (e.balance + (cardBalance - cardTotal)) : (totalBalance - totalSpent);

  let r = `Расход · ${e.date||""}\n`;
  r += `📍 Точка: ${e.market||""}\n`;
  r += `💰 Касса: ${fmt(totalBalance)} сўм\n`;
  r += `\n`;

  const allItems = [...(e.cashItems||[]), ...(e.cardItems||[])].sort((a,b) => (a.seq||0) - (b.seq||0));
  allItems.forEach(i=>{ r+=`• ${i.name}`; if(i.kg) r+=` ${i.kg}кг`; if(i.unitPrice) r+=` (${fmt(i.unitPrice)})`; r+=` — ${fmt(i.totalPrice)} сўм\n`; });
  r += `\n`;

  if (e.note) r += `📝 Изоҳ: ${e.note}\n\n`;
  r += `💰 Умумий: ${fmt(totalSpent)} сўм\n`;
  r += `✅ Қолди: ${fmt(totalRemain)} сўм`;
  r += buildDebtSectionText(e.market||"", e.date||"");
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
  if(!confirm("Барча тарих ўчирилсинми?")) return false;
  localStorage.removeItem("bz_history");
  renderHistory();
  updateDashboard();
  updateStats();
  showToast("🗑️ Тарих тозаланди");
  return true;
}

/* ── CHARTS ── */
function setPeriod(p) {
  period = p;
  document.querySelectorAll(".period-btn").forEach(b=>b.classList.remove("active"));
  document.getElementById("pb-"+p).classList.add("active");
  updateCharts();
}
function filteredHist() {
  const h = safeGetJSON("bz_history", []);
  const now = new Date();
  if (period==="week") {
    const wa = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const waStr = `${wa.getFullYear()}-${String(wa.getMonth()+1).padStart(2,"0")}-${String(wa.getDate()).padStart(2,"0")}`;
    return h.filter(e=>e.date>=waStr);
  }
  if (period==="month"){
    const m = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    return h.filter(e=>e.date&&e.date.startsWith(m));
  }
  return h;
}
function updateCharts() {
  if (typeof Chart === "undefined") return;
  const barCanvas = document.getElementById("barChart");
  const pieCanvas = document.getElementById("pieChart");
  if (!barCanvas || !pieCanvas) return;

  const hist = filteredHist();
  const isDark = document.body.classList.contains("dark");
  const tc = isDark ? "#94a3b8" : "#6b7280";
  const gc = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const cb = isDark ? "#1c1f26" : "#ffffff";

  const byDay = {};
  hist.forEach(e=>{ byDay[e.date]=(byDay[e.date]||0)+(e.spent||e.cashTotal||0)+(e.cardTotal||0); });
  const days = Object.keys(byDay).sort();

  if (barInst) barInst.destroy();
  barInst = new Chart(barCanvas.getContext("2d"), {
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
  hist.forEach(e=>{
    const m = e.market || "Бошқа";
    byMkt[m]=(byMkt[m]||0)+(e.spent||e.cashTotal||0)+(e.cardTotal||0);
  });
  const mkts = Object.keys(byMkt);
  if (pieInst) pieInst.destroy();
  if (!mkts.length) return;
  const palette = ["#2563eb","#16a34a","#ea580c","#7c3aed","#dc2626","#0891b2","#f59e0b","#10b981","#6366f1","#ec4899"];
  const mktColors = mkts.map((_, i) => palette[i % palette.length]);

  pieInst = new Chart(pieCanvas.getContext("2d"), {
    type:"doughnut",
    data:{
      labels:mkts,
      datasets:[{ data:mkts.map(m=>byMkt[m]),
        backgroundColor: mktColors,
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
  return safeGetJSON("bz_templates", []);
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
  if (templates.find(t => t.name.toLowerCase() === p.name.toLowerCase())) { showToast("⚠️ Бу шаблон аллақачон бор"); return; }
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
function useTemplateByIndex(i) {
  const templates = getTemplates();
  const t = templates[i];
  if (!t) return;
  document.getElementById("cashInp").value = t.raw || (t.kg && t.unitPrice ? `${t.name} ${t.kg}кг (${t.unitPrice}) ${t.totalPrice}` : `${t.name} ${t.totalPrice}`);
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
    <div class="template-item" onclick="useTemplateByIndex(${i})">
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
  const h = safeGetJSON("bz_history", []);
  const map = {};
  h.forEach(entry => {
    const allItems = [...(entry.cashItems||[]), ...(entry.cardItems||[])];
    allItems.forEach(it => {
      if (!it || !it.name) return;
      const key = it.name.trim();
      if (!map[key]) map[key] = [];
      const itPrice = it.unitPrice || it.totalPrice;
      if (itPrice) {
        map[key].push({ date: entry.date, price: itPrice });
      }
    });
  });
  return map;
}

function renderPriceHistory() {
  const sel = document.getElementById("priceItemSel");
  const map = buildPriceHistory();
  const keys = Object.keys(map).sort();
  if (!keys.length) { 
    if (priceChartInst) { priceChartInst.destroy(); priceChartInst = null; }
    const infoEl = document.getElementById("priceChangeInfo");
    if (infoEl) infoEl.innerHTML = `<span style="color:var(--text2)">Тарих йўқ</span>`;
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
  const data = (map[name] || []).sort((a, b) => (a.date||"").localeCompare(b.date||""));
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
  if (typeof Chart === "undefined") return;
  const canvas = document.getElementById("priceLineChart");
  if (!canvas) return;
  priceChartInst = new Chart(canvas.getContext("2d"), {
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
  const h = safeGetJSON("bz_history", []);
  const itemMap = {}, mktMap = {};
  h.forEach(entry => {
    const m = entry.market || "Бошқа";
    mktMap[m] = (mktMap[m] || 0) + (entry.spent || entry.cashTotal || 0) + (entry.cardTotal || 0);
    const allItems = [...(entry.cashItems||[]), ...(entry.cardItems||[])];
    allItems.forEach(it => {
      if (!it || !it.name) return;
      const p = +it.totalPrice || 0;
      itemMap[it.name] = (itemMap[it.name] || 0) + p;
    });
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
        <span class="top-rank">${["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"][i]||"·"}</span>
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
   📑 ҲИСОБОТ ЭКСПОРТ (PDF & EXCEL)
══════════════════════════════════════════ */
let currentReportScope = "month";

function openReportModal(scope = "month") {
  currentReportScope = scope;
  renderReportContent(scope);
  const modal = document.getElementById("reportModal");
  if (modal) modal.classList.add("open");
}

function closeReportModal(e) {
  if (!e || e.target === document.getElementById("reportModal") || e.currentTarget === e.target) {
    const modal = document.getElementById("reportModal");
    if (modal) modal.classList.remove("open");
  }
}

function switchReportScope(scope) {
  currentReportScope = scope;
  const btnMonth = document.getElementById("repBtnMonth");
  const btnAll = document.getElementById("repBtnAll");
  if (btnMonth) btnMonth.classList.toggle("active", scope === "month");
  if (btnAll) btnAll.classList.toggle("active", scope === "all");
  renderReportContent(scope);
}

function renderReportContent(scope) {
  const h = safeGetJSON("bz_history", []);
  const debts = safeGetJSON("bz_debts", []);
  const monthInput = document.getElementById("histMonth");
  const targetMonth = monthInput?.value || today().slice(0, 7);

  const filtered = scope === "month" 
    ? h.filter(e => (e.date || "").startsWith(targetMonth))
    : h;

  const totalSpent = filtered.reduce((s, e) => s + (e.cashTotal ?? e.spent ?? 0) + (e.cardTotal || 0), 0);
  const totalDebts = debts.reduce((s, d) => s + (d.totalPrice || 0), 0);
  const count = filtered.length;
  const periodLabel = scope === "month" ? targetMonth + " ойи" : "Барча давр";

  let html = `
    <div style="border-bottom:1px dashed var(--border);padding-bottom:10px;margin-bottom:12px;text-align:center">
      <div style="font-weight:800;font-size:1.1rem;letter-spacing:-.3px">🛒 BOZORLIK ҲИСОБОТИ</div>
      <div style="color:var(--text2);font-size:.76rem;margin-top:2px">Давр: <b>${periodLabel}</b> · Шахсий харажатлар</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:var(--surface);padding:10px;border-radius:10px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:.7rem;color:var(--text2)">Жами харажат</div>
        <div style="font-size:1rem;font-weight:700;color:var(--orange)">${fmt(totalSpent)} сўм</div>
      </div>
      <div style="background:var(--surface);padding:10px;border-radius:10px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:.7rem;color:var(--text2)">Бозор сафарлари</div>
        <div style="font-size:1rem;font-weight:700;color:var(--blue)">${count} та</div>
      </div>
      <div style="background:var(--surface);padding:10px;border-radius:10px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:.7rem;color:var(--text2)">Фаол қарзлар</div>
        <div style="font-size:1rem;font-weight:700;color:var(--red)">${fmt(totalDebts)} сўм</div>
      </div>
      <div style="background:var(--surface);padding:10px;border-radius:10px;text-align:center;border:1px solid var(--border)">
        <div style="font-size:.7rem;color:var(--text2)">Қарзлар сони</div>
        <div style="font-size:1rem;font-weight:700;color:var(--text)">${debts.length} та</div>
      </div>
    </div>
  `;

  if (filtered.length) {
    html += `<div style="font-weight:700;margin-bottom:6px;font-size:.82rem">📅 Харидлар рўйхати (${filtered.length} та):</div>`;
    html += `<div style="max-height:190px;overflow-y:auto;margin-bottom:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface)">`;
    html += `<table style="width:100%;border-collapse:collapse;font-size:.74rem">
      <thead>
        <tr style="background:var(--bg);text-align:left;border-bottom:1px solid var(--border)">
          <th style="padding:6px">Сана</th>
          <th style="padding:6px">Бозор</th>
          <th style="padding:6px;text-align:right">Харажат</th>
        </tr>
      </thead>
      <tbody>`;
    filtered.forEach(e => {
      const sp = (e.cashTotal ?? e.spent ?? 0) + (e.cardTotal || 0);
      html += `
        <tr style="border-bottom:1px solid var(--border)">
          <td style="padding:6px;white-space:nowrap">${e.date}</td>
          <td style="padding:6px">${esc(e.market || "—")}</td>
          <td style="padding:6px;text-align:right;font-weight:600;color:var(--text)">${fmt(sp)} сўм</td>
        </tr>`;
    });
    html += `</tbody></table></div>`;
  } else {
    html += `<div style="color:var(--text2);text-align:center;padding:14px;background:var(--surface);border-radius:8px">Бу даврда харидлар топилмади</div>`;
  }

  const el = document.getElementById("reportContent");
  if (el) el.innerHTML = html;
}

function triggerPrintReport() {
  const h = safeGetJSON("bz_history", []);
  const debts = safeGetJSON("bz_debts", []);
  const monthInput = document.getElementById("histMonth");
  const targetMonth = monthInput?.value || today().slice(0, 7);

  const filtered = currentReportScope === "month" 
    ? h.filter(e => (e.date || "").startsWith(targetMonth))
    : h;

  const totalSpent = filtered.reduce((s, e) => s + (e.cashTotal ?? e.spent ?? 0) + (e.cardTotal || 0), 0);
  const totalDebts = debts.reduce((s, d) => s + (d.totalPrice || 0), 0);
  const periodLabel = currentReportScope === "month" ? targetMonth + " ойи" : "Барча давр";

  const rowsHtml = filtered.map((e, idx) => {
    const sp = (e.cashTotal ?? e.spent ?? 0) + (e.cardTotal || 0);
    const items = [...(e.cashItems||[]), ...(e.cardItems||[])]
      .map(i => `${i.name}${i.kg ? " ("+i.kg+"кг)" : ""} - ${fmt(i.totalPrice)} сўм`)
      .join(", ");
    return `
      <tr>
        <td style="border:1px solid #ddd;padding:6px;text-align:center">${idx+1}</td>
        <td style="border:1px solid #ddd;padding:6px;white-space:nowrap">${e.date} ${e.time||""}</td>
        <td style="border:1px solid #ddd;padding:6px">${e.market||"—"}</td>
        <td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:bold">${fmt(sp)} сўм</td>
        <td style="border:1px solid #ddd;padding:6px;font-size:9pt">${items || "—"}</td>
      </tr>
    `;
  }).join("");

  const debtsHtml = debts.map((d, idx) => `
    <tr>
      <td style="border:1px solid #ddd;padding:6px;text-align:center">${idx+1}</td>
      <td style="border:1px solid #ddd;padding:6px">${d.date}</td>
      <td style="border:1px solid #ddd;padding:6px;font-weight:bold">${d.who||"—"}</td>
      <td style="border:1px solid #ddd;padding:6px">${d.name} ${d.kg ? "("+d.kg+"кг)" : ""}</td>
      <td style="border:1px solid #ddd;padding:6px;text-align:right;font-weight:bold;color:#c00">${fmt(d.totalPrice)} сўм</td>
    </tr>
  `).join("");

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Bozorlik Hisoboti - ${periodLabel}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 24px; color: #111; line-height: 1.4; }
        h1 { margin: 0 0 4px; font-size: 18pt; }
        h2 { margin: 20px 0 8px; font-size: 13pt; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        .summary-box { display: flex; gap: 12px; margin: 16px 0; }
        .summary-card { flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 10px; text-align: center; background: #fafafa; }
        .summary-num { font-size: 15pt; font-weight: bold; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9.5pt; }
        th { background: #f2f2f2; border: 1px solid #ddd; padding: 7px; text-align: left; }
        @media print {
          body { margin: 8mm; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom:16px;display:flex;gap:10px">
        <button onclick="window.print()" style="padding:10px 18px;background:#007aff;color:#fff;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:10pt">🖨️ PDF сифатида сақлаш / Чоп этиш</button>
        <button onclick="window.close()" style="padding:10px 18px;background:#eee;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:10pt">Ёпиш</button>
      </div>

      <div style="border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:12px">
        <h1>🛒 BOZORLIK МОЛИЯВИЙ ҲИСОБОТИ</h1>
        <div style="color:#555;font-size:10pt">Ҳисобот даври: <b>${periodLabel}</b> | Ҳисобот тузилган вақт: <b>${today()}</b></div>
      </div>

      <div class="summary-box">
        <div class="summary-card">
          <div style="font-size:9pt;color:#666">Жами харажат</div>
          <div class="summary-num" style="color:#d9534f">${fmt(totalSpent)} сўм</div>
        </div>
        <div class="summary-card">
          <div style="font-size:9pt;color:#666">Бозор сафарлари</div>
          <div class="summary-num" style="color:#0275d8">${filtered.length} та</div>
        </div>
        <div class="summary-card">
          <div style="font-size:9pt;color:#666">Фаол қарзлар</div>
          <div class="summary-num" style="color:#f0ad4e">${fmt(totalDebts)} сўм</div>
        </div>
      </div>

      <h2>📅 Харидлар ва сафарлар тарихи</h2>
      <table>
        <thead>
          <tr>
            <th style="width:25px">#</th>
            <th style="width:110px">Сана ва вақт</th>
            <th style="width:110px">Бозор / Точка</th>
            <th style="width:105px;text-align:right">Харажат</th>
            <th>Харид қилинган товарлар</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || "<tr><td colspan='5' style='text-align:center;padding:12px'>Харидлар йўқ</td></tr>"}
        </tbody>
      </table>

      ${debts.length ? `
        <h2>📋 Фаол қарздорликлар рўйхати</h2>
        <table>
          <thead>
            <tr>
              <th style="width:25px">#</th>
              <th style="width:90px">Сана</th>
              <th style="width:130px">Кимга / Кимдан</th>
              <th>Товар</th>
              <th style="width:105px;text-align:right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${debtsHtml}
          </tbody>
        </table>
      ` : ""}

      <div style="margin-top:24px;font-size:8.5pt;color:#888;text-align:right">
        Bozorlik тизими орқали шакллантирилди.
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function exportCSV(scope = "month") {
  const h = safeGetJSON("bz_history", []);
  const debts = safeGetJSON("bz_debts", []);
  const monthInput = document.getElementById("histMonth");
  const targetMonth = monthInput?.value || today().slice(0, 7);

  const filtered = scope === "month" 
    ? h.filter(e => (e.date || "").startsWith(targetMonth))
    : h;

  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;

  let csv = "\uFEFF";
  csv += `ХАРАЖАТ ТАРИХИ (${scope === 'month' ? targetMonth : 'Барча давр'})\n`;
  csv += "Сана,Вақт,Точка,Касса,Харажат,Қолдиқ,Товарлар,Изоҳ\n";
  filtered.forEach(e => {
    const cashItemsStr = (e.cashItems || []).map(i => i.name + (i.kg ? " " + i.kg + "кг" : "") + " - " + i.totalPrice + " сўм").join(" | ");
    const cardItemsStr = (e.cardItems || []).map(i => i.name + (i.kg ? " " + i.kg + "кг" : "") + " - " + i.totalPrice + " сўм").join(" | ");
    const allItems = [cashItemsStr, cardItemsStr].filter(Boolean).join(" | ");
    const spent = (e.cashTotal ?? e.spent ?? 0) + (e.cardTotal || 0);
    csv += [cell(e.date), cell(e.time), cell(e.market), e.cashBalance || 0, spent, e.balance || 0, cell(allItems), cell(e.note)].join(",") + "\n";
  });

  csv += "\nҚАРЗЛАР\n";
  csv += "Сана,Ким,Точка,Товар,Миқдор,Нарх,Жами (сўм)\n";
  debts.forEach(d => {
    csv += [cell(d.date), cell(d.who), cell(d.market), cell(d.name), d.kg || "", d.unitPrice || "", d.totalPrice || 0].join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const date = today();
  const filename = scope === "month" ? `bozorlik_${targetMonth}.csv` : `bozorlik_all_${date}.csv`;
  a.href = url; 
  a.download = filename;
  a.click(); 
  URL.revokeObjectURL(url);
  showToast("📥 Excel (CSV) юклаб олинди!");
}

/* ══════════════════════════════════════════
   💾 JSON EXPORT / IMPORT — Backup & Restore
══════════════════════════════════════════ */

/* Барча маълумотларни JSON га экспорт */
function exportJSON() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    history:   safeGetJSON("bz_history",   []),
    debts:     safeGetJSON("bz_debts",     []),
    templates: safeGetJSON("bz_templates", []),
    cashBalance: getCashBalance(),
    cardBalance: getCardBalance(),
    tgToken:   localStorage.getItem("bz_tg_token") || "",
    tgChat:    localStorage.getItem("bz_tg_chat")  || "",
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const date = today();
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
          history:   safeGetJSON("bz_history",   []),
          debts:     safeGetJSON("bz_debts",     []),
          templates: safeGetJSON("bz_templates", []),
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
        if (data.cashBalance != null) setCashBalance(data.cashBalance);
        if (data.cardBalance != null) setCardBalance(data.cardBalance);
        if (data.tgToken) localStorage.setItem("bz_tg_token", data.tgToken);
        if (data.tgChat)  localStorage.setItem("bz_tg_chat",  data.tgChat);

        const incEl = document.getElementById("income");
        if (incEl) incEl.value = fmt(getCashBalance()) + " сўм";
        const cardIncEl = document.getElementById("cardIncome");
        if (cardIncEl) cardIncEl.value = fmt(getCardBalance()) + " сўм";

        renderTemplates(); loadAllDebts(); renderAllDebts(); updateStats();
        updateTgPill(); renderHistory();
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
  const h = safeGetJSON("bz_history", []);
  const monthMap = {};

  h.forEach(entry => {
    const ym = (entry.date || "").slice(0, 7); // "2025-05"
    if (!ym) return;
    monthMap[ym] = (monthMap[ym] || 0) + (entry.cashTotal || entry.spent || 0) + (entry.cardTotal || 0);
  });

  const months = Object.keys(monthMap).sort();
  const infoEl = document.getElementById("monthCompareInfo");

  if (months.length < 2) {
    if (monthCompareChartInst) { monthCompareChartInst.destroy(); monthCompareChartInst = null; }
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
  if (typeof Chart === "undefined") return;
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
  const cashLines = (d.cashItems || []).map((it, i) =>
    `<tr>
      <td>${i+1}. ${esc(it.name)}${it.kg ? " " + it.kg + "кг" : ""}</td>
      <td style="text-align:right;white-space:nowrap">${it.unitPrice ? fmt(it.unitPrice) + " × " + it.kg + "кг = " : ""}${fmt(it.totalPrice)} сўм</td>
    </tr>`).join("");

  const cardLines = (d.cardItems || []).map((it, i) =>
    `<tr style="color:var(--purple)">
      <td>💳 ${i+1}. ${esc(it.name)}${it.kg ? " " + it.kg + "кг" : ""}</td>
      <td style="text-align:right;white-space:nowrap">${it.unitPrice ? fmt(it.unitPrice) + " × " + it.kg + "кг = " : ""}${fmt(it.totalPrice)} сўм</td>
    </tr>`).join("");

  document.getElementById("receiptContent").innerHTML = `
    <div class="receipt-header">
      <div class="receipt-logo">🛒</div>
      <div class="receipt-title">BOZORLIK</div>
      <div class="receipt-sub">${esc(d.market)} · ${d.date} ${d.time || ""}</div>
    </div>
    <div class="receipt-divider">────────────────────</div>
    ${cashLines ? `<div style="font-size:.7rem;color:var(--text2);margin-bottom:3px;font-weight:600">💰 НАҚД</div><table class="receipt-table">${cashLines}</table>` : ""}
    ${cardLines ? `<div style="font-size:.7rem;color:var(--purple);margin:5px 0 3px;font-weight:600">💳 КАРТА</div><table class="receipt-table">${cardLines}</table>` : ""}
    <div class="receipt-divider">────────────────────</div>
    <div class="receipt-row"><span>Нақд касса:</span><span>${fmt(d.cashBalance)} сўм</span></div>
    ${d.cardBalance ? `<div class="receipt-row" style="color:var(--purple)"><span>Карта:</span><span>${fmt(d.cardBalance)} сўм</span></div>` : ""}
    ${d.cashTotal ? `<div class="receipt-row"><span>Нақд харажат:</span><span>${fmt(d.cashTotal)} сўм</span></div>` : ""}
    ${d.cardTotal ? `<div class="receipt-row" style="color:var(--purple)"><span>Карта харажат:</span><span>${fmt(d.cardTotal)} сўм</span></div>` : ""}
    <div class="receipt-row total-row"><span>Жами харажат:</span><span>${fmt((d.cashTotal||0)+(d.cardTotal||0))} сўм</span></div>
    <div class="receipt-row remain-row"><span>Нақд қолдиқ:</span><span>${fmt(d.balance)} сўм</span></div>
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
  const cashLines = (d.cashItems || []).map((it, i) =>
    `${i+1}. ${it.name}${it.kg ? " " + it.kg + "кг" : ""}${it.unitPrice ? " (" + fmt(it.unitPrice) + ")" : ""} — ${fmt(it.totalPrice)} сўм`).join("\n");
  const cardLines = (d.cardItems || []).map((it, i) =>
    `💳${i+1}. ${it.name}${it.kg ? " " + it.kg + "кг" : ""}${it.unitPrice ? " (" + fmt(it.unitPrice) + ")" : ""} — ${fmt(it.totalPrice)} сўм`).join("\n");

  let text = `🧾 ЧЕК — BOZORLIK\n📍 ${d.market} · ${d.date} ${d.time||""}\n${"─".repeat(24)}\n`;
  if (cashLines) text += `💰 НАҚД:\n${cashLines}\n`;
  if (cardLines) text += `\n💳 КАРТА:\n${cardLines}\n`;
  text += `${"─".repeat(24)}\n`;
  text += `💵 Нақд касса: ${fmt(d.cashBalance)} сўм\n`;
  if (d.cardBalance) text += `💳 Карта: ${fmt(d.cardBalance)} сўм\n`;
  if (d.cashTotal) text += `💰 Нақд харажат: ${fmt(d.cashTotal)} сўм\n`;
  if (d.cardTotal) text += `💳 Карта харажат: ${fmt(d.cardTotal)} сўм\n`;
  text += `🛒 Жами: ${fmt((d.cashTotal||0)+(d.cardTotal||0))} сўм\n`;
  text += `✅ Нақд қолдиқ: ${fmt(d.balance)} сўм`;
  if (d.note) text += `\n📝 ${d.note}`;

  const tgToken = localStorage.getItem("bz_tg_token");
  const tgChat  = localStorage.getItem("bz_tg_chat");
  if (!tgToken || !tgChat) { showToast("⚠️ Телеграм улаш керак"); return; }

  try {
    await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: tgChat, text })
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
  const card  = getCardBalance();
  const h     = safeGetJSON("bz_history", []);

  // Бугунги умумий расход (нақд + карта)
  const todayStr   = today();
  const todaySpent = h.filter(e => e.date === todayStr)
                      .reduce((s, e) => s + (e.cashTotal || e.spent || 0) + (e.cardTotal || 0), 0);

  // Охирги бозор
  // Eng so'nggi yozuvni date+time bo'yicha topamiz
  const last = h.length ? h.reduce((a, b) => {
    const ka = (a.date || "") + (a.time || "");
    const kb = (b.date || "") + (b.time || "");
    return kb > ka ? b : a;
  }) : null;
  const lastMkt = last ? (last.market || "—") + " " + fmtD(last.date) : "—";

  const kwEl   = document.getElementById("dw-kassa");
  const cardEl = document.getElementById("dw-card");
  const twEl   = document.getElementById("dw-today");
  const lwEl   = document.getElementById("dw-last");

  if (kwEl)   kwEl.textContent   = fmt(kassa) + " сўм";
  if (cardEl) cardEl.textContent = fmt(card)  + " сўм";
  if (twEl)   twEl.textContent   = fmt(todaySpent) + " сўм";
  if (lwEl)   lwEl.textContent   = lastMkt;
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
    const norm = bzNormalizeSpokenText(transcript);
    const inp = document.getElementById("cashInp");
    if (inp) { inp.value = norm; inp.focus(); }
    showToast("🎤 " + norm);
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

/* ── ОВОЗ МАТНИНИ ТОЗАЛАШ ВА НОРМАЛЛАШТИРИШ ── */
function bzNormalizeSpokenText(t) {
  if (!t) return "";
  let s = t.toLowerCase();
  const pairs = [
    [/ўн беш минг|o'?n besh ming/gi, "15000"],
    [/ўн минг|o'?n ming/gi, "10000"],
    [/йигирма беш минг|yigirma besh ming/gi, "25000"],
    [/йигирма минг|yigirma ming/gi, "20000"],
    [/ўттиз беш минг|o'?ttiz besh ming/gi, "35000"],
    [/ўттиз минг|o'?ttiz ming/gi, "30000"],
    [/қирқ беш минг|qirq besh ming/gi, "45000"],
    [/қирқ минг|qirq ming/gi, "40000"],
    [/эллик минг|ellik ming/gi, "50000"],
    [/олтмиш минг|oltmysh ming|oltmish ming/gi, "60000"],
    [/етмиш минг|yetmish ming/gi, "70000"],
    [/саксон минг|sakson ming/gi, "80000"],
    [/тўқсон минг|to'?qson ming/gi, "90000"],
    [/юз минг|yuz ming/gi, "100000"],
    [/икки юз минг|ikki yuz ming/gi, "200000"],
    [/уч юз минг|uch yuz ming/gi, "300000"],
    [/тўрт юз минг|to'?rt yuz ming/gi, "400000"],
    [/беш юз минг|besh yuz ming/gi, "500000"],
    [/бир миллион|bir million/gi, "1000000"],
    [/минг|ming/gi, "000"],
    [/ўн килограмм|ўн кило|o'?n kg|o'?n kilo/gi, "10кг"],
    [/беш килограмм|беш кило|besh kg|besh kilo/gi, "5кг"],
    [/йигирма килограмм|yigirma kg/gi, "20кг"],
    [/бир килограмм|бир кило|bir kg|bir kilo/gi, "1кг"],
    [/ярим килограмм|ярим кило|yarim kilo/gi, "0.5кг"],
    [/килограмм|кило|kilogramm|kilo/gi, "кг"]
  ];
  pairs.forEach(([rgx, repl]) => { s = s.replace(rgx, repl); });
  s = s.replace(/(\d)\s+(\d{3})(?!\d)/g, "$1$2");
  return s.trim();
}

/* ── ҚАРЗЛАР УЧУН ОВОЗЛИ КИРИТИШ ── */
let debtVoiceActive = false;
let debtRecognition = null;

function toggleDebtVoice() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    showToast("⚠️ Браузер овозни қўллаб-қувватламайди. Chrome ишлатинг.");
    return;
  }
  if (debtVoiceActive) {
    stopDebtVoice();
  } else {
    startDebtVoice();
  }
}

function startDebtVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  debtRecognition = new SR();
  debtRecognition.lang = "uz-UZ";
  debtRecognition.interimResults = false;
  debtRecognition.continuous = false;

  debtRecognition.onstart = () => {
    debtVoiceActive = true;
    const btn = document.getElementById("debtMicBtn");
    if (btn) { btn.textContent = "⏹"; btn.style.background = "var(--red)"; btn.style.color = "#fff"; }
    const vs = document.getElementById("debtVoiceStatus");
    if (vs) vs.style.display = "block";
  };

  debtRecognition.onresult = e => {
    let transcript = e.results[0][0].transcript;
    const norm = bzNormalizeSpokenText(transcript);
    const inp = document.getElementById("debtInp");
    if (inp) {
      inp.value = norm;
      inp.focus();
    }
    showToast("🎤 " + norm);
    stopDebtVoice();
  };

  debtRecognition.onerror = () => {
    stopDebtVoice();
    showToast("⚠️ Овоз танилмади, қайта уриниб кўринг");
  };
  debtRecognition.onend = () => stopDebtVoice();
  debtRecognition.start();
}

function stopDebtVoice() {
  debtVoiceActive = false;
  if (debtRecognition) {
    try { debtRecognition.stop(); } catch(e) {}
    debtRecognition = null;
  }
  const btn = document.getElementById("debtMicBtn");
  if (btn) { btn.textContent = "🎤"; btn.style.background = ""; btn.style.color = "var(--blue)"; }
  const vs = document.getElementById("debtVoiceStatus");
  if (vs) vs.style.display = "none";
}

/* ══════════════════════════════════════════
   🤖 BOZORLIK AI AGENTI (SMART ASSISTANT)
══════════════════════════════════════════ */
let aiVoiceActive = false;
let aiRecognition = null;

function openAiAgentModal() {
  const m = document.getElementById("aiAgentModal");
  if (m) {
    m.classList.add("open");
    setTimeout(() => {
      const inp = document.getElementById("aiInput");
      if (inp) inp.focus();
    }, 200);
  }
}

function closeAiAgentModal(e) {
  if (!e || e.target === document.getElementById("aiAgentModal")) {
    const m = document.getElementById("aiAgentModal");
    if (m) m.classList.remove("open");
    stopAiVoice();
  }
}

function bzAiQuickPrompt(txt) {
  const inp = document.getElementById("aiInput");
  if (inp) {
    inp.value = txt;
    bzSendAiMessage();
  }
}

function bzAiAppendMessage(role, htmlText) {
  const feed = document.getElementById("aiChatFeed");
  if (!feed) return;
  const div = document.createElement("div");
  div.className = "ai-msg " + role;
  div.innerHTML = htmlText;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

async function bzSendAiMessage() {
  const inp = document.getElementById("aiInput");
  if (!inp) return;
  const q = inp.value.trim();
  if (!q) return;

  inp.value = "";
  bzAiAppendMessage("user", esc(q));

  const feed = document.getElementById("aiChatFeed");
  const typingDiv = document.createElement("div");
  typingDiv.className = "ai-msg bot";
  typingDiv.id = "aiTypingIndicator";
  typingDiv.innerHTML = "🤖 <i>O'ylayapman...</i>";
  if (feed) {
    feed.appendChild(typingDiv);
    feed.scrollTop = feed.scrollHeight;
  }

  try {
    const answer = await bzProcessAiAgent(q);
    typingDiv.remove();
    bzAiAppendMessage("bot", answer);
  } catch(e) {
    typingDiv.remove();
    bzAiAppendMessage("bot", "⚠️ Xatolik yuz berdi: " + esc(e.message));
  }
}

function toggleAiVoice() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    showToast("⚠️ Браузер овозни қўллаб-қувватламайди.");
    return;
  }
  if (aiVoiceActive) {
    stopAiVoice();
  } else {
    startAiVoice();
  }
}

function startAiVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  aiRecognition = new SR();
  aiRecognition.lang = "uz-UZ";
  aiRecognition.interimResults = false;
  aiRecognition.continuous = false;

  aiRecognition.onstart = () => {
    aiVoiceActive = true;
    const btn = document.getElementById("aiMicBtn");
    if (btn) { btn.textContent = "⏹"; btn.style.background = "var(--red)"; btn.style.color = "#fff"; }
  };

  aiRecognition.onresult = e => {
    let transcript = e.results[0][0].transcript;
    const norm = bzNormalizeSpokenText(transcript);
    const inp = document.getElementById("aiInput");
    if (inp) inp.value = norm;
    stopAiVoice();
    bzSendAiMessage();
  };

  aiRecognition.onerror = () => stopAiVoice();
  aiRecognition.onend   = () => stopAiVoice();
  aiRecognition.start();
}

function stopAiVoice() {
  aiVoiceActive = false;
  if (aiRecognition) {
    try { aiRecognition.stop(); } catch(e) {}
    aiRecognition = null;
  }
  const btn = document.getElementById("aiMicBtn");
  if (btn) { btn.textContent = "🎤"; btn.style.background = ""; btn.style.color = "var(--blue)"; }
}

/* AI Agentning ichki tahliliy va boshqaruv mexanizmi */
async function bzProcessAiAgent(query) {
  const q = query.toLowerCase().trim();
  const hist = safeGetJSON("bz_history", []);
  const debts = safeGetJSON("bz_debts", []);
  const cashBal = typeof getCashBalance === "function" ? getCashBalance() : 0;
  const t = today();

  // 1. BUYRUQ: Tovar qo'shish (barcha xaridlar kassa/savatchaga qo'shiladi)
  if (!/qarz|қарз/i.test(q) && /qo'?sh|yoz|olindi|плюс|\+/i.test(q)) {
    const clean = q.replace(/naqdga|нақдга|kartaga|картага|naqd|нақд|karta|карта|qo'?sh|yoz|qil/gi, "").trim();
    const p = parse(clean);
    if (p) {
      p.seq = itemSeq++;
      p.market = getMarket();
      cashItems.push(p);
      renderCash();
      updateStats();
      bzHaptic("success");
      return `✅ <b>${esc(p.name)}</b> (${fmt(p.totalPrice)} сўм) savatga muvaffaqiyatli qo'shildi!<br>Joriy savatcha jami: <b>${fmt(cashItems.reduce((s,i)=>s+i.totalPrice,0))} сўм</b>`;
    }
  }

  // 2. BUYRUQ: Qarz qo'shish
  if (/qarz|қарз/i.test(q) && /qo'?sh|yoz|бердим|олди/i.test(q)) {
    const clean = q.replace(/qarzga|қарзга|qarz|қарз|qo'?sh|yoz/gi, "").trim();
    const p = parse(clean);
    if (p) {
      loadAllDebts();
      const newDebt = {
        ...p,
        date: today(),
        who: "",
        market: getMarket(),
        savedAt: today(),
        id: Date.now() + Math.random()
      };
      allDebtsArray.push(newDebt);
      saveAllDebtsToStorage();
      if (typeof bzSaveDebt === "function") bzSaveDebt(newDebt);
      renderAllDebts();
      updateStats();
      bzHaptic("success");
      return `📋 <b>${esc(p.name)}</b> (${fmt(p.totalPrice)} сўм) қарзлар рўйхатига қўшилди!<br>Жами барча қарзлар: <b>${fmt(allDebtsArray.reduce((s,d)=>s+d.totalPrice,0))} сўм</b>`;
    }
  }

  // 3. SAVOL: Bugungi holat va xulosalar
  if (/bugun|бугун|holat|ҳисобот|hisobot|qoldiq|қолдиқ|kassa|касса|balans|баланс/i.test(q)) {
    const todayHist = hist.filter(e => e.date === t);
    const todaySpend = todayHist.reduce((s,e) => s + (e.cashTotal ?? e.spent ?? 0) + (e.cardTotal || 0), 0);
    const cartCash = cashItems.reduce((s,i)=>s+i.totalPrice,0);
    const totalRem = cashBal - cartCash;

    return `
      <b>📊 Bugungi umumiy moliyaviy holat:</b><br><br>
      • 💵 <b>Kassa balansi:</b> ${fmt(cashBal)} сўм<br>
      • 🛒 <b>Hozirgi savatchada:</b> ${cashItems.length} ta tovar (${fmt(cartCash)} сўм)<br>
      • 📅 <b>Bugun tugatilgan xarajat:</b> ${fmt(todaySpend)} сўм<br>
      • ✅ <b>Kassada sof qoldiq:</b> <b style="color:${totalRem < 0 ? 'var(--red)':'var(--green)'}">${fmt(totalRem)} сўм</b>
    `;
  }

  // 5. SAVOL: Qarzlar tahlili
  if (/qarz|қарз|kimda|кимда|qarzdor/i.test(q)) {
    if (!debts.length) {
      return "🎉 Ajoyib! Hozirda hech qanday qarzdorlik mavjud emas.";
    }
    const totalDebt = debts.reduce((s,d)=>s+(d.totalPrice||0),0);
    const whoMap = {};
    debts.forEach(d => {
      const w = d.who ? d.who.trim() : "Noma'lum";
      whoMap[w] = (whoMap[w] || 0) + (d.totalPrice || 0);
    });
    const topDebtors = Object.entries(whoMap).sort((a,b)=>b[1]-a[1]);
    let debtDetails = topDebtors.slice(0, 4).map(([name, sum]) => `• 👤 <b>${esc(name)}:</b> ${fmt(sum)} сўм`).join("<br>");

    return `
      <b>📋 Qarzdorlik tahlili:</b><br><br>
      • <b>Jami qarz:</b> <span style="color:var(--red);font-weight:700">${fmt(totalDebt)} сўм</span> (${debts.length} ta tovar)<br>
      • <b>Asosiy qarzdorlar:</b><br>${debtDetails}<br><br>
      <i>💡 Maslahat: 'Қарзлар' bo'limida belgilangan qarzlar summasini alohida kuzatishingiz mumkin.</i>
    `;
  }

  // 6. SAVOL: Bozorlar va tochkalar tahlili
  if (/bozor|бозор|tochka|точка|qayer|қайер|arzon|арзон/i.test(q)) {
    if (!hist.length) {
      return "Tarixda hali xaridlar mavjud emas. Bir necha xaridlardan so'ng to'liq tahlil bera olaman.";
    }
    const mktMap = {};
    hist.forEach(e => {
      const m = e.market || "Boshqa";
      mktMap[m] = (mktMap[m] || 0) + (e.cashTotal || e.spent || 0) + (e.cardTotal || 0);
    });
    const sorted = Object.entries(mktMap).sort((a,b)=>b[1]-a[1]);
    const top = sorted[0];
    const totalAll = Object.values(mktMap).reduce((a,b)=>a+b,0);
    const pct = totalAll > 0 ? Math.round((top[1] / totalAll) * 100) : 0;

    let list = sorted.map(([m, s]) => `• 📍 <b>${m}:</b> ${fmt(s)} сўм (${Math.round((s/totalAll)*100)}%)`).join("<br>");

    return `
      <b>📍 Savdo nuqtalari (Bozorlar) tahlili:</b><br><br>
      Eng ko'p mablag' <b>${top[0]}</b> bozoriga sarflangan (${fmt(top[1])} сўм, umumiy xarajatning ${pct}% qismi).<br><br>
      <b>Tochkalar bo'yicha taqsimot:</b><br>${list}
    `;
  }

  // 7. SAVOL: Narxlar va tavsiyalar
  if (/tavsiya|тавсия|nima|maslahat|keyingi|rejala/i.test(q)) {
    const items = {};
    hist.forEach(e => {
      [...(e.cashItems||[]), ...(e.cardItems||[])].forEach(i => {
        if (!i.name) return;
        items[i.name] = (items[i.name] || 0) + 1;
      });
    });
    const frequent = Object.entries(items).sort((a,b)=>b[1]-a[1]).slice(0, 4);
    if (!frequent.length) {
      return "💡 Muntazam xaridlaringiz shakllangach, bu yerda shaxsiy tavsiyalarni ko'rsataman.";
    }
    const str = frequent.map(([n, c]) => `• 🛒 <b>${esc(n)}</b> (${c} marta xarid qilingan)`).join("<br>");
    return `
      <b>💡 Sizning eng doimiy xaridlaringiz:</b><br><br>
      ${str}<br><br>
      Bozorga borishdan oldin ushbu mahsulotlarning zaxirasini tekshirib olishingizni maslahat beraman.
    `;
  }

  // 8. BUYRUQ: Hisobot eksport / PDF / Excel
  if (/eksport|экспорт|pdf|пдф|excel|эксель|csv|hisobot.*yukla|хисобот.*юкла/i.test(q)) {
    setTimeout(() => {
      openReportModal('month');
    }, 400);
    return "📑 <b>Молиявий ҳисобот экспорт ойнаси очилди!</b><br>Ушбу ойнадан харажатлар ва қарзларни PDF (чоп этиш / PDF сақлаш) ёки Excel (CSV) форматида юклаб олишингиз мумкин.";
  }

  // 9. Tashqi Generativ LLM (agar API kaliti saqlangan bo'lsa)
  const aiKey = localStorage.getItem("bz_ai_key");
  if (aiKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": aiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: `Sen "Bozorlik" nomli bozor xarajatlari va qarz hisobchisi ilovasining aqlli AI assistentisan.
Foydalanuvchi ma'lumotlari:
- Naqd kassa: ${cashBal} so'm
- Karta kassa: ${cardBal} so'm
- Jami qarzlar soni: ${debts.length} ta
- Tarixdagi xaridlar: ${hist.length} ta
Foydalanuvchi savoli: "${query}".
O'zbek tilida qisqa, aniq va do'stona javob ber.`
          }]
        })
      });
      const data = await res.json();
      const txt = data.content?.[0]?.text;
      if (txt) return txt.replace(/\n/g, "<br>");
    } catch(err) {}
  }

  // Standart yordam
  return `
    Men sizning <b>Bozorlik AI Agenti</b>zman! 🤖<br><br>
    Quyidagi buyruq yoki savollarni berishingiz mumkin:<br>
    • <i>"Bugungi holat"</i> — kassa va bugungi xarajatlar<br>
    • <i>"Qarzlar tahlili"</i> — qarzlar kimda qancha<br>
    • <i>"Bozorlar tahlili"</i> — qaysi tochkaga ko'p sarflangan<br>
    • <i>"Naqdga Go'sht 120000 qo'sh"</i> — to'g'ridan-to'g'ri tovar qo'shish<br>
    • <i>"Aliga 50000 qarz yoz"</i> — tezkor qarz yozish
  `;
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
  const h = safeGetJSON("bz_history", []);
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  const cutStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,"0")}-${String(cutoff.getDate()).padStart(2,"0")}`;

  const period = h.filter(e => (e.date || "") >= cutStr);
  if (!period.length) return null;

  const total   = period.reduce((s, e) => s + (e.cashTotal || e.spent || 0) + (e.cardTotal || 0), 0);
  const markets = {};
  const items   = {};

  period.forEach(e => {
    markets[e.market] = (markets[e.market] || 0) + (e.cashTotal || e.spent || 0) + (e.cardTotal || 0);
    const allItems = [...(e.cashItems||[]), ...(e.cardItems||[])];
    allItems.forEach(it => {
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
}

async function sendMonthlyReport() {
  const txt = buildReport(30, "ОЙЛИК");
  if (!txt) { showToast("⚠️ Ойда маълумот йўқ"); return; }
  await sendTGText(txt);
}

function buildReportData(days) {
  const h = safeGetJSON("bz_history", []);
  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  const cutStr = toLocalDateStr(cutoff);
  const period = h.filter(e => (e.date || "") >= cutStr);
  if (!period.length) return null;
  const total = period.reduce((s, e) => s + (e.cashTotal || e.spent || 0) + (e.cardTotal || 0), 0);
  const markets = {}, items = {};
  period.forEach(e => {
    markets[e.market] = (markets[e.market] || 0) + (e.cashTotal || e.spent || 0) + (e.cardTotal || 0);
    [...(e.cashItems||[]), ...(e.cardItems||[])].forEach(it => { items[it.name] = (items[it.name] || 0) + it.totalPrice; });
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
  const debtDateEl = document.getElementById("debtDate");
  if (debtDateEl) debtDateEl.value = today();
  const histMonthEl = document.getElementById("histMonth");
  if (histMonthEl) histMonthEl.value = today().slice(0, 7);
  renderCash();
  renderTemplates();
  loadAllDebts();
  renderAllDebts();

  const cashBalance = getCashBalance();
  document.getElementById("income").value = fmt(cashBalance) + " сўм";
  document.getElementById("income").readOnly = true;

  const cardBalance = getCardBalance();
  const cardIncEl = document.getElementById("cardIncome");
  if (cardIncEl) { cardIncEl.value = fmt(cardBalance) + " сўм"; cardIncEl.readOnly = true; }

  renderCard();

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

  // Telegram Bot polling
  setTimeout(bzStartTgBot, 3000);
  // GPS bozor rejimi
  bzLoadMarketGeo();
  bzStartGps();
  bzInitMarketLongPress();
  // Narx tarixi hint
  setTimeout(bzAttachPriceHints, 500);
  // Hisobot scheduler
  bzStartReportScheduler();

});

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
