from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

socketio = SocketIO(
    app, 
    cors_allowed_origins="*",
    async_mode='eventlet',
    logger=True,
    engineio_logger=True
)

# Store player data
players = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/health')
def health():
    """Health check endpoint for monitoring"""
    return {'status': 'healthy', 'players': len(players)}

@socketio.on('connect')
def handle_connect():
    """Handle new player connection"""
    player_id = request.sid
    players[player_id] = {
        'id': player_id,
        'ammo': 30,
        'health': 100,
        'name': f'Player_{player_id[:4]}',
        'hits': 0,
        'shots_fired': 0
    }
    print(f"✅ New player connected: {player_id}")
    print(f"   Total players online: {len(players)}")
    
    emit('player_data', players[player_id])
    emit('player_count', {'count': len(players)}, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    """Handle player disconnection"""
    player_id = request.sid
    if player_id in players:
        player_name = players[player_id]['name']
        print(f"❌ Player disconnected: {player_name}")
        del players[player_id]
        
        emit('player_count', {'count': len(players)}, broadcast=True)
        emit('player_left', {'name': player_name}, broadcast=True)

@socketio.on('shoot')
def handle_shoot(data):
    """Handle shoot button press with CV detection"""
    player_id = request.sid
    
    if player_id not in players:
        return
    
    player = players[player_id]
    
    if player['ammo'] > 0:
        player['ammo'] -= 1
        player['shots_fired'] += 1
        
        # Print statement for CV detection testing
        print(f"\n{'='*50}")
        print(f"🔫 SHOT FIRED")
        print(f"   Player: {player['name']}")
        print(f"   Ammo remaining: {player['ammo']}")
        print(f"   Total shots fired: {player['shots_fired']}")
        print(f"   Timestamp: {data.get('timestamp', 'N/A')}")
        print(f"{'='*50}\n")
        
        # TODO: Add your CV detection code here
        # Example:
        # from cv_detection import check_qr_code
        # camera_frame = data.get('camera_frame')
        # hit_result = check_qr_code(camera_frame, player_id)
        # if hit_result['hit']:
        #     handle_hit({'target_id': hit_result['target_id']})
        
        emit('ammo_update', {
            'ammo': player['ammo'],
            'shots_fired': player['shots_fired']
        })
        
        emit('player_shot', {
            'shooter': player['name'],
            'shooter_id': player_id,
            'ammo': player['ammo']
        }, broadcast=True)
        
    else:
        print(f"⚠️  {player['name']} out of ammo!")
        emit('out_of_ammo', {'message': 'Reload needed!'})

@socketio.on('reload')
def handle_reload(data=None):
    """Handle reload action - Fixed to accept optional data parameter"""
    player_id = request.sid
    if player_id in players:
        players[player_id]['ammo'] = 30
        print(f"🔄 {players[player_id]['name']} reloaded")
        emit('ammo_update', {
            'ammo': 30,
            'shots_fired': players[player_id]['shots_fired']
        })
        emit('player_reloaded', {
            'name': players[player_id]['name']
        }, broadcast=True)

@socketio.on('register_player')
def handle_register(data):
    """Register player with custom name"""
    player_id = request.sid
    if player_id in players:
        old_name = players[player_id]['name']
        new_name = data.get('name', old_name)
        players[player_id]['name'] = new_name
        
        print(f"📝 Player registered: {new_name}")
        
        emit('player_data', players[player_id])
        emit('player_renamed', {
            'old_name': old_name,
            'new_name': new_name
        }, broadcast=True)

@socketio.on('hit_detected')
def handle_hit(data):
    """Handle when a player successfully hits another player"""
    shooter_id = request.sid
    target_id = data.get('target_id')
    
    if shooter_id in players and target_id in players:
        shooter = players[shooter_id]
        target = players[target_id]
        
        shooter['hits'] += 1
        target['health'] -= 10
        
        print(f"\n💥 HIT CONFIRMED!")
        print(f"   Shooter: {shooter['name']}")
        print(f"   Target: {target['name']}")
        print(f"   Target health: {target['health']}")
        
        emit('hit_confirmed', {
            'target': target['name'],
            'your_hits': shooter['hits']
        }, room=shooter_id)
        
        emit('you_were_hit', {
            'shooter': shooter['name'],
            'your_health': target['health']
        }, room=target_id)
        
        emit('hit_event', {
            'shooter': shooter['name'],
            'target': target['name'],
            'target_health': target['health']
        }, broadcast=True)
        
        if target['health'] <= 0:
            emit('player_eliminated', {
                'name': target['name'],
                'eliminated_by': shooter['name']
            }, broadcast=True)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    
    print(f"🚀 Laser Tag Server Starting...")
    print(f"📡 Port: {port}")
    print(f"🌐 Environment: {'Production' if os.environ.get('PORT') else 'Development'}")
    
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=os.environ.get('FLASK_DEBUG', 'False') == 'True'
    )