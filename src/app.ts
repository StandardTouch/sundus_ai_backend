import express from "express";
import type { Application } from "express";
import dotenv from "dotenv";

// import webhookRouter from "./routes/webhook";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

app.post("/", (req: any, res: any) => {
  console.log("📥 Received webhook payload:");
  console.log(JSON.stringify(req.body, null, 2));

  console.log("✅ Root endpoint accessed");
  res.send("🚀 WhatsApp Chatbot (TypeScript) is running!");
});

app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
});
