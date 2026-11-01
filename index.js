const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

let clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Player conectado. Total:', clients.size);

    ws.on('message', (message) => {
        const msg = message.toString();
        if (msg === 'ping') return; 
    });

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Player desconectado. Total:', clients.size);
    });
});

// API que o SITE vai chamar para mandar comandos
app.post('/comando', (req, res) => {
    const { comando, alvo, texto, duracao } = req.body;
    const payload = JSON.stringify({ comando, alvo, texto, duracao });

    let enviados = 0;
    clients.forEach((client) => {
        if (client.readyState === 1) { 
            client.send(payload);
            enviados++;
        }
    });

    res.json({ ok: true, enviados });
});

// API que o SITE vai chamar para pedir o registro dos players
app.post('/registrar-player', (req, res) => {
    const payload = JSON.stringify({ comando: "registrar", alvo: "all", texto: "" });

    let enviados = 0;
    clients.forEach((client) => {
        if (client.readyState === 1) { 
            client.send(payload);
            enviados++;
        }
    });

    res.json({ ok: true, enviados });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('Servidor WebSocket rodando na porta', PORT);
});