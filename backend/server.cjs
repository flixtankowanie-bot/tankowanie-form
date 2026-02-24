const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const brevo = require("@getbrevo/brevo");

dotenv.config();

const app = express();

/* ===== MIDDLEWARE ===== */
app.use(cors());
app.use(express.json());

/* ===== BREVO CONFIG ===== */
const apiInstance = new brevo.TransactionalEmailsApi();

const apiKey = apiInstance.authentications["apiKey"];
apiKey.apiKey = process.env.BREVO_API_KEY;

/* ===== ROUTES ===== */
app.post("/send", async (req, res) => {
  try {
    const { regNo, mileage, fuel, adblue, station, driver } = req.body;

    if (!regNo || !mileage || !fuel || !station || !driver) {
      return res.status(400).json({ error: "Brak wymaganych danych" });
    }

    const email = new brevo.SendSmtpEmail({
      sender: {
        email: process.env.MAIL_FROM,
        name: "System tankowania",
      },
      to: [{ email: process.env.MAIL_TO }],
      subject: "Nowe tankowanie autobusu",
      htmlContent: `
        <h2>🚌 Nowe tankowanie</h2>
        <ul>
          <li><b>Nr rejestracyjny:</b> ${regNo}</li>
          <li><b>Przebieg:</b> ${mileage} km</li>
          <li><b>Paliwo:</b> ${fuel} l</li>
          <li><b>AdBlue:</b> ${adblue ?? 0} l</li>
          <li><b>Stacja:</b> ${station}</li>
          <li><b>Kierowca:</b> ${driver}</li>
        </ul>
      `,
    });

    await apiInstance.sendTransacEmail(email);

    res.json({ success: true });
  } catch (err) {
    console.error("Błąd Brevo:", err);
    res.status(500).json({ error: "Nie udało się wysłać maila" });
  }
});

/* ===== START SERVER ===== */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server działa na porcie ${PORT}`);
});