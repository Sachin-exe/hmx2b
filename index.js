const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const User = require("./models/User");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB"));

// Initialize default users (run once)
const initUsers = async () => {
    const users = [
        { id: "admin", password: "admin123", role: "admin" },
        { id: "user1", password: "user123", role: "user" },
        { id: "user2", password: "user123", role: "user" },
    ];

    for (const user of users) {
        const exists = await User.findOne({ id: user.id });
        if (!exists) {
            await User.create(user);
        }
    }
    console.log("Default users initialized");
};
initUsers();

// Login endpoint
app.post("/api/login", async (req, res) => {
    const { id, password } = req.body;
    try {
        const user = await User.findOne({ id, password });
        if (!user) {
            return res.status(401).json({ error: "Invalid ID or password" });
        }
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
        res.json({ token, role: user.role });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Get all users (admin only)
app.get("/api/users", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== "admin") return res.status(403).json({ error: "Unauthorized" });

        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(401).json({ error: "Invalid token" });
    }
});

// Add user (admin only)
app.post("/api/users", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== "admin") return res.status(403).json({ error: "Unauthorized" });

        const { id, password, role } = req.body;
        const existingUser = await User.findOne({ id });
        if (existingUser) return res.status(400).json({ error: "User ID already exists" });

        const user = new User({ id, password, role });
        await user.save();
        res.json({ message: "User added successfully" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
