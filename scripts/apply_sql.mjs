// Aplica um arquivo .sql no Postgres self-hosted via gateway /pg/query.
// Uso: SVC_KEY=<service_role> node scripts/apply_sql.mjs supabase/migrations/007_team_accounts.sql
// A service_role NUNCA é commitada — vem da env SVC_KEY.
import { readFileSync } from 'node:fs'

const KEY = process.env.SVC_KEY
const BASE = process.env.PG_BASE || 'https://api.praktor.com.br'
const file = process.argv[2]

if (!KEY) { console.error('Defina SVC_KEY (service_role) no ambiente.'); process.exit(1) }
if (!file) { console.error('Informe o caminho do .sql.'); process.exit(1) }

const sql = readFileSync(file, 'utf8')

const res = await fetch(`${BASE}/pg/query`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'User-Agent': 'praktor-memory-client/1.0',
  },
  body: JSON.stringify({ query: sql }),
})
const text = await res.text()
console.log(res.status, text)
process.exit(res.ok && !text.includes('"error"') ? 0 : 1)
