import pg from "pg";

const { Pool } = pg;

const globalForPostgres = globalThis;

const pool =
  globalForPostgres.postgresPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPostgres.postgresPool = pool;
}

export default pool;
