# Arquitetura do Lumi Educa

## Visao geral

O Lumi Educa e uma plataforma web para autoria estudantil, revisao pedagogica e publicacao de livros digitais. A aplicacao combina frontend React, backend Express/tRPC e banco PostgreSQL via Drizzle, com fallback local em JSON para desenvolvimento sem banco.

## Perfis

- Aluno: cria livros, escreve paginas, salva rascunhos e envia para revisao.
- Educador: le producoes, registra feedback e encaminha para coordenacao.
- Coordenador: aprova obras e publica na biblioteca digital.
- Editor: acompanha obras aprovadas para acabamento editorial.
- Administrador: gerencia usuarios, indicadores e configuracoes.

## Regras de IA

A IA nao e exposta como chat para alunos. Qualquer analise automatizada deve ser interna, voltada apenas para educadores, coordenadores, editores e administradores.

## Fluxo de publicacao

```txt
Rascunho -> Enviado -> Em revisao -> Aprovado -> Publicado
```

Livros devolvidos entram como `rejected`, permitindo que o aluno edite e reenvie.

## Backend

- `server/routers/auth.ts`: login por senha mestra e email/senha.
- `server/routers/books.ts`: livros, paginas, escrita e permissoes.
- `server/routers/publications.ts`: envio, devolucao, aprovacao e publicacao.
- `server/routers/library.ts`: biblioteca publica.
- `server/localStore.ts`: persistencia local zerada quando nao ha `DATABASE_URL`.
- `drizzle/schema.ts`: schema PostgreSQL.

## Frontend

- `DashboardStudent`: biblioteca pessoal e criacao de livros.
- `BookPages`: organizacao de paginas e envio para revisao.
- `PageEditor`: escrita com autosave e modo leitura para equipe.
- `DashboardEducator`: revisao pedagogica.
- `DashboardCoordinator`: aprovacao e publicacao.
- `DashboardEditor`: acompanhamento editorial.
- `DashboardAdmin`: indicadores e administracao.

## Persistencia

Em desenvolvimento local:

```txt
data/edu-smart-system.json
```

Em producao:

```txt
DATABASE_URL=postgresql://...
```

## Verificacao

Antes de publicar:

```bash
pnpm check
pnpm test
pnpm build
```
