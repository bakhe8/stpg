const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres:stgp2024!@localhost:5432/stgp_dev',
});

async function main() {
  await client.connect();
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log(tables.rows.map(t => t.table_name));
  
  const persons = await client.query('SELECT * FROM "persons" LIMIT 5').catch(() => []);
  if (persons.rows) {
     console.log(JSON.stringify(persons.rows, null, 2));
  } else {
     const persons2 = await client.query('SELECT * FROM persons LIMIT 5').catch(() => []);
     if (persons2.rows) console.log(JSON.stringify(persons2.rows, null, 2));
  }

  await client.end();
}

main().catch(console.error);
