# Deploy do Lumi Educa

Pasta local do projeto:

```txt
C:\Users\guilh\Documents\Codex\2026-05-23\edu-smart-system
```

## Login mestre

O acesso mestre fica oculto na tela de login em `Acesso interno`.

Defina a senha apenas em variavel de ambiente ou no arquivo `.env` local, que nao deve ser enviado ao GitHub.

Perfis disponiveis:

- Aluno
- Educador
- Coordenador
- Editor
- Administrador

Em producao, defina uma senha forte:

```env
MASTER_PASSWORD=sua-senha-forte
```

## Banco de dados

O sistema esta preparado para PostgreSQL.

Exemplo local:

```env
DATABASE_URL=postgresql://postgres:senha@localhost:5432/lumi_educa
```

Aplicar schema:

```bash
pnpm db:push
```

Sem `DATABASE_URL`, o app usa `data/edu-smart-system.json` e comeca zerado.

## Comandos

```bash
pnpm install
pnpm check
pnpm test
pnpm build
pnpm start
```

## Publicacao online

Recomendado:

- Aplicacao Node: Render, Railway, Fly.io ou VPS.
- Banco PostgreSQL: Supabase, Neon, Railway ou PostgreSQL em VPS.
- Armazenamento futuro de capas/PDFs: Cloudflare R2, AWS S3 ou Firebase Storage.

Variaveis importantes:

```env
DATABASE_URL=postgresql://...
MASTER_PASSWORD=...
PORT=3000
NODE_ENV=production
```

Nao publique a senha mestra no repositorio.
