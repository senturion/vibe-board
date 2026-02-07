This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Goal Planner LLM Providers

The Goal Task Planner supports multiple backends via environment variables:

`GOAL_PLANNER_PROVIDER=rules|openai|openai-compatible|ollama`

`rules` keeps deterministic in-app templates (default fallback).

### OpenAI

```bash
GOAL_PLANNER_PROVIDER=openai
OPENAI_API_KEY=your_key
GOAL_PLANNER_MODEL=gpt-4.1-mini
# optional
OPENAI_BASE_URL=https://api.openai.com/v1
```

### OpenAI-Compatible APIs (vLLM, LM Studio, etc.)

```bash
GOAL_PLANNER_PROVIDER=openai-compatible
GOAL_PLANNER_API_URL=http://localhost:1234/v1
GOAL_PLANNER_MODEL=your-model-name
# optional (only if your endpoint requires auth)
GOAL_PLANNER_API_KEY=your_key
```

### Ollama

```bash
GOAL_PLANNER_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
GOAL_PLANNER_MODEL=llama3.1
```

Optional tuning:

```bash
GOAL_PLANNER_TIMEOUT_MS=20000
```

If provider calls fail, the app automatically falls back to rules-based suggestions.

You can also choose provider/model/base URL per user in the app Settings under `AI`.
You can enter an API key there too; it stays local to your device and is sent only with AI requests.
Server environment variables still act as defaults/fallbacks.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
