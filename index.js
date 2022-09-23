import express from "express";
import cors from "cors";
import joi from "joi";
import { MongoClient, ObjectId } from "mongodb";
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
  expireAt: joi.string().allow("").required(),
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

  const validation = postChoiceSchema.validate(req.body, {
    abortEarly: false,
  });
  if (validation.error) {
    const erros = validation.error.details.map((value) => value.message);
    return res.status(422).send(erros);
  }

  try {
    const expirePoll = await db

      .collection("poll")
      .findOne({ _id: ObjectId(pollId) });

    if (!expirePoll) {
      return res.sendStatus(404);
    }
    if ([dayjs(expirePoll.expireAt).valueOf() - days] < 0) {
      res.sendStatus(403);
    }

    const choices = await db
      .collection("choice")
      .find({ pollId: ObjectId(pollId) })
      .toArray();

    const sameTitle = choices.find((value) => value.title === title);
    console.log(choices);
    if (sameTitle) {
      return res.sendStatus(409);
    }

    await db
      .collection("choice")
      .insertOne({ title, pollId: ObjectId(pollId) });
    res.status(201).send(req.body);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get("/poll/:id/choice", async (req, res) => {
  const { id } = req.params;

  try {
    const existPoll = await db
      .collection("poll")
      .findOne({ _id: ObjectId(id) });
    if (!existPoll) {
      return res.sendStatus(404);
    }

    const choices = await db
      .collection("choice")
      .find({ pollId: ObjectId(id) })
      .toArray();
    res.status(200).send(choices);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post("/choice/:id/vote", async (req, res) => {
  const { id } = req.params; // id do choice escolhido
  const days = Date.now() - 30 * 1000 * 86400;

  console.log(id);

  try {
    const choice = await db.collection("choice").findOne({ _id: ObjectId(id) });
    console.log("choice", choice);
    if (!choice) {
      return res.sendStatus(404);
    }

    const expirePoll = await db
      .collection("poll")
      .findOne({ _id: ObjectId(choice.pollId) });
    if (!expirePoll) {
      res.sendStatus(409);
    }
    if ([dayjs(expirePoll.expireAt).valueOf() - days] < 0) {
      res.sendStatus(403);
    }

    const verificacao = await db.collection("vote").insertOne({
      createdAt: dayjs().format("YYYY-MM-DD HH:mm"),
      choiceId: id,
    });

    res.sendStatus(201);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get("/poll/:id/result", async (req, res) => {
  const { id } = req.params;

  try {
    const poll = await db.collection("poll").findOne({ _id: ObjectId(id) });
    if (!poll) {
      return res.sendStatus(404);
    }

    const choices = await db
      .collection("choice")
      .find({ pollId: ObjectId(id) })
      .toArray(); /// prga os ids das choices, vai em votes e pesquisa os votos

    /*  const votes = await db.collection("vote").find(t); */
    console.log(choices);
    let title = "";
    let totalVotes = 0;
    console.log("choices", choices);
    for (let i = 0; i < choices.length; i++) {
      const maxVotes = await db
        .collection("vote")
        .find({ choiceId: choices[i]._id })
        .toArray();
      console.log("maxVotes", maxVotes);

      if (maxVotes.length > totalVotes) {
        totalVotes = maxVotes.length;

        title = choices[i].title;
      }
    }

    const obj = {
      _id: id,
      title: poll.title,
      expireAt: poll.expireAt,

      result: {
        title: title,
        votes: totalVotes,
      },
    };

    res.status(200).send(obj);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.listen(5000, () => {
  console.log("listen on 5000");
});
