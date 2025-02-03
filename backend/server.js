require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();

// CORS Configuration
const corsOptions = {
    origin: ["http://127.0.0.1:5500", "https://hvac-frontend.com"],
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: ["Content-Type", "x-api-key"],
    credentials: false
};
app.use(cors(corsOptions));

app.use(bodyParser.json());

const API_KEY = process.env.API_KEY;
const API_KEY_FRONTEND = process.env.API_KEY_FRONTEND;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
const IV_LENGTH = 16; // AES Block size

// Function to Encrypt Phone Number
const encrypt = (text) => {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
};

// Function to Decrypt Phone Number
const decrypt = (text) => {
    let parts = text.split(":");
    let iv = Buffer.from(parts.shift(), "hex");
    let encryptedText = Buffer.from(parts.join(":"), "hex");
    let decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};

const leadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 requests per hour
    message: { error: "Too many submissions. Try again later." }
});

console.log("API_KEY:", API_KEY ? "Loaded" : "NOT LOADED");

app.get('/', (req, res) => {
    res.send('HVAC Lead API is running...');
});

app.get('/api/config', (req, res) => {
    res.json({ apiKey: API_KEY_FRONTEND });
});

mongoose.connect(process.env.MONGO_URI, {
    dbName: "leadsDB",
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log(`MongoDB Connected to: ${mongoose.connection.name}`);
    const PORT = process.env.PORT || 5500;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
});

const LeadSchema = new mongoose.Schema({
    name: String,
    phone: String,
    zip: String,
    service: String,
    timestamp: { type: Date, default: Date.now }
});
const Lead = mongoose.model('Lead', LeadSchema);

// Logging API use
const logRequest = (req, status) => {
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip} - Status: ${status}\n`;
    fs.appendFileSync(path.join(__dirname, "api.log"), logMessage);
};

app.use((req, res, next) => {
    console.log(`Checking API key for: ${req.path}`);
    logRequest(req, "PENDING");
    
    if (req.path.startsWith("/api/leads") && req.method === "GET") {
        console.log(`Protecting route: ${req.path}`);
        console.log(`Received API Key: ${req.headers['x-api-key'] ? "Present" : "Missing"}`);

        if (!req.headers['x-api-key'] || req.headers['x-api-key'] !== API_KEY) {
            console.log("Unauthorized request blocked.");
            logRequest(req, "403 Unauthorized");
            return res.status(403).json({ error: "Unauthorized access" });
        }
    }
    next();
});

app.post("/api/leads", leadLimiter, async (req, res) => {
    try {
        const { name, phone, zip, service } = req.body;
        if (!name || !phone || !zip) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Remove non-numeric characters from phone number
        const sanitizedPhone = phone.replace(/\D/g, "");

        // Validate phone number format (must be exactly 10 digits after filtering)
        if (sanitizedPhone.length !== 10) {
            return res.status(400).json({ error: "Invalid phone number. Must be 10 digits." });
        }

        // Encrypt the phone number before saving
        const encryptedPhone = encrypt(sanitizedPhone);

        const newLead = new Lead({ name, phone: encryptedPhone, zip, service });
        await newLead.save();

        logRequest(req, "201 Created");
        res.status(201).json({ message: "Lead stored securely", lead: newLead });
    } catch (error) {
        console.error("Error storing lead:", error);
        logRequest(req, "500 Internal Server Error");
        res.status(500).json({ error: "Failed to store lead" });
    }
});

app.get('/api/leads', async (req, res) => {
    try {
        const leads = await Lead.find({});

        // Decrypt each phone number before sending response
        const decryptedLeads = leads.map(lead => ({
            ...lead._doc,
            phone: decrypt(lead.phone)
        }));

        console.log("Decrypted Leads Fetched:", decryptedLeads);
        logRequest(req, "200 OK");
        res.status(200).json(decryptedLeads);
    } catch (error) {
        console.error("Error fetching leads:", error);
        logRequest(req, "500 Internal Server Error");
        res.status(500).json({ error: "Failed to fetch leads" });
    }
});
