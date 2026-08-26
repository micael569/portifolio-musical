# Meu Portfólio Musical

Site estático (HTML + CSS + JS puros) para exibir suas músicas e vídeos,
pronto para publicar gratuitamente no **GitHub Pages**.

## Estrutura

```
portfolio-musical/
├── index.html
├── style.css
├── script.js
└── assets/
    ├── musicas/   ← coloque seus .mp3 aqui
    ├── videos/    ← coloque seus .mp4 aqui
    └── capas/     ← (opcional) imagens de capa
```

## 1. Adicione suas músicas e vídeos

1. Copie seus arquivos `.mp3` para `assets/musicas/`.
2. Copie seus arquivos `.mp4` para `assets/videos/`.
3. Abra `script.js` e edite as listas `TRACKS` e `VIDEOS` no topo do arquivo,
   colocando o título, a descrição e o caminho de cada arquivo. Exemplo:

```js
const TRACKS = [
  { title: "Céu de Vidro", desc: "Single · 2026", src: "assets/musicas/ceu-de-vidro.mp3" },
];
```

4. Edite também o texto da seção "Sobre" e os links de contato no `index.html`.

## 2. Teste localmente (opcional)

Você pode simplesmente abrir o `index.html` no navegador. Se os players de
vídeo/áudio não carregarem por causa de restrições do navegador, rode um
servidor local simples:

```bash
python3 -m http.server 8000
```

E acesse `http://localhost:8000`.

## 3. Publique no GitHub Pages

1. Crie um repositório novo no GitHub (ex: `meu-portfolio-musical`).
2. Envie todos os arquivos deste projeto para o repositório (pelo site,
   arrastando os arquivos, ou via Git):

```bash
git init
git add .
git commit -m "Primeira versão do portfólio"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/meu-portfolio-musical.git
git push -u origin main
```

3. No repositório, vá em **Settings → Pages**.
4. Em "Branch", selecione `main` e a pasta `/ (root)`, depois clique em **Save**.
5. Em alguns minutos, o site estará no ar em:
   `https://SEU_USUARIO.github.io/meu-portfolio-musical/`

## Observações importantes

- **Tamanho dos arquivos**: o GitHub recomenda arquivos individuais de até
  ~50 MB (e o repositório todo idealmente abaixo de ~1 GB). Para músicas em
  MP3 isso raramente é problema, mas vídeos longos podem passar do limite —
  comprima-os antes (ex: [freeconvert.com](https://www.freeconvert.com)) ou,
  se forem muitos/grandes, considere hospedá-los no YouTube/Vimeo e apenas
  incorporar o player (`<iframe>`) no site.
- **Duração das faixas**: aparece automaticamente na lista assim que o
  navegador consegue ler os metadados do arquivo — não precisa preencher
  na mão.
- **Visualizador de onda**: a barra abaixo da lista de faixas reage ao áudio
  em tempo real (usa a Web Audio API), sem precisar de bibliotecas externas.
