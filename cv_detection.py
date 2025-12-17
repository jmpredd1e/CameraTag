"""
Computer Vision Detection Module for Laser Tag
This file will eventually contain QR code detection and player hit detection
"""

import base64
import io
from PIL import Image
import numpy as np

def check_qr_code(camera_frame_base64, shooter_id):
    """
    Check if a QR code is detected in the camera frame
    
    Args:
        camera_frame_base64: Base64 encoded image from camera
        shooter_id: ID of the player who shot
        
    Returns:
        dict: {
            'hit': bool,
            'target_id': str or None,
            'confidence': float
        }
    """
    
    # TODO: Implement actual QR code detection here
    # Example using OpenCV and pyzbar:
    # 1. Decode base64 to image
    # 2. Use pyzbar to detect QR codes
    # 3. Match QR code to player IDs
    # 4. Return hit information
    
    print("\n🔍 CV DETECTION CALLED")
    print(f"   Shooter ID: {shooter_id}")
    print(f"   Camera frame received: {len(camera_frame_base64) if camera_frame_base64 else 0} bytes")
    
    # Placeholder return
    return {
        'hit': False,
        'target_id': None,
        'confidence': 0.0
    }

def decode_camera_frame(base64_string):
    """
    Decode base64 camera frame to numpy array
    
    Args:
        base64_string: Base64 encoded image (with or without data URI prefix)
        
    Returns:
        numpy.ndarray: Image as numpy array
    """
    try:
        # Remove data URI prefix if present
        if 'base64,' in base64_string:
            base64_string = base64_string.split('base64,')[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to numpy array
        image_array = np.array(image)
        
        return image_array
    except Exception as e:
        print(f"Error decoding camera frame: {e}")
        return None

def detect_players_in_frame(image_array):
    """
    Detect QR codes in the image frame
    
    Args:
        image_array: numpy array of the image
        
    Returns:
        list: List of detected player IDs
    """
    
    # TODO: Implement QR code detection
    # Example implementation:
    # from pyzbar.pyzbar import decode
    # decoded_objects = decode(image_array)
    # player_ids = [obj.data.decode('utf-8') for obj in decoded_objects]
    # return player_ids
    
    return []

# Example of how to integrate this into server.py:
"""
In server.py, modify handle_shoot():

@socketio.on('shoot')
def handle_shoot(data):
    player_id = request.sid
    
    if player_id not in players:
        return
    
    player = players[player_id]
    
    if player['ammo'] > 0:
        player['ammo'] -= 1
        player['shots_fired'] += 1
        
        print(f"\n🔫 SHOT FIRED")
        print(f"   Player: {player['name']}")
        print(f"   Ammo remaining: {player['ammo']}")
        
        # ADD CV DETECTION HERE:
        camera_frame = data.get('camera_frame')
        if camera_frame:
            from cv_detection import check_qr_code
            hit_result = check_qr_code(camera_frame, player_id)
            
            if hit_result['hit']:
                target_id = hit_result['target_id']
                # Call hit_detected event
                handle_hit({'target_id': target_id})
        
        emit('ammo_update', {
            'ammo': player['ammo'],
            'shots_fired': player['shots_fired']
        })
"""