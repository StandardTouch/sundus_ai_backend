import express from "express";
import type { Application } from "express";
import dotenv from "dotenv";

// import webhookRouter from "./routes/webhook";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// app.get("/", (_, res: any) => {
//   res.send("🚀 WhatsApp Chatbot (TypeScript) is running!");
//   console.log("✅ Root endpoint accessed");
// });

app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
});
