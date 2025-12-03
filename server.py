from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Allow requests from your HTML page

@app.route('/shoot', methods=['POST'])
def shoot():
    """
    This function is called when the SHOOT button is pressed.
    Add your custom Python code here!
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print(f"🎯 SHOT FIRED at {timestamp}")
    
    # Add your custom code here
    # Examples:
    # - Control hardware (LED, servo, relay)
    # - Save to database
    # - Send notification
    # - Process image
    # - Run ML model
    
    return jsonify({
        "status": "success",
        "message": "Shot fired!",
        "timestamp": timestamp
    })

if __name__ == '__main__':
    print("🚀 Laser Tag Server Starting...")
    print("📡 Server running on http://localhost:5000")
    print("Press CTRL+C to stop")
    app.run(host='0.0.0.0', port=5000, debug=True)