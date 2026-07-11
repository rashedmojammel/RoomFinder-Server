import { MongoClient } from "mongodb";
import "dotenv/config";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Missing required environment variable: MONGODB_URI");
}

/**
 * Single shared MongoClient for the whole app.
 */
export const mongoClient = new MongoClient(MONGODB_URI);
export const db = mongoClient.db();

let connected = false;

export async function connectMongo(): Promise<void> {
  if (connected) return;
  await mongoClient.connect();
  connected = true;
  console.log("[db] MongoDB connected");
}

export async function closeMongo(): Promise<void> {
  if (!connected) return;
  await mongoClient.close();
  connected = false;
  console.log("[db] MongoDB connection closed");
}