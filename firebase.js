/* ══════════════════════════════════════════
   🔥 FIREBASE REAL-TIME DATABASE ИНТЕГРАЦИЯ
   Bozorlik PWA — To'liq tuzatilgan versiya
══════════════════════════════════════════ */

// ─── 1. FIREBASE КОНФИГУРАЦИЯ ────────────────────────────────────────────────
const BZ_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDZD1UMcrL38mJV1EiG-Gkwrvzg8iPquXY",
  authDomain:        "bozorpro-cf5b2.firebaseapp.com",
  databaseURL:       "https://bozorpro-cf5b2-default-rtdb.firebaseio.com",
  projectId:         "bozorpro-cf5b2",
  storageBucket:     "bozorpro-cf5b2.firebasestorage.app",
  messagingSenderId: "919749340480",
  appId:             "1:919749340480:web:76073c1aeb82c24823dea5"
};

// ─── 2. ГЛОБАЛ ҲОЛАТ ─────────────────────────────────────────────────────────
window.BZ_FB = {
  db:        null,
  uid:       null,
  connected: false,
  patched:   false
};

// ─── 3. FIREBASE SDK ЮКЛАШ ───────────────────────────────────────────────────
function loadFirebaseSDK(callback) {
  const scripts = [
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js"
  ];
  let loaded = 0;
  scripts.forEach(src => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => { if (++loaded === scripts.length) callback(); };
    s.onerror = () => console.warn("Firebase SDK юкланмади:", src);
    document.head.appendChild(s);
  });
}

// ─── 4. ИНИЦИАЛИЗАЦИЯ ────────────────────────────────────────────────────────
function initFirebase() {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(BZ_FIREBASE_CONFIG);
    }
  } catch(e) {
    console.warn("Firebase init xato:", e);
    return;
  }

  window.BZ_FB.db = firebase.database();

  firebase.auth().signInAnonymously().catch(err => {
    console.warn("Firebase Auth:", err.message);
  });

  firebase.auth().onAuthStateChanged(user => {
    if (!user) return;
    window.BZ_FB.uid = user.uid;
    window.BZ_FB.connected = true;

    // Онлайн/офлайн кузатиш
    firebase.database().ref(".info/connected").on("value", snap => {
      if (snap.val() === true) {
        bzToast("🔥 Firebase ulandi ✓");
      }
    });

    // Real-time listeners
    bzStartListeners();

    // app.js DOMContentLoaded dan keyin yuklangan bo'lsa patch qilamiz
    bzPatchFunctions();
  });
}

// ─── 5. FIREBASE YO'L HELPER ─────────────────────────────────────────────────
function bzRef(path) {
  const uid = window.BZ_FB.uid;
  if (!uid || !window.BZ_FB.db) return null;
  return window.BZ_FB.db.ref("users/" + uid + "/" + path);
}

// ─── 6. REAL-TIME LISTENERS ──────────────────────────────────────────────────
function bzStartListeners() {

  // 6.1 Balanslar
  const balRef = bzRef("balances");
  if (balRef) {
    balRef.on("value", snap => {
      const d = snap.val();
      if (!d) return;
      if (d.cash !== undefined) {
        localStorage.setItem("bz_cash_balance", d.cash);
      }
      if (d.card !== undefined) {
        localStorage.setItem("bz_card_balance", d.card);
      }
      // UI refresh — faqat agar funksiya mavjud bo'lsa
      if (typeof updateStats === "function") {
        // localStorage.setItem patch loop oldini olish uchun flag
        window._bzSyncingBalance = true;
        updateStats();
        window._bzSyncingBalance = false;
      }
    });
  }

  // 6.2 Tarix
  const histRef = bzRef("history");
  if (histRef) {
    histRef.on("value", snap => {
      const d = snap.val();
      if (!d) return;
      const arr = Object.values(d).sort((a, b) => {
        const ka = (a.date || "") + (a.time || "");
        const kb = (b.date || "") + (b.time || "");
        return kb.localeCompare(ka);
      }).slice(0, 300);

      window._bzSyncingHistory = true;
      localStorage.setItem("bz_history", JSON.stringify(arr));
      window._bzSyncingHistory = false;

      // Agar history tab ochiq bo'lsa render qilamiz
      const histTab = document.getElementById("tab-history");
      if (histTab && histTab.classList.contains("active") && typeof renderHistory === "function") {
        renderHistory();
      }
      if (typeof updateDashboard === "function") updateDashboard();
    });
  }

  // 6.3 Qarzlar
  const debtRef = bzRef("debts");
  if (debtRef) {
    debtRef.on("value", snap => {
      const d = snap.val();
      const arr = d ? Object.values(d) : [];

      window._bzSyncingDebts = true;
      localStorage.setItem("bz_debts", JSON.stringify(arr));
      window.allDebtsArray = arr; // app.js global array
      window._bzSyncingDebts = false;

      const debtTab = document.getElementById("tab-debt");
      if (debtTab && debtTab.classList.contains("active") && typeof renderAllDebts === "function") {
        renderAllDebts();
      }
      if (typeof updateStats === "function") updateStats();
    });
  }

  // 6.4 Shablonlar
  const tmplRef = bzRef("templates");
  if (tmplRef) {
    tmplRef.on("value", snap => {
      const d = snap.val();
      const arr = d ? Object.values(d) : [];
      window._bzSyncingTemplates = true;
      localStorage.setItem("bz_templates", JSON.stringify(arr));
      window._bzSyncingTemplates = false;
      if (typeof renderTemplates === "function") renderTemplates();
    });
  }

  // 6.5 Sozlamalar
  const settRef = bzRef("settings");
  if (settRef) {
    settRef.on("value", snap => {
      const d = snap.val();
      if (!d) return;
      if (d.tg_token) localStorage.setItem("bz_tg_token", d.tg_token);
      if (d.tg_chat)  localStorage.setItem("bz_tg_chat",  d.tg_chat);
      if (d.gs_url)   localStorage.setItem("bz_gs_url",   d.gs_url);
      if (d.dark !== undefined) {
        localStorage.setItem("bz_dark", d.dark ? "1" : "0");
      }
      if (typeof updateTgPill === "function") updateTgPill();
      if (typeof updateGsPill === "function") updateGsPill();
    });
  }
}

// ─── 7. YOZISH FUNKSIYALARI ──────────────────────────────────────────────────

function bzSaveBalance(cash, card) {
  const ref = bzRef("balances");
  if (!ref) return;
  ref.set({ cash: +cash || 0, card: +card || 0, updatedAt: Date.now() })
     .catch(e => console.warn("bzSaveBalance:", e));
}

function bzSaveHistoryEntry(entry) {
  const ref = bzRef("history");
  if (!ref) return;
  if (!entry.fbKey) entry.fbKey = ref.push().key;
  ref.child(entry.fbKey).set(entry)
     .catch(e => console.warn("bzSaveHistoryEntry:", e));
}

// Firebase key sanitizer (. # $ / [ ] bo'lmasligi kerak)
function bzSafeKey(id) {
  return String(id || Date.now()).replace(/[\.#$\/\[\]]/g, "_");
}

function bzSaveDebt(debt) {
  const ref = bzRef("debts");
  if (!ref) return;
  const key = debt.fbKey || bzSafeKey(debt.id || Date.now());
  debt.fbKey = key;
  ref.child(key).set(debt)
     .catch(e => console.warn("bzSaveDebt:", e));
}

function bzDeleteDebt(debt) {
  if (!debt || !debt.fbKey) return;
  const ref = bzRef("debts/" + debt.fbKey);
  if (!ref) return;
  ref.remove().catch(e => console.warn("bzDeleteDebt:", e));
}

function bzDeleteAllDebts() {
  const ref = bzRef("debts");
  if (!ref) return;
  ref.remove().catch(e => console.warn("bzDeleteAllDebts:", e));
}

function bzClearHistory() {
  const ref = bzRef("history");
  if (!ref) return;
  ref.remove().catch(e => console.warn("bzClearHistory:", e));
}

function bzSaveSettings(obj) {
  const ref = bzRef("settings");
  if (!ref) return;
  ref.update(obj).catch(e => console.warn("bzSaveSettings:", e));
}

function bzSaveTemplates(arr) {
  const ref = bzRef("templates");
  if (!ref) return;
  const obj = {};
  arr.forEach((t, i) => { obj[String(i)] = t; });
  ref.set(obj).catch(e => console.warn("bzSaveTemplates:", e));
}

// ─── 8. APP.JS FUNKSIYALARINI PATCH QILISH ───────────────────────────────────
// MUHIM: app.js DOMContentLoaded ni ham ishlatadi,
// shuning uchun biz ham DOMContentLoaded dan keyin patch qilamiz
// LEKIN Firebase auth async — shuning uchun bzPatchFunctions
// auth callback ichida chaqiriladi

function bzPatchFunctions() {
  if (window.BZ_FB.patched) return;
  window.BZ_FB.patched = true;

  // 8.1 saveHistory → Firebase ga qo'shimcha saqlaymiz
  const _saveHistory = window.saveHistory;
  if (typeof _saveHistory === "function") {
    window.saveHistory = function(entry) {
      _saveHistory(entry);
      bzSaveHistoryEntry(entry);
    };
  }

  // 8.2 addDebt → Firebase ga saqlaymiz
  // app.js dagi addDebt ichida allDebtsArray.push qilinadi,
  // keyin saveAllDebtsToStorage chaqiriladi
  const _saveAllDebtsToStorage = window.saveAllDebtsToStorage;
  if (typeof _saveAllDebtsToStorage === "function") {
    window.saveAllDebtsToStorage = function() {
      _saveAllDebtsToStorage();
      // allDebtsArray dan oxirgi elementni Firebase ga yuboramiz
      // Bu funksiya faqat addDebt va deleteAllDebt da chaqiriladi
      // deleteAllDebt da alohida handle qilamiz
    };
  }

  // addDebt ni to'g'ridan to'g'ri patch qilamiz
  const _addDebt = window.addDebt;
  if (typeof _addDebt === "function") {
    window.addDebt = function() {
      const prevLen = (window.allDebtsArray || []).length;
      _addDebt();
      const arr = window.allDebtsArray || [];
      if (arr.length > prevLen) {
        const newDebt = arr[arr.length - 1];
        bzSaveDebt(newDebt);
      }
    };
  }

  // 8.3 deleteAllDebt
  const _deleteAllDebt = window.deleteAllDebt;
  if (typeof _deleteAllDebt === "function") {
    window.deleteAllDebt = function(idx) {
      const arr = window.allDebtsArray || [];
      const debt = arr[idx];
      _deleteAllDebt(idx);
      if (debt) bzDeleteDebt(debt);
    };
  }

  // 8.4 deleteSelectedAllDebts — ommaviy o'chirish
  const _deleteSelectedAllDebts = window.deleteSelectedAllDebts;
  if (typeof _deleteSelectedAllDebts === "function") {
    window.deleteSelectedAllDebts = function() {
      const selected = window.getAllSelectedDebtIndexes ? window.getAllSelectedDebtIndexes() : [];
      const arr = window.allDebtsArray || [];
      const toDelete = selected.map(i => arr[i]).filter(Boolean);
      _deleteSelectedAllDebts();
      toDelete.forEach(d => bzDeleteDebt(d));
    };
  }

  // 8.5 clearAllDebts
  const _clearAllDebts = window.clearAllDebts;
  if (typeof _clearAllDebts === "function") {
    window.clearAllDebts = function() {
      _clearAllDebts();
      bzDeleteAllDebts();
    };
  }

  // 8.6 clearHistory
  const _clearHistory = window.clearHistory;
  if (typeof _clearHistory === "function") {
    window.clearHistory = function() {
      _clearHistory();
      bzClearHistory();
    };
  }

  // 8.7 saveTemplates
  const _saveTemplates = window.saveTemplates;
  if (typeof _saveTemplates === "function") {
    window.saveTemplates = function(arr) {
      _saveTemplates(arr);
      bzSaveTemplates(arr);
    };
  }

  // 8.8 setCashBalance / setCardBalance
  const _setCashBalance = window.setCashBalance;
  if (typeof _setCashBalance === "function") {
    window.setCashBalance = function(amount) {
      const result = _setCashBalance(amount);
      if (!window._bzSyncingBalance) {
        const card = +localStorage.getItem("bz_card_balance") || 0;
        bzSaveBalance(amount, card);
      }
      return result;
    };
  }

  const _setCardBalance = window.setCardBalance;
  if (typeof _setCardBalance === "function") {
    window.setCardBalance = function(amount) {
      const result = _setCardBalance(amount);
      if (!window._bzSyncingBalance) {
        const cash = +localStorage.getItem("bz_cash_balance") || 0;
        bzSaveBalance(cash, amount);
      }
      return result;
    };
  }

  // 8.9 saveTg
  const _saveTg = window.saveTg;
  if (typeof _saveTg === "function") {
    window.saveTg = function() {
      _saveTg();
      bzSaveSettings({
        tg_token: localStorage.getItem("bz_tg_token") || "",
        tg_chat:  localStorage.getItem("bz_tg_chat")  || ""
      });
    };
  }

  // 8.10 saveGs
  const _saveGs = window.saveGs;
  if (typeof _saveGs === "function") {
    window.saveGs = function() {
      _saveGs();
      bzSaveSettings({ gs_url: localStorage.getItem("bz_gs_url") || "" });
    };
  }

  // 8.11 toggleDark
  const _toggleDark = window.toggleDark;
  if (typeof _toggleDark === "function") {
    window.toggleDark = function() {
      _toggleDark();
      bzSaveSettings({ dark: document.body.classList.contains("dark") });
    };
  }

  // 8.12 confirmEditMarket — tarix yozuvida bozor nomini o'zgartirish
  const _confirmEditMarket = window.confirmEditMarket;
  if (typeof _confirmEditMarket === "function") {
    window.confirmEditMarket = function(idx, newMarket, btn) {
      const h = JSON.parse(localStorage.getItem("bz_history") || "[]");
      const entry = h[idx];
      _confirmEditMarket(idx, newMarket, btn);
      if (entry && entry.fbKey) {
        const ref = bzRef("history/" + entry.fbKey + "/market");
        if (ref) ref.set((newMarket || "").trim());
      }
    };
  }

  console.log("✅ Firebase patches qo'yildi");
}

// ─── 9. TOAST HELPER ─────────────────────────────────────────────────────────
let _bzToastTimer = null;
function bzToast(msg) {
  clearTimeout(_bzToastTimer);
  _bzToastTimer = setTimeout(() => {
    if (typeof showToast === "function") showToast(msg);
  }, 600);
}

// ─── 10. MIGRATSIYA: localStorage → Firebase ─────────────────────────────────
window.bzMigrateToFirebase = async function() {
  if (!window.BZ_FB.connected) {
    if (typeof showToast === "function") showToast("⚠️ Firebase ulanmagan, kuting...");
    return;
  }

  if (typeof showToast === "function") showToast("🔄 Ko'chirilmoqda...");

  // Balans
  const cash = +localStorage.getItem("bz_cash_balance") || 0;
  const card = +localStorage.getItem("bz_card_balance") || 0;
  bzSaveBalance(cash, card);

  // Tarix
  const history = JSON.parse(localStorage.getItem("bz_history") || "[]");
  const histRef = bzRef("history");
  if (histRef && history.length) {
    const obj = {};
    history.forEach(entry => {
      if (!entry.fbKey) entry.fbKey = histRef.push().key;
      obj[entry.fbKey] = entry;
    });
    await histRef.set(obj);
    localStorage.setItem("bz_history", JSON.stringify(history));
  }

  // Qarzlar
  const debts = JSON.parse(localStorage.getItem("bz_debts") || "[]");
  const debtRef = bzRef("debts");
  if (debtRef && debts.length) {
    const obj = {};
    debts.forEach(debt => {
      const key = debt.fbKey || bzSafeKey(debt.id || Date.now());
      debt.fbKey = key;
      obj[key] = debt;
    });
    await debtRef.set(obj);
    localStorage.setItem("bz_debts", JSON.stringify(debts));
  }

  // Shablonlar
  const templates = JSON.parse(localStorage.getItem("bz_templates") || "[]");
  if (templates.length) bzSaveTemplates(templates);

  // Sozlamalar
  const settings = {};
  const tgToken = localStorage.getItem("bz_tg_token");
  const tgChat  = localStorage.getItem("bz_tg_chat");
  const gsUrl   = localStorage.getItem("bz_gs_url");
  const dark    = localStorage.getItem("bz_dark");
  if (tgToken) settings.tg_token = tgToken;
  if (tgChat)  settings.tg_chat  = tgChat;
  if (gsUrl)   settings.gs_url   = gsUrl;
  if (dark)    settings.dark     = dark === "1";
  if (Object.keys(settings).length) bzSaveSettings(settings);

  const msg = `✅ ${history.length} tarix, ${debts.length} qarz Firebase ga ko'chirildi!`;
  console.log(msg);
  if (typeof showToast === "function") showToast(msg);
};

// ─── 11. ISHGA TUSHIRISH ─────────────────────────────────────────────────────
// app.js dan OLDIN yuklangani uchun:
// 1) SDK ni yuklaymiz
// 2) DOMContentLoaded dan keyin initFirebase
// 3) Firebase auth callback ichida bzPatchFunctions (app.js funksiyalari tayyor bo'lganda)

loadFirebaseSDK(function() {
  // SDK tayyor, ammo DOM va app.js ham tayyor bo'lishi kerak
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFirebase);
  } else {
    // DOM allaqachon tayyor (script defer bo'lsa)
    setTimeout(initFirebase, 100);
  }
});
