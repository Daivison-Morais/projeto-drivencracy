import convertMilisInDate from "./convertMilisInDate.js";
import joi from "joi";
import db from "./db.js";
import dayjs from "dayjs";
import { ObjectId } from "mongodb";

const postPollSchema = joi.object({
  title: joi.string().required(),
  expireAt: joi.string().allow("").required(),
});

const postChoiceSchema = joi.object({
  title: joi.string().required(),
  pollId: joi.string().required(),
});

async function postPoll(req, res) {
  const { expireAt } = req.body;

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
}

async function getPoll(req, res) {
  try {
    const polls = await db.collection("poll").find().toArray();

    res.status(200).send(polls);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
}

async function postChoice(req, res) {
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
      return res.sendStatus(403);
    }

    const choices = await db
      .collection("choice")
      .find({ pollId: ObjectId(pollId) })
      .toArray();

    const sameTitle = choices.find((value) => value.title === title);
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
}

async function getChoice(req, res) {
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
}

async function postVote(req, res) {
  const { id } = req.params;
  const days = Date.now() - 30 * 1000 * 86400;

  try {
    const choice = await db.collection("choice").findOne({ _id: ObjectId(id) });
    if (!choice) {
      return res.sendStatus(404);
    }

    const expirePoll = await db
      .collection("poll")
      .findOne({ _id: ObjectId(choice.pollId) });
    if (!expirePoll) {
      return res.sendStatus(409);
    }
    if ([dayjs(expirePoll.expireAt).valueOf() - days] < 0) {
      return res.sendStatus(403);
    }

    await db.collection("vote").insertOne({
      createdAt: dayjs().format("YYYY-MM-DD HH:mm"),
      choiceId: ObjectId(id),
    });

    res.sendStatus(201);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
}

async function getResult(req, res) {
  const { id } = req.params;

  try {
    const poll = await db.collection("poll").findOne({ _id: ObjectId(id) });
    if (!poll) {
      return res.sendStatus(404);
    }

    const choices = await db
      .collection("choice")
      .find({ pollId: ObjectId(id) })
      .toArray();

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
}

export { postPoll, getPoll, postChoice, getChoice, postVote, getResult };
