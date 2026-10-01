# SmallVille — Frontend

Aplicação web do SmallVille, uma rede de cinemas: o cliente descobre filmes em cartaz, escolhe cidade e sessão, seleciona os assentos, monta a bomboniere, paga por PIX e recebe o ingresso com QR Code. Administradores usam o mesmo app para gerenciar catálogo, sessões, preços, estoque, pedidos, reembolsos e relatórios.

Este repositório é **apenas o frontend**. Ele conversa com a API do SmallVille (NestJS) através de `NEXT_PUBLIC_API_URL`.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router, React Server Components, Server Actions) |
| UI | React 19, Tailwind CSS 4, MUI + Emotion (pontuais), lucide-react / react-icons |
| Linguagem | TypeScript (`strict`, `noUncheckedIndexedAccess`) |
| Validação | Valibot (schemas de formulário) |
| Auth | JWT em cookie `httpOnly`, decodificado com `jwt-decode` |
| Extras | swiper (carrosséis), @hello-pangea/dnd (drag and drop), qrcode, html2pdf.js + react-to-print (ingresso em PDF), @react-input/mask (máscaras) |
| Build/Deploy | Output `standalone`, Docker, GitHub Actions (CI + CD via SSH na VPS) |

---

## Como rodar

**1. Instalar as dependências**

```bash
yarn install
```

**2. Configurar as variáveis de ambiente**

Crie um `.env` na raiz copiando o conteúdo do `.env.exemple`:

```env
NEXT_PUBLIC_API_URL=http://localhost:21165/api
```

**3. Rodar em desenvolvimento**

```bash
yarn dev
```

**4. Gerar a versão final (build de produção)**

```bash
yarn build
```

**5. Rodar em modo de produção** (só funciona depois do `yarn build`)

```bash
yarn start
```

**6. Lint** — vasculha o código à procura de más práticas, variáveis não usadas e problemas de formatação

```bash
yarn lint
```

> O script `yarn test` está declarado no `package.json`, mas hoje não existem arquivos `*.test.ts` em `src/` nem o `scripts/register-alias.mjs` que ele importa — ou seja, ainda não há suíte de testes rodando.

### Docker

```bash
docker build -t smallville-front .
docker run -p 3000:3000 -e PORT=3000 smallville-front
```

O `dockerfile` faz build multi-stage e roda o output `standalone` do Next (`node server.js`).

---

## Estrutura do projeto

```
src/
├── app/                  # Rotas (App Router)
│   ├── (public)/         # Home, catálogo, detalhes do filme, login/cadastro/senha
│   ├── (protected)/      # Exige cookie de sessão; redireciona para /login
│   │   └── admin/        # Exige role ADMIN; redireciona para /home
│   ├── layout.tsx        # Providers globais (Auth, Order), fontes, metadata
│   └── globals.css       # Tema do Tailwind 4 (@theme) + regras de impressão
├── actions/              # Server Actions ("use server") — toda a conversa com a API
│   └── admin/            # Ações restritas ao dashboard
├── components/           # Componentes por domínio (admin, sessions, payments, tickets…)
│   └── ui/               # Botão, input, modais, loader, logo…
├── context/              # AuthContext (usuário logado) e OrderContext (pedido em curso)
├── hooks/                # useSeatSelection, usePixTimer, useQueryParams, forms…
├── lib/                  # api.ts (fetch autenticado), auth.ts (sessão), fonts, qrcode, schemas
├── types/                # Contratos de domínio compartilhados
├── utils/                # Moeda, datas, máscaras, paginação, assentos, upload…
└── proxy.ts              # Middleware do Next (matcher de rotas)
```

### Convenções

- **Alias de import:** `@/*` aponta para a raiz do repositório, então os imports ficam como `@/src/lib/api`.
- **Server Actions no lugar de fetch no cliente:** as telas chamam funções de `src/actions/*`, que rodam no servidor, leem o cookie e falam com a API. O token JWT nunca chega ao browser.
- **`ActionResult<T>`:** as ações devolvem `{ success: true, data }` ou `{ success: false, error }`, então a UI trata os dois casos sem `try/catch` espalhado.
- **Commits:** padrão de commits semânticos descrito em [`branches.md`](./branches.md).

---

## Autenticação e autorização

- O login (`loginAction`) chama `POST /auth/login`, recebe o JWT e grava o cookie `auth_token` como `httpOnly`, com validade de 24h.
- `src/lib/auth.ts` decodifica esse cookie no servidor (`getServerUser`) e confere a expiração; `getSessionUser` complementa com o perfil atual vindo da API (é `cache()`ado por request).
- **Três níveis de proteção:**
  1. `(protected)/layout.tsx` — sem cookie, redireciona para `/login`.
  2. `(protected)/admin/layout.tsx` — sem `role === "ADMIN"`, redireciona para `/home`.
  3. Cada Server Action envia o `Authorization: Bearer` e a API decide.
- No cliente, o `AuthContext` expõe `user`, `isAuthenticated`, `isAdmin`, `updateUser` e `logout`, semeado pelo servidor via `initialUser`.

---

## Camada de acesso à API

`src/lib/api.ts` centraliza as chamadas autenticadas:

- injeta o `Authorization` a partir do cookie;
- aceita JSON ou `FormData` (rotas multipart de filmes e produtos);
- desembrulha o envelope `{ data }` da API (ou o mantém, com `keepEnvelope`);
- normaliza erros — inclusive o `message` em formato de array do `ValidationPipe` do Nest;
- usa `cache: "no-store"`, já que quase tudo é dado de sessão/venda.

---

## Funcionalidades

### Área pública
- **Home** com hero/carrossel de filmes, destaques da bomboniere e promoções.
- **Em cartaz** e **Lançamentos**, com cards de filme, busca e paginação.
- **Bomboniere** avulsa, com pré-seleção de itens salva em `localStorage` (`src/lib/snackPreselection.ts`) e reaproveitada dentro do fluxo de compra.
- **Página do filme**: banner, sinopse, elenco e a grade de sessões filtrada por **cidade** e por **dia**. A cidade do perfil apenas semeia o filtro — visitante sem cadastro escolhe no seletor, e trocar ali não altera a cidade cadastrada.
- **Autenticação**: login, cadastro, esqueci minha senha e redefinição de senha (schemas Valibot em `src/lib/schemas/`).

### Fluxo de compra
1. **Mapa de assentos** (`SeatMapModal` + `useSeatSelection`): grade da sala, assentos ocupados, seleção múltipla e escolha do tipo de ingresso (inteira, meia…), com o preço oficial calculado pelo backend.
2. **Bomboniere** dentro do mesmo fluxo, aproveitando o que já foi pré-selecionado.
3. **Pedido** criado via `createOrder`, mantido no `OrderContext` e resumido no `PurchaseSummary`.
4. **Pagamento** em `/payment/[orderId]`: PIX com QR Code, código copia-e-cola e contador de expiração (`usePixTimer`), com polling do status até um desfecho final. Cartão já está mapeado, porém ainda bloqueado como indisponível.
5. **Confirmação** e emissão do ingresso.

### Área do cliente
- **Meus ingressos** — ingressos com QR Code e download em PDF (`TicketDownloadButton` / `TicketPdfDocument`).
- **Meus pedidos** — histórico, status do pagamento e **solicitação de reembolso**.
- **Pontos** — saldo, extrato de transações e a regra de pontuação do programa de fidelidade.
- **Notificações** — sino no cabeçalho e caixa de entrada, com marcação de lidas.
- **Perfil** — dados cadastrais, cidade e exclusão de conta.

### Dashboard administrativo (`/admin`)
Seções declaradas em `src/components/admin/adminSections.ts`, todas sobre o mesmo shell de CRUD (`AdminCrudShell`, `AdminTable`, `AdminModal`, `AdminPagination`):

| Seção | O que faz |
| --- | --- |
| Filmes | Cadastro, edição e remoção, com upload de banner e elenco |
| Cinemas | Unidades, endereços e filmes em cartaz de cada cinema |
| Sessões | Horário, idioma, tipo de sala e preço do ingresso |
| Controle de vendas | Preços de inteira e meia, regras por dia e período de venda |
| Produtos / Estoque | Itens da bomboniere, preços, disponibilidade e quantidade |
| Pedidos | Todos os pedidos, com usuário, itens e valores |
| Ingressos | Ingressos emitidos por usuário, sessão e assento |
| Reembolsos | Fila de análise, com aprovação/recusa e trilha de auditoria |
| Relatórios | Receita, ingressos, filmes, cinemas e produtos por período |
| Usuários | Clientes cadastrados, com contato, cidade e data de cadastro |
| Notificações | Vendas novas, pagamentos aguardando análise e alertas de estoque |

---

## Detalhes de configuração (`next.config.ts`)

- `output: "standalone"` — imagem Docker enxuta.
- `serverActions.bodySizeLimit: 25 MB` — o padrão de 1 MB estoura já no primeiro banner de filme; os limites por arquivo (5 MB) e por envio ficam em `src/utils/upload.ts`.
- `images.remotePatterns` libera `firebasestorage.googleapis.com` e `storage.googleapis.com` (onde ficam banners e imagens de produto), servindo em AVIF/WebP.
- `removeConsole` em produção, preservando `console.error`.
- `poweredByHeader: false`.

---

## CI/CD

- **CI** (`.github/workflows/ci.yml`) — roda em todo push e em PR para `main`: `yarn install --frozen-lockfile`, `yarn lint`, `npx tsc --noEmit` e `yarn build`.
- **CD** (`.github/workflows/cd.yml`) — dispara após um CI verde em `main`, conecta na VPS por SSH, faz `git pull` e sobe o container com `docker compose up -d --build frontend`.

## Branches

`main` (produção) ← `dev` (integração) ← branches de feature. O padrão de mensagens de commit e os comandos de Git usados no time estão em [`branches.md`](./branches.md).
