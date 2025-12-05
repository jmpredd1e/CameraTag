const message = document.getElementById("message");

// ⚠️ IMPORTANT: Replace with your computer's local IP address
// Find it by running: ipconfig (Windows) or ifconfig (Mac/Linux)
// Example: 'http://192.168.1.100:5000'
const SERVER_URL = 'http://10.202.3.216:5000';

let socket = null;
let localShotCount = 0;

// Check HTTPS requirement for camera
if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  message.innerHTML = "⚠️ Camera requires HTTPS.<br>Please use a secure connection or localhost.";
  document.getElementById("startBtn").disabled = true;
}

async function startCamera() {
  // Check if getUserMedia is supported
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    message.innerText = "❌ Camera access is not supported on this device/browser.";
    return;
  }

  // Detect if device is mobile or desktop
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Choose facingMode based on device
  const constraints = isMobile 
    ? { video: { facingMode: { ideal: "environment" } } } // rear camera on phone
    : { video: true }; // default webcam on desktop

  try {
    message.innerText = "📷 Requesting camera access...";
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.getElementById("video");
    video.srcObject = stream;
    video.style.display = "block";
    document.getElementById("crosshair").style.display = "block";
    document.getElementById("startBtn").style.display = "none";
    document.getElementById("shootBtn").style.display = "block";
    message.innerText = "";
    
    // Initialize Socket.IO connection after camera starts
    initializeSocket();
    
  } catch (err) {
    console.error(err);
    
    // Provide specific error messages
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      message.innerText = "❌ Camera permission denied. Please allow camera access in your browser settings.";
    } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      message.innerText = "❌ No camera found on this device.";
    } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
      message.innerText = "❌ Camera is already in use by another app.";
    } else if (err.name === "OverconstrainedError") {
      message.innerText = "❌ Rear camera not available. Trying default camera...";
      setTimeout(() => retryWithDefaultCamera(), 2000);
    } else {
      message.innerText = `❌ Camera error: ${err.message}`;
    }
  }
}

async function retryWithDefaultCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.getElementById("video");
    video.srcObject = stream;
    video.style.display = "block";
    document.getElementById("crosshair").style.display = "block";
    document.getElementById("startBtn").style.display = "none";
    document.getElementById("shootBtn").style.display = "block";
    message.innerText = "";
    
    // Initialize Socket.IO connection after camera starts
    initializeSocket();
    
  } catch (err) {
    message.innerText = `❌ Could not access any camera: ${err.message}`;
  }
}

// Initialize Socket.IO connection
function initializeSocket() {
  // Load Socket.IO client library
  const script = document.createElement('script');
  script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
  script.onload = function() {
    connectToServer();
  };
  document.head.appendChild(script);
}

function connectToServer() {
  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling']
  });
  
  socket.on('connect', function() {
    console.log('✅ Connected to Python server');
  });
  
  socket.on('connection_status', function(data) {
    console.log('Server says:', data.message);
    message.innerText = '🟢 Connected to server';
    setTimeout(() => { message.innerText = ''; }, 2000);
  });
  
  socket.on('shot_confirmed', function(data) {
    console.log('Shot confirmed:', data);
    localShotCount = data.shots_fired;
    message.innerText = `🎯 ${data.message}`;
    setTimeout(() => { message.innerText = ''; }, 1500);
  });
  
  socket.on('reload', function(data) {
    console.log('Reload triggered:', data);
    localShotCount = 0;
    message.innerText = '🔄 RELOAD!';
    setTimeout(() => { message.innerText = ''; }, 3000);
  });
  
  socket.on('disconnect', function() {
    console.log('❌ Disconnected from server');
    message.innerText = '🔴 Disconnected from server';
  });
  
  socket.on('connect_error', function(error) {
    console.error('Connection error:', error);
    message.innerText = '❌ Cannot connect to server. Check SERVER_URL in script.js';
  });
}

document.getElementById("startBtn").addEventListener("click", startCamera);

// Shoot button functionality
function shootLaser() {
  const shootBtn = document.getElementById("shootBtn");
  
  if (!socket || !socket.connected) {
    message.innerText = '❌ Not connected to server!';
    setTimeout(() => { message.innerText = ''; }, 2000);
    return;
  }
  
  // Disable button temporarily to prevent spam
  shootBtn.disabled = true;
  shootBtn.innerText = "FIRING...";
  
  // Send shoot event to Python server
  socket.emit('shoot', { timestamp: new Date().toISOString() });
  
  // Re-enable button after short delay
  setTimeout(() => {
    shootBtn.disabled = false;
    shootBtn.innerText = "SHOOT";
  }, 300);
}

document.getElementById("shootBtn").addEventListener("click", shootLaser);