// ⚠️ IMPORTANT: Replace with your computer's local IP address
const SERVER_URL = 'https://cameratag.onrender.com';

let socket = null;
let playerId = null;
let playerName = null;
let playerTagId = null;
let isCalibrated = false;
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
        
        // Move to game screen
        showScreen('gameScreen');
        
        // Set up game video
        const gameVideo = document.getElementById('cameraView');
        gameVideo.srcObject = cameraStream;
        
        // Update UI
        document.getElementById('playerNameDisplay').innerText = playerName;
        document.getElementById('tagId').innerText = playerTagId;
        document.getElementById('shootBtn').disabled = false;
        document.getElementById('reloadBtn').disabled = false;
        
        showMessage(`✅ Calibrated! Tag ID: ${playerTagId}`, 'success');
        
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
    healthCount -= 25;
    updateStats();
    
    showMessage(`💥 HIT by ${data.shooter_id}!`, 'error');
    
    // Flash screen red
    document.getElementById('cameraView').style.filter = 'hue-rotate(90deg) brightness(0.7)';
    setTimeout(() => {
        document.getElementById('cameraView').style.filter = 'none';
    }, 500);
    
    if (healthCount <= 0) {
        document.getElementById('shootBtn').disabled = true;
        document.getElementById('cameraView').style.filter = 'grayscale(100%) brightness(0.5)';
        showMessage('💀 YOU ARE ELIMINATED!', 'error');
    }
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