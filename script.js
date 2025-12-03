const message = document.getElementById("message");

// Check HTTPS requirement
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
      // Fallback to any available camera
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
  } catch (err) {
    message.innerText = `❌ Could not access any camera: ${err.message}`;
  }
}

document.getElementById("startBtn").addEventListener("click", startCamera);

// Shoot button functionality
async function shootLaser() {
  const shootBtn = document.getElementById("shootBtn");
  const originalText = shootBtn.innerText;
  
  try {
    shootBtn.innerText = "FIRING...";
    shootBtn.disabled = true;
    
    const response = await fetch('http://localhost:5000/shoot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('Python response:', data);
    
    // Visual feedback
    message.innerText = "🎯 Shot fired!";
    setTimeout(() => { message.innerText = ""; }, 2000);
    
  } catch (err) {
    console.error('Error calling Python backend:', err);
    message.innerText = "❌ Could not connect to Python server. Make sure server.py is running!";
    setTimeout(() => { message.innerText = ""; }, 3000);
  } finally {
    shootBtn.innerText = originalText;
    shootBtn.disabled = false;
  }
}

document.getElementById("shootBtn").addEventListener("click", shootLaser);