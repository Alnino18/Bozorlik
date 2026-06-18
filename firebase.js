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

    // Doimiy UID: bir marta saqlangan UID ni ishlatamiz
    // Bu kompyuter, telefon, brauzer tozalansa ham bir xil qoladi
    const SAVED_UID_KEY = "bz_device_uid";
    let deviceUID = localStorage.getItem(SAVED_UID_KEY);

    if (!deviceUID) {
      // Birinchi ulanish — auth UID ni doimiy saqlaymiz
      deviceUID = user.uid;
      localStorage.setItem(SAVED_UID_KEY, deviceUID);
      console.log("✅ Yangi qurilma UID saqlandi:", deviceUID);
    } else {
      console.log("✅ Saqlangan UID ishlatildi:", deviceUID);
    }

    window.BZ_FB.uid = deviceUID;
    window.BZ_FB.connected = true;

    // Онлайн/офлайн кузатиш
    firebase.database().ref(".info/connected").on("value", snap => {
      if (snap.val() === true) {
        bzToast("🔥 Firebase ulandi ✓");
      }
    });

    // Real-time listeners
    bzStartListeners();

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
    // Avval oxirgi 500 tasini yuklaymiz — tezroq ishlaydi
    histRef.limitToLast(500).on("value", snap => {
      const d = snap.val();
      if (!d) return;
      const arr = Object.values(d).sort((a, b) => {
        const ka = (a.date || "") + (a.time || "");
        const kb = (b.date || "") + (b.time || "");
        return kb.localeCompare(ka);
      });

      window._bzSyncingHistory = true;
      localStorage.setItem("bz_history", JSON.stringify(arr));
      window._bzSyncingHistory = false;

      // UI yangilash
      const histTab = document.getElementById("tab-history");
      if (histTab && histTab.classList.contains("active") && typeof renderHistory === "function") {
        renderHistory();
      }
      if (typeof updateDashboard === "function") updateDashboard();
      if (typeof updateStats === "function") updateStats();
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

      // Default TG sozlamalari — Firebase bo'sh bo'lsa ham ishlaydi
      const TG_TOKEN = "8631566876:AAHDinet5d5PF1NE4E_GNPWAIzDhP4g2O8M";
      const TG_CHAT  = "483325961";

      const token = (d && d.tg_token) ? d.tg_token : TG_TOKEN;
      const chat  = (d && d.tg_chat)  ? d.tg_chat  : TG_CHAT;

      localStorage.setItem("bz_tg_token", token);
      localStorage.setItem("bz_tg_chat",  chat);

      // Firebase ga ham saqlaymiz (bir marta)
      if (!d || !d.tg_token) {
        bzSaveSettings({ tg_token: TG_TOKEN, tg_chat: TG_CHAT });
      }

      if (d && d.dark !== undefined) {
        localStorage.setItem("bz_dark", d.dark ? "1" : "0");
      }
      if (typeof updateTgPill === "function") updateTgPill();
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

// ─── 8. APP.JS FUNKSIYALARINI PATCH QILISH ─────────────────────────────────
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
  const _addDebt = window.addDebt;
  if (typeof _addDebt === "function") {
    window.addDebt = function() {
      // Oldingi holat
      const prevDebts = JSON.parse(localStorage.getItem("bz_debts") || "[]");
      const prevLen = prevDebts.length;
      _addDebt();
      // Yangi holatni olish
      const newDebts = JSON.parse(localStorage.getItem("bz_debts") || "[]");
      if (newDebts.length > prevLen) {
        const newDebt = newDebts[newDebts.length - 1];
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
      const selected = typeof getAllSelectedDebtIndexes === "function"
        ? getAllSelectedDebtIndexes() : [];
      const arr = JSON.parse(localStorage.getItem("bz_debts") || "[]");
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
      bzDeleteAllDebts(); // Firebase dan ham o'chirish
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


  // 8.12 confirmEditMarket — tarix yozuvida bozor nomini o'zgartirish
  const _confirmEditMarket = window.confirmEditMarket;
  if (typeof _confirmEditMarket === "function") {
    window.confirmEditMarket = function(idx, newMarket, btn) {
      // app.js idx ni ishlatadi — history arraydan to'g'ri entry ni olamiz
      const h = JSON.parse(localStorage.getItem("bz_history") || "[]");
      const entry = h[idx];
      const fbKey = entry && entry.fbKey;
      _confirmEditMarket(idx, newMarket, btn);
      // Firebase da yangilash
      if (fbKey && newMarket && newMarket.trim()) {
        const ref = bzRef("history/" + fbKey + "/market");
        if (ref) ref.set(newMarket.trim());
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

// ─── 10. ISHGA TUSHIRISH ─────────────────────────────────────────────────────
loadFirebaseSDK(function() {
  // SDK tayyor, ammo DOM va app.js ham tayyor bo'lishi kerak
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFirebase);
  } else {
    // DOM allaqachon tayyor (script defer bo'lsa)
    setTimeout(initFirebase, 100);
  }
});

// ─── 11. FIREBASE DAN TO'G'RIDAN EKSPORT ────────────────────────────────────
window.bzExportFromFirebase = async function() {
  if (!window.BZ_FB.connected) {
    if (typeof showToast === "function") showToast("⚠️ Firebase ulanmagan");
    return;
  }
  if (typeof showToast === "function") showToast("🔄 Firebase dan yuklanmoqda...");

  try {
    const uid = window.BZ_FB.uid;
    const db  = window.BZ_FB.db;

    const [balSnap, histSnap, debtSnap, tmplSnap, settSnap] = await Promise.all([
      db.ref("users/" + uid + "/balances").once("value"),
      db.ref("users/" + uid + "/history").once("value"),
      db.ref("users/" + uid + "/debts").once("value"),
      db.ref("users/" + uid + "/templates").once("value"),
      db.ref("users/" + uid + "/settings").once("value"),
    ]);

    const bal      = balSnap.val()  || {};
    const histObj  = histSnap.val() || {};
    const debtObj  = debtSnap.val() || {};
    const tmplObj  = tmplSnap.val() || {};
    const sett     = settSnap.val() || {};

    const history   = Object.values(histObj).sort((a, b) => {
      const ka = (a.date || "") + (a.time || "");
      const kb = (b.date || "") + (b.time || "");
      return kb.localeCompare(ka);
    });
    const debts     = Object.values(debtObj);
    const templates = Object.values(tmplObj);

    const data = {
      version:     1,
      exportedAt:  new Date().toISOString(),
      source:      "firebase",
      history,
      debts,
      templates,
      cashBalance: bal.cash || 0,
      cardBalance: bal.card || 0,
      tgToken:     sett.tg_token || "",
      tgChat:      sett.tg_chat  || "",
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = "bozorlik_firebase_" + date + ".json";
    a.click();
    URL.revokeObjectURL(url);

    if (typeof showToast === "function") {
      showToast("✅ " + history.length + " tarix, " + debts.length + " qarz yuklandi!");
    }
  } catch(e) {
    console.warn("bzExportFromFirebase:", e);
    if (typeof showToast === "function") showToast("❌ Xatolik: " + e.message);
  }
};
