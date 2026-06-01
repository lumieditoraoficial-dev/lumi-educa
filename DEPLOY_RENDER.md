# Publicar o Lumi Educa gratis

O Lumi Educa nao deve ser publicado como HTML puro, porque login, biblioteca, PDFs e banco precisam do backend Node rodando junto com PostgreSQL.

O caminho gratis recomendado e:

- Render Free para hospedar o site e o backend.
- Supabase Free para hospedar o PostgreSQL.

## 1. Criar banco gratis

Abra:

```txt
https://supabase.com/dashboard/projects
```

Crie um projeto gratis e copie a string de conexao PostgreSQL em:

```txt
Project Settings > Database > Connection string
```

Use a conexao com pooler se o Supabase oferecer essa opcao.

## 2. Publicar no Render gratis

Abra:

```txt
https://render.com/deploy?repo=https://github.com/lumieditoraoficial-dev/lumi-educa
```

O Render vai ler `render.yaml` e criar um servico web no plano `free`.

Quando ele pedir variaveis, preencha:

```env
DATABASE_URL=postgresql://...
MASTER_PASSWORD=sua-senha-mestra-secreta
```

O `JWT_SECRET` e gerado automaticamente pelo Render.

## 3. Link da plataforma

Depois do deploy, o Render mostra um link parecido com:

```txt
https://lumi-educa.onrender.com
```

Esse e o link para os alunos acessarem.

## 4. Link do banco

O banco fica no Supabase:

```txt
https://supabase.com/dashboard/projects
```

Entre no projeto criado e abra `Table Editor` para ver as tabelas.

## 5. Conferir se esta funcionando

Depois que publicar, abra:

```txt
https://SEU-LINK.onrender.com/api/health
```

Resultado esperado:

```json
{
  "ok": true,
  "service": "lumi-educa",
  "database": {
    "ok": true,
    "mode": "postgresql"
  }
}
```

## Limites do gratis

O plano gratis pode dormir ou pausar por inatividade. Isso nao e bug do Lumi Educa; e limite do provedor gratuito.

Para reduzir chance de pausa:

- Acesse o sistema pelo menos uma vez por semana.
- Confira `/api/health` quando for usar com alunos.
- Faca backup do Supabase antes de testes importantes.
