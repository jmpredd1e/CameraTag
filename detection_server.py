"""
April Tag Detection Server for Laser Tag (Windows-compatible version)
Receives images from phone, detects tags using OpenCV, returns tag IDs
"""

from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import numpy as np
import cv2
import base64
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'laser-tag-secret'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# Initialize April Tag detector using OpenCV
# OpenCV has built-in support for ArUco markers and AprilTag detection
aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11)
aruco_params = cv2.aruco.DetectorParameters()
detector = cv2.aruco.ArucoDetector(aruco_dict, aruco_params)

# Game state
shot_count = 0
connected_clients = 0
player_registry = {}  # Maps player_id to tag_id

@socketio.on('connect')
def handle_connect():
    global connected_clients
    connected_clients += 1
    print(f'✅ Client connected (Total: {connected_clients})')
    emit('connection_status', {'status': 'connected', 'message': 'Connected to server!'})

@socketio.on('disconnect')
def handle_disconnect():
    global connected_clients
    connected_clients -= 1
    print(f'❌ Client disconnected (Total: {connected_clients})')

@socketio.on('detect_tag')
def handle_detect_tag(data):
    """
    Receive image from phone and detect April Tag using OpenCV
    
    Expected data format:
    {
        'image': 'base64_encoded_image_data',
        'player_id': 'player_123'
    }
    """
    try:
        # Decode base64 image
        image_data = data.get('image', '')
        if ',' in image_data:
            image_data = image_data.split(',')[1]  # Remove data URL prefix
        
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            emit('detection_result', {
                'success': False,
                'error': 'Invalid image data'
            })
            return
        
        # Convert to grayscale for better detection
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Detect April Tags using OpenCV's ArUco detector
        corners, ids, rejected = detector.detectMarkers(gray)
        
        if ids is None or len(ids) == 0:
            print("🔍 No tags detected")
            emit('detection_result', {
                'success': False,
                'message': 'No April Tag detected',
                'detections': []
            })
        else:
            # Extract tag information
            tags = []
            for i, tag_id in enumerate(ids):
                # Calculate center of the tag
                corner = corners[i][0]
                center_x = int(corner[:, 0].mean())
                center_y = int(corner[:, 1].mean())
                
                tag_info = {
                    'id': int(tag_id[0]),
                    'center': [center_x, center_y],
                    'corners': corner.tolist()
                }
                tags.append(tag_info)
                print(f"🏷️  Detected Tag ID: {tag_info['id']} at ({center_x}, {center_y})")
            
            emit('detection_result', {
                'success': True,
                'message': f'Detected {len(ids)} tag(s)',
                'detections': tags,
                'timestamp': datetime.now().isoformat()
            })
            
    except Exception as e:
        print(f"❌ Detection error: {e}")
        import traceback
        traceback.print_exc()
        emit('detection_result', {
            'success': False,
            'error': str(e)
        })

@socketio.on('register_player')
def handle_register_player(data):
    """
    Register a player with their April Tag
    
    Expected data:
    {
        'player_id': 'player_123',
        'player_name': 'John',
        'tag_id': 5
    }
    """
    player_id = data.get('player_id')
    player_name = data.get('player_name')
    tag_id = data.get('tag_id')
    
    if not all([player_id, player_name, tag_id is not None]):
        emit('registration_result', {
            'success': False,
            'error': 'Missing required fields'
        })
        return
    
    # Check if tag already registered
    for pid, pdata in player_registry.items():
        if pdata['tag_id'] == tag_id:
            emit('registration_result', {
                'success': False,
                'error': f'Tag {tag_id} already registered to {pdata["name"]}'
            })
            return
    
    # Register player
    player_registry[player_id] = {
        'name': player_name,
        'tag_id': tag_id,
        'alive': True,
        'kills': 0,
        'registered_at': datetime.now().isoformat()
    }
    
    print(f"✅ Registered: {player_name} (Player {player_id}) → Tag {tag_id}")
    
    emit('registration_result', {
        'success': True,
        'message': f'Successfully registered {player_name} with Tag {tag_id}',
        'player_data': player_registry[player_id]
    })
    
    # Broadcast to all clients
    socketio.emit('player_registered', {
        'player_id': player_id,
        'player_name': player_name,
        'tag_id': tag_id
    })

@socketio.on('shoot')
def handle_shoot(data):
    """Handle shoot event - now expects tag_id from detection"""
    global shot_count
    
    player_id = data.get('player_id')
    detected_tag_id = data.get('tag_id')  # Tag that was shot
    
    shot_count += 1
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print(f"🎯 SHOT #{shot_count} by {player_id} at Tag {detected_tag_id} - {timestamp}")
    
    # Check if tag belongs to a player
    hit_player_id = None
    hit_player_name = None
    
    for pid, pdata in player_registry.items():
        if pdata['tag_id'] == detected_tag_id:
            hit_player_id = pid
            hit_player_name = pdata['name']
            
            # Mark player as hit
            if pdata['alive']:
                pdata['alive'] = False
                
                # Update shooter's kills
                if player_id in player_registry:
                    player_registry[player_id]['kills'] += 1
                
                print(f"💀 {hit_player_name} has been eliminated!")
                
                # Notify the hit player
                socketio.emit('player_hit', {
                    'player_id': hit_player_id,
                    'player_name': hit_player_name,
                    'shooter_id': player_id,
                    'timestamp': timestamp
                })
            else:
                print(f"⚠️  {hit_player_name} already eliminated")
            
            break
    
    if hit_player_id:
        emit('shot_confirmed', {
            'message': f'Hit {hit_player_name}!',
            'hit_player': hit_player_name,
            'tag_id': detected_tag_id,
            'timestamp': timestamp
        })
    else:
        emit('shot_confirmed', {
            'message': 'Tag detected but not registered',
            'tag_id': detected_tag_id,
            'timestamp': timestamp
        })
    
    # Check reload (every 3 shots per player)
    # This is simplified - you might want per-player ammo tracking
    if shot_count % 3 == 0:
        print("Reload")
        emit('reload', {
            'message': 'RELOAD!',
            'shots_fired': 3,
            'timestamp': timestamp
        })

@socketio.on('get_game_state')
def handle_get_game_state():
    """Send current game state to client (for admin dashboard)"""
    game_state = {
        'players': player_registry,
        'total_players': len(player_registry),
        'alive_count': sum(1 for p in player_registry.values() if p['alive']),
        'connected_clients': connected_clients,
        'total_shots': shot_count
    }
    emit('game_state', game_state)

@socketio.on('reset_game')
def handle_reset_game():
    """Reset game state - respawn all players"""
    global shot_count
    shot_count = 0
    
    for player_id in player_registry:
        player_registry[player_id]['alive'] = True
        player_registry[player_id]['kills'] = 0
    
    print("🔄 Game reset - all players respawned")
    
    socketio.emit('game_reset', {
        'message': 'Game has been reset',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("=" * 70)
    print("🚀 Laser Tag Detection Server with April Tags (OpenCV)")
    print("=" * 70)
    print("📡 Server running on http://localhost:5000")
    print("🏷️  April Tag detector initialized (DICT_APRILTAG_36h11)")
    print("💻 Using OpenCV ArUco detector (Windows-compatible)")
    print("")
    print("Features:")
    print("  • April Tag detection from phone camera")
    print("  • Player registration with tags")
    print("  • Hit detection and tracking")
    print("  • Game state management")
    print("")
    print("⚠️  Note: Make sure you downloaded tag36h11 April Tags")
    print("   These are different from standard ArUco markers")
    print("")
    print("Press CTRL+C to stop")
    print("=" * 70)
    
    socketio.run(app, 
                host='0.0.0.0', 
                port=5000, 
                debug=True, 
                allow_unsafe_werkzeug=True)