import express from "express";

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
