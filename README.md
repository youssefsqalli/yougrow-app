# Value Adding Tasks App (Web + Android PWA)

Minimalist app with rounded blue outlines, daily top-5 task list, donut completion chart, and calendar status view.

## Features
- Create up to 5 daily tasks called Value Adding Tasks
- Morning reminder + repeated reminder every 30 minutes if today's list is still empty (while app is open)
- Check/uncheck tasks as you complete them
- Donut chart with color rules:
  - Red: 0% or 20%
  - Orange: 40% or 60%
  - Green: 80% or 100%
- Calendar overview with red/orange/green daily status

## Run locally
Because this is a PWA, use a local static server instead of opening `index.html` directly.

Examples:
- `python3 -m http.server 8080`
- Open `http://localhost:8080/value-adding-tasks-app/`

## Android usage
1. Open the app URL in Chrome on Android.
2. Use **Add to Home screen** to install it.
3. Open installed app and tap **Enable reminders**.
4. Keep app permissions for notifications enabled.

## Notes
- Browser notifications and repeat reminders are strongest when app is open.
- Data is currently stored locally in browser `localStorage`.

## Closed-app reminders (Firebase)
This project now includes Firebase push scaffolding:
- Web app registers FCM token and syncs daily task status to Firestore (`devices/{deviceId}/days/{YYYY-MM-DD}`).
- Scheduled function sends reminder every 30 minutes when `hasAnyTask` is false.

Files:
- `firebase-messaging-sw.js`
- `firebase-sw-config.js`
- `firebase/functions/index.js`
- `firebase/functions/package.json`

High-level setup:
1. Create Firebase project and enable Cloud Messaging + Firestore.
2. Deploy this web app on Firebase Hosting (or any HTTPS host).
3. In app `Settings`, paste Firebase config + Web Push VAPID key and press `Connect Push`.
4. Fill `firebase-sw-config.js` with the same Firebase web config and redeploy (required for true closed-app background push).
5. Deploy functions from `firebase/functions`:
   - `npm install`
   - `firebase deploy --only functions`

## Daily 5 RAG (latest updates)
Daily 5 now expects a server endpoint that does live retrieval and returns topic-constrained questions from recent news/updates.

Daily 5 output contract:
- Exactly 5 questions
- Strictly bounded by selected topics (off-topic set is rejected)
- Format mix across: `mcq`, `true_false`, `fill_blank`, `short_answer`
- Every item must include at least one source URL from recent updates

Included endpoint:
- Firebase HTTPS function: `daily5` in `firebase/functions/index.js`
- Uses OpenAI + web search tool for retrieval

Required server env:
- `OPENAI_API_KEY`
- Optional: `DAILY5_MODEL` (default: `gpt-5.1`)

Deploy:
1. `cd firebase/functions`
2. `npm install`
3. Configure secret/env for `OPENAI_API_KEY`
4. `firebase deploy --only functions`

### Free Alternative (no Firebase Blaze): Cloudflare Worker
This is the recommended path if you don't want paid Firebase Functions.

Files:
- `cloudflare/daily5-worker.js`
- `cloudflare/wrangler.toml.example`

Deploy quick steps:
1. Create a free Cloudflare account and open Workers.
2. Create a Worker and paste `cloudflare/daily5-worker.js`.
3. Add Worker secret `OPENAI_API_KEY`.
4. Optional env var: `DAILY5_MODEL` (default `gpt-5.1`).
5. Deploy and copy your Worker URL (example: `https://yougrow-daily5.<subdomain>.workers.dev`).
6. In app `Daily 5 Settings`, paste that URL in **Daily 5 API** and save.

## Android Screen Time Bridge (new)
If you want real screen-time minutes from your Android phone, use:
- `android-screen-time-bridge/`

This native bridge reads Usage Access stats, uploads `addictiveApps` and `usefulApps` to:
- `syncSpaces/{syncCode}/screenTime/{YYYY-MM-DD}`

Then Home reads that cloud data (when Firebase config + Sync Code are set in Settings).
