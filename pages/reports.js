const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/", async (req, res) => {
  const { name, type, description } = req.body;

  try {
    await pool.query(
      "INSERT INTO reports (name, type, description) VALUES ($1,$2,$3)",
      [name, type, description]
    );

    res.json({ message: "Report submitted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/", async (req, res) => {
  const result = await pool.query("SELECT * FROM reports ORDER BY created_at DESC");
  res.json(result.rows);
});

module.exports = router;
