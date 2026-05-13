// BOZORLIK PWA - app.js (без localStorage)
// Тузатишлар: localStorage олиб ташланди, фақат охирги рақам олинади, нуқта минглик ажратгич сифатида қолади,
// тан нархи сақланади, касса текшируви ва Telegram юбориш қолади.

let items = [];
let selectedMarket = "Куйлик";

document.addEventListener("DOMContentLoaded", () => {
  // default active market
  const firstBtn = document.querySelector("#markets button");
  if(firstBtn && !document.querySelector("#markets button.active")) {
    setMarket(selectedMarket, firstBtn);
  }
  // cash input formatting on blur
  const cashInput = document.getElementById("cash");
  if (cashInput) {
    cashInput.addEventListener("blur", () => {
      const v = parseNumberFromString(cashInput.value);
      if(!isNaN(v)) cashInput.value = formatNumber(v);
    });
  }
});

// Форматлаш: 1.380.000
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return Number(num).toLocaleString("uz-UZ").replace(/,/g, ".");
}

// Парс: матндан рақамни олиш (нуқталарни олиб ташлаб integer)
function parseNumberFromString(str) {
  if(!str) return NaN;
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
}

// addItem: киритилган матндан фақат охирги рақамни олади, тан нархи (в скобках) сақланади
function addItem() {
  const inputEl = document.getElementById("itemInput");
  const input = inputEl.value.trim();
  if(!input) {
    alert("Илтимос, товар матнини киритинг.");
    return;
  }

  const totalPrice = parseNumberFromString(input);
  if(isNaN(totalPrice)) {
    alert("Формат: Мош 10кг (15) 150000 — охирги рақамни киритинг.");
    return;
  }

  let unitPrice = 0;
  const unitMatch = input.match(/\(([\d.]+)\)/);
  if(unitMatch) {
    unitPrice = parseInt(unitMatch[1].replace(/\./g, ""), 10) || 0;
  }

  let name = "Товар";
  let kg = "";
  const nameKgMatch = input.match(/^(.+?)\s+(\d+\.?\d*)кг/i);
  if(nameKgMatch) {
    name = nameKgMatch[1].trim();
    kg = nameKgMatch[2];
  } else {
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
}

// renderList
function renderList() {
  const listDiv = document.getElementById("list");
  listDiv.innerHTML = "";
  items.forEach((i, index) => {
    const left = document.createElement("div");
    left.className = "item-left";
    left.innerText = `${i.name}${i.kg ? " " + i.kg + "кг" : ""} (${formatNumber(i.unitPrice)}) — ${formatNumber(i.totalPrice)} сум`;

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

// editItem
function editItem(index) {
  const i = items[index];
  const inputEl = document.getElementById("itemInput");
  const unitStr = i.unitPrice ? `(${formatNumber(i.unitPrice)})` : "";
  inputEl.value = `${i.name}${i.kg ? " " + i.kg + "кг " : " "}${unitStr} ${formatNumber(i.totalPrice)}`.trim();
  deleteItem(index);
}

// deleteItem
function deleteItem(index) {
  items.splice(index, 1);
  renderList();
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

  if(remain < 0) {
    if(!confirm("⚠️ Қолдиқ манфий чиқди. Давом этасизми?")) {
      return;
    }
  }

  let report = `🏦 Касса: ${formatNumber(cash)}\n📤 Расход: ${selectedMarket}\n\n`;
  items.forEach(i => {
    report += `• ${i.name}${i.kg ? " " + i.kg + "кг" : ""} (${formatNumber(i.unitPrice)}) ${formatNumber(i.totalPrice)} сум\n`;
  });
  report += `\n💰 Общий: ${formatNumber(total)}\n💵 Қолди: ${formatNumber(remain)}`;

  document.getElementById("report").innerText = report;
  sendToTelegram(report);

  items = [];
  renderList();
}

// sendToTelegram (placeholder token/chatId)
function sendToTelegram(report) {
  // Токен бошидаги < белгисини олиб ташладик ва аниқ қийматларни ёздик
  const token = "8631566876:AAEaWdmZog6PKIsfnFJ-Lmlz7b9fFIRf8Wg";
  const chatId = "483325961";

  // Текширув қисмини (if) олиб ташладик, чунки у хато чиқараётган эди
  
  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ chat_id: chatId, text: report })
  })
  .then(async res => {
    const text = await res.text();
    console.log("HTTP status:", res.status, "response text:", text);
    let data;
    try { data = JSON.parse(text); } catch(e) { data = text; }
    if(!res.ok || (data && data.ok === false)) throw new Error(JSON.stringify(data));
    alert("Хабар Telegramга юборилди.");
  })
  .catch(err => {
    console.error("Telegram хатоси:", err);
    alert("Telegramга юборишда хатолик. Консольни текширинг.");
  });
}
