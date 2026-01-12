// ⚠️ IMPORTANT: Replace with your computer's local IP address
const SERVER_URL = 'http://localhost:5000';

let socket = null;
let playerId = null;
let playerName = null;
let playerTagId = null;
let isCalibrated = false;
let currentRoomCode = null;
let isHost = false;
let ammoCount = 30;
let healthCount = 100;
let hitsCount = 0;
let shotsFiredCount = 0;
let cameraStream = null;

// Screen management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Generate unique player ID
    playerId = 'player_' + Math.random().toString(36).substr(2, 9);
    
    // Welcome screen button
    document.getElementById('requestCameraBtn').addEventListener('click', async function() {
        const nameInput = document.getElementById('playerNameSetup');
        playerName = nameInput.value.trim() || 'Player' + Math.floor(Math.random() * 1000);
        
        // Request camera access
        try {
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const constraints = isMobile 
                ? { video: { facingMode: { ideal: "environment" } } }
                : { video: true };
            
            cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Show calibration screen
            showScreen('calibrationScreen');
            
            // Set up calibration video
            const calibrationVideo = document.getElementById('calibrationVideo');
            calibrationVideo.srcObject = cameraStream;
            
            // Connect to server
            initializeSocket();
            
        } catch (err) {
            alert('Camera access denied. Please allow camera access and try again.');
            console.error('Camera error:', err);
        }
    });
    
    // Calibration button
    document.getElementById('calibrateBtn').addEventListener('click', calibrateTag);
    
    // Lobby menu buttons
    document.getElementById('hostGameBtn').addEventListener('click', hostGame);
    document.getElementById('joinGameBtn').addEventListener('click', () => showScreen('joinGameScreen'));
    
    // Join game buttons
    document.getElementById('joinRoomBtn').addEventListener('click', joinRoom);
    document.getElementById('backToLobbyFromJoin').addEventListener('click', () => showScreen('lobbyMenuScreen'));
    
    // Host game buttons
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('cancelHostBtn').addEventListener('click', cancelHost);
    
    // Waiting room button
    document.getElementById('leaveRoomBtn').addEventListener('click', leaveRoom);
    
    // Admin buttons
    document.getElementById('secretAdminBtn').addEventListener('click', () => showScreen('adminLoginScreen'));
    document.getElementById('adminLoginBtn').addEventListener('click', adminLogin);
    document.getElementById('backFromAdminLogin').addEventListener('click', () => showScreen('welcomeScreen'));
    document.getElementById('exitAdminBtn').addEventListener('click', () => showScreen('welcomeScreen'));
    document.getElementById('resetAllTagsBtn').addEventListener('click', resetAllTags);
    document.getElementById('closeAllRoomsBtn').addEventListener('click', closeAllRooms);
    document.getElementById('refreshStatsBtn').addEventListener('click', refreshAdminStats);
    
    // Shoot button
    document.getElementById('shootBtn').addEventListener('click', shootLaser);
    
    // Reload button
    document.getElementById('reloadBtn').addEventListener('click', reloadWeapon);
});

function initializeSocket() {
    socket = io(SERVER_URL, {
        transports: ['websocket', 'polling']
    });
    
    socket.on('connect', function() {
        console.log('✅ Connected to server');
        updateConnectionStatus('connected', 'Connected');
    });
    
    socket.on('disconnect', function() {
        console.log('❌ Disconnected from server');
        updateConnectionStatus('disconnected', 'Disconnected');
    });
    
    socket.on('connect_error', function(error) {
        console.error('Connection error:', error);
        updateConnectionStatus('error', 'Connection Error');
    });
    
    socket.on('connection_status', function(data) {
        console.log('Server status:', data.message);
    });
    
    socket.on('detection_result', function(data) {
        handleDetectionResult(data);
    });
    
    socket.on('registration_result', function(data) {
        handleRegistrationResult(data);
    });
    
    socket.on('shot_confirmed', function(data) {
        handleShotConfirmed(data);
    });
    
    socket.on('player_hit', function(data) {
        if (data.player_id === playerId) {
            handlePlayerHit(data);
        }
    });
    
    socket.on('reload', function(data) {
        showMessage('🔄 RELOAD TIME!', 'warning');
    });
    
    socket.on('game_reset', function(data) {
        resetGame();
    });
    
    // Room events
    socket.on('room_created', function(data) {
        console.log('Room created event received:', data);
        handleRoomCreated(data);
    });
    
    socket.on('room_joined', function(data) {
        console.log('Room joined event received:', data);
        handleRoomJoined(data);
    });
    
    socket.on('room_updated', function(data) {
        console.log('Room updated event received:', data);
        handleRoomUpdated(data);
    });
    
    socket.on('room_error', function(data) {
        console.log('Room error event received:', data);
        handleRoomError(data);
    });
    
    socket.on('game_started', function(data) {
        console.log('Game started event received:', data);
        handleGameStarted(data);
    });
    
    socket.on('room_closed', function(data) {
        console.log('Room closed event received:', data);
        handleRoomClosed(data);
    });
    
    // Game end events
    socket.on('game_won', function(data) {
        console.log('Game won event received:', data);
        handleGameWon(data);
    });
    
    socket.on('game_draw', function(data) {
        console.log('Game draw event received:', data);
        handleGameDraw(data);
    });
    
    // Admin events
    socket.on('admin_stats', function(data) {
        console.log('Admin stats received:', data);
        updateAdminStats(data);
    });
    
    socket.on('force_recalibrate', function() {
        console.log('Force recalibrate received');
        handleForceRecalibrate();
    });
}

async function calibrateTag() {
    const calibrateBtn = document.getElementById('calibrateBtn');
    const calibrationMessage = document.getElementById('calibrationMessage');
    
    calibrateBtn.disabled = true;
    calibrateBtn.innerText = '📸 SCANNING...';
    calibrationMessage.innerText = 'Detecting tag...';
    
    try {
        const video = document.getElementById('calibrationVideo');
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        socket.emit('detect_tag', {
            image: imageData,
            player_id: playerId,
            calibration: true
        });
        
    } catch (err) {
        console.error('Calibration error:', err);
        calibrationMessage.innerText = '❌ Error capturing image. Try again.';
        calibrateBtn.disabled = false;
        calibrateBtn.innerText = '📸 Scan My Tag';
    }
}

function handleDetectionResult(data) {
    if (data.success && data.detections.length > 0) {
        const tag = data.detections[0];
        
        if (!isCalibrated) {
            // Register player with this tag
            socket.emit('register_player', {
                player_id: playerId,
                player_name: playerName,
                tag_id: tag.id
            });
        } else {
            // This is a shot
            socket.emit('shoot', {
                player_id: playerId,
                tag_id: tag.id
            });
        }
    } else {
        if (!isCalibrated) {
            const calibrationMessage = document.getElementById('calibrationMessage');
            calibrationMessage.innerText = '❌ No tag detected. Hold tag flat and try again.';
            document.getElementById('calibrateBtn').disabled = false;
            document.getElementById('calibrateBtn').innerText = '📸 Scan My Tag';
        } else {
            showMessage('❌ No target detected', 'error');
            document.getElementById('shootBtn').disabled = false;
        }
    }
}

function handleRegistrationResult(data) {
    if (data.success) {
        isCalibrated = true;
        playerTagId = data.player_data.tag_id;
        
        // Move to lobby menu instead of game screen
        showScreen('lobbyMenuScreen');
        
        // Update lobby menu with player info
        document.getElementById('lobbyPlayerName').innerText = playerName;
        document.getElementById('lobbyTagId').innerText = playerTagId;
        
    } else {
        const calibrationMessage = document.getElementById('calibrationMessage');
        calibrationMessage.innerText = `❌ ${data.error}`;
        document.getElementById('calibrateBtn').disabled = false;
        document.getElementById('calibrateBtn').innerText = '📸 Scan My Tag';
    }
}

async function shootLaser() {
    if (ammoCount <= 0) {
        showMessage('❌ Out of ammo! Reload first', 'error');
        return;
    }
    
    if (healthCount <= 0) {
        showMessage('💀 You are eliminated!', 'error');
        return;
    }
    
    const shootBtn = document.getElementById('shootBtn');
    shootBtn.disabled = true;
    shootBtn.innerText = '🔍 DETECTING...';
    
    try {
        const video = document.getElementById('cameraView');
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        socket.emit('detect_tag', {
            image: imageData,
            player_id: playerId
        });
        
        // Update ammo
        ammoCount--;
        shotsFiredCount++;
        updateStats();
        
    } catch (err) {
        console.error('Shoot error:', err);
        showMessage('❌ Error capturing image', 'error');
    }
    
    setTimeout(() => {
        shootBtn.disabled = false;
        shootBtn.innerText = '🔫 SHOOT';
    }, 1000);
}

function handleShotConfirmed(data) {
    if (data.hit_player) {
        hitsCount++;
        updateStats();
        showMessage(`🎯 HIT ${data.hit_player}!`, 'success');
    } else {
        showMessage(`📍 Tag ${data.tag_id} detected (not registered)`, 'info');
    }
}

function handlePlayerHit(data) {
    // Always deduct HP when hit
    healthCount -= 25;
    updateStats();
    
    console.log(`Hit! Current HP: ${healthCount}`);
    
    showMessage(`💥 HIT by ${data.shooter_id}!`, 'error');
    
    // Flash screen red
    const cameraView = document.getElementById('cameraView');
    cameraView.style.filter = 'brightness(2) saturate(2) hue-rotate(320deg)';
    setTimeout(() => {
        cameraView.style.filter = 'none';
    }, 200);
    
    // Flash again
    setTimeout(() => {
        cameraView.style.filter = 'brightness(2) saturate(2) hue-rotate(320deg)';
    }, 400);
    setTimeout(() => {
        cameraView.style.filter = 'none';
    }, 600);
    
    // Check if player is eliminated
    if (healthCount <= 0) {
        healthCount = 0;
        updateStats();
        
        // Notify server we're eliminated
        socket.emit('player_eliminated', {
            player_id: playerId,
            room_code: currentRoomCode
        });
        
        // Show game over screen
        showGameOver();
    }
}

function showGameOver() {
    // Disable shooting
    document.getElementById('shootBtn').disabled = true;
    document.getElementById('reloadBtn').disabled = true;
    
    // Create game over overlay
    const gameScreen = document.getElementById('gameScreen');
    
    const overlay = document.createElement('div');
    overlay.id = 'gameOverOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        animation: fadeIn 1s;
    `;
    
    overlay.innerHTML = `
        <style>
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
        </style>
        <h1 style="
            color: #ff0000;
            font-size: 72px;
            margin-bottom: 20px;
            text-shadow: 0 0 30px rgba(255, 0, 0, 0.8);
            animation: pulse 2s infinite;
        ">ELIMINATED</h1>
        <p style="
            color: white;
            font-size: 24px;
            margin-bottom: 30px;
        ">You have been eliminated!</p>
        <div style="
            background: rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            margin-bottom: 30px;
        ">
            <div style="color: #888; font-size: 18px; margin-bottom: 10px;">Final Stats</div>
            <div style="color: #00ff88; font-size: 32px; font-weight: bold; margin: 10px 0;">
                ${hitsCount} Hits
            </div>
            <div style="color: #888; font-size: 18px;">
                ${shotsFiredCount} Shots Fired
            </div>
        </div>
        <button id="returnToLobbyBtn" style="
            padding: 20px 40px;
            font-size: 20px;
            font-weight: bold;
            border: 2px solid #00ff88;
            border-radius: 12px;
            background: transparent;
            color: #00ff88;
            cursor: pointer;
            transition: all 0.3s;
        " onmouseover="this.style.background='rgba(0,255,136,0.2)'" 
           onmouseout="this.style.background='transparent'"
           onclick="returnToLobby()">
            Return to Lobby
        </button>
    `;
    
    gameScreen.appendChild(overlay);
}

function showVictory() {
    // Disable shooting
    document.getElementById('shootBtn').disabled = true;
    document.getElementById('reloadBtn').disabled = true;
    
    // Create victory overlay
    const gameScreen = document.getElementById('gameScreen');
    
    const overlay = document.createElement('div');
    overlay.id = 'victoryOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(0, 0, 0, 0.95) 100%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        animation: fadeIn 1s;
    `;
    
    overlay.innerHTML = `
        <style>
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-20px); }
            }
            @keyframes glow {
                0%, 100% { text-shadow: 0 0 20px rgba(0, 255, 136, 0.8); }
                50% { text-shadow: 0 0 40px rgba(0, 255, 136, 1), 0 0 60px rgba(0, 255, 136, 0.8); }
            }
        </style>
        <div style="font-size: 100px; margin-bottom: 20px; animation: bounce 1s infinite;">🏆</div>
        <h1 style="
            color: #00ff88;
            font-size: 72px;
            margin-bottom: 20px;
            animation: glow 2s infinite;
        ">YOU WIN!</h1>
        <p style="
            color: white;
            font-size: 28px;
            margin-bottom: 30px;
        ">Victory Royale!</p>
        <div style="
            background: rgba(0, 255, 136, 0.1);
            border: 2px solid #00ff88;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            margin-bottom: 30px;
        ">
            <div style="color: #888; font-size: 18px; margin-bottom: 10px;">Final Stats</div>
            <div style="color: #00ff88; font-size: 32px; font-weight: bold; margin: 10px 0;">
                ${hitsCount} Hits
            </div>
            <div style="color: #888; font-size: 18px;">
                ${shotsFiredCount} Shots Fired
            </div>
            <div style="color: #888; font-size: 18px;">
                HP Remaining: ${healthCount}
            </div>
        </div>
        <button id="returnToLobbyBtn" style="
            padding: 20px 40px;
            font-size: 20px;
            font-weight: bold;
            border: 2px solid #00ff88;
            border-radius: 12px;
            background: rgba(0, 255, 136, 0.2);
            color: #00ff88;
            cursor: pointer;
            transition: all 0.3s;
        " onmouseover="this.style.background='rgba(0,255,136,0.3)'" 
           onmouseout="this.style.background='rgba(0,255,136,0.2)'"
           onclick="returnToLobby()">
            Return to Lobby
        </button>
    `;
    
    gameScreen.appendChild(overlay);
}

function handleGameWon(data) {
    if (data.winner_id === playerId) {
        // You won!
        showVictory();
    }
    // If not the winner, they're already eliminated and see the eliminated screen
}

function handleGameDraw(data) {
    alert(data.message);
    returnToLobby();
}

function returnToLobby() {
    // Remove overlay if it exists
    const overlay = document.getElementById('gameOverOverlay') || document.getElementById('victoryOverlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Leave the room
    if (currentRoomCode) {
        socket.emit('leave_room', {
            room_code: currentRoomCode,
            player_id: playerId
        });
    }
    
    // Reset game state
    currentRoomCode = null;
    isHost = false;
    healthCount = 100;
    ammoCount = 30;
    hitsCount = 0;
    shotsFiredCount = 0;
    
    // Re-enable buttons
    document.getElementById('shootBtn').disabled = false;
    document.getElementById('reloadBtn').disabled = false;
    
    // Return to lobby menu
    showScreen('lobbyMenuScreen');
}

function reloadWeapon() {
    ammoCount = 30;
    updateStats();
    showMessage('🔄 Reloaded!', 'success');
}

function updateStats() {
    document.getElementById('ammo').innerText = ammoCount;
    document.getElementById('health').innerText = healthCount;
    document.getElementById('hits').innerText = hitsCount;
    document.getElementById('shotsFired').innerText = shotsFiredCount;
}

function updateConnectionStatus(status, text) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    statusDot.className = 'status-dot ' + status;
    statusText.innerText = text;
}

function showMessage(text, type = 'info') {
    const messageArea = document.getElementById('messageArea');
    messageArea.innerText = text;
    messageArea.className = 'message ' + type;
    messageArea.style.display = 'block';
    
    setTimeout(() => {
        messageArea.style.display = 'none';
    }, 3000);
}

function resetGame() {
    healthCount = 100;
    ammoCount = 30;
    hitsCount = 0;
    shotsFiredCount = 0;
    updateStats();
    document.getElementById('shootBtn').disabled = false;
    document.getElementById('cameraView').style.filter = 'none';
    showMessage('🎮 Game Reset!', 'success');
}

// Make returnToLobby globally accessible for onclick
window.returnToLobby = returnToLobby;

// ===== LOBBY FUNCTIONS =====

function hostGame() {
    console.log('Host game clicked');
    console.log('Socket connected?', socket && socket.connected);
    console.log('Player ID:', playerId);
    console.log('Player Name:', playerName);
    
    if (!socket || !socket.connected) {
        alert('Not connected to server! Please refresh and try again.');
        return;
    }
    
    socket.emit('create_room', {
        player_id: playerId,
        player_name: playerName
    });
    
    console.log('Create room event sent');
}

function handleRoomCreated(data) {
    currentRoomCode = data.room_code;
    isHost = true;
    
    showScreen('hostGameScreen');
    document.getElementById('roomCodeDisplay').innerText = currentRoomCode;
    
    updatePlayersList(data.players);
    
    console.log(`🏠 Created room: ${currentRoomCode}`);
}

function joinRoom() {
    const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
    
    if (roomCode.length !== 4) {
        document.getElementById('joinMessage').innerText = '❌ Code must be 4 letters';
        return;
    }
    
    socket.emit('join_room', {
        player_id: playerId,
        player_name: playerName,
        room_code: roomCode
    });
}

function handleRoomJoined(data) {
    currentRoomCode = data.room_code;
    isHost = false;
    
    showScreen('waitingRoomScreen');
    document.getElementById('waitingRoomCode').innerText = currentRoomCode;
    
    updateWaitingPlayersList(data.players);
    
    console.log(`🚪 Joined room: ${currentRoomCode}`);
}

function handleRoomUpdated(data) {
    if (isHost) {
        updatePlayersList(data.players);
    } else {
        updateWaitingPlayersList(data.players);
    }
}

function handleRoomError(data) {
    if (document.getElementById('joinGameScreen').classList.contains('active')) {
        document.getElementById('joinMessage').innerText = `❌ ${data.error}`;
    } else {
        alert(data.error);
    }
}

function startGame() {
    socket.emit('start_game', {
        room_code: currentRoomCode,
        player_id: playerId
    });
}

function handleGameStarted(data) {
    // Transition to game screen
    showScreen('gameScreen');
    
    // Set up game video
    const gameVideo = document.getElementById('cameraView');
    gameVideo.srcObject = cameraStream;
    
    // Update UI
    document.getElementById('playerNameDisplay').innerText = playerName;
    document.getElementById('tagId').innerText = playerTagId;
    document.getElementById('shootBtn').disabled = false;
    document.getElementById('reloadBtn').disabled = false;
    
    showMessage('🎮 Game Started!', 'success');
}

function cancelHost() {
    leaveRoom();
    showScreen('lobbyMenuScreen');
}

function leaveRoom() {
    if (currentRoomCode) {
        socket.emit('leave_room', {
            room_code: currentRoomCode,
            player_id: playerId
        });
        
        currentRoomCode = null;
        isHost = false;
    }
    
    showScreen('lobbyMenuScreen');
}

function handleRoomClosed(data) {
    if (currentRoomCode === data.room_code) {
        alert('Room has been closed by the host');
        showScreen('lobbyMenuScreen');
        currentRoomCode = null;
        isHost = false;
    }
}

function updatePlayersList(players) {
    const container = document.getElementById('playersListContainer');
    const count = document.getElementById('playerCountLobby');
    
    container.innerHTML = '';
    count.innerText = Object.keys(players).length;
    
    for (const [pid, player] of Object.entries(players)) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item' + (pid === playerId ? ' host' : '');
        
        playerDiv.innerHTML = `
            <div class="player-icon">👤</div>
            <div class="player-details">
                <div class="player-name">${player.name}</div>
                <div class="player-tag">Tag ID: ${player.tag_id || '?'}</div>
            </div>
            ${pid === playerId ? '<span class="host-badge">HOST</span>' : ''}
        `;
        
        container.appendChild(playerDiv);
    }
    
    // Enable start button if at least 2 players
    const startBtn = document.getElementById('startGameBtn');
    if (Object.keys(players).length >= 2) {
        startBtn.disabled = false;
    } else {
        startBtn.disabled = true;
    }
}

function updateWaitingPlayersList(players) {
    const container = document.getElementById('waitingPlayersListContainer');
    const count = document.getElementById('waitingPlayerCount');
    
    container.innerHTML = '';
    count.innerText = Object.keys(players).length;
    
    for (const [pid, player] of Object.entries(players)) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item' + (player.name === playerName ? ' host' : '');
        
        playerDiv.innerHTML = `
            <div class="player-icon">👤</div>
            <div class="player-details">
                <div class="player-name">${player.name}</div>
                <div class="player-tag">Tag ID: ${player.tag_id || '?'}</div>
            </div>
        `;
        
        container.appendChild(playerDiv);
    }
}

// ===== ADMIN FUNCTIONS =====

function adminLogin() {
    const code = document.getElementById('adminCodeInput').value;
    const errorText = document.getElementById('adminLoginError');
    
    if (code === '8117') {
        // Correct code
        errorText.innerText = '';
        showScreen('adminScreen');
        
        // Initialize socket if not already connected
        if (!socket) {
            initializeSocket();
        }
        
        // Request admin stats
        refreshAdminStats();
    } else {
        errorText.innerText = '❌ Invalid admin code';
        document.getElementById('adminCodeInput').value = '';
    }
}

function refreshAdminStats() {
    if (socket && socket.connected) {
        socket.emit('get_admin_stats');
    }
}

function updateAdminStats(data) {
    document.getElementById('adminPlayerCount').innerText = data.total_players || 0;
    document.getElementById('adminRoomCount').innerText = data.total_rooms || 0;
    document.getElementById('adminConnectedCount').innerText = data.connected_clients || 0;
}

function resetAllTags() {
    if (!confirm('Are you sure you want to reset all player tags? This will force everyone to recalibrate.')) {
        return;
    }
    
    socket.emit('admin_reset_all_tags', {
        admin_code: '8117'
    });
    
    alert('All tags have been reset. Players will be sent to recalibration.');
}

function closeAllRooms() {
    if (!confirm('Are you sure you want to close all active rooms?')) {
        return;
    }
    
    socket.emit('admin_close_all_rooms', {
        admin_code: '8117'
    });
    
    alert('All rooms have been closed.');
}

function handleForceRecalibrate() {
    alert('Admin has reset all tags. You must recalibrate.');
    
    // Reset player state
    isCalibrated = false;
    playerTagId = null;
    
    // Clear any overlays
    const overlay = document.getElementById('gameOverOverlay') || document.getElementById('victoryOverlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Go back to calibration screen
    showScreen('calibrationScreen');
}