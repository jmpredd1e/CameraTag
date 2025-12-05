from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'laser-tag-secret'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

# Game state
shot_count = 0
connected_clients = 0

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

@socketio.on('shoot')
def handle_shoot(data):
    """Handle shoot event from phone"""
    global shot_count
    
    shot_count += 1
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print(f"🎯 SHOT #{shot_count} FIRED at {timestamp}")
    
    # Check if we need to reload
    if shot_count >= 3:
        print("Reload")
        shot_count = 0
        
        # Send reload message back to phone
        emit('reload', {
            'message': 'RELOAD!',
            'shots_fired': 3,
            'timestamp': timestamp
        })
    else:
        # Send shot confirmation back to phone
        emit('shot_confirmed', {
            'message': f'Shot {shot_count} of 3',
            'shots_fired': shot_count,
            'timestamp': timestamp
        })

@socketio.on('reset')
def handle_reset():
    """Reset shot counter"""
    global shot_count
    shot_count = 0
    print("🔄 Counter reset")
    emit('reset_confirmed', {'message': 'Counter reset'})

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Laser Tag Socket.IO Server Starting...")
    print("=" * 50)
    print("📡 Server running on http://0.0.0.0:5000")
    print("📱 Connect from phone using your computer's IP address")
    print("   Example: http://192.168.1.100:5000")
    print("")
    print("To find your IP address:")
    print("  Mac/Linux: ifconfig | grep 'inet '")
    print("  Windows: ipconfig")
    print("")
    print("Press CTRL+C to stop")
    print("=" * 50)
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)