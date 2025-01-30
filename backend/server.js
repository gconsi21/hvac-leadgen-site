require('dotenv').config({ path: __dirname + '/.env' });

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

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("MongoDB Connected");
    const PORT = process.env.PORT || 5500;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
});
    
// Define Lead Schema Globally
const LeadSchema = new mongoose.Schema({
    name: String,
    phone: String,
    zip: String,
    service: String,
    timestamp: { type: Date, default: Date.now }
});
const Lead = mongoose.model('Lead', LeadSchema);

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

// API Fetch
app.get('/api/leads', async (req, res) => {
    try {
        const leads = await Lead.find({});
        res.status(200).json(leads);
    } catch (error) {
        console.error("Error fetching leads:", error);
        res.status(500).json({ error: "Failed to fetch leads" });
    }
});
