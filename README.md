# AdDash

<div align="center">

**Dashboard de Performance para Agências de Tráfego Pago**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Ready-green.svg)](https://supabase.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

*Vibecoded with ❤️*

</div>

---

## 📖 Sobre

AdDash é um dashboard completo para agências de tráfego pago gerenciarem métricas, KPIs e performance de clientes em um único lugar. Visualização clara, comparação de períodos e gestão simplificada.

Ideal para agências que precisam:
- 📊 Visualizar performance de múltiplos clientes
- 📈 Comparar períodos e identificar tendências
- 🎯 Gerenciar prazos e lembretes
- 🔐 Controlar acesso por cliente

## ✨ Features

### 📊 Dashboard por Cliente
- Métricas de tráfego (Meta Ads)
- Visualização simplificada vs. padrão
- Preferência salva por cliente

### 📥 Importação
- Upload de CSV do Meta Ads
- Parsing automático de métricas
- Histórico de importações

### 📈 Análise
- Comparação de períodos (semana, mês, trimestre)
- Gráficos de tendência
- KPIs destacados

### 👥 Gestão
- Cadastro de clientes
- Permissões por usuário
- Prazos e lembretes por email

### 🔒 Segurança
- Autenticação com sessões seguras
- Cookies HTTP-only
- Rate limiting

## 🚀 Quick Start

### Pré-requisitos

- Docker e Docker Compose
- Conta no Supabase (gratuita)

### Deploy

```bash
# 1. Clone o repositório
git clone https://github.com/cirokk/addash.git
cd addash

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do Supabase

# 3. Suba o container
docker compose up -d --build

# 4. Verifique se está rodando
curl http://localhost:3220/api/health
```

### Acesso

```
http://localhost:3220
```

## 🛠️ Stack

| Tecnologia | Propósito |
|------------|-----------|
| Node.js + Express 5 | Backend API |
| Supabase (PostgreSQL) | Banco de dados principal |
| SQLite | Sessões locais |
| express-session | Autenticação |
| Helmet | Headers de segurança |

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Obrigatório | Descrição |
|----------|:-----------:|-----------|
| `SUPABASE_URL` | ✅ | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key do Supabase |
| `SESSION_SECRET` | ✅ | Segredo para sessões (aleatório) |
| `COOKIE_SECURE` | ⚪ | `true` para HTTPS, `false` para HTTP |
| `TRUST_PROXY` | ⚪ | `1` se atrás de proxy/reverse proxy |
| `PORT` | ⚪ | Porta do servidor (padrão: 3220) |

### Supabase Setup

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute o SQL em `supabase-schema.sql` no editor SQL
3. Copie a URL e a Service Role Key para o `.env`

## 📡 API

### Health Check

```http
GET /api/health
```

### Clientes

```http
GET /api/clients
POST /api/clients
GET /api/clients/:id
```

### Métricas

```http
GET /api/metrics/:clientId?period=7d
POST /api/metrics/import
```

## 🚧 Limitações Conhecidas

- ✅ Atualmente suporta apenas Meta Ads (Facebook/Instagram)
- ✅ Importação manual via CSV (sem integração direta com API do Meta)
- ✅ Sem suporte a Google Ads ainda

## 🗺️ Roadmap

- [ ] Integração com Google Ads
- [ ] Importação automática via API
- [ ] Relatórios em PDF
- [ ] Alertas por WhatsApp

## 🤝 Contribuindo

Contribuições são bem-vindas!

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

**Vibecoded** - Desenvolvido com ajuda de IA para automatizar e simplificar.

*Se este projeto foi útil para sua agência, deixe uma ⭐ no repositório!*

</div>
