# SmallVille — Backend

API REST de um sistema de cinema: catálogo de filmes, programação de sessões,
venda de ingressos e da bomboniere, pagamento, emissão de ingresso com QR Code,
programa de fidelidade e painel gerencial.

Construída em **NestJS 11 + TypeScript + MongoDB (Mongoose)**, com autenticação
JWT, controle de acesso por papel (`USER` / `ADMIN`) e documentação Swagger.

---

## Índice

- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Arquitetura](#arquitetura)
- [Módulos](#módulos)
- [Fluxo principal de compra](#fluxo-principal-de-compra)
- [Regras de negócio](#regras-de-negócio)
- [Rotas](#rotas)
- [Testes e CI](#testes-e-ci)
- [Convenção de commits](#convenção-de-commits)

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | NestJS 11 (Express) |
| Linguagem | TypeScript 5.7 |
| Banco | MongoDB via Mongoose 9 |
| Autenticação | JWT (`@nestjs/jwt`) + bcrypt |
| Validação | `class-validator` / `class-transformer` |
| Documentação | Swagger (`@nestjs/swagger`) |
| E-mail | Nodemailer + `@nestjs-modules/mailer` (SMTP Brevo) |
| Upload de imagens | Firebase Admin (Cloud Storage) + Multer |
| PDF / QR Code | `pdfkit` + `qrcode` |
| Rate limit | `@nestjs/throttler` (100 req / 60s, global) |
| Testes | Jest (unitários) + Supertest (e2e) |

---

## Como rodar

### 1. Instalar dependências

```bash
yarn install
```

### 2. Configurar o ambiente

Crie um `.env` na raiz copiando o conteúdo de `.env.exemple` e preencha os
valores (banco, JWT, SMTP, Firebase, credenciais do admin).

### 3. Subir a aplicação

```bash
yarn start:dev     # desenvolvimento, com watch
yarn start:prod    # produção (exige yarn build antes)
yarn start:debug   # debug com watch
```

A API sobe em `http://localhost:21165` com prefixo global `/api`.
O Swagger fica em **`http://localhost:21165/api/api-docs`**.

Na inicialização o `SeedService` cria automaticamente o usuário administrador
definido em `EMAIL_ADMIN` / `PASSWORD_ADMIN` / `CPF_ADMIN`, caso ele ainda não
exista.

### Outros comandos

```bash
yarn build      # compila para dist/
yarn lint       # ESLint com --fix
yarn format     # Prettier
yarn test       # testes unitários
yarn test:cov   # cobertura
yarn test:e2e   # testes end-to-end
```

### Docker

O `dockerfile` empacota a aplicação em `node:22-slim` e só inicia depois que a
conexão com o host `mongo-kingdom:27017` responder.

---

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `PORT` | Porta HTTP (padrão `21165`) |
| `DATABASE_URL` | String de conexão do MongoDB |
| `DATABASEURL_PRODUCTION` | Conexão do banco de produção |
| `TOKEN_SECRET` | Segredo do JWT — também assina o QR Code dos ingressos |
| `TOKEN_EXPIRATION` | Validade do token (ex.: `1h`) |
| `NODE_ENV` | `development` / `production` / `test` |
| `MAIL_HOST` `MAIL_PORT` `MAIL_USER` `MAIL_PASS` `MAIL_FROM` | SMTP de envio |
| `EMAIL_ADMIN` `PASSWORD_ADMIN` `CPF_ADMIN` | Credenciais do admin criado no seed |
| `FIREBASE_PROJECT_ID` `FIREBASE_CLIENT_EMAIL` `FIREBASE_PRIVATE_KEY` `FIREBASE_STORAGE_BUCKET` `FIREBASE_STORAGE_FOLDER` | Credenciais do Cloud Storage |
| `FRONTEND_URL` | Base do link enviado no e-mail de redefinição de senha |

---

## Arquitetura

Cada domínio é um módulo NestJS isolado, sempre com a mesma estrutura interna:

```
src/<modulo>/
├── controllers/   # rotas HTTP + documentação Swagger
├── services/      # regra de negócio
├── dtos/          # entrada validada com class-validator
├── schemas/       # modelos Mongoose
├── enums/         # estados e tipos do domínio
├── messages/      # textos de resposta centralizados
└── constants/     # regras fixas (pontuação, estoque, dias da semana)
```

Configuração global aplicada em `src/main.ts`:

- prefixo `/api` em todas as rotas;
- `ValidationPipe` com `whitelist`, `forbidNonWhitelisted`, `transform` e
  `stopAtFirstError`, usando um `exceptionFactory` próprio;
- `MulterExceptionFilter` global para erros de upload;
- CORS liberado e Swagger com autenticação Bearer persistida.

**Segurança:** o `AuthGuard` valida o JWT e injeta `request.user`; o
`RolesGuard` lê o decorator `@Roles(...)` e restringe a rota ao papel exigido.
O `ThrottlerGuard` é registrado como `APP_GUARD` global.

---

## Módulos

| Módulo | Responsabilidade |
|---|---|
| **auth** | Registro, login, `GET /auth` (perfil do token), esqueci/redefinir senha por e-mail |
| **users** | CRUD de usuários, papéis, dados pessoais com validação de CPF, CEP, telefone e idade |
| **cinemas** | Cadastro de cinemas (cidade/estado/status), vínculo com filmes, endpoint de detalhes com filmes e sessões |
| **movies** | Catálogo: gênero, classificação indicativa, duração, pôster, detalhes com sessões |
| **session** | Sessões (sala, idioma, data/hora, mapa de assentos por tipo), já com preço e disponibilidade de venda resolvidos |
| **tickets** | Emissão de ingressos, número único, QR Code assinado por HMAC, PDF |
| **products** | Bomboniere: categorias, tamanho, preço, estoque e disponibilidade |
| **orders** | Pedido, carrinho de produtos, cancelamento, solicitação e análise de reembolso, recibo e trilha de auditoria |
| **payments** | Pagamento com gateway **mockado** (PIX, cartão de crédito/débito) |
| **loyalty** | Programa de pontos: saldo, extrato, crédito e estorno idempotentes |
| **sales-control** | Regras de preço (inteira/meia por dia da semana e cinema) e janela de vendas por sessão |
| **notifications** | Notificações in-app para usuário e administrador, com deduplicação |
| **analytics** | Indicadores gerenciais de vendas, filmes, cinemas, produtos e estoque |
| **storage** | Upload de imagens (JPEG/PNG/WEBP, máx. 5 MB) para o Firebase Storage |
| **mail** | Módulo global de SMTP |
| **seed** | Criação do administrador na subida da aplicação |
| **common** | Enums de UF, decorator de papéis, validadores e fábrica de exceções |

---

## Fluxo principal de compra

```
1. POST /api/orders                    → cria o pedido com os assentos escolhidos
                                         (valida assentos, janela de venda e preço)
2. PATCH /api/orders/:id/products      → adiciona/altera itens da bomboniere
3. POST /api/payments                  → gera a cobrança (PIX com QR Code e validade
                                         de 15 min, ou cartão processado em ~2,5s)
4. Pagamento aprovado                  → emite os ingressos, baixa o estoque,
                                         credita pontos, envia e-mail e notifica
5. GET /api/orders/:id/ticket/download → PDF do ingresso com QR Code
```

Se algo der errado no caminho: um PIX vencido expira o pedido de forma
preguiçosa na próxima consulta, pagamento recusado devolve o pedido para um
estado editável, e o usuário pode cancelar ou pedir reembolso — que passa pela
análise do administrador.

**Estados do pedido** (`OrderStatus`): `pedido_realizado` → `pagamento_pendente`
→ `pagamento_aprovado` | `pagamento_recusado` | `expirado` | `pedido_cancelado`
→ `reembolso_solicitado` → `reembolso_aprovado` | `reembolso_recusado`.

---

## Regras de negócio

- **Preço do ingresso** vem, nesta ordem: preço próprio da sessão → regra
  cadastrada em *sales-control* (por dia da semana e/ou cinema) → valor padrão.
  O dia da semana é sempre calculado no fuso `America/Sao_Paulo`.
- **Tipos de ingresso:** `INTEIRA` e `MEIA`.
- **Tipos de assento:** comum, preferencial, cadeirante, acompanhante PCD e obeso.
- **Fidelidade:** 10 pontos a cada R$ 5,00 gastos. Crédito e estorno usam chave
  de idempotência por pedido, então repetir a operação não duplica pontos.
  O resgate de recompensas ainda não está habilitado.
- **Estoque:** produto com 10 unidades ou menos gera alerta ao administrador —
  a mesma régua usada pela notificação e pelo painel de analytics.
- **Ingresso:** número no formato `SMV-AAAAMMDD-XXXXXXXX` e QR Code assinado com
  HMAC-SHA256 derivado do `TOKEN_SECRET`, verificável na portaria.
- **Auditoria:** toda operação sensível sobre um pedido (visualizar, baixar,
  cancelar, reembolsar) é registrada em `OrderAuditLog` com o resultado
  (`sucesso`, `falha` ou `negado`).
- **Gateway de pagamento é simulado:** hoje só o PIX está liberado para venda; o
  mock inclui taxa de aprovação de 85% no cartão e 3% de falha de comunicação,
  para exercitar os caminhos de erro.

---

## Rotas

Todas sob o prefixo `/api`. 🔒 exige JWT · 👑 exige papel `ADMIN`.

### Autenticação

| Método | Rota | Acesso |
|---|---|---|
| POST | `/register` | público |
| POST | `/auth/login` | público |
| GET | `/auth` | 🔒 |
| POST | `/forgot-password` | público |
| GET | `/reset-password/validate` | público |
| POST | `/reset-password` | público |

### Catálogo

| Método | Rota | Acesso |
|---|---|---|
| GET | `/movies` · `/movies/:id` · `/movies/:id/details` | público |
| POST · PATCH · DELETE | `/movies` · `/movies/:id` | 🔒👑 |
| GET | `/cinemas` · `/cinemas/:id` · `/cinemas/:id/details` | público |
| POST · PATCH · DELETE | `/cinemas` · `/cinemas/:id` | 🔒👑 |
| POST · DELETE | `/cinemas/:id/movies/:movieId` | 🔒👑 |
| GET | `/sessions` · `/sessions/:id` · `/sessions/movie/:movieTitle` | público |
| POST · PATCH · DELETE | `/sessions` · `/sessions/:id` | 🔒👑 |
| GET | `/products/availables` · `/products/:id` | público |
| GET · POST · PATCH · DELETE | `/products` · `/products/:id` | 🔒👑 |

### Compra

| Método | Rota | Acesso |
|---|---|---|
| POST · GET | `/orders` · `/orders/:id` | 🔒 |
| PATCH | `/orders/:id/products` | 🔒 |
| GET | `/orders/:id/ticket` · `/orders/:id/ticket/download` · `/orders/:id/receipt` | 🔒 |
| POST | `/orders/:id/ticket/resend-email` · `/orders/:id/cancel` · `/orders/:id/refund` | 🔒 |
| GET · POST | `/refunds` · `/refunds/:id` · `/refunds/:id/approve` · `/refunds/:id/reject` | 🔒👑 |
| GET | `/payments/methods` · `/payments/:id` · `/payments/orders/:orderId` | 🔒 |
| POST | `/payments` · `/payments/:id/mock-confirm-pix` · `/payments/orders/:orderId/cancel` | 🔒 |
| POST | `/payments/orders/:orderId/mock-approve` · `/payments/orders/:orderId/reject` | 🔒👑 |
| GET | `/tickets/my-tickets` · `/tickets/:id` | 🔒 |
| GET · POST | `/tickets` | 🔒👑 |

### Conta e gestão

| Método | Rota | Acesso |
|---|---|---|
| GET · PATCH · DELETE | `/users/:id` | 🔒 |
| GET | `/users` | 🔒👑 |
| GET | `/loyalty/me` · `/loyalty/me/transactions` | 🔒 |
| GET | `/loyalty/users/:userId` | 🔒👑 |
| GET · PATCH | `/notifications` · `/notifications/unread-count` · `/notifications/read-all` · `/notifications/:id/read` | 🔒 |
| GET | `/analytics/sales` · `/analytics/movies` · `/analytics/cinemas` · `/analytics/products` · `/analytics/stock-alerts` | 🔒👑 |
| GET · POST · PATCH · DELETE | `/sales-control/price-rules` · `/sales-control/sessions` | 🔒👑 |
| GET | `/sales-control/sessions/:sessionId/pricing` | 🔒 |
| POST | `/storage/upload` | 🔒👑 |

A lista completa, com corpo de requisição, exemplos e respostas, está no Swagger.

---

## Testes e CI

- **Unitários** (`*.spec.ts`, ao lado do código): 26 suítes cobrindo serviços e
  controllers de auth, usuários, filmes, cinemas, sessões, ingressos, produtos,
  pedidos, pagamentos, fidelidade, notificações, precificação e analytics.
- **E2E** (`test/*.e2e-spec.ts`): auth, usuários, filmes, cinemas, sessões,
  produtos e ingressos.
- **Pipeline** (`.github/workflows/ci.yml`), em `push`/`PR` para `main` e `dev`:
  `lint + tsc --noEmit` → `testes unitários e e2e` (com serviço MongoDB 8) →
  `build`, publicando a cobertura e o `dist/` como artefatos.

---

## Convenção de commits

O projeto segue commits semânticos (`feat`, `fix`, `docs`, `test`, `refactor`,
`chore`, `ci`…). O guia completo, com exemplos, está em
[`branches.md`](./branches.md).
