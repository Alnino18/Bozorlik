// BOZORLIK PWA - app.js
// Тузатишлар: фақат охирги рақам олинади, нуқта минглик ажратгич сифатида қолади,
// тан нархи сақланади, касса текшируви ва localStorage билан сақлаш.

let items = [];
let selectedMarket = "Куйлик";

const STORAGE_KEY = "bozorlik_data_v1";

document.addEventListener("DOMContentLoaded", () => {
  // Инициализация: localStorage дан ўқиш
  loadFromStorage();
  // default active market
  const firstBtn = document.querySelector("#markets button");
  if(firstBtn && !document.querySelector("#markets button.active")) {
    setMarket(selectedMarket, firstBtn);
  }
  // cash input formatting on blur
  const cashInput = document.getElementById("cash");
  cashInput.addEventListener("blur", () => {
    const v = parseNumberFromString(cashInput.value);
    if(!isNaN(v)) cashInput.value = formatNumber(v);
  });
});

// Форматлаш: 1.380.000
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return Number(num).toLocaleString("uz-UZ").replace(/,/g, ".");
}

// Парс: матндан рақамни олиш (нуқталарни олиб ташлаб integer)
function parseNumberFromString(str) {
  if(!str) return NaN;
  // топилган рақамлар (масалан: ["10","15","150.000"])
  const nums = str.match(/[\d.]+/g);
  if(!nums || nums.length === 0) return NaN;
  const lastRaw = nums[nums.length - 1];
  const cleaned = lastRaw.replace(/\./g, "");
  return parseInt(cleaned, 10);
}

// setMarket
function setMarket(market, btn) {
  selectedMarket = market;
  document.querySelectorAll("#markets button").forEach(b => b.classList.remove("active"));
  if(btn) btn.classList.add("active");
  saveToStorage();
}

// addItem: киритилган матндан фақат охирги рақамни олади, тан нархи (в скобках) сақланади
function addItem() {
  const inputEl = document.getElementById("itemInput");
  const input = inputEl.value.trim();
  if(!input) {
    alert("Илтимос, товар матнини киритинг.");
    return;
  }

  // Охирги рақамни олиш (умумий нарх)
  const totalPrice = parseNumberFromString(input);
  if(isNaN(totalPrice)) {
    alert("Формат: Мош 10кг (15) 150000 — охирги рақамни киритинг.");
    return;
  }

  // Тан нархи: скобка ичидаги рақам (масалан (15) ёки (1.500))
  let unitPrice = 0;
  const unitMatch = input.match(/\(([\d.]+)\)/);
  if(unitMatch) {
    unitPrice = parseInt(unitMatch[1].replace(/\./g, ""), 10) || 0;
  }

  // Номи ва кгни олиш (агар бор бўлса)
  let name = "Товар";
  let kg = "";
  const nameKgMatch = input.match(/^(.+?)\s+(\d+\.?\d*)кг/i);
  if(nameKgMatch) {
    name = nameKgMatch[1].trim();
    kg = nameKgMatch[2];
  } else {
    // агар "Стоянка 6.000" каби киритилса — охирги рақамни олиб ташлаб қолганини ном сифатида оламиз
    const lastRaw = input.match(/[\d.]+(?!.*[\d.])/);
    if(lastRaw) {
      name = input.replace(lastRaw[0], "").trim();
      if(!name) name = "Товар";
    } else {
      name = input;
    }
  }

  items.push({ name, kg, unitPrice, totalPrice });
  inputEl.value = "";
  renderList();
  saveToStorage();
}

// renderList
function renderList() {
  const listDiv = document.getElementById("list");
  listDiv.innerHTML = "";
  items.forEach((i, index) => {
    const left = document.createElement("div");
    left.className = "item-left";
    left.innerText = `${i.name}${i.kg ? " " + i.kg + "кг" : ""} (${formatNumber(i.unitPrice)}) — ${formatNumber(i.totalPrice)}`;

    const editBtn = document.createElement("button");
    editBtn.className = "small-btn";
    editBtn.innerText = "✏️ Таҳрир";
    editBtn.onclick = () => editItem(index);

    const delBtn = document.createElement("button");
    delBtn.className = "small-btn danger";
    delBtn.innerText = "❌ Учириш";
    delBtn.onclick = () => deleteItem(index);

    const right = document.createElement("div");
    right.className = "item-right";
    right.appendChild(editBtn);
    right.appendChild(delBtn);

    const row = document.createElement("div");
    row.className = "item-row";
    row.appendChild(left);
    row.appendChild(right);

    listDiv.appendChild(row);
  });
}

// editItem: киритилган маълумотни input га қайта қўяди (редакт учун)
function editItem(index) {
  const i = items[index];
  const inputEl = document.getElementById("itemInput");
  // Қайта киритиш формати: "Номи кг (тан) умумий"
  const unitStr = i.unitPrice ? `(${formatNumber(i.unitPrice)})` : "";
  inputEl.value = `${i.name}${i.kg ? " " + i.kg + "кг " : " "}${unitStr} ${formatNumber(i.totalPrice)}`.trim();
  // ўчириш (кейин +қўшиш босилганда янги қўшилади)
  deleteItem(index);
}

// deleteItem
function deleteItem(index) {
  items.splice(index, 1);
  renderList();
  saveToStorage();
}

// finish: касса текшируви, ҳисобот, Telegramга юбориш
function finish() {
  if(items.length === 0) {
    alert("Товарлар йўқ!");
    return;
  }

  const cashInput = document.getElementById("cash").value.trim();
  const cash = parseNumberFromString(cashInput) || 0;
  const total = items.reduce((s, it) => s + (it.totalPrice || 0), 0);
  const remain = cash - total;

  // Агар қолдиқ манфий бўлса — огоҳлантириш
  if(remain < 0) {
    if(!confirm("⚠️ Қолдиқ манфий чиқди. Давом этасизми?")) {
      return;
    }
  }

  let report = `🏦 Касса: ${formatNumber(cash)}\n📤 Расход: ${selectedMarket}\n\n`;
  items.forEach(i => {
    report += `• ${i.name}${i.kg ? " " + i.kg + "кг" : ""} (${formatNumber(i.unitPrice)}) ${formatNumber(i.totalPrice)}\n`;
  });
  report += `\n💰 Общий: ${formatNumber(total)}\n💵 Қолди: ${formatNumber(remain)}`;

  document.getElementById("report").innerText = report;
  sendToTelegram(report);

  // Списокни тозалаш (қўшилган товарлар сақланмасин)
  items = [];
  renderList();
  saveToStorage();
}

// sendToTelegram (placeholder token/chatId)
function sendToTelegram(report) {
  const token = "8631566876:AAHDinet5d5PF1NE4E_GNPWAIzDhP4g2O8M"; 
  const chatId = "483325961";
  }
  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ chat_id: chatId, text: report })
  })
  .then(res => res.json())
  .then(data => console.log("Telegramга юборилди:", data))
  .catch(err => console.error("Telegram хатолиги:", err));
}

// localStorage: сақлаш ва ўқиш
function saveToStorage() {
  const payload = {
    items,
    selectedMarket,
    cash: document.getElementById("cash").value || ""
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);
    items = data.items || [];
    selectedMarket = data.selectedMarket || selectedMarket;
    if(data.cash) document.getElementById("cash").value = data.cash;
    renderList();
    // set active market button
    document.querySelectorAll("#markets button").forEach(b => {
      if(b.innerText.includes(selectedMarket)) b.classList.add("active");
      else b.classList.remove("active");
    });
  } catch (e) {
    console.error("Storage load error:", e);
  }
}
