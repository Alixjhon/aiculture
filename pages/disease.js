const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const pool = require("../db");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

// OpenAI config
const openai = new OpenAI({
  apiKey: process.env.APIFREE_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  timeout: 60000,
});

// ===============================
// JWT Middleware
// ===============================
function authenticateToken(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send("Access denied.");
  jwt.verify(token, process.env.JWT_SECRET || "fallback_secret", (err, user) => {
    if (err) return res.status(403).send("Invalid token.");
    req.user = user;
    next();
  });
}

// ===============================
// Serve uploaded images
// ===============================
router.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ===============================
// Get Disease History
// ===============================
router.get("/api/diseaseHistory", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM "diseaseAnalyses"
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC`,
      [req.user.userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ===============================
// AI Plant Analysis API
// ===============================
router.post("/api/analyzePlant", authenticateToken, async (req, res) => {
  const { imageBase64, plantType } = req.body;
  const userId = req.user.userId;

  if (!imageBase64)
    return res.status(400).json({ success: false, error: "Image required" });

  try {
    // Save image locally (optional)
    const base64Data = Buffer.from(
      imageBase64.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );
    const fileType = imageBase64.match(/^data:image\/(\w+);base64,/)[1];
    const fileName = `plant_${Date.now()}.${fileType}`;
    const saveDir = path.join(__dirname, "../uploads");

    fs.mkdirSync(saveDir, { recursive: true });
    fs.writeFileSync(path.join(saveDir, fileName), base64Data);

    // Use base64 data URL for OpenAI API
    const aiResponse = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert plant pathologist. Analyze plant images and detect diseases. Respond clearly with: Disease Name, Explanation, and Treatment Recommendation."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this ${plantType || "plant"} image and detect disease. Provide disease name, short explanation, and treatment.`
            },
            { type: "image_url", image_url: { url: imageBase64 } } // ✅ fixed here
          ]
        }
      ]
    });

    const resultText = aiResponse.choices[0].message.content;
    const diseaseName = resultText.split("\n")[0] || "Unknown Disease";

    // Save analysis to database
    await pool.query(
      `INSERT INTO "diseaseAnalyses"
       ("userId","imageUrl","imageKey","plantType","diseases","analysisNotes")
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, `/uploads/${fileName}`, fileName, plantType || "Unknown", diseaseName, resultText]
    );

    res.json({ success: true, disease: diseaseName, fullAnalysis: resultText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "AI analysis failed" });
  }
});

// ===============================
// Disease Analysis Page (frontend merged)
// ===============================
router.get("/", authenticateToken, (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Plant Health Analysis | AI Crop Advisor</title>
<script src="https://unpkg.com/lucide@latest"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root { 
--primary-sage:#88a38d; 
--primary-dark:#768e7b;
--primary-green-dark:#166534;
--bg-light:#ffffff; 
--text-main:#1f2937; 
--text-muted:#6b7280; 
--border:#f3f4f6; 
}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Plus Jakarta Sans',sans-serif;background:var(--bg-light);color:var(--text-main);padding:40px;}
.badge{display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;color:#166534;padding:6px 12px;border-radius:99px;font-size:13px;font-weight:600;border:1px solid #dcfce7;margin-bottom:16px;}
.header h1{font-size:36px;font-weight:800;color:#111827;}
.header p{color:var(--text-muted);font-size:16px;margin:8px 0 40px 0;}
.main-container{display:grid;grid-template-columns:350px 1fr;gap:32px;}
.upload-card{background:white;border-radius:20px;padding:24px;border:1px solid var(--border);box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);}
.upload-card h2{font-size:18px;font-weight:700;margin-bottom:20px;}
.drop-zone{width:100%;height:200px;border:2px dashed #e5e7eb;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;margin-bottom:20px;text-align:center;overflow:hidden;position:relative;}
.drop-zone:hover{background:#f9fafb;border-color:var(--primary-sage);}
.drop-zone i{color:#9ca3af;margin-bottom:12px;}
.drop-zone .title{font-size:14px;font-weight:700;color:#111827;}
.drop-zone .subtitle{font-size:12px;color:#9ca3af;margin-top:4px;}
.drop-zone .specs{font-size:10px;color:#9ca3af;text-transform:uppercase;margin-top:8px;font-weight:600;}
.drop-zone img{max-width:100%; max-height:100%; border-radius:12px; margin-top:10px;}
.btn-analyze{width:100%;background:gray;color:white;padding:14px;border-radius:10px;border:none;font-weight:700;font-size:14px;cursor:not-allowed;transition:background 0.2s;}
.btn-analyze.active{background:var(--primary-green-dark);cursor:pointer;}
.analysis-display{border:2px dashed #f3f4f6;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fafafa;color:var(--text-muted);min-height:450px;padding:40px;text-align:center;}
.micro-icon-bg{background:white;padding:20px;border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.03);margin-bottom:16px;}
@media(max-width:900px){.main-container{grid-template-columns:1fr;}}
</style>
</head>
<body>

<div class="header">
<div class="badge"><i data-lucide="leaf" size="14"></i> Disease Detection</div>
<h1>Plant Health Analysis</h1>
<p>Upload an image of your plant to get instant AI-powered disease diagnosis and treatment recommendations</p>
</div>

<div class="main-container">
<div class="upload-card">
<h2>Upload Plant Image</h2>
<div class="drop-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
  <i data-lucide="upload-cloud" size="32"></i>
  <div class="title">Click to upload</div>
  <div class="subtitle">or drag and drop</div>
  <div class="specs">PNG, JPG, GIF up to 5MB</div>
  <input type="file" id="fileInput" hidden accept="image/*">
  <img id="previewImage" style="display:none;" />
</div>
<button id="analyzeBtn" class="btn-analyze" onclick="startAnalysis()">Analyze Plant</button>
</div>

<div class="analysis-display" id="displayArea">
<div class="micro-icon-bg">
<i data-lucide="microscope" size="40" style="color:#d1d5db;"></i>
</div>
<p style="max-width:250px;line-height:1.5;">
Upload a plant image to analyze for diseases
</p>
</div>
</div>

<script>
lucide.createIcons();

const input = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const previewImage = document.getElementById('previewImage');
const analyzeBtn = document.getElementById('analyzeBtn');

function enableAnalyzeButton(){
  analyzeBtn.classList.add('active');
}

input.addEventListener('change', () => {
  if(input.files && input.files[0]){
    const file = input.files[0];
    if(file.size > 5*1024*1024){
      alert("Image must be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(e){
      previewImage.src = e.target.result;
      previewImage.style.display = 'block';
      enableAnalyzeButton();
    }
  }
});

dropZone.addEventListener('dragover', (e)=> e.preventDefault());
dropZone.addEventListener('drop', (e)=>{
  e.preventDefault();
  input.files = e.dataTransfer.files;
  const event = new Event('change');
  input.dispatchEvent(event);
});

async function startAnalysis(){
  if(!input.files || input.files.length === 0){
    alert("Please select an image first!");
    return;
  }

  const reader = new FileReader();
  reader.readAsDataURL(input.files[0]);
  reader.onload = async function(){
    const base64Image = reader.result;
    document.getElementById('displayArea').innerHTML = "<p>Uploading and analyzing image...</p>";

    try{
      const response = await fetch("/disease/api/analyzePlant", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          imageBase64: base64Image,
          plantType: "Unknown"
        })
      });
      const data = await response.json();
      if(data.success){
        document.getElementById('displayArea').innerHTML = \`
          <h3 style="margin-bottom:12px;">Detected Disease:</h3>
          <p style="font-weight:700;margin-bottom:16px;">\${data.disease}</p>
          <div style="text-align:left;max-width:600px;">
            \${data.fullAnalysis.replace(/\\n/g,"<br>")}
          </div>
        \`;
      } else {
        document.getElementById('displayArea').innerHTML = "<p>Analysis failed. Please try again.</p>";
      }
    }catch(err){
      document.getElementById('displayArea').innerHTML = "<p>Server error. Please try again later.</p>";
    }
  }
}
</script>

</body>
</html>`);
});

module.exports = router;