import { Db } from "mongodb";
import { db } from "./mongo";

export function getDb(): Db {
  return db;
}