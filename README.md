# J.A.R.V.I.S. Android web assistant

A mobile-first, Iron Man-inspired AI chat interface. It uses a Node.js server for Gemini requests and browser speech features for optional voice input/output.

## Important
- This project is a web app, not an Android system assistant.
- Voice recognition support varies by browser and device. Use a secure HTTPS deployment for microphone access.
- Never put your Gemini API key in frontend files, screenshots, chat messages, or a public repository.
- API usage may have limits or costs. Check the current Gemini API terms and billing before enabling it.
- The server uses `gemini-3.8-flash` by default. Change `GEMINI_MODEL` in your private environment if needed.

## Run on a computer or hosted Node.js service
1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env`.
3. Put your Gemini API key in `.env` on the server only.
4. Run `npm install`.
5. Run `npm start`.
6. Open `http://localhost:3000`.

For Android use, deploy the Node server to a trusted HTTPS host, add `GEMINI_API_KEY` as a private environment secret, then open the HTTPS URL in Chrome. Use Chrome's menu > Add to Home screen if available.

## Files
- `server.js`: API server and Gemini connection.
- `public/index.html`: app layout.
- `public/css/styles.css`: holographic blue interface.
- `public/js/app.js`: chat, storage, clock and controls.
- `public/js/speech.js`: browser speech input/output.
- `public/js/reactor.js`: reactor status animation.
