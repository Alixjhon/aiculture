const express = require("express");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use(cookieParser());

app.use("/api/auth", require("./pages/auth"));
app.use("/api/reports", require("./pages/reports"));
app.use("/chatbot", require("./pages/chatbot"));
app.use("/login", require("./pages/login"));
app.use("/register", require("./pages/register"));
app.use("/dashboard", require("./pages/dashboard"));
app.use("/cropadvice", require("./pages/cropadvice"))
app.use("/disease", require("./pages/disease"))



app.listen(process.env.PORT, () => {
  console.log("Server running on port " + process.env.PORT);
});
