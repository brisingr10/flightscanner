import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

const rows = await sql`
  SELECT id, origin, destination, last_checked_at, last_emailed_at, created_at
  FROM trackers
  WHERE id = 'a5910d71-4073-4348-b3ba-34cd61cb4282'
`;

for (const r of rows) {
  console.log(`${r.origin} → ${r.destination}`);
  console.log(`Created:      ${r.created_at}`);
  console.log(`Last checked: ${r.last_checked_at ?? 'never'}`);
  console.log(`Last emailed: ${r.last_emailed_at ?? 'never'}`);
}
