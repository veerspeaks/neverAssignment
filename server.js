const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

const authMiddleware = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

const adminMiddleware = (req, res, next) => {
  if (req.headers.authorization !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

const loggingMiddleware = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
};

app.post("/login", authMiddleware, loggingMiddleware, (req, res) => res.json({ message: "Login successful" }));
app.post("/signup", authMiddleware, loggingMiddleware, (req, res) => res.json({ message: "Signup successful" }));
app.post("/signout", authMiddleware, loggingMiddleware, (req, res) => res.json({ message: "Signout successful" }));
app.get("/user", authMiddleware, loggingMiddleware, (req, res) => res.json({ message: "User data" }));
app.get("/admin", authMiddleware, adminMiddleware, loggingMiddleware, (req, res) => res.json({ message: "Admin data" }));
app.get("/home", loggingMiddleware, (req, res) => res.json({ message: "Welcome to Home Page" }));
app.get("/about", loggingMiddleware, (req, res) => res.json({ message: "About us" }));
app.get("/news", loggingMiddleware, (req, res) => res.json({ message: "Latest news" }));
app.get("/blogs", loggingMiddleware, (req, res) => res.json({ message: "Blogs list" }));

app.listen(3000, () => console.log("Server running on port 3000"));
