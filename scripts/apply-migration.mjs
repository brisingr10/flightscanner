// Apply the latest SQL migration directly via Neon serverless.
// Run: node --env-file=.env.local scripts/apply-migration.mjs

import { neon } from "@neondatabase/serverless";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const migDir = "src/lib/db/migrations";
const files = (await readdir(migDir)).filter((f) => f.endsWith(".sql")).sort();
if (files.length === 0) {
  console.error("No migration files found");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

for (const file of files) {
  console.log(`\nApplying ${file}...`);
  const content = await readFile(join(migDir, file), "utf-8");
  const statements = content
    .split("--> statement-breakpoint")
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    const preview = stmt.slice(0, 80).replace(/\s+/g, " ");
    process.stdout.write(`  ${preview}... `);
    try {
      await sql.query(stmt);
      console.log("✓");
    } catch (e) {
      console.log(`✗ ${e.message}`);
      throw e;
    }
  }
}

console.log("\nAll migrations applied.");
