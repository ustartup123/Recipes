# Recipes

Personal recipe library with AI-assisted import. Parse recipes from URLs, pasted
text, or YouTube videos into structured ingredients / instructions / tags, then
save them to a per-user Firestore library. Hebrew UI (RTL).

Scaffolded from [next-firebase-template](https://github.com/ustartup123/next-firebase-template).

## Stack

- Next.js 14 App Router + TypeScript
- Firebase Auth (Google), Firestore, Admin SDK, Storage
- Tailwind CSS, Lucide icons, react-hot-toast
- Gemini 2.5 Flash for recipe parsing
- Vitest (unit) + Playwright (e2e)
- Vercel deploy

## Local setup

\`\`\`bash
npm install
cp .env.example .env   # fill in Firebase + Gemini keys
npm run dev
\`\`\`

Then visit http://localhost:3000 (use \`?dev-login=true\` in development to skip
Google sign-in).

## Deploy

\`\`\`bash
npm run test
npm run build
npx vercel --prod --yes
\`\`\`

See \`CLAUDE.md\` for the mandatory fix-deploy pipeline.
