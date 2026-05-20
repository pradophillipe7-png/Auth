const express = require("express");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// ======================
// DB FUNCTIONS
// ======================
function getDB() {
  return JSON.parse(fs.readFileSync("./db.json"));
}

function saveDB(db) {
  fs.writeFileSync("./db.json", JSON.stringify(db, null, 2));
}

// ======================
// LOGIN (DEVICE LOCK)
// ======================
app.post("/login", (req, res) => {
  const { user, pass, deviceId } = req.body;
  const db = getDB();

  const u = db.users.find(x => x.user === user && x.pass === pass);

  if (!u) return res.json({ ok: false, msg: "login inválido" });

  // primeira vez salva device
  if (!u.deviceId) {
    u.deviceId = deviceId;
    saveDB(db);
  }

  // bloqueia outro celular
  if (u.deviceId !== deviceId) {
    return res.json({
      ok: false,
      msg: "Conta já está vinculada a outro dispositivo"
    });
  }

  res.json({
    ok: true,
    user: u.user,
    credits: u.credits
  });
});

// ======================
// GERAR KEYS (BULK)
// ======================
app.post("/generate", (req, res) => {
  const db = getDB();

  const type = req.body.type;
  const quantity = req.body.quantity || 1;

  let credits = 10;

  if (type === "3d") credits = 30;
  if (type === "7d") credits = 70;
  if (type === "30d") credits = 100;

  const keys = [];

  for (let i = 0; i < quantity; i++) {
    const key = crypto.randomBytes(4).toString("hex");

    db.keys.push({
      key,
      type,
      credits,
      used: false
    });

    keys.push(key);
  }

  saveDB(db);

  res.json({
    ok: true,
    keys,
    total: quantity,
    credits
  });
});

// ======================
// ATIVAR KEY
// ======================
app.post("/activate", (req, res) => {
  const { user, deviceId, key } = req.body;
  const db = getDB();

  const u = db.users.find(x => x.user === user);
  if (!u) return res.json({ ok: false, msg: "user inválido" });

  if (u.deviceId !== deviceId) {
    return res.json({ ok: false, msg: "dispositivo inválido" });
  }

  const k = db.keys.find(x => x.key === key);

  if (!k) return res.json({ ok: false, msg: "key inválida" });

  if (k.used) return res.json({ ok: false, msg: "key já usada" });

  k.used = true;
  u.credits += k.credits;

  saveDB(db);

  res.json({
    ok: true,
    credits: u.credits
  });
});

// ======================
// CHECAR USUÁRIO
// ======================
app.post("/me", (req, res) => {
  const { user, deviceId } = req.body;
  const db = getDB();

  const u = db.users.find(
    x => x.user === user && x.deviceId === deviceId
  );

  if (!u) return res.json({ ok: false });

  res.json({
    ok: true,
    credits: u.credits
  });
});

// ======================
app.listen(PORT, () => {
  console.log("COMPANHIA SHELBY ONLINE NA PORTA " + PORT);
});