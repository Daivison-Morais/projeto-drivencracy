import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use(router);

app.listen(process.env.PORT || 5000, () => {
  console.log("app running on port " + process.env.PORT);
});
