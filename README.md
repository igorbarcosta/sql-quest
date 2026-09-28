# SQL Quest — Revisão SQL

Jogo estático de revisão de SQL para o 2º ano do curso técnico integrado em Informática: 10 fases regulares e um Chefão cumulativo. O aluno escreve consultas para reproduzir saídas-alvo. Os dados e o progresso ficam apenas no navegador.

## Executar localmente

```bash
python -m http.server 8000 -d docs
```

Abra `http://localhost:8000`.

## GitHub Pages

Publique em **Settings → Pages → Deploy from branch → main → /docs**.

O SQLite via WebAssembly (`sql.js` 1.13.0) está versionado em `docs/vendor/`. Não há etapa de build nem dependência de CDN em tempo de execução.

`gabarito-professor.sql` está ignorado pelo Git e não deve ser colocado no repositório público.

## Uso em sala

As consultas são avaliadas pelos nomes e ordem das colunas, quantidade e ordem das linhas e valores. Há duas dicas por fase e três no Chefão. Tentativas erradas não reduzem estrelas. O Chefão não vale estrelas. O progresso é salvo em `localStorage`; ao fim, o aluno pode baixar suas próprias consultas em um arquivo `.sql`.
