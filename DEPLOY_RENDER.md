# Publicar o Lumi Educa

O Lumi Educa nao deve ser publicado como HTML puro, porque login, biblioteca, PDFs e banco precisam do backend Node rodando junto com PostgreSQL.

## Link de publicacao

Use o Blueprint do Render:

```txt
https://render.com/deploy?repo=https://github.com/lumieditoraoficial-dev/lumi-educa
```

O arquivo `render.yaml` cria:

- Servico web `lumi-educa`.
- Banco PostgreSQL `lumi-educa-db`.
- `DATABASE_URL` ligado automaticamente ao banco.
- `JWT_SECRET` gerado automaticamente.
- `MASTER_PASSWORD` pedido no painel do Render, sem ir para o GitHub.
- Health check em `/api/health`.

## Configuracao recomendada

Para nao suspender por inatividade, use plano `starter` ou superior no servico web e no banco.

Depois do deploy, o Render mostra um link parecido com:

```txt
https://lumi-educa.onrender.com
```

O painel do banco fica no Dashboard do Render, dentro do recurso `lumi-educa-db`.

## Conferencia

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
