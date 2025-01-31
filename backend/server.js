require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const API_KEY = process.env.API_KEY;
const API_KEY_FRONTEND = process.env.API_KEY_FRONTEND;

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

app.post('/api/leads', async (req, res) => {
    try {
        const { name, phone, zip, service } = req.body;

        if (!name || !phone || !zip) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const newLead = new Lead({ name, phone, zip, service });
        await newLead.save();

        res.status(201).json({ message: "Lead stored successfully", lead: newLead });
    } catch (error) {
        console.error("Error storing lead:", error);
        res.status(500).json({ error: "Failed to store lead" });
    }
});

app.get('/api/leads', async (req, res) => {
    try {
        const leads = await Lead.find({});
        console.log("Leads Fetched:", leads);
        res.status(200).json(leads);
    } catch (error) {
        console.error("Error fetching leads:", error);
        res.status(500).json({ error: "Failed to fetch leads" });
    }
});

// Define routes first
app.post('/api/leads', async (req, res) => { /* Lead storage logic */ });
app.get('/api/leads', async (req, res) => { /* Fetch leads logic */ });

// Apply API key authentication AFTER defining routes
app.use((req, res, next) => {
    console.log(`Request to ${req.path} with API key: ${req.headers['x-api-key']}`);

    const allowedRoutes = ["/", "/api/config"];
    if (!allowedRoutes.includes(req.path) && req.headers['x-api-key'] !== API_KEY) {
        console.log("Unauthorized request blocked.");
        return res.status(403).json({ error: "Unauthorized access" });
    }

    console.log("Authorized request allowed.");
    next();
});
