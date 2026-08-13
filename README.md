# Marshadow Dex

Uma experiência Pokémon imersiva construída em React, com abertura cinematográfica, Pokédex pesquisável, Team Builder, perfis de treinador e a Marshadow AI.

## Destaques

- abertura cinematográfica responsiva e otimizada para desktop e celular;
- Pokédex com busca, formas, evoluções e dados completos;
- Team Builder com análise de fraquezas, resistências e sugestões;
- contas de treinador com Firebase Authentication e Firestore;
- Marshadow AI com conversas persistentes, títulos inteligentes, edição e exclusão;
- interface em preto e roxo, animações 2D/3D e interações personalizadas.

## Executar localmente

Requisitos: Node.js 22.13 ou superior.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Abra o endereço exibido no terminal.

## Variáveis de ambiente

O chatbot usa uma função de servidor para não expor a chave da API no navegador.

```env
GEMINI_API_KEY=sua_chave_do_google_ai_studio
```

No Vercel, cadastre `GEMINI_API_KEY` em **Settings → Environment Variables** antes do deploy de produção.

## Comandos

```bash
npm run dev       # ambiente de desenvolvimento
npm run build     # build de produção
npm test          # build e testes
npm run lint      # análise estática
```

## Tecnologias

React 19, TypeScript, Vinext/Vite, Three.js, Firebase Authentication, Firestore e Gemini API.

---

Projeto criado por [SpectrePulse01](https://github.com/SpectrePulse01).
