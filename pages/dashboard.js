const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const pool = require("../db");

// Middleware to verify JWT
function authenticateToken(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send("Access denied.");

  jwt.verify(token, process.env.JWT_SECRET || "fallback_secret", (err, user) => {
    if (err) return res.status(403).send("Invalid token.");
    req.user = user;
    next();
  });
}

// API: Fetch crop recommendations
router.get("/api/cropRecommendations", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM crop_recommendations WHERE "userId" = $1 ORDER BY COALESCE("createdAt", created_at) DESC`,
      [req.user.userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// API: Fetch conversation history
router.get("/api/chatHistory", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM conversations WHERE "userId" = $1 ORDER BY "lastMessageAt" DESC`,
      [req.user.userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Dashboard page
router.get("/", authenticateToken, async (req, res) => {
  let userName = "User";
  let stats = { crops: 0, diseases: 0, chats: 0, total: 0 };

  try {
    const userId = req.user.userId;

    const userRes = await pool.query(`SELECT name FROM users WHERE id = $1`, [userId]);
    if (userRes.rows.length > 0) userName = userRes.rows[0].name;

    const cropCount = await pool.query(`SELECT COUNT(*) FROM crop_recommendations WHERE "userId" = $1`, [userId]);
    const chatCount = await pool.query(`SELECT COUNT(*) FROM conversations WHERE "userId" = $1`, [userId]);
    const diseaseCount = await pool.query(`SELECT COUNT(*) FROM "diseaseAnalyses" WHERE "userId" = $1`, [userId]);

    stats.crops = parseInt(cropCount.rows[0].count);
    stats.chats = parseInt(chatCount.rows[0].count);
    stats.diseases = parseInt(diseaseCount.rows[0].count);
    stats.total = stats.crops + stats.chats + stats.diseases;

  } catch (err) {
    console.error("Error calculating dashboard stats:", err);
  }

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard | AI Crop Advisor</title>
<script src="https://unpkg.com/lucide@latest"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root { 
    --primary: #064e3b; 
    --accent: #10b981; 
    --bg: #f8fafc; 
    --white: #ffffff; 
    --text-main: #0f172a; 
    --text-muted: #64748b; 
    --border: #e2e8f0; 
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Plus Jakarta Sans', sans-serif; 
    background: var(--bg); 
    color: var(--text-main); 
    padding: 40px 40px 120px 40px; 
  }
  .header { margin-bottom: 40px; }
  .header h1 { font-size: 32px; font-weight: 800; }
  .header p { color: var(--text-muted); font-size: 16px; margin-top: 4px; }

  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 40px; }
  .stat-card { background: var(--white); padding: 24px; border-radius: 16px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
  .stat-info h4 { font-size: 14px; color: var(--text-muted); font-weight: 600; margin-bottom: 8px; }
  .stat-info span { font-size: 28px; font-weight: 800; }
  .stat-icon { color: var(--accent); opacity: 0.6; }

  .tabs { display: flex; background: #eef2f6; padding: 6px; border-radius: 12px; margin-bottom: 32px; width: fit-content; }
  .tab { padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; color: var(--text-muted); transition: all 0.2s; }
  .tab.active { background: var(--white); color: var(--text-main); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }

  .analysis-list { display: flex; flex-direction: column; gap: 20px; min-height: 200px; }
  .analysis-card { display: flex; background: var(--white); border-radius: 16px; border: 1px solid var(--border); padding: 24px; position: relative; flex-direction: column; cursor: pointer; transition: transform 0.2s; }
  .analysis-card:hover { transform: translateY(-2px); border-color: var(--accent); }
  .analysis-card .icon-bg { position: absolute; top: 24px; right: 24px; opacity: 0.3; }

  .card-header h3 { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
  .card-header span { font-size: 13px; color: var(--text-muted); font-weight: 600; }

  .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 24px 0; }
  .data-section h5 { font-size: 12px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 12px; }
  .data-values { font-size: 14px; font-weight: 600; color: #334155; }

  /* Updated tag styling to match Pic 2 */
  .recommendation-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .tag { background: #dcfce7; color: #166534; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 700; border: 1px solid #bbf7d0; }

  .empty-state { display: none; flex-direction: column; align-items: center; justify-content: center; padding: 60px; background: var(--white); border-radius: 16px; border: 2px dashed var(--border); text-align: center; }

  .action-bar-scrollable { display: flex; gap: 12px; padding: 20px 0; margin-top: 20px; overflow-x: auto; white-space: nowrap; scrollbar-width: none; -ms-overflow-style: none; }
  .action-bar-scrollable::-webkit-scrollbar { display: none; }

  .action-btn { display: flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 10px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; flex-shrink: 0; }
  .btn-crop { background: #064e3b; color: #ffffff; box-shadow: 0 4px 12px rgba(6, 78, 59, 0.15); }
  .btn-outline { background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  .action-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
</style>
</head>
<body>

<header class="header">
  <h1>Dashboard</h1>
  <p>Welcome back, ${userName}</p>
</header>

<section class="stats-grid">
  <div class="stat-card">
    <div class="stat-info"><h4>Crop Recommendations</h4><span>${stats.crops}</span></div>
    <i data-lucide="leaf" class="stat-icon" size="32"></i>
  </div>
  <div class="stat-card">
    <div class="stat-info"><h4>Disease Analyses</h4><span>${stats.diseases}</span></div>
    <i data-lucide="microscope" class="stat-icon" size="32"></i>
  </div>
  <div class="stat-card">
    <div class="stat-info"><h4>Chat Conversations</h4><span>${stats.chats}</span></div>
    <i data-lucide="message-circle" class="stat-icon" size="32"></i>
  </div>
  <div class="stat-card">
    <div class="stat-info"><h4>Total Interactions</h4><span>${stats.total}</span></div>
    <i data-lucide="bar-chart-3" class="stat-icon" size="32"></i>
  </div>
</section>

<nav class="tabs">
  <div class="tab active" data-tab="crop">Crop Recommendations</div>
  <div class="tab" data-tab="disease">Disease Analyses</div>
  <div class="tab" data-tab="chat">Chat History</div>
</nav>

<main class="analysis-list">
  <div id="emptyState" class="empty-state">
    <i data-lucide="folder-open" size="48" style="color: #cbd5e1; margin-bottom:12px;"></i>
    <h3 id="emptyTitle">No Data Found</h3>
    <p>There are no records available for this category yet.</p>
  </div>
</main>

<div class="action-bar-scrollable">
    <button class="action-btn btn-crop" onclick="goToCropRecommendation()">
      <i data-lucide="leaf" size="18"></i> Get Crop Recommendations
    </button>
    <button class="action-btn btn-outline" onclick="goToDisease()">
      <i data-lucide="microscope" size="18"></i> Analyze Plant Disease
    </button>
    <button class="action-btn btn-outline" onclick="goToChatbot()">
      <i data-lucide="message-circle" size="18"></i> Chat with Expert
    </button>
</div>

<script>
lucide.createIcons();
const tabs = document.querySelectorAll('.tab');
const emptyState = document.getElementById('emptyState');
const emptyTitle = document.getElementById('emptyTitle');
const container = document.querySelector('.analysis-list');

function goToChatbot(id = null) {
    window.location.href = id ? \`/chatbot?id=\${id}\` : '/chatbot';
}

function goToDisease(id = null) {
    window.location.href = id ? \`/disease?id=\${id}\` : '/disease';
}

function goToCropRecommendation(id = null) {
    window.location.href = id ? \`/cropadvice?id=\${id}\` : '/cropadvice';
}

function showEmpty(label) {
    emptyState.style.display = 'flex';
    emptyTitle.textContent = "No " + label + " Found";
}

async function fetchData(type) {
    container.querySelectorAll('.analysis-card').forEach(c => c.remove());
    
    if(type === 'disease') { showEmpty('Disease Analyses'); return; }

    const url = type === 'crop' ? '/dashboard/api/cropRecommendations' : '/dashboard/api/chatHistory';

    try {
        const res = await fetch(url);
        const json = await res.json();
        
        if (!json.success || json.data.length === 0) {
            showEmpty(type === 'crop' ? 'Crop Recommendations' : 'Conversations');
        } else {
            emptyState.style.display = 'none';
            renderCards(json.data, type);
        }
    } catch (err) { showEmpty('Data'); }
}

function renderCards(data, type) {
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'analysis-card';
        if (type === 'crop') {
            // FIX: Parsing the JSON string to extract crop names for tags
            let cropNames = [];
            try {
                const parsedRecs = typeof item.recommendations === 'string' 
                    ? JSON.parse(item.recommendations) 
                    : item.recommendations;
                
                cropNames = Array.isArray(parsedRecs) 
                    ? parsedRecs.map(c => c.name) 
                    : [parsedRecs.name || "N/A"];
            } catch (e) {
                // Fallback for simple comma-separated strings
                cropNames = item.recommendations.split(',');
            }

            card.innerHTML = \`
                <i data-lucide="leaf" class="icon-bg" style="color: var(--accent)" size="24"></i>
                <div class="card-header"><h3>Crop Analysis</h3><span>\${new Date(item.createdAt || item.created_at).toLocaleDateString()}</span></div>
                <div class="data-grid">
                  <div class="data-section"><h5>Soil Parameters</h5><div class="data-values">N: \${item.nitrogen}, P: \${item.phosphorus}, K: \${item.potassium}</div></div>
                  <div class="data-section"><h5>Conditions</h5><div class="data-values">pH: \${item.ph}, Temp: \${item.temperature}°C, Hum: \${item.humidity}%</div></div>
                </div>
                <div class="data-section">
                    <h5>Recommended Crops</h5>
                    <div class="recommendation-tags">
                        \${cropNames.map(name => '<span class="tag">' + name.trim() + '</span>').join('')}
                    </div>
                </div>\`;
        } else {
            card.onclick = () => goToChatbot(item.conversationId);
            card.innerHTML = \`
                <i data-lucide="message-circle" class="icon-bg" style="color: #3b82f6" size="24"></i>
                <div class="card-header"><h3>\${item.title}</h3><span>\${new Date(item.lastMessageAt).toLocaleDateString()}</span></div>
                <div class="data-grid">
                  <div class="data-section"><h5>Topic</h5><div class="data-values">\${item.topic}</div></div>
                  <div class="data-section"><h5>Messages</h5><div class="data-values">\${item.messageCount}</div></div>
                </div>\`;
        }
        container.appendChild(card);
    });
    lucide.createIcons();
}

tabs.forEach(tab => {
  tab.onclick = () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    fetchData(tab.dataset.tab);
  };
});

fetchData('crop');
</script>
</body>
</html>`);
});

module.exports = router;