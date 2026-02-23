import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import nodemailer from "nodemailer";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "200kb" }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// ===== SMTP =====
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || "false") === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// pomocnicza konwersja liczb
function toNumber(x) {
  const n = Number(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// ===== ENDPOINT =====
app.post("/send", async (req, res) => {
  const {
    regNo,
    regNoOther,
    odometerKm,
    dieselLiters,
    adblueLiters,
    station,
    stationOther,
    driverName
  } = req.body || {};

  if (!regNo || !station) {
    return res.status(400).json({ error: "Brak nr rej lub stacji" });
  }

  // --- nr rejestracyjny ---
  let finalRegNo = regNo;
  if (regNo === "inny") {
    if (!regNoOther || regNoOther.trim().length < 3) {
      return res.status(400).json({ error: "Podaj nr rejestracyjny" });
    }
    finalRegNo = regNoOther.trim().toUpperCase();
  }

  // --- stacja ---
  let finalStation = station;
  if (station === "inna") {
    if (!stationOther || stationOther.trim().length < 2) {
      return res.status(400).json({ error: "Podaj nazwę stacji" });
    }
    finalStation = stationOther.trim();
  }

  const km = parseInt(odometerKm, 10);
  const diesel = toNumber(dieselLiters);
  const adblue = toNumber(adblueLiters ?? 0);

  if (!Number.isFinite(km) || km < 0) {
    return res.status(400).json({ error: "Błędny przebieg" });
  }
  if (diesel === null || diesel < 0) {
    return res.status(400).json({ error: "Błędne litry paliwa" });
  }
  if (adblue === null || adblue < 0) {
    return res.status(400).json({ error: "Błędne litry AdBlue" });
  }

  const when = new Date().toISOString().slice(0, 19).replace("T", " ");

  const subject = `Tankowanie | ${finalRegNo} | ${when}`;
  const text = [
    `Data: ${when}`,
    driverName ? `Kierowca: ${driverName}` : null,
    `Nr rej: ${finalRegNo}`,
    `Przebieg: ${km} km`,
    `Paliwo: ${diesel} l`,
    `AdBlue: ${adblue} l`,
    `Stacja: ${finalStation}`
  ].filter(Boolean).join("\n");

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_TO,
      subject,
      text
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Nie udało się wysłać maila (SMTP)" });
  }
});

// ===== START =====
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, () => {
  console.log(`Server działa: http://127.0.0.1:${PORT}`);
});