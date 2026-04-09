# Aicuture

Aicuture is a Node.js + Express web app with pages for authentication, dashboard, crop advice, disease reporting, and chatbot features.

## Setup

1. Install dependencies:
   - `npm install`
2. Create a `.env` file with your own values (do not commit secrets):
   - `PORT=5000`
   - `DATABASE_URL=...`
   - `APIFREE_API_KEY=...`
   - `JWT_SECRET=...`
3. Start the server:
   - `npm start`

## Notes

- Keep `node_modules/`, `.env`, and runtime uploads out of git.
- Rotate any credentials that were previously exposed.