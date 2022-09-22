import express from "express";
import cors from "cors";
import joi from "joi";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import convertMilisInDate from "./components/convertMilisInDate.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect().then(() => {
  db = mongoClient.db("cracy");
});

const postPollSchema = joi.object({
  title: joi.string().required(),
  expireAt: joi.string().required(),
});

app.post("/poll", async (req, res) => {
  const { title, expireAt } = req.body;

  const validation = postPollSchema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    const erros = validation.error.details.map((value) => value.message);
    return res.status(422).send(erros);
  }
  if (!expireAt) {
    const daysSecunds = 30 * 86400;
    const daysMiliSec = daysSecunds * 1000;
    const timeExpiration = Date.now() + daysMiliSec;
    req.body.expireAt = convertMilisInDate(timeExpiration);
  }

  try {
    await db.collection("poll").insertOne(req.body);
    res.status(201).send(req.body);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get("/poll", async (req, res) => {
  try {
    const polls = await db.collection("poll").find().toArray();

    const days = Date.now() - 30 * 1000 * 86400;
    /*  const ehPolls = polls.filter(
      ({ expireAt }) => [dayjs(expireAt).valueOf() - days] >= 0
    ); */

    res.status(200).send(polls);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

/* setInterval(async () => {
  const days = Date.now() - 30 * 86400 * 1000;
  console.log(days);

  try {
    const polls = await db.collection("poll").find().toArray();
    if (polls.length > 0) {
      polls.filter(async (value) => {
        if ([dayjs(value.expireAt).valueOf() - days] < 0) {
          await db.collection("poll").deleteOne({ expireAt: value.expireAt });
        }
      });
    }


    /////////
    const timeExpirated = await db
      .collection("poll")
      .find({ expireAt: { $lte: days } })
      .toArray(); 

     if (timeExpirated.length > 0) {
      await db.collection("poll").deleteMany({ expireAt: { $lte: days } });
    } 

////

  } catch (error) {
    console.error(error);
  }
}, 900 * 1000);
//1661260981450
//2592000000  //30 dias */

const postChoiceSchema = joi.object({
  title: joi.string().required(),
  pollId: joi.string().required(),
});

app.post("/choice", async (req, res) => {
  const { title, pollId } = req.body;
  const days = Date.now() - 30 * 86400 * 1000;

  try {
    const validation = postChoiceSchema.validate(req.body, {
      abortEarly: false,
    });

    if (validation.error) {
      const erros = validation.error.details.map((value) => value.message);
      return res.status(422).send(erros);
    }

    if ([dayjs(existsPoll.expireAt).valueOf() - days] < 0) {
      res.sendStatus(403);
    }

    const existsPoll = await db.collection("choice").find({ pollId }).toArray();
    const choices = existsPoll.find(({ title }) => title);

    console.log(choices);
    if (choices) {
      console.log(choices);
      return res.sendStatus(404);
    }

    await db.collection("choice").insertOne({ title, pollId });
    res.status(201).send(req.body);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.listen(5000, () => {
  console.log("listen on 5000");
});
