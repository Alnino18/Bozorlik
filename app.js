let items = [];
let selectedMarket = "Куйлик"; // default

function setMarket(market, btn) {
  selectedMarket = market;
  document.querySelectorAll("#markets button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

function formatNumber(num) {
  return num.toLocaleString("uz-UZ");
}

function addItem() {
  const input = document.getElementById("itemInput").value.trim();
  const regex = /^(.+?)\s+(\d+\.?\d*)кг\s+\((\d+)\)\s+(\d+)$/;
  const match = input.match(regex);

  if(match) {
    const name = match[1];
    const kg = match[2];
    const unitPrice = parseInt(match[3]);
    const totalPrice = parseInt(match[4]);

    items.push({name, kg, unitPrice, totalPrice});
    renderList();
    document.getElementById("itemInput").value = "";
  } else {
    alert("Формат: Мош 10кг (15) 150000");
  }
}

function renderList() {
  const listDiv = document.getElementById("list");
  listDiv.innerHTML = "";
  items.forEach((i, index) => {
    listDiv.innerHTML += `
      <div id="item-${index}">
        • ${i.name} ${i.kg}кг (${formatNumber(i.unitPrice)}) — ${formatNumber(i.totalPrice)} сум
        <button onclick="editItem(${index})">✏️ Таҳрир</button>
        <button onclick="deleteItem(${index})">❌ Учириш</button>
      </div>`;
  });
}

function editItem(index) {
  const i = items[index];
  document.getElementById("itemInput").value = 
    `${i.name} ${i.kg}кг (${i.unitPrice}) ${i.totalPrice}`;
  deleteItem(index);
}

function deleteItem(index) {
  items.splice(index, 1);
  renderList();
}

function finish() {
  if(items.length === 0) {
    alert("Товарлар йўқ!");
    return;
  }

  let cash = parseInt(document.getElementById("cash").value) || 0;
  let total = items.reduce((sum, i) => sum + i.totalPrice, 0);
  let remain = cash - total;

  document.getElementById("cash").value = remain;

  let report = `🏦 Касса: ${formatNumber(remain)}\n📤 Расход: ${selectedMarket}\n\n`;
  items.forEach(i => {
    report += `• ${i.name} ${i.kg}кг (${formatNumber(i.unitPrice)}) ${formatNumber(i.totalPrice)}\n`;
  });
  report += `\n💰 Общий: ${formatNumber(total)}\n💵 Қолди: ${formatNumber(remain)}`;

  document.getElementById("report").innerText = report;
  sendToTelegram(report);

  items = [];
  renderList();
}

function sendToTelegram(report) {
  const token = "8631566876:AAHDinet5d5PF1NE4E_GNPWAIzDhP4g2O8M"; 
  const chatId = "483325961";

  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      chat_id: chatId,
      text: report
    })
  })
  .then(res => res.json())
  .then(data => console.log("Telegramга юборилди:", data))
  .catch(err => console.error("Хатолик:", err));
}
