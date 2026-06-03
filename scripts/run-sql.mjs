// Runs one or more .sql files against DATABASE_URL using a single simple-query
// per file (so dollar-quoted function bodies execute correctly).
// Usage: DATABASE_URL="postgresql://..." node scripts/run-sql.mjs file1.sql file2.sql
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL");
  process.exit(1);
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Pass at least one .sql file");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  for (const f of files) {
    const sql = readFileSync(f, "utf8");
    process.stdout.write(`Running ${f} ... `);
    await client.query(sql);
    console.log("OK");
  }
  console.log("All done.");
} catch (e) {
  console.error("\nFAILED:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
