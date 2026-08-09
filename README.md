# 💘 Couple Game

Um party game para casais, amigos e solteiros, feito para rodar direto no navegador.

## 🎮 3 salas de jogo

### 1. 💞 Entre Nós
Uma experiência para o casal conversar, rir e se aproximar com perguntas em três intensidades:

- **Leve** — memórias, carinho e cotidiano
- **Profundo** — sentimentos, futuro e conexão
- **Quente** — intimidade e preferências, sempre com respeito e consentimento

Não há vencedor ou perdedor. A ideia é criar conversa.

### 2. 🥂 Duelo de Casais
Dois casais formam duas equipes e disputam perguntas de conhecimento geral.

- 5, 10 ou 15 rodadas
- dificuldades fácil, média, difícil ou mista
- pontuação automática
- empate tratado no resultado
- casal com menor pontuação recebe um **mico aleatório**

### 3. 🎉 Galera
De 2 a 8 jogadores, casais ou solteiros, jogando individualmente.

- turnos alternados
- perguntas de conhecimento geral
- placar por jogador
- quem terminar com a menor pontuação paga um **mico aleatório**

## ✨ Extras

- interface responsiva para celular e desktop
- funciona sem cadastro
- nomes e preferências ficam somente no navegador
- estatísticas locais de partidas
- perguntas e micos embaralhados
- aleatoriedade usando `crypto.getRandomValues` quando disponível
- botão para trocar pergunta sem pontuar
- modo tela cheia para jogar na TV ou em uma roda de amigos
- sem framework e sem dependências de runtime

## 🚀 Rodar localmente

Você pode abrir `index.html` diretamente no navegador ou servir os arquivos por HTTP:

```bash
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080`.

> Como o projeto usa ES Modules, servir por HTTP é a opção mais compatível entre navegadores.

## 🧪 Validação

O repositório possui uma validação automática dos baralhos de perguntas:

```bash
npm test
```

Ela verifica IDs duplicados, alternativas inválidas, resposta correta fora do intervalo e quantidade mínima de conteúdo.

## 🌐 GitHub Pages

Como o jogo é 100% estático, ele pode ser publicado pelo GitHub Pages usando a raiz da branch `main`.

No GitHub: **Settings → Pages → Deploy from a branch → main / root**.

## 🗂️ Estrutura

```text
.
├── index.html
├── styles.css
├── app.js
├── data.js
├── manifest.webmanifest
├── package.json
├── scripts/
│   └── validate-data.mjs
└── .github/
    └── workflows/
        └── ci.yml
```

## 🔒 Privacidade e segurança

O MVP não possui login, banco de dados, analytics ou API. Entradas de nomes são tratadas como texto e não são executadas como HTML. As preferências são armazenadas localmente no navegador.

## 🛣️ Próximas evoluções possíveis

- salas online com código de convite
- multiplayer em tempo real
- login opcional
- decks personalizados
- QR Code para entrada na sala
- ranking por temporada
- temas visuais desbloqueáveis
- sons e feedback tátil
- perguntas enviadas pelos próprios jogadores
- painel para criar novos baralhos

---

Feito para transformar uma noite comum em uma boa história. ❤️
