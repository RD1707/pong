// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; // Porta do servidor

// --- Servir Arquivos Estáticos ---
// Define o diretório 'public' como o local dos arquivos estáticos (html, css, js do cliente)
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal para servir o index.html (opcional, pois o express.static já faz isso para '/')
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Configuração do Servidor HTTP e WebSocket ---
const server = http.createServer(app); // Cria um servidor HTTP usando o app Express
const wss = new WebSocket.Server({ server }); // Anexa o servidor WebSocket ao servidor HTTP

console.log(`[Servidor] WebSocket e HTTP rodando na porta ${port}`);

// --- Lógica Multiplayer ---
let players = {}; // Objeto para armazenar os jogadores conectados e seus dados
let playerCounter = 0; // Contador para atribuir P1 ou P2
let gameFull = false; // Indica se já temos 2 jogadores

// Limpar jogadores se o servidor for reiniciado (para desenvolvimento)
function resetServerState() {
    players = {};
    playerCounter = 0;
    gameFull = false;
    console.log("[Servidor] Estado do servidor resetado.");
}
resetServerState(); // Chamada inicial

wss.on('connection', (ws) => {
    if (gameFull && Object.keys(players).length >= 2) {
        console.log('[Servidor] Conexão recusada: Jogo já está cheio.');
        ws.send(JSON.stringify({ type: 'error', message: 'O jogo já está cheio. Tente mais tarde.' }));
        ws.close();
        return;
    }

    playerCounter++;
    let currentPlayerId;

    if (!players.p1) {
        currentPlayerId = 'p1';
        players.p1 = ws;
        players.p1.id = 'p1'; // Adicionando id ao objeto ws para referência
        console.log('[Servidor] Jogador 1 (p1) conectou.');
        ws.send(JSON.stringify({ type: 'playerAssignment', playerId: 'p1' }));
    } else if (!players.p2) {
        currentPlayerId = 'p2';
        players.p2 = ws;
        players.p2.id = 'p2';
        gameFull = true; // Agora o jogo está cheio
        console.log('[Servidor] Jogador 2 (p2) conectou. O jogo pode começar!');
        ws.send(JSON.stringify({ type: 'playerAssignment', playerId: 'p2' }));

        // Notifica ambos os jogadores que o jogo pode começar
        if (players.p1 && players.p1.readyState === WebSocket.OPEN) {
             players.p1.send(JSON.stringify({ type: 'gameStart', message: 'Oponente conectado! O jogo vai começar.' }));
        }
        if (players.p2 && players.p2.readyState === WebSocket.OPEN) {
            players.p2.send(JSON.stringify({ type: 'gameStart', message: 'Conectado! O jogo vai começar.' }));
        }
    } else {
        // Este caso não deveria acontecer por causa do 'gameFull' check inicial, mas é uma salvaguarda.
        console.log('[Servidor] Tentativa de conexão extra, recusada.');
        ws.send(JSON.stringify({ type: 'error', message: 'Erro inesperado ao tentar conectar.' }));
        ws.close();
        return;
    }


    // Lidar com mensagens recebidas do cliente
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            // console.log(`[Servidor] Mensagem de ${currentPlayerId}: `, data);

            if (data.type === 'paddleMove') {
                // Retransmite a posição da paleta para o outro jogador
                const opponentId = (currentPlayerId === 'p1') ? 'p2' : 'p1';
                if (players[opponentId] && players[opponentId].readyState === WebSocket.OPEN) {
                    players[opponentId].send(JSON.stringify({
                        type: 'opponentPaddleMove',
                        y: data.y
                    }));
                }
            }

            // --- AQUI VOCÊ ADICIONARÁ MAIS LÓGICA ---
            // Ex: 'ballUpdate' se o servidor controlar a bola, 'scoreUpdate', etc.

        } catch (error) {
            console.error('[Servidor] Erro ao processar mensagem:', error);
        }
    });

    // Lidar com desconexões
    ws.on('close', () => {
        console.log(`[Servidor] Jogador ${currentPlayerId} desconectou.`);
        if (players[currentPlayerId]) {
            delete players[currentPlayerId];
        }
        
        // Se um jogador sair, o jogo não está mais cheio
        gameFull = false; 
        // Se era p1 ou p2, reseta o contador para permitir que a próxima conexão seja p1
        // Isso é uma simplificação. Uma lógica mais robusta de "slots" seria melhor.
        if (currentPlayerId === 'p1' && !players.p2) playerCounter = 0; // Se p1 saiu e não tinha p2, reseta
        else if (currentPlayerId === 'p2' && !players.p1) playerCounter = 0; // Se p2 saiu e não tinha p1, reseta
        else if (!players.p1 && !players.p2) playerCounter = 0; // Se ambos saíram
        else if (currentPlayerId === 'p1' && players.p2) { // Se p1 saiu mas p2 existe, p2 se torna p1 conceitualmente
            // (Esta lógica precisaria de mais refinamento para reatribuir p2 para p1)
            // Por agora, apenas notificamos o oponente.
        }


        // Notifica o outro jogador (se houver) sobre a desconexão
        const opponentId = (currentPlayerId === 'p1') ? 'p2' : 'p1';
        if (players[opponentId] && players[opponentId].readyState === WebSocket.OPEN) {
            players[opponentId].send(JSON.stringify({
                type: 'opponentDisconnected',
                message: 'Seu oponente desconectou.'
            }));
            // Aqui você pode querer resetar o estado do jogo para o oponente restante
            // ou prepará-lo para um novo oponente.
            // Por simplicidade, apenas notificamos. O cliente pode voltar ao menu.
        }
        
        // Resetar o estado para permitir novos jogadores se um sair e o jogo estava cheio.
        // Se um jogador crucial sair, talvez resetar o playerCounter para permitir um novo P1.
        // Esta lógica de reset pode ser complexa dependendo de como você quer lidar com reconexões
        // ou com um jogador esperando o outro.
        // Simplificação: se não há p1, o próximo será p1.
        if (!players.p1) {
            playerCounter = 0; // Permite que o próximo a conectar seja p1
        } else if (!players.p2 && players.p1) {
             // Se p1 existe mas p2 não, o próximo a conectar será p2.
             // Não precisa mudar playerCounter aqui se p1 já está definido.
        }


        console.log("[Servidor] Jogadores atuais:", Object.keys(players));
    });

    ws.on('error', (error) => {
        console.error(`[Servidor] Erro no WebSocket do jogador ${currentPlayerId}: `, error);
    });
});

// --- Iniciar o Servidor ---
server.listen(port, () => {
    console.log(`[Servidor] Servidor ouvindo em http://localhost:${port}`);
});

// Graceful shutdown (opcional, mas bom para desenvolvimento)
process.on('SIGINT', () => {
    console.log('[Servidor] Desligando servidor...');
    wss.clients.forEach(client => client.close());
    server.close(() => {
        resetServerState(); // Limpa o estado antes de sair
        process.exit(0);
    });
});