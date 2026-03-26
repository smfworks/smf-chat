/**
 * cleanup-no-reply.ts
 * Finds and deletes all messages containing "NO_REPLY" from the smf-chat Turso DB.
 * Run: npx tsx cleanup-no-reply.ts
 */

import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  // Find all NO_REPLY messages
  const result = await client.execute({
    sql: `SELECT id, agent_id, content, timestamp, channel FROM messages WHERE content = 'NO_REPLY'`,
  });

  const msgs = result.rows as unknown as Array<{ id: string; agent_id: string; content: string; timestamp: number; channel: string }>;

  console.log(`Found ${msgs.length} NO_REPLY message(s) to delete:`);

  for (const msg of msgs) {
    console.log(`  Deleting [${msg.channel}] ${msg.agent_id} at ${new Date(msg.timestamp).toISOString()} — "${msg.content}"`);
  }

  if (msgs.length === 0) {
    console.log("No NO_REPLY messages found. Nothing to do.");
    await client.close();
    return;
  }

  // Delete them one by one (bulk delete isn't supported in the client)
  const ids = msgs.map(m => m.id);
  let deleted = 0;
  for (const id of ids) {
    const r = await client.execute({ sql: "DELETE FROM messages WHERE id = ?", args: [id] });
    if ((r.rowsAffected ?? 0) > 0) deleted++;
  }

  console.log(`\n✅ Deleted ${deleted} NO_REPLY message(s).`);
  await client.close();
}

main().catch(console.error);
