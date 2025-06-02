// script.js

// 1. --- DOM Elements & Canvas Setup ---
const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

const scorePlayer1Elem = document.getElementById('scorePlayer1');
const scorePlayer2Elem = document.getElementById('scorePlayer2');
const gameOverlay = document.getElementById('game-overlay');
const mainMessageElem = document.getElementById('main-message');
const subMessageElem = document.getElementById('sub-message');
const difficultySelectionDiv = document.getElementById('difficulty-selection');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');
const player2NameElem = document.querySelector('#player2-score-container .player-name');


// Ajustar o tamanho do canvas (pode ser dinâmico ou fixo)
// Para este exemplo, vamos usar dimensões fixas que se encaixam bem no layout
canvas.width = 720; // Largura definida no CSS para #game-arena max-width
canvas.height = canvas.width * (3 / 4); // Proporção 4:3

// 2. --- Game Variables & Constants ---
let gameState = 'menu'; // 'menu', 'difficulty_select', 'playing', 'paused', 'gameOver'
let animationFrameId;

const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS = 8;
const WINNING_SCORE = 5;

let player1, player2, ball;
let player1Score = 0;
let player2Score = 0;

const PADDLE_SPEED = 6;
const AI_SPEEDS = {
    easy: 3.5,
    medium: 4.5,
    hard: 5.8
};
let currentAIDifficulty = 'medium'; // Valor padrão

// Cores para o canvas (podem ser diferentes do CSS se desejar)
const NET_COLOR = 'rgba(200, 200, 200, 0.3)';
const PADDLE_1_COLOR = '#00FFFF'; // Cyan
const PADDLE_2_COLOR = '#FF00FF'; // Magenta
const BALL_COLOR = '#FFFFFF';   // Branco

// Sound placeholders (descomente e implemente se tiver os sons)
// const hitSound = new Audio('sounds/hit.wav');
// const scoreSound = new Audio('sounds/score.wav');
// const wallHitSound = new Audio('sounds/wall.wav');

// 3. --- Game Objects (Classes) ---
class Paddle {
    constructor(x, y, width, height, color, speed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.speed = speed;
        this.velocityY = 0; // Para movimento mais suave baseado em keydown/keyup
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.y += this.velocityY;

        // Manter dentro das bordas do canvas
        if (this.y < 0) {
            this.y = 0;
        } else if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
        }
    }

    move(direction) { // -1 para cima, 1 para baixo, 0 para parar
        this.velocityY = direction * this.speed;
    }

    // Para controle direto sem suavização (usado pela IA neste exemplo)
    moveInstantly(newY) {
        this.y = newY;
        if (this.y < 0) {
            this.y = 0;
        } else if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
        }
    }
}

class Ball {
    constructor(x, y, radius, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.baseSpeedX = 5;
        this.baseSpeedY = 3;
        this.speedX = this.baseSpeedX;
        this.speedY = this.baseSpeedY;
        this.maxSpeed = 10; // Velocidade máxima que a bola pode atingir
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Quicar nas paredes superior e inferior
        if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
            this.speedY *= -1;
            // wallHitSound.play();
             // Clamp para evitar que a bola saia
            if (this.y - this.radius < 0) this.y = this.radius;
            if (this.y + this.radius > canvas.height) this.y = canvas.height - this.radius;
        }
    }

    reset(servingPlayer) { // servingPlayer = 1 ou 2
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.speedX = this.baseSpeedX * (servingPlayer === 1 ? 1 : -1) * (Math.random() > 0.5 ? 1 : -0.8); // Direção e pequena variação
        this.speedY = this.baseSpeedY * (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.8 + 0.7); // Variação na velocidade Y
    }

    increaseSpeed() {
        if (Math.abs(this.speedX) < this.maxSpeed) {
            this.speedX *= 1.05; // Aumenta 5%
        }
        // A velocidade Y pode ser ajustada baseada no ângulo de colisão
    }
}

// 4. --- Helper Functions ---
function drawNet() {
    ctx.strokeStyle = NET_COLOR;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 10]); // [traço, espaço]
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]); // Resetar o padrão do traço
}

function collision(ball, paddle) {
    // Calcula as bordas dos objetos
    const ballTop = ball.y - ball.radius;
    const ballBottom = ball.y + ball.radius;
    const ballLeft = ball.x - ball.radius;
    const ballRight = ball.x + ball.radius;

    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + paddle.height;
    const paddleLeft = paddle.x;
    const paddleRight = paddle.x + paddle.width;

    // Verifica se há colisão
    return ballRight > paddleLeft && ballLeft < paddleRight &&
           ballBottom > paddleTop && ballTop < paddleBottom;
}

// 5. --- Game Logic Functions ---
function updateScores() {
    scorePlayer1Elem.textContent = player1Score;
    scorePlayer2Elem.textContent = player2Score;
}

function resetGame(difficulty = 'medium') {
    player1Score = 0;
    player2Score = 0;
    updateScores();
    currentAIDifficulty = difficulty;
    player2NameElem.textContent = `IA (${difficulty.toUpperCase()})`;

    player1 = new Paddle(30, canvas.height / 2 - PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_1_COLOR, PADDLE_SPEED);
    player2 = new Paddle(canvas.width - 30 - PADDLE_WIDTH, canvas.height / 2 - PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_2_COLOR, AI_SPEEDS[currentAIDifficulty]);
    ball = new Ball(canvas.width / 2, canvas.height / 2, BALL_RADIUS, BALL_COLOR);
    ball.reset(Math.random() > 0.5 ? 1 : 2); // Sorteia quem começa
}

function aiControl() {
    // Lógica simples da IA: tentar centralizar a paleta com a bola
    // Adiciona um "lag" ou imperfeição para não ser perfeita
    const targetY = ball.y - player2.height / 2;
    const speed = AI_SPEEDS[currentAIDifficulty];

    // Pequeno fator de erro e atraso na reação da IA
    // Quanto maior o 'reactionFactor', mais lenta/imprecisa a IA
    const reactionFactor = { easy: 0.15, medium: 0.1, hard: 0.06 }[currentAIDifficulty];
    
    player2.y += (targetY - player2.y) * reactionFactor;

    // Garante que a paleta da IA não exceda sua velocidade máxima
    // Isso é mais uma limitação de quão rápido ela corrige a posição por frame.
    // A velocidade 'speed' no construtor da paleta da IA já limita o movimento por input.
    // No entanto, como estamos movendo a IA diretamente com base na posição da bola,
    // precisamos garantir que ela não "teleporte".
    // Se a diferença for muito grande, move apenas o máximo permitido pela sua velocidade.
    // (Essa parte pode ser refinada para uma IA mais natural)
}


// 6. --- Game State Management Functions ---
function showOverlay(mainText, subText, showDifficulty = false) {
    mainMessageElem.textContent = mainText;
    subMessageElem.textContent = subText;
    difficultySelectionDiv.style.display = showDifficulty ? 'block' : 'none';
    gameOverlay.classList.remove('hidden');
}

function hideOverlay() {
    gameOverlay.classList.add('hidden');
}

function setGameState(newState) {
    gameState = newState;
    hideOverlay(); // Esconde por padrão, mostra se necessário

    switch (gameState) {
        case 'menu':
            showOverlay('PONG F🔥DA!', 'Pressione ESPAÇO para selecionar dificuldade', false);
            break;
        case 'difficulty_select':
            showOverlay('ESCOLHA A DIFICULDADE', 'Use os botões ou números 1, 2, 3', true);
            break;
        case 'playing':
            // A overlay já foi escondida. O loop do jogo assume.
            if (animationFrameId) cancelAnimationFrame(animationFrameId); // Garante que não haja loops duplicados
            gameLoop();
            break;
        case 'paused':
            showOverlay('PAUSADO', 'Pressione P para continuar', false);
            // Não cancela o animationFrameId aqui, pois o loop já vai parar de atualizar a lógica
            break;
        case 'gameOver':
            const winner = player1Score >= WINNING_SCORE ? 'JOGADOR 1' : `IA (${currentAIDifficulty.toUpperCase()})`;
            showOverlay('FIM DE JOGO!', `${winner} VENCEU! Pressione ESPAÇO.`, false);
            // play_sound("game_over"); // Exemplo de som de game over
            break;
    }
}

// 7. --- Input Handling ---
const keysPressed = {};

window.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true;

    if (gameState === 'menu' && e.key === ' ') {
        // play_sound("menu_select");
        setGameState('difficulty_select');
    } else if (gameState === 'difficulty_select') {
        if (e.key === '1' || e.key.toLowerCase() === 'e') startGame('easy');
        else if (e.key === '2' || e.key.toLowerCase() === 'm') startGame('medium');
        else if (e.key === '3' || e.key.toLowerCase() === 'h') startGame('hard');
    } else if (gameState === 'gameOver' && e.key === ' ') {
        // play_sound("menu_select");
        setGameState('menu');
    } else if (e.key.toLowerCase() === 'p') { // Tecla P para pausar/despausar
        if (gameState === 'playing') {
            setGameState('paused');
        } else if (gameState === 'paused') {
            setGameState('playing'); // Retoma o jogo
        }
    }
});

window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
        // play_sound("menu_select");
        const difficulty = button.getAttribute('data-difficulty');
        startGame(difficulty);
    });
});

function handlePlayerInput() {
    if (keysPressed['w'] || keysPressed['arrowup']) {
        player1.move(-1); // Mover para cima
    } else if (keysPressed['s'] || keysPressed['arrowdown']) {
        player1.move(1); // Mover para baixo
    } else {
        player1.move(0); // Parar se nenhuma tecla de movimento estiver pressionada
    }
}

// 8. --- Main Game Loop ---
function gameLoop() {
    if (gameState !== 'playing') {
        // Se não estiver jogando (ex: pausado), não atualiza nem redesenha a lógica do jogo
        // mas mantém o loop de animação para poder voltar
        if (gameState !== 'paused') return; // Sai completamente se não for nem playing nem paused
    }
    
    if (gameState === 'playing') { // Só processa lógica do jogo se estiver 'playing'
        handlePlayerInput();
        player1.update();
        aiControl(); // Atualiza a posição da IA (sem chamar player2.update() pois não tem velocityY)
        player2.update(); // Aplica limites de borda para IA

        ball.update();

        // Colisão da bola com player1
        if (collision(ball, player1)) {
            // hitSound.play();
            let collidePoint = (ball.y - (player1.y + player1.height / 2)) / (player1.height / 2);
            let angleRad = collidePoint * (Math.PI / 4); // Ângulo de até 45 graus
            
            let direction = (ball.x < canvas.width / 2) ? 1 : -1; // Esta lógica pode estar invertida, ball.x > paddle.x para player1
            ball.speedX = ball.baseSpeedX * Math.cos(angleRad) * direction * -1; // Inverte X
            ball.speedY = ball.baseSpeedX * Math.sin(angleRad);
            ball.increaseSpeed();
             // Evitar que a bola entre na paleta
            if(ball.speedX < 0) ball.x = player1.x + player1.width + ball.radius;
            
        }
        // Colisão da bola com player2 (IA)
        else if (collision(ball, player2)) {
            // hitSound.play();
            let collidePoint = (ball.y - (player2.y + player2.height / 2)) / (player2.height / 2);
            let angleRad = collidePoint * (Math.PI / 4);

            ball.speedX = ball.baseSpeedX * Math.cos(angleRad) * 1; // Direção X positiva para a IA
            ball.speedY = ball.baseSpeedX * Math.sin(angleRad);
            ball.increaseSpeed();
            // Evitar que a bola entre na paleta
            if(ball.speedX > 0) ball.x = player2.x - ball.radius;
        }

        // Pontuação
        if (ball.x - ball.radius < 0) { // Ponto para Player 2 (IA)
            player2Score++;
            // scoreSound.play();
            ball.reset(1); // Bola serve para Player 1
        } else if (ball.x + ball.radius > canvas.width) { // Ponto para Player 1
            player1Score++;
            // scoreSound.play();
            ball.reset(2); // Bola serve para Player 2
        }
        updateScores();

        // Verificar condição de vitória
        if (player1Score >= WINNING_SCORE || player2Score >= WINNING_SCORE) {
            setGameState('gameOver');
        }
    }


    // Desenhar tudo
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpar o canvas
    drawNet();
    if (player1) player1.draw(); // Verifica se existem antes de desenhar
    if (player2) player2.draw();
    if (ball) ball.draw();
    
    if (gameState === 'playing' || gameState === 'paused') { // Continua o loop se estiver jogando ou pausado
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}


// 9. --- Initialization / Start Game ---
function startGame(difficulty) {
    resetGame(difficulty);
    setGameState('playing');
}

// Iniciar o jogo no estado de menu
setGameState('menu');