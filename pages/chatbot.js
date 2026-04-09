const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const openai = new OpenAI({
  apiKey: process.env.APIFREE_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  timeout: 60000,
});

function authenticateToken(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send("Access denied.");
  jwt.verify(token, process.env.JWT_SECRET || "fallback_secret", (err, user) => {
    if (err) return res.status(403).send("Invalid token.");
    req.user = user;
    next();
  });
}

router.get("/history/:convId", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT role, content FROM "chatMessages" 
       WHERE "conversationId" = $1 AND "userId" = $2 
       ORDER BY "createdAt" ASC`,
      [req.params.convId, req.user.userId]
    );
    res.json({ success: true, messages: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

router.get("/", authenticateToken, (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Expert Farming Chatbot</title>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-orange: #fff7ed;
            --accent-orange: #f97316;
            --border: #e2e8f0;
            --text-main: #0f172a;
            --text-muted: #64748b;
            --success-green: #064e3b; /* Darker green matching Pic 8 */
            --bg-gray: #f8fafc;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; }
        
        body { background-color: #ffffff; padding: 40px; color: var(--text-main); }
        .container { max-width: 1100px; margin: 0 auto; }
        
        /* Header Styling */
        .header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
        .badge { background: var(--primary-orange); color: var(--accent-orange); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1px solid #ffedd5; display: inline-flex; align-items: center; gap: 6px; }
        .page-title { font-size: 28px; font-weight: 800; margin-top: 12px; }
        
        /* Chat Card & Window */
        .chat-card { background: white; border: 1px solid var(--border); border-radius: 16px; height: 70vh; display: flex; flex-direction: column; position: relative; }
        #chat-window { flex: 1; overflow-y: auto; padding: 30px; display: flex; flex-direction: column; gap: 20px; }
        
        /* Empty State (Pic 8) */
        .empty-state { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: var(--text-muted); width: 100%; }
        .empty-state i { color: #cbd5e1; margin-bottom: 16px; }
        .empty-state h3 { color: var(--text-main); font-size: 18px; margin-bottom: 8px; }
        .empty-state p { font-size: 14px; }

        /* Message Bubbles */
        .msg { max-width: 80%; padding: 14px 20px; border-radius: 12px; font-size: 15px; line-height: 1.6; }
        .user { align-self: flex-end; background: var(--success-green); color: white; border-bottom-right-radius: 2px; }
        .ai { align-self: flex-start; background: var(--bg-gray); color: var(--text-main); border: 1px solid var(--border); border-bottom-left-radius: 2px; }
        
        /* Input Section */
        .input-section { padding: 24px 30px; border-top: 1px solid var(--border); }
        .input-bar { position: relative; display: flex; align-items: center; gap: 12px; }
        input { flex: 1; padding: 14px 20px; border: 1px solid var(--border); border-radius: 12px; outline: none; background: #fcfcfd; font-size: 14px; transition: border-color 0.2s; }
        input:focus { border-color: var(--success-green); }
        
        .send-btn { background: #10b981; color: white; border: none; width: 42px; height: 42px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.1s; }
        .send-btn:hover { background: var(--success-green); }

        .btn-ghost { background: white; border: 1px solid var(--border); padding: 8px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-main); }
        
        .dot-loader { display: flex; gap: 4px; padding: 12px; background: var(--bg-gray); border-radius: 12px; width: fit-content; }
        .dot { width: 6px; height: 6px; background: #94a3b8; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
    </style>
</head>
<body>
    <div class="container">
        <header class="header-section">
            <div>
                <div class="badge"><i data-lucide="message-circle" size="14"></i> Farming Advice</div>
                <h1 class="page-title">Expert Farming Chatbot</h1>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-ghost" onclick="window.location.href='/chatbot'"><i data-lucide="plus" size="16"></i> New Chat</button>
            </div>
        </header>

        <div class="chat-card">
            <div id="empty-state" class="empty-state">
                <i data-lucide="message-circle" size="48"></i>
                <h3>Start a Conversation</h3>
                <p>Ask me anything about farming, crop care, soil health, or pest management</p>
            </div>

            <div id="chat-window"></div>

            <div class="input-section">
                <form id="chat-form" class="input-bar">
                    <input type="text" id="user-input" placeholder="Ask about crops, diseases, soil care..." autocomplete="off">
                    <button type="submit" class="send-btn"><i data-lucide="send" size="18"></i></button>
                </form>
            </div>
        </div>
    </div>

    <script>
        lucide.createIcons();
        const chatWindow = document.getElementById('chat-window');
        const emptyState = document.getElementById('empty-state');
        const form = document.getElementById('chat-form');
        let currentConvId = new URLSearchParams(window.location.search).get('id');

        async function loadHistory() {
            if (!currentConvId) return;
            try {
                const res = await fetch(\`/chatbot/history/\${currentConvId}\`);
                const data = await res.json();
                if (data.success && data.messages.length > 0) {
                    emptyState.style.display = 'none';
                    data.messages.forEach(msg => {
                        appendMessage(msg.content, msg.role === 'assistant' ? 'ai' : 'user');
                    });
                }
            } catch (err) { console.error(err); }
        }

        form.onsubmit = async (e) => {
            e.preventDefault();
            const input = document.getElementById('user-input');
            const text = input.value.trim();
            if(!text) return;

            emptyState.style.display = 'none';
            appendMessage(text, 'user');
            input.value = '';
            const loader = showLoader();

            try {
                const res = await fetch(window.location.pathname, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ message: text, conversationId: currentConvId })
                });
                const data = await res.json();
                loader.remove();
                currentConvId = data.conversationId;
                appendMessage(data.reply, 'ai');
            } catch (err) {
                loader.remove();
                appendMessage("Sorry, I'm having trouble connecting right now.", 'ai');
            }
        };

        function showLoader() {
            const div = document.createElement('div');
            div.className = 'dot-loader';
            div.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
            chatWindow.appendChild(div);
            chatWindow.scrollTop = chatWindow.scrollHeight;
            return div;
        }

        function appendMessage(content, type) {
            const div = document.createElement('div');
            div.className = 'msg ' + type;
            div.innerText = content;
            chatWindow.appendChild(div);
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }

        loadHistory();
    </script>
</body>
</html>`);
});

// POST logic remains the same
router.post("/", authenticateToken, async (req, res) => {
  const { message, conversationId } = req.body;
  const userId = req.user.userId;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: "Expert farming assistant." }, { role: "user", content: message }],
    });
    const aiReply = response.choices[0].message.content;

    let finalId = conversationId;
    if (!finalId) {
      const newC = await pool.query(
        `INSERT INTO conversations ("userId", "conversationId", title, topic, "messageCount", "lastMessageAt") 
         VALUES ($1, gen_random_uuid(), $2, 'General', 0, NOW()) RETURNING "conversationId"`,
        [userId, message.substring(0, 30) + "..."]
      );
      finalId = newC.rows[0].conversationId;
    }

    await pool.query(`INSERT INTO "chatMessages" ("userId", "conversationId", "role", "content") VALUES ($1, $2, 'user', $3)`, [userId, finalId, message]);
    await pool.query(`INSERT INTO "chatMessages" ("userId", "conversationId", "role", "content", "fullResponse") VALUES ($1, $2, 'assistant', $3, $4)`, [userId, finalId, aiReply, JSON.stringify(response)]);
    await pool.query(`UPDATE conversations SET "messageCount" = "messageCount" + 2, "lastMessageAt" = NOW() WHERE "conversationId" = $1`, [finalId]);

    res.json({ reply: aiReply, conversationId: finalId });
  } catch (error) {
    res.status(500).json({ error: "AI Error" });
  }
});

module.exports = router;