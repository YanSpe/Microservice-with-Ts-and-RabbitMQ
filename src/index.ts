import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import email from "./routes/email";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use("/email", email);

app.get("/", (req: Request, res: Response) => {
  res.send("HI: Express + TypeScript Server");
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});