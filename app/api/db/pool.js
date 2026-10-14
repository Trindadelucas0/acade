import '../env.js'
import pg from 'pg'
export const dbConfig = (database = process.env.DB_NAME || 'avagym') => ({
  host: process.env.DB_HOST || 'localhost', port: +(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || '', database
})
export const pool = new pg.Pool({ ...dbConfig(), max: 10 })
export const q = (text, params) => pool.query(text, params)
