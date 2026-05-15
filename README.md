# 911 Training Simulator

Voice-based web app where fire-department youth explorers (ages 12-17)
practice making a 911 call. A kid picks a scenario, talks out loud to an
AI dispatcher (Claude), and gets coaching feedback when the call ends.

## Stack

- **Frontend:** Vite + React + Tailwind CSS
- **Speech-to-Text:** Web Speech API (`SpeechRecognition`) — browser-native
- **Text-to-Speech:** Web Speech API (`SpeechSynthesis`) — browser-native
- **AI dispatcher:** Anthropic Claude via a small Express proxy

The Anthropic API key never reaches the browser — all model calls go
through `server/index.js`.

## Local development

```bash
cp .env.example .env          # add your ANTHROPIC_API_KEY
npm install
npm run dev                   # vite on :5173, api on :8787
```

Open <http://localhost:5173>. Vite proxies `/api/*` to the Express server.

> The mic only works on `localhost` or HTTPS. On a LAN IP (`192.168.x.x`),
> Chrome will block `SpeechRecognition`.

## Production build

```bash
npm install
npm run build         # builds the React app into ./dist
npm start             # serves dist + /api from :8787
```

## VPS + nginx deployment

1. Clone the repo to `/opt/explorers911`, `npm ci`, `npm run build`.
2. Create `/opt/explorers911/.env` with `ANTHROPIC_API_KEY=...`.
3. Install the systemd unit:

   ```bash
   sudo cp deploy/explorers911.service.example /etc/systemd/system/explorers911.service
   sudo useradd --system --home /opt/explorers911 explorers911
   sudo chown -R explorers911:explorers911 /opt/explorers911
   sudo systemctl daemon-reload
   sudo systemctl enable --now explorers911
   ```

4. Drop the nginx config in place and issue a TLS cert (HTTPS is required
   for the microphone in Chrome/Edge/Safari):

   ```bash
   sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/explorers911
   sudo ln -s /etc/nginx/sites-available/explorers911 /etc/nginx/sites-enabled/
   sudo certbot --nginx -d example.com
   sudo systemctl reload nginx
   ```

## Browser support

| Browser | STT | TTS |
| ------- | --- | --- |
| Chrome / Edge | ✅ | ✅ |
| Safari (macOS / iOS) | ✅ | ✅ |
| Firefox | ❌ (no `SpeechRecognition`) | ✅ |

The home screen shows a warning if the browser doesn't support the Web
Speech API.

## What the app does

1. **Home** — kid picks one of four scenarios (fall, choking, fire, crash).
2. **Ringing** — short ring animation + tone, then the dispatcher answers.
3. **In-call** — hold-to-talk mic, live transcription, dispatcher speaks
   replies through TTS. Interrupting the dispatcher cancels playback,
   just like a real call. The dispatcher ends the call with a hidden
   `[END_CALL]` tag once units are dispatched.
4. **Feedback** — full transcript goes back to Claude for structured
   coaching: overall, what you did well, what to remember, key takeaway.

## Files of interest

- `src/App.jsx` — stage machine (home → ringing → call → feedback)
- `src/components/CallScreen.jsx` — mic + TTS + interrupt + transcript
- `src/hooks/useSpeechRecognition.js` — Web Speech API wrapper
- `src/hooks/useSpeechSynthesis.js` — TTS wrapper with voice picking
- `server/index.js` — `/api/chat` and `/api/feedback` Anthropic proxy
- `server/prompts.js` — dispatcher system prompt + feedback prompt
