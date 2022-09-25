import express from "express";

import {
  postPoll,
  getPoll,
  postChoice,
  getChoice,
  postVote,
  getResult,
} from "./controllers.js";

const router = express.Router();

router.post("/poll", postPoll);

router.get("/poll", getPoll);

router.post("/choice", postChoice);

router.get("/poll/:id/choice", getChoice);

router.post("/choice/:id/vote", postVote);

router.get("/poll/:id/result", getResult);

export default router;
