# AdDash

Dashboard de performance para agências de tráfego pago. Visualização de métricas, KPIs, gestão de clientes e comparação de períodos.

## Stack

- **Backend:** Node.js + Express 5
- **Frontend:** HTML/CSS/JS estático
- **Database:** Supabase (PostgreSQL) + SQLite local para sessões
- **Auth:** express-session com cookies HTTP-only

## Funcionalidades

- Dashboard por cliente com métricas de tráfego (Meta Ads)
- Visualização simplificada vs. padrão (preferência por cliente)
- Importação de CSV do Meta Ads
- Gestão de clientes e permissões
- Comparação de períodos
- Prazos e lembretes por email

## Deploy

```bash
# 1. Copiar .env.example para .env e preencher
cp .env.example .env

# 2. Subir com Docker Compose
docker compose up -d --build

# 3. Verificar saúde
curl http://localhost:3220/api/health
```

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do Supabase |
| `SESSION_SECRET` | Segredo para sessões |
| `COOKIE_SECURE` | `true` para HTTPS, `false` para HTTP |
| `TRUST_PROXY` | `1` se atrás de proxy |
| `PORT` | Porta do servidor (padrão: 3220) |

## Licença

MIT
