// ========== Global Variables ==========
let socket;
let cameraStream = null;
let playerData = { 
    ammo: 30, 
    health: 100, 
    name: 'Player',
    hits: 0,
    shots_fired: 0
};

// ========== Screen Management ==========
const welcomeScreen = document.getElementById('welcomeScreen');
const gameScreen = document.getElementById('gameScreen');
const playerNameSetup = document.getElementById('playerNameSetup');
const requestCameraBtn = document.getElementById('requestCameraBtn');

// ========== Game Screen Elements ==========
const shootBtn = document.getElementById('shootBtn');
const reloadBtn = document.getElementById('reloadBtn');
const cameraView = document.getElementById('cameraView');
const ammoDisplay = document.getElementById('ammo');
const healthDisplay = document.getElementById('health');
const playerNameDisplay = document.getElementById('playerNameDisplay');
const playerCountDisplay = document.getElementById('playerCount');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const messageArea = document.getElementById('messageArea');
const hitsDisplay = document.getElementById('hits');
const shotsFiredDisplay = document.getElementById('shotsFired');

// ========== Welcome Screen - Camera Permission ==========
requestCameraBtn.addEventListener('click', async () => {
    const playerName = playerNameSetup.value.trim();
    
    if (!playerName) {
        alert('Please enter your name first!');
        return;
    }
    
    try {
        // Request camera access
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment', // Use back camera on mobile
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        // Camera access granted - switch to game screen
        playerData.name = playerName;
        welcomeScreen.classList.remove('active');
        gameScreen.classList.add('active');
        
        // Setup camera view
        cameraView.srcObject = cameraStream;
        
        // Connect to server
        initializeSocket();
        
    } catch (error) {
        console.error('Camera access error:', error);
        
        if (error.name === 'NotAllowedError') {
            alert('Camera access denied. Please allow camera access in your browser settings and refresh the page.');
        } else if (error.name === 'NotFoundError') {
            alert('No camera found on this device.');
        } else {
            alert('Error accessing camera: ' + error.message);
        }
    }
});

// ========== Socket.IO Connection ==========
function initializeSocket() {
    socket = io();
    
    // Connection events
    socket.on('connect', () => {
        console.log('✅ Connected to server');
        statusDot.className = 'status-dot';
        statusText.textContent = 'Connected';
        shootBtn.disabled = false;
        reloadBtn.disabled = false;
        showMessage('Connected to game server!', '#4ecca3');
        
        // Register player name
        socket.emit('register_player', { name: playerData.name });
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Disconnected';
        shootBtn.disabled = true;
        reloadBtn.disabled = true;
        showMessage('Lost connection to server', '#ff4b2b');
    });
    
    // Receive player data
    socket.on('player_data', (data) => {
        playerData = data;
        updateUI();
    });
    
    // Update ammo
    socket.on('ammo_update', (data) => {
        playerData.ammo = data.ammo;
        if (data.shots_fired !== undefined) {
            playerData.shots_fired = data.shots_fired;
        }
        updateUI();
    });
    
    // Update player count
    socket.on('player_count', (data) => {
        playerCountDisplay.textContent = data.count;
    });
    
    // Out of ammo
    socket.on('out_of_ammo', (data) => {
        showMessage('⚠️ Out of Ammo! Reload!', '#ff4b2b');
        vibrate([200, 100, 200]);
    });
    
    // Player shot event
    socket.on('player_shot', (data) => {
        if (data.shooter !== playerData.name) {
            showMessage(`${data.shooter} fired!`, '#ffaa00');
        }
    });
    
    // Hit confirmed (you hit someone)
    socket.on('hit_confirmed', (data) => {
        showMessage(`💥 HIT! You tagged ${data.target}!`, '#4ecca3');
        playerData.hits = data.your_hits;
        hitsDisplay.textContent = data.your_hits;
        vibrate([100, 50, 100, 50, 100]);
    });
    
    // You were hit
    socket.on('you_were_hit', (data) => {
        showMessage(`❌ Tagged by ${data.shooter}!`, '#ff4b2b');
        playerData.health = data.your_health;
        healthDisplay.textContent = data.your_health;
        vibrate([500]);
        
        // Flash screen red
        document.body.style.background = 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)';
        setTimeout(() => {
            document.body.style.background = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';
        }, 300);
    });
    
    // Hit event (broadcast to all)
    socket.on('hit_event', (data) => {
        if (data.shooter !== playerData.name && data.target !== playerData.name) {
            showMessage(`${data.shooter} tagged ${data.target}!`, '#ffaa00');
        }
    });
    
    // Player eliminated
    socket.on('player_eliminated', (data) => {
        showMessage(`☠️ ${data.name} was eliminated by ${data.eliminated_by}!`, '#ff4b2b');
    });
}

// ========== Shoot Button ==========
shootBtn.addEventListener('click', () => {
    if (playerData.ammo > 0) {
        // Get camera frame (for future CV detection)
        const canvas = document.createElement('canvas');
        canvas.width = cameraView.videoWidth;
        canvas.height = cameraView.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(cameraView, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Send shoot event to server
        socket.emit('shoot', {
            timestamp: Date.now(),
            camera_frame: imageData, // Send camera frame for CV detection
            position: 'TODO: GPS/location data'
        });
        
        // Visual feedback
        shootBtn.style.transform = 'scale(0.95)';
        setTimeout(() => shootBtn.style.transform = '', 100);
        
        // Haptic feedback
        vibrate(50);
    }
});

// ========== Reload Button ==========
reloadBtn.addEventListener('click', () => {
    socket.emit('reload', {});
    showMessage('🔄 Reloading...', '#4ecca3');
    vibrate([100, 50, 100]);
});

// ========== Helper Functions ==========
function updateUI() {
    ammoDisplay.textContent = playerData.ammo;
    healthDisplay.textContent = playerData.health;
    playerNameDisplay.textContent = playerData.name;
    hitsDisplay.textContent = playerData.hits || 0;
    shotsFiredDisplay.textContent = playerData.shots_fired || 0;
}

function showMessage(text, color) {
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = text;
    msg.style.borderLeft = `4px solid ${color}`;
    messageArea.insertBefore(msg, messageArea.firstChild);
    
    // Remove old messages if too many
    while (messageArea.children.length > 5) {
        messageArea.lastChild.remove();
    }
    
    setTimeout(() => {
        msg.style.opacity = '0';
        setTimeout(() => msg.remove(), 300);
    }, 3000);
}

function vibrate(pattern) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

// ========== Cleanup on page unload ==========
window.addEventListener('beforeunload', () => {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    if (socket) {
        socket.disconnect();
    }
});

// ========== Prevent zoom on iOS ==========
document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);