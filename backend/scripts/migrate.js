import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sequelize from "../config/db.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.resolve(currentDirectory, "../migrations");

try {
  await sequelize.authenticate();
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const [appliedRows] = await sequelize.query("SELECT name FROM schema_migrations");
  const applied = new Set(appliedRows.map((row) => row.name));
  const files = (await fs.readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await fs.readFile(path.join(migrationsDirectory, file), "utf8");
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(sql, { transaction });
      await sequelize.query("INSERT INTO schema_migrations (name) VALUES (:name)", { replacements: { name: file }, transaction });
    });
    console.log(`Applied ${file}`);
  }

  console.log("Database is up to date");
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
