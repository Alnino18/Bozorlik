let items = [];

// Сонларни 1.600.000 кўринишида форматлаш
function formatNumber(num) {
  return num.toLocaleString("uz-UZ");
}

function addItem() {
  const name = document.getElementById("name").value;
  const kg = document.getElementById("kg").value;
  const price = parseInt(document.getElementById("price").value);

  if(name && kg && price) {
    items.push({name, kg, price});
    document.getElementById("list").innerHTML += 
      `<div>• ${name} ${kg}кг — ${formatNumber(price)} </div>`;
    document.getElementById("name").value = "";
    document.getElementById("kg").value = "";
    document.getElementById("price").value = "";
  }
}

function finish() {
  const market = document.getElementById("market").value;
  let cash = parseInt(document.getElementById("cash").value) || 0;
  let total = items.reduce((sum, i) => sum + i.price, 0);
  let remain = cash - total;

  // Касса автоматик равишда қолган суммага ўзгарсин
  document.getElementById("cash").value = remain;

  let report = `🏦 Касса: ${formatNumber(remain)}\n📤 Расход: ${market}\n\n`;
  items.forEach(i => {
    report += `• ${i.name} ${i.kg}кг ${formatNumber(i.price)}\n`;
  });
  report += `\n💰 Общий: ${formatNumber(total)}\n💵 Қолдиқ: ${formatNumber(remain)}`;

  document.getElementById("report").innerText = report;
  sendToTelegram(report);
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
