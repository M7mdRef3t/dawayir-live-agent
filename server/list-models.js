import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

function listModels() {
    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models?key=${API_KEY}`,
        method: 'GET'
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                console.log('Available models:');
                if (json.models) {
                    json.models.forEach(m => {
                        console.log(`- ${m.name} (supports: ${m.supportedGenerationMethods.join(', ')})`);
                    });
                } else {
                    console.log('No models found or error:', json);
                }
            } catch (e) {
                console.error('Parse error:', e);
                console.log('Raw data:', data);
            }
        });
    });

    req.on('error', (e) => {
        console.error('Request error:', e);
    });
    req.end();
}

listModels();
