require('dotenv').config({ path: __dirname + '/.env' });

console.log("🔍 Checking MONGO_URI:", process.env.MONGO_URI); // debugging

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors()); // Allows frontend to connect
app.use(bodyParser.json()); // Parses JSON requests

// Root route for health check
app.get('/', (req, res) => {
    res.send('HVAC Lead API is running...');
});

//debugging
if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing!");
} else {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log("MongoDB Connected"))
        .catch(err => console.error("MongoDB Connection Error:", err));
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB Connection Error:", err));

// Define Lead Schema Globally
const LeadSchema = new mongoose.Schema({
    name: String,
    phone: String,
    zip: String,
    service: String,
    timestamp: { type: Date, default: Date.now }
});
const Lead = mongoose.model('Lead', LeadSchema);

app.get('/api/leads', async (req, res) => {
    try {
        const Lead = mongoose.model('Lead');
        const leads = await Lead.find({});
        res.status(200).json(leads);
    } catch (error) {
        console.error("Error fetching leads:", error);
        res.status(500).json({ error: "Failed to fetch leads" });
    }
});


// API Route: Store Lead
app.post('/api/leads', async (req, res) => {
    try {
        const { name, phone, zip, service } = req.body;

        // Ensure required fields are present
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

// Start Server
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
