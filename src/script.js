async function getApiKey() {
    try {
        const response = await fetch('https://hvac-backend.onrender.com/api/config');
        const data = await response.json();
        return data.apiKey;
    } catch (error) {
        console.error("Failed to load API key:", error);
        return null;
    }
}

document.getElementById('quote-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const zip = document.getElementById('zip').value.trim();
    const service = document.getElementById('service').value;

    if (!name || !phone || !zip) {
        alert("Please fill in all required fields.");
        return;
    }

    const leadData = { name, phone, zip, service };
    const apiKey = await getApiKey();

    if (!apiKey) {
        alert("Failed to load API key. Please try again.");
        return;
    }

    try {
        const response = await fetch('https://hvac-backend.onrender.com/api/leads', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify(leadData)
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const result = await response.json();
        console.log("Response from server:", result);

        alert("Thank you! Your request has been submitted. We will contact you soon.");
        document.getElementById('quote-form').reset();
    } catch (error) {
        console.error("Error submitting form:", error);
        alert("Failed to submit the form. Please try again.");
    }
});
