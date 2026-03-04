const { Client } = require('pg');

async function createDatabase() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    password: 'postgres', // Based on the environment variable pattern
    port: 5432,
  });

  try {
    await client.connect();
    // Use double quotes for identifier
    await client.query('CREATE DATABASE looto_db');
    console.log('Database looto_db created successfully');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('Database looto_db already exists');
    } else {
      console.error('Error creating database:', err);
    }
  } finally {
    await client.end();
  }
}

createDatabase();
