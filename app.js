let items = [];

function addItem() {
  const name = document.getElementById("name").value;
  const kg = document.getElementById("kg").value;
  const price = parseInt(document.getElementById("price").value);

  if(name && kg && price) {
    items.push({name, kg, price});
    document.getElementById("list").innerHTML += 
      `<div>• ${name} ${kg}кг — ${price}</div>`;
    document.getElementById("name").value = "";
    document.getElementById("kg").value = "";
    document.getElementById("price").value = "";
  }
}

function finish() {
  const market = document.getElementById("market").value;
  const cash = parseInt(document.getElementById("cash").value) || 0;
  let total = items.reduce((sum, i) => sum + i.price, 0);
  let remain = cash - total;

  let report = `🏦 Касса: ${cash}\n📤 Расход: ${market}\n\n`;
  items.forEach(i => {
    report += `• ${i.name} ${i.kg}кг ${i.price}\n`;
  });
  report += `\n💰 Общий: ${total}\n💵 Қолдиқ: ${remain}`;

  document.getElementById("report").innerText = report;
  sendToTelegram(report);
}

function sendToTelegram(report) {
  const token = "<YOUR_BOT_TOKEN>"; 
  const chatId = "<YOUR_CHAT_ID>";  

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

// Оффлайн режимни қўллаб-қувватлаш
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(() => console.log("Service Worker ишга тушди"))
    .catch(err => console.error("SW хатолик:", err));
}
