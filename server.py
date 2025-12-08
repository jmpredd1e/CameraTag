from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import json
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# Store player data
players = {}

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('connect')
def handle_connect():
    """Handle new player connection"""
    player_id = request.sid
    players[player_id] = {
        'id': player_id,
        'ammo': 30,
        'health': 100,
        'name': f'Player_{player_id[:4]}'
    }
    print(f"✅ New player connected: {player_id}")
    print(f"   Total players: {len(players)}")
    
    # Send current player data back
    emit('player_data', players[player_id])
    
    # Broadcast updated player count to all
    emit('player_count', {'count': len(players)}, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    """Handle player disconnection"""
    player_id = request.sid
    if player_id in players:
        print(f"❌ Player disconnected: {player_id}")
        del players[player_id]
        emit('player_count', {'count': len(players)}, broadcast=True)

@socketio.on('shoot')
def handle_shoot(data):
    """Handle shoot button press"""
    player_id = request.sid
    
    if player_id not in players:
        return
    
    player = players[player_id]
    
    # Check if player has ammo
    if player['ammo'] > 0:
        player['ammo'] -= 1
        
        print(f"\n🔫 SHOOT EVENT")
        print(f"   Player: {player['name']}")
        print(f"   Ammo remaining: {player['ammo']}")
        print(f"   Position data: {data.get('position', 'N/A')}")
        
        # Send updated ammo back to shooter
        emit('ammo_update', {'ammo': player['ammo']})
        
        # TODO: Add your CV code here to check if target was hit
        # For now, simulate hit detection
        # hit_detected = check_qr_code_in_view(data)
        
        # Broadcast shoot event to all players (for game sync)
        emit('player_shot', {
            'shooter': player['name'],
            'ammo': player['ammo']
        }, broadcast=True)
    else:
        print(f"⚠️  {player['name']} out of ammo!")
        emit('out_of_ammo', {'message': 'Reload!'})

@socketio.on('reload')
def handle_reload(data):
    """Handle reload action"""
    player_id = request.sid
    if player_id in players:
        players[player_id]['ammo'] = 30
        print(f"🔄 {players[player_id]['name']} reloaded")
        emit('ammo_update', {'ammo': 30})

@socketio.on('register_player')
def handle_register(data):
    """Register player with custom name"""
    player_id = request.sid
    if player_id in players:
        players[player_id]['name'] = data.get('name', players[player_id]['name'])
        print(f"📝 Player registered: {players[player_id]['name']}")
        emit('player_data', players[player_id])

if __name__ == '__main__':
    print("🚀 Laser Tag Server Starting...")
    print("📱 Connect from your phone at: http://<your-ip>:5000")
    socketio.run(app, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))