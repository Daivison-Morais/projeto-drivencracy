import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

let db;
const mongoClient = new MongoClient(process.env.MONGO_URI);

try {
  await mongoClient.connect();
} catch (error) {
  console.log(error);
}

db = mongoClient.db("cracy");

export default db;
