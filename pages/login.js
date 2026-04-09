const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ======================
// Serve AI Crop Advisor UI
// ======================
router.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Crop Advisor - Sign In</title>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #004d26;
            --primary-hover: #003d1e;
            --accent: #059669;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --bg: #f8fafc;
            --error: #ef4444;
        }

        /* Base Styles */
        * { box-sizing: border-box; }
        body { 
            font-family: 'Inter', sans-serif; 
            background-color: var(--bg); 
            margin: 0; 
            display: flex; 
            flex-direction: column;
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
        }

        /* Typography */
        .header-area { text-align: center; margin-bottom: 24px; }
        .logo-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px; }
        .logo-row h1 { font-size: 22px; color: var(--text-main); margin: 0; }
        .subtitle { color: var(--text-muted); font-size: 14px; margin: 0; }

        /* Card Layout */
        .card { 
            background: white; 
            padding: 40px; 
            border-radius: 12px; 
            width: 100%;
            max-width: 380px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.05); 
        }

        /* Form Elements */
        .input-group { margin-bottom: 18px; }
        .label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        label { font-size: 13px; font-weight: 600; color: #334155; }
        .forgot-pw { font-size: 12px; color: var(--accent); text-decoration: none; font-weight: 500; }
        
        .input-wrapper { position: relative; display: flex; align-items: center; }
        .input-wrapper i { position: absolute; left: 14px; color: #94a3b8; pointer-events: none; }
        
        input { 
            width: 100%; 
            padding: 12px 12px 12px 42px; 
            border: 1px solid var(--border); 
            border-radius: 8px; 
            font-size: 14px;
            transition: all 0.2s;
        }
        input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }

        /* Buttons */
        .btn { width: 100%; padding: 12px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; border: none; }
        .btn-signin { background: var(--primary); color: white; margin-top: 10px; }
        .btn-signin:hover { background: var(--primary-hover); }
        .btn-oauth { background: white; border: 1px solid var(--border); color: var(--text-main); font-weight: 500; }

        /* Divider */
        .divider { display: flex; align-items: center; margin: 24px 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .divider::before, .divider::after { content: ''; flex: 1; border-bottom: 1px solid var(--border); }
        .divider::before { margin-right: 1em; }
        .divider::after { margin-left: 1em; }

        .footer { margin-top: 25px; text-align: center; font-size: 13px; color: var(--text-muted); }
        .footer a { color: var(--accent); text-decoration: none; font-weight: 600; }

        /* Toast */
        .error-toast {
            position: fixed; bottom: 24px; left: 24px; background: var(--error); color: white;
            padding: 10px 16px; border-radius: 50px; display: flex; align-items: center; gap: 10px;
            font-size: 14px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); z-index: 1000;
        }
        .hidden { display: none; }
    </style>
</head>
<body>

    <header class="header-area">
        <div class="logo-row">
            <i data-lucide="leaf" style="color: var(--accent);"></i>
            <h1>AI Crop Advisor</h1>
        </div>
        <p class="subtitle">Sign in to your account</p>
    </header>

    <main class="card">
        <form id="loginForm">
            <div class="input-group">
                <label for="loginEmail">Email Address</label>
                <div class="input-wrapper">
                    <i data-lucide="mail" size="18"></i>
                    <input type="email" id="loginEmail" placeholder="you@example.com" required>
                </div>
            </div>

            <div class="input-group">
                <div class="label-row">
                    <label for="loginPassword">Password</label>
                    <a href="#" class="forgot-pw">Forgot password?</a>
                </div>
                <div class="input-wrapper">
                    <i data-lucide="lock" size="18"></i>
                    <input type="password" id="loginPassword" placeholder="••••••••" required>
                </div>
            </div>

            <button type="submit" class="btn btn-signin">Sign In</button>
        </form>

        <div class="divider">OR CONTINUE WITH</div>

        <button class="btn btn-oauth">Sign in with OAuth</button>

        <footer class="footer">
            Don't have an account? <a href="/register">Sign up</a>
        </footer>
    </main>

    <div id="errorToast" class="error-toast hidden">
        <i data-lucide="alert-circle" size="18"></i>
        <span id="errorMsg">Error</span>
        <i data-lucide="x" size="14" style="cursor:pointer" id="closeError"></i>
    </div>

    <script>
        lucide.createIcons();
        
        const loginForm = document.getElementById("loginForm");
        const errorToast = document.getElementById("errorToast");
        const errorMsg = document.getElementById("errorMsg");

        const toggleError = (text = "", show = true) => {
            errorMsg.textContent = text;
            errorToast.classList.toggle("hidden", !show);
            if (show) setTimeout(() => toggleError("", false), 5000);
        };

        document.getElementById("closeError").onclick = () => toggleError("", false);

        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const payload = {
                email: loginForm.loginEmail.value,
                password: loginForm.loginPassword.value
            };

            try {
                const res = await fetch("/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    window.location.href = "/dashboard";
                } else {
                    toggleError(data.error || "Invalid credentials");
                }
            } catch (err) {
                toggleError("Unable to connect to server");
            }
        });
    </script>
</body>
</html>
`);
});

// ======================
// Handle login POST
// ======================
router.post("/", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const userResult = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = userResult.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: "Invalid email or password" });

    // Sign JWT
    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email},
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "12h" }
    );

    // Optionally store token in a cookie
    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });

    // ✅ Return JSON success
    return res.json({ success: true });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});
module.exports = router;