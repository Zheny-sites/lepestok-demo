// Принимает заказ с сайта и отправляет его владельцу в Telegram.
// Токен бота и chat id берутся из настроек Netlify (Environment variables), а не из кода.
exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  var token = process.env.TELEGRAM_BOT_TOKEN;
  var chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    return { statusCode: 500, body: "Not configured" };
  }

  var d;
  try {
    d = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: "Bad request" };
  }

  // скрытое поле-ловушка для ботов: люди его не заполняют
  if (d.website) {
    return { statusCode: 200, body: "ok" };
  }

  function clean(s, n) {
    return String(s || "").replace(/[\u0000-\u001f]/g, " ").slice(0, n).trim();
  }

  var name = clean(d.name, 60);
  var phone = clean(d.phone, 30);
  var note = clean(d.note, 300);
  var total = clean(d.total, 30);
  var items = Array.isArray(d.items) ? d.items.slice(0, 30).map(function (x) { return clean(x, 120); }) : [];

  if (name.length < 2 || phone.replace(/\D/g, "").length < 10 || items.length === 0) {
    return { statusCode: 400, body: "Invalid data" };
  }

  var text =
    "Новый заказ (самовывоз)\n\n" +
    "Имя: " + name + "\n" +
    "Телефон: " + phone + "\n\n" +
    "Состав:\n" + items.join("\n") + "\n\n" +
    "Итого: " + total +
    (note ? "\n\nКомментарий: " + note : "");

  try {
    var r = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: text })
    });
    if (!r.ok) {
      return { statusCode: 502, body: "Telegram error" };
    }
    return { statusCode: 200, body: "ok" };
  } catch (e) {
    return { statusCode: 502, body: "Send failed" };
  }
};
