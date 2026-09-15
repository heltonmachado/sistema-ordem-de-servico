import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config(); // carrega variáveis do .env

const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Supabase exige SSL
});

async function testConnection() {
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log('✅ Conectado ao Supabase! Hora atual:', res.rows[0]);
  } catch (err) {
    console.error('❌ Erro de conexão:', err);
  } finally {
    await client.end();
  }
}

testConnection();
