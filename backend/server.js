require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const cors = require('cors');
app.use(cors({
    origin: '*', 
    methods: 'GET, POST',
    allowedHeaders: 'Content-Type'
}));

app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Define Lead Schema for MongoDB
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
        const newLead = new Lead(req.body);
        await newLead.save();
        res.status(201).json({ message: "Lead stored successfully", lead: newLead });
    } catch (error) {
        res.status(500).json({ error: "Failed to store lead" });
    }
});

// Start Server
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
