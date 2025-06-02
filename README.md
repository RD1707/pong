# Pong F🔥DA! Online 🚀

Bem-vindo ao Pong F🔥DA! Online – uma releitura moderna do clássico jogo de Pong, construído com HTML, CSS, JavaScript no frontend, e Node.js com Express e WebSockets no backend para uma experiência multiplayer em tempo real (em desenvolvimento).

Prepare-se para testar seus reflexos, seja contra uma Inteligência Artificial com níveis de dificuldade variados ou (em breve) contra outros jogadores online!

---

## ✨ Funcionalidades Atuais

**🎮 Client-Side (Jogo Local):**
* Jogabilidade clássica de Pong.
* Modo Single-player contra Inteligência Artificial (IA).
* Múltiplos níveis de dificuldade para a IA (Fácil, Médio, Difícil).
* Placar em tempo real.
* Interface de usuário limpa com estados de jogo claros:
    * Menu Principal
    * Seleção de Dificuldade
    * Jogo em Andamento
    * Pausado
    * Fim de Jogo (Game Over)
* Controles responsivos via teclado.

**🌐 Server-Side (Node.js) - Base para Multiplayer:**
* Serve os arquivos estáticos do jogo (HTML, CSS, JavaScript).
* Servidor WebSocket (`ws`) configurado para comunicação em tempo real.
* **Funcionalidade Multiplayer Inicial:**
    * Permite que dois jogadores se conectem ao servidor.
    * Atribui os papéis de Jogador 1 e Jogador 2.
    * Retransmite o movimento da paleta de um jogador para o outro em tempo real.
    * Detecta e informa desconexões de jogadores.
    * *Observação: A lógica completa do jogo online (sincronização da bola, pontuação centralizada) ainda está em desenvolvimento.*

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (ES6+)
* **Backend:** Node.js
* **Framework/Bibliotecas Backend:**
    * Express.js (para servir arquivos estáticos e roteamento HTTP)
    * `ws` (para comunicação WebSocket nativa e eficiente)
* **Ambiente de Desenvolvimento (Opcional):**
    * `nodemon` (para reiniciar automaticamente o servidor durante o desenvolvimento)
    * Scripts `.bat` customizados para configuração de ambientes portáteis de Node.js e Python (para usuários sem direitos de administrador).

---

## 📂 Estrutura do Projeto