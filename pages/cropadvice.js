const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const jwt = require("jsonwebtoken");
const pool = require("../db");

// --- AI CONFIGURATION ---
const openai = new OpenAI({
    apiKey: process.env.APIFREE_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    timeout: 60000,
});

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

// --- GET ROUTE: RENDER UI ---
router.get("/", authenticateToken, (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Crop Advisor</title>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #064e3b;
            --accent: #10b981;
            --bg: #ffffff;
            --text-main: #1a1a1a;
            --text-muted: #6b7280;
            --border: #f3f4f6;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: var(--bg); color: var(--text-main); padding: 40px 60px; }
        .container { max-width: 1400px; margin: 0 auto; }
        .badge { display: inline-flex; align-items: center; padding: 6px 14px; background: #f0fdf4; color: #166534; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 16px; border: 1px solid #dcfce7; }
        .header h1 { font-size: 36px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.02em;}
        .header p { color: var(--text-muted); margin-bottom: 48px; }

        .main-layout { display: grid; grid-template-columns: 380px 1fr; gap: 60px; align-items: start; }
        .input-card { background: #fff; padding: 32px; border-radius: 20px; border: 1px solid #e5e7eb; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 14px; font-weight: 700; margin-bottom: 8px; }
        .form-group input, .form-group select { width: 100%; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 10px; font-size: 15px; background: #f9fafb; outline: none; transition: border-color 0.2s;}
        .form-group input:focus { border-color: var(--accent); }
        .unit { font-size: 11px; color: var(--text-muted); margin-top: 5px; display: block; font-weight: 500; }
        
        .btn-submit { width: 100%; padding: 16px; background: var(--primary); color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: 0.2s; }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .results-area { position: sticky; top: 40px; }
        .results-header { font-size: 24px; font-weight: 800; margin-bottom: 24px; display: none; }
        .placeholder-box { border: 2px dashed #e5e7eb; border-radius: 24px; height: 500px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #9ca3af; text-align: center; }
        
        .cards-list { display: flex; flex-direction: column; gap: 24px; max-height: 85vh; overflow-y: auto; padding-right: 15px; }
        .crop-card { background: #fff; border-radius: 20px; border: 1px solid #e5e7eb; padding: 32px; position: relative; transition: 0.2s; }
        .crop-card:hover { border-color: var(--accent); }
        .suitability-badge { display: inline-block; background: #dcfce7; color: #15803d; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; margin-bottom: 20px; text-transform: uppercase; }
        .crop-card h3 { font-size: 24px; font-weight: 800; margin-bottom: 24px; }
        .info-block { margin-bottom: 20px; }
        .info-block h4 { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
        .info-block p { font-size: 15px; color: #4b5563; line-height: 1.6; }
        .icon-floating { position: absolute; top: 32px; right: 32px; color: #10b981; opacity: 0.4; }
    </style>
</head>
<body>
    <div class="container">
        <div class="badge"><i data-lucide="leaf" size="14"></i> AI Crop Advisor</div>
        <header class="header">
            <h1>Find Your Ideal Crops</h1>
            <p>Our AI analyzes your soil and environment to suggest the most profitable and sustainable crops.</p>
        </header>

        <div class="main-layout">
            <aside class="input-card">
                <h2>Soil Parameters</h2>
                <form id="cropForm">
                    <div class="form-group"><label>Nitrogen (N)</label><input type="number" name="nitrogen" value="50"><span class="unit">ppm</span></div>
                    <div class="form-group"><label>Phosphorus (P)</label><input type="number" name="phosphorus" value="40"><span class="unit">ppm</span></div>
                    <div class="form-group"><label>Potassium (K)</label><input type="number" name="potassium" value="45"><span class="unit">ppm</span></div>
                    <div class="form-group"><label>pH Level</label><input type="number" step="0.1" name="ph" value="6.5"><span class="unit">0.0 - 14.0</span></div>
                    <div class="form-group"><label>Annual Rainfall (mm)</label><input type="number" name="rainfall" value="800"></div>
                    <div class="form-group"><label>Temperature (°C)</label><input type="number" name="temperature" value="25"></div>
                    <div class="form-group"><label>Humidity (%)</label><input type="number" name="humidity" value="60"></div>
                    <div class="form-group">
                        <label>Soil Type</label>
                        <select name="soilType">
                            <option value="Loamy">Loamy</option>
                            <option value="Sandy">Sandy</option>
                            <option value="Clay">Clay</option>
                            <option value="Silt">Silt</option>
                        </select>
                    </div>
                    <button type="submit" class="btn-submit" id="subBtn">Get Recommendations <i data-lucide="arrow-right" size="18"></i></button>
                </form>
            </aside>

            <section class="results-area">
                <h2 class="results-header" id="resTitle">Recommended Crops</h2>
                <div id="placeholder" class="placeholder-box">
                    <i data-lucide="search" size="48" style="margin-bottom:20px; opacity:0.2"></i>
                    <p>Enter soil data to see AI analysis</p>
                </div>
                <div id="cardsList" class="cards-list"></div>
            </section>
        </div>
    </div>

    <script>
        lucide.createIcons();
        const form = document.getElementById('cropForm');
        const btn = document.getElementById('subBtn');

        form.onsubmit = async (e) => {
            e.preventDefault();
            btn.disabled = true;
            btn.innerHTML = 'AI is analyzing...';
            
            const formData = new FormData(form);
            const params = Object.fromEntries(formData.entries());

            try {
                const res = await fetch('/cropadvice', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params)
                });
                const data = await res.json();
                
                if(data.success) {
                    renderCards(data.recommendations);
                }
            } catch (err) {
                console.error(err);
                alert("Error getting recommendations");
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Get Recommendations <i data-lucide="arrow-right" size="18"></i>';
                lucide.createIcons();
            }
        };

        function renderCards(crops) {
            document.getElementById('placeholder').style.display = 'none';
            document.getElementById('resTitle').style.display = 'block';
            const list = document.getElementById('cardsList');
            list.innerHTML = crops.map(c => \`
                <div class="crop-card">
                    <i data-lucide="leaf" class="icon-floating" size="28"></i>
                    <span class="suitability-badge">\${c.tag}</span>
                    <h3>\${c.name}</h3>
                    <div class="info-block"><h4>Why Suitable</h4><p>\${c.why}</p></div>
                    <div class="info-block"><h4>Best Planting Month</h4><p>\${c.planting}</p></div>
                    <div class="info-block"><h4>Care Tips</h4><p>\${c.care}</p></div>
                    <div class="info-block"><h4>Expected Yield</h4><p>\${c.yield}</p></div>
                </div>
            \`).join('');
            lucide.createIcons();
        }
    </script>
</body>
</html>`);
});

// --- POST ROUTE: AI LOGIC & DATABASE LOGGING ---
router.post("/", authenticateToken, async (req, res) => {
    const { nitrogen, phosphorus, potassium, ph, rainfall, temperature, humidity, soilType } = req.body;
    const userId = req.user.userId;

    const systemPrompt = `You are a professional Agronomist. 
    Analyze soil data and return exactly 2-3 crop recommendations in valid JSON format.
    Structure: {"recommendations": [{"name": "Crop Name", "tag": "High Suitability", "why": "Explanation", "planting": "Month", "care": "Tips", "yield": "Est. Amount"}]}`;

    const userPrompt = `Soil Data: N:${nitrogen}, P:${phosphorus}, K:${potassium}, pH:${ph}, Rainfall:${rainfall}mm, Temp:${temperature}°C, Humidity:${humidity}%, Soil:${soilType}.`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" }
        });

        const aiData = JSON.parse(response.choices[0].message.content);

        // --- DATABASE INTEGRATION: cropRecommendations table ---
        await pool.query(
            `INSERT INTO crop_recommendations (
                "userId",
                nitrogen,
                phosphorus,
                potassium,
                ph,
                rainfall,
                humidity,
                moisture,
                temperature,
                sunlight,
                soil_type,
                recommendations
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                 userId,
                 Number(nitrogen) || null,
                 Number(phosphorus) || null,
                 Number(potassium) || null,
                 Number(ph) || null,
                 Number(rainfall) || null,
                 Number(humidity) || null,
                 Number(humidity) || null,
                 Number(temperature) || null,
                 "Unknown",
                 soilType,
                 JSON.stringify(aiData.recommendations)
            ]
        );

        res.json({ success: true, recommendations: aiData.recommendations });

    } catch (error) {
        console.error("Database or AI Error:", error);
        res.status(500).json({ success: false, error: "Processing Failed" });
    }
});

module.exports = router;