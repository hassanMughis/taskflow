import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  for (const key of ["DB_NAME", "DB_USER", "DB_PASSWORD", "DB_HOST"]) {
    if (!process.env[key]) throw new Error(`${key} is required when DATABASE_URL is not set`);
  }
}

const sslEnabled = process.env.DB_SSL === "true" || Boolean(databaseUrl?.includes("sslmode=require"));
const options = {
  dialect: "postgres",
  dialectModule: pg,
  logging: false,
  pool: {
    max: Number(process.env.DB_POOL_MAX || 5),
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  ...(sslEnabled ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } } : {}),
};

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, options)
  : new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
      ...options,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
    });

export default sequelize;
