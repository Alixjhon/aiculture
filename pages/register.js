const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");

// ======================
// Serve Registration UI
// ======================
router.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Join AI Crop Advisor | Secure Registration</title>
<script src="https://unpkg.com/lucide@latest"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  /* YOUR ORIGINAL CSS - PRESERVED */
  :root { --primary: #064e3b; --accent: #10b981; --text-main: #0f172a; --text-muted: #64748b; --border: #e2e8f0; --bg-subtle: #f8fafc; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: white; color: var(--text-main); min-height: 100vh; display: flex; overflow-x: hidden; animation: fadeInBody 0.8s ease-in-out; }
  @keyframes fadeInBody { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .split-layout { display: flex; width: 100%; min-height: 100vh; }
  .visual-panel { flex: 1.2; background: var(--primary); position: relative; display: flex; flex-direction: column; justify-content: center; padding: 80px; color: white; overflow: hidden; animation: slideInLeft 1s ease-out; }
  @keyframes slideInLeft { from { transform: translateX(-50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .visual-panel::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-image: radial-gradient(circle at 20% 30%, rgba(16, 185, 129, 0.15) 0%, transparent 50%); z-index: 1; }
  .brand-header { position: absolute; top: 60px; left: 80px; display: flex; align-items: center; gap: 12px; }
  .brand-header span { font-weight: 800; font-size: 20px; letter-spacing: -0.5px; }
  .hero-content { position: relative; z-index: 2; max-width: 520px; animation: fadeInContent 1.2s ease-out; }
  .hero-content h1 { font-size: 48px; font-weight: 800; line-height: 1.1; margin-bottom: 24px; letter-spacing: -1px; }
  .hero-content p { font-size: 18px; color: #a7f3d0; line-height: 1.6; }
  @keyframes fadeInContent { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  .auth-panel { flex: 1; background: white; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 60px; animation: slideInRight 1s ease-out; }
  @keyframes slideInRight { from { transform: translateX(50px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .auth-container { width: 100%; max-width: 440px; }
  .auth-header { margin-bottom: 32px; }
  .auth-header h3 { font-size: 32px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 8px; }
  .auth-header p { color: var(--text-muted); font-size: 15px; }
  .form-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
  .input-group { display: flex; flex-direction: column; gap: 8px; }
  label { font-size: 14px; font-weight: 700; color: var(--text-main); }
  input { width: 100%; padding: 14px 18px; border: 2px solid var(--border); border-radius: 12px; font-size: 15px; font-family: inherit; background: var(--bg-subtle); transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
  input:focus { outline: none; border-color: var(--accent); background: white; box-shadow: 0 0 0 4px rgba(16,185,129,0.1); animation: inputGlow 0.5s ease-in-out; }
  @keyframes inputGlow { 0% { box-shadow:0 0 0 rgba(16,185,129,0);}50%{box-shadow:0 0 12px rgba(16,185,129,0.4);}100%{box-shadow:0 0 4px rgba(16,185,129,0.1);} }
  .btn-primary { width:100%; padding:16px; background:var(--primary); border:none; color:white; font-weight:700; border-radius:12px; cursor:pointer; font-size:16px; transition:all 0.3s; margin-top:10px; }
  .btn-primary:hover { background:#043a2c; transform:translateY(-3px) scale(1.02); box-shadow:0 10px 20px -5px rgba(6,78,59,0.3); }
  .divider { display:flex; align-items:center; margin:24px 0; color:#cbd5e1; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
  .divider::before,.divider::after{content:'';flex:1;height:1px;background:#e2e8f0;}
  .divider span{padding:0 16px;}
  .btn-social{width:100%;padding:14px;background:white;border:2px solid var(--border);border-radius:12px;cursor:pointer;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:12px;transition:all 0.2s;}
  .btn-social:hover{transform:translateY(-2px);background:#f0fdf4;border-color:var(--accent);}
  .auth-footer{margin-top:32px;text-align:center;font-size:14px;color:var(--text-muted);}
  .auth-footer a{color:var(--accent);text-decoration:none;font-weight:700;transition:all 0.2s;}
  .auth-footer a:hover{text-decoration:underline;}
  #notification{position:fixed;top:40px;right:40px;background:#1e293b;color:white;padding:16px 24px;border-radius:12px;display:flex;align-items:center;gap:12px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.2);transform:translateY(-150%);transition:transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275);z-index:1000;}
  #notification.visible{transform:translateY(0);}
  #notification.error{border-bottom:4px solid #ef4444;}
  @media (max-width:1024px){.visual-panel{display:none;}}
</style>
</head>
<body>
<div class="split-layout">
  <section class="visual-panel">
    <div class="brand-header">
      <i data-lucide="sprout" size="32" stroke-width="3"></i>
      <span>CROP ADVISOR</span>
    </div>
    <div class="hero-content">
      <h1>Grow your legacy with precision.</h1>
      <p>Create an account to begin monitoring soil metrics, predicting pest cycles, and optimizing your harvest through AI.</p>
    </div>
  </section>
  <section class="auth-panel">
    <div class="auth-container">
      <header class="auth-header">
        <h3>Create account</h3>
        <p>Start your journey to smarter farming.</p>
      </header>
      <form id="registerForm" class="form-grid">
        <div class="input-group">
          <label>Full Name</label>
          <input type="text" id="regName" placeholder="John Doe" required />
        </div>
        <div class="input-group">
          <label>Email Address</label>
          <input type="email" id="regEmail" placeholder="farmer@agri.ai" required />
        </div>
        <div class="input-group">
          <label>Password</label>
          <input type="password" id="regPassword" placeholder="Minimum 8 characters" required />
        </div>
        <div class="input-group">
          <label>Confirm Password</label>
          <input type="password" id="regConfirm" placeholder="Repeat your password" required />
        </div>
        <button type="submit" class="btn-primary">Create Free Account</button>
      </form>
      <div class="divider"><span>or sign up with</span></div>
      <button class="btn-social">
        <i data-lucide="shield-check" size="20"></i>
        OAuth 2.0 Registration
      </button>
      <footer class="auth-footer">
        Already have an account? <a href="/login">Sign in here</a>
      </footer>
    </div>
  </section>
</div>
<div id="notification" class="error">
  <i data-lucide="alert-circle" size="20"></i>
  <span id="notifText">Please check your entries.</span>
</div>

<script>
lucide.createIcons();
const registerForm = document.getElementById("registerForm");
const notif = document.getElementById("notification");
const notifText = document.getElementById("notifText");

function notify(message) {
  notifText.textContent = message;
  notif.classList.add("visible");
  setTimeout(() => notif.classList.remove("visible"), 4000);
}

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const confirm = document.getElementById("regConfirm").value;

  if(password !== confirm) return notify("Passwords do not match.");
  if(password.length < 8) return notify("Password must be at least 8 characters.");

  try {
    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if(res.ok){
      notify("Account created! Redirecting to login...");
      setTimeout(() => window.location.href="/login", 1500);
    } else {
      notify(data.error || "Registration failed.");
    }
  } catch(err){
    notify("Connection error. Try again later.");
  }
});
</script>
</body>
</html>`);
});

// ======================
// Handle register POST
// ======================
router.post("/", async (req, res) => {
  const { name, email, password } = req.body;
  if(!name || !email || !password){
    return res.status(400).json({ error: "Name, email, and password are required" });
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if(existing.rows.length > 0){
      return res.status(400).json({ error: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name,email,password_hash) VALUES ($1,$2,$3) RETURNING id,name,email",
      [name,email,hash]
    );

    res.status(201).json({ message: "User registered", user: result.rows[0] });
  } catch(err){
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error: "+err.message });
  }
});

module.exports = router;