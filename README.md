# Lumi Educa

Sistema educacional e editorial para escrita de livros por alunos, revisao pedagogica, aprovacao escolar e biblioteca digital.

## Funcoes principais

- Login por perfil: aluno, educador, coordenador, editor e administrador.
- Senha mestra local para teste rapido em qualquer perfil.
- Aluno cria livros, organiza paginas, escreve e salva com autosave.
- Livro segue o fluxo: rascunho, enviado, em revisao, aprovado e publicado.
- Educador le producoes, devolve ajustes ou envia para coordenacao.
- Coordenador aprova e publica livros na biblioteca digital.
- Equipe acessa paginas em modo leitura; aluno nao conversa com IA.
- Editor baixa o livro em PDF para revisao, arquivo e publicacao.
- Backend preparado para PostgreSQL e fallback local em JSON para localhost.

## Acesso interno

O acesso mestre fica oculto na tela de login em `Acesso interno`.

Configure a senha pela variavel `MASTER_PASSWORD` no arquivo `.env` local ou no painel do servidor em producao. Nunca publique essa senha no GitHub.

## Rodar localmente

```bash
pnpm install
pnpm build
pnpm start
```

No computador local deste projeto, o atalho `lumi educA` na Area de Trabalho inicia o servidor e abre:

```txt
http://127.0.0.1:3105/login
```

## Variaveis de ambiente

Copie `.env.example` para `.env` quando for usar banco real.

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/lumi_educa
MASTER_PASSWORD=sua-senha-secreta
PORT=3105
```

Sem `DATABASE_URL`, o sistema usa armazenamento local em `data/edu-smart-system.json`, com dados zerados.

## Banco de dados

O projeto usa PostgreSQL via Drizzle. Para publicar:

```bash
pnpm db:push
pnpm build
pnpm start
```

Um PC com 16 GB de RAM e PostgreSQL local e suficiente para desenvolvimento, testes e uso pequeno/medio. Para producao publica, use banco hospedado, backups automaticos e variaveis seguras.

## Qualidade

```bash
pnpm check
pnpm test
pnpm build
```

Todos os comandos acima devem passar antes de publicar.
