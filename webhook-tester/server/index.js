import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';

const app = express();
const port = 3001;
const wsPort = 3002;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// WebSocket Server for the frontend to connect to
const wss = new WebSocketServer({ port: wsPort });

wss.on('connection', (ws) => {
    console.log('Frontend connected');
    ws.send(JSON.stringify({ type: 'STATUS', message: 'Connected to Local Server' }));
});

// Broadcast to all connected clients
const broadcast = (data) => {
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {
            client.send(JSON.stringify(data));
        }
    });
};

// Webhook Endpoint
app.all('/webhook/*', (req, res) => {
    const requestData = {
        id: crypto.randomUUID(),
        method: req.method,
        url: req.path,
        query: req.query,
        headers: req.headers,
        body: req.body,
        timestamp: Date.now(),
        size: JSON.stringify(req.body).length
    };

    console.log(`Received ${req.method} request to ${req.path}`);

    // Send to frontend
    broadcast({
        type: 'NEW_REQUEST',
        payload: requestData
    });

    res.status(200).send({ success: true, message: 'Webhook received' });
});

app.listen(port, () => {
    console.log(`\n🚀 Webhook Relay Server running!`);
    console.log(`📡 Send webhooks to: http://localhost:${port}/webhook`);
    console.log(`🔌 WebSocket running on port ${wsPort}\n`);
});
