import eventlet
eventlet.monkey_patch()
import os
import time
import joblib
import pandas as pd
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from datetime import datetime
import numpy as np
import requests
import time
import random
import json

# LOCATION_API_URL = "http://ip-api.com/json"

HARDCODED_ELEVATION_M = 120.5  # Example: 120.5 meters
HARDCODED_LAND_COVER = "Urban"  # Example: "Urban" or "Agricultural"
HARDCODED_SOIL_TYPE = "Loam"
HARDCODED_LATITUDE = 25.4922    # MNNIT Main Gate Latitude
HARDCODED_LONGITUDE = 81.8680   # MNNIT Main Gate Longitude

def send_remaining_data():

    # This data is now safe to be converted with float()
    data = {
        'elevation_m': HARDCODED_ELEVATION_M,
        'landCover': HARDCODED_LAND_COVER,
        'soilType': HARDCODED_SOIL_TYPE,
        'latitude': HARDCODED_LATITUDE,
        'longitude': HARDCODED_LONGITUDE
    }
    
    print(f"Sending additional data: {data}")
    return data
# --- Configuration & Model Loading ---
app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), "static"), static_url_path="")
CORS(app, origins=['*'])  
socketio = SocketIO(app, cors_allowed_origins="*")

MODEL_FILENAME = os.path.join(os.path.dirname(__file__), 'model.pkl')
model = None

try:
    if os.path.exists(MODEL_FILENAME):
        model = joblib.load(MODEL_FILENAME)
        print(f"--- Model '{MODEL_FILENAME}' loaded successfully ---")
    else:
        print(f"!!! ERROR: Model file '{MODEL_FILENAME}' not found. !!!")
except Exception as e:
    print(f"!!! An error occurred loading the model: {e} !!!")

# --- Socket.IO Event Handlers ---
@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')
    emit('message', {'status': 'Connected to server'})

@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')

# --- HTTP Route for IoT Device ---
@app.route('/update-sensors', methods=['POST'])
def update_from_iot_device():
    print("--- /update-sensors called ---")
    if model is None:
        return jsonify({'error': 'Model is not loaded on server.'}), 500

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided.'}), 400
        rem_data = send_remaining_data()
        data.update(rem_data)
        print(f"Received data: {data}")
        # --- 1. Extract Features from Sensor ---
        sensor_data = {
            'latitude': float(data['latitude']),
            'longitude': float(data['longitude']),
            'rainfall_mm': float(data['rainfall_mm']),
            'temperature_c': float(data['temperature_c']),
            'humidity_percent': float(data['humidity_percent']),
            'discharge_m3s': float(data['discharge_m3s']),
            'waterLevel_m': float(data['waterLevel_m']),
            'elevation_m': float(data['elevation_m']),
            'landCover': str(data['landCover']),
            'soilType': str(data['soilType']),
        }

        # --- 2. Prepare Data for Model ---
        model_input_data = {
            'Latitude': sensor_data['latitude'],
            'Longitude': sensor_data['longitude'],
            'Rainfall (mm)': sensor_data['rainfall_mm'],
            'Temperature (°C)': sensor_data['temperature_c'],
            'Humidity (%)': sensor_data['humidity_percent'],
            'River Discharge (m³/s)': sensor_data['discharge_m3s'],
            'Water Level (m)': sensor_data['waterLevel_m'],
            'Elevation (m)': sensor_data['elevation_m'],
            'Land Cover': sensor_data['landCover'],
            'Soil Type': sensor_data['soilType'],
        }

        feature_order = [
            'Latitude', 'Longitude', 'Rainfall (mm)', 'Temperature (°C)',
            'Humidity (%)', 'River Discharge (m³/s)', 'Water Level (m)',
            'Elevation (m)', 'Land Cover', 'Soil Type'
        ]
        
        input_df = pd.DataFrame([model_input_data], columns=feature_order)

        # --- 3. Make Prediction ---
        prediction_val = model.predict(input_df)[0]
        probability_matrix = model.predict_proba(input_df)
        class_1_index = np.where(model.classes_ == 1)[0][0]
        flood_probability = float(probability_matrix[0][class_1_index])

        prediction_result = {
            'prediction': int(prediction_val),
            'flood_probability': round(flood_probability, 4),
            'message': 'Flood Likely' if int(prediction_val) == 1 else 'No Flood Likely'
        }

        # --- 4. Broadcast Data via Socket.IO ---
        broadcast_data = {
            **sensor_data,
            'prediction': prediction_result,
            'last_updated': datetime.utcnow().isoformat() + 'Z'
        }

        socketio.emit('sensorUpdate', broadcast_data)

        return jsonify({'status': 'success', 'message': 'Data received and broadcasted.'}), 200

    except KeyError as e:
        return jsonify({'error': f'Missing expected data key: {e}. Check sensor_simulator.py.'}), 400
    except Exception as e:
        print(f"!!! Error in /update-sensors: {e} !!!")
        return jsonify({'error': f'An internal server error occurred: {str(e)}'}), 500

# --- Serve Frontend Static Files ---

# Root route → serves index.html
@app.route('/')
def index():
    index_path = os.path.join(app.static_folder, 'index.html')
    if os.path.exists(index_path):
        return send_from_directory(app.static_folder, 'index.html')
    return {"error": "index.html not found"}, 404

# Favicon route
@app.route('/favicon.ico')
def favicon():
    favicon_path = os.path.join(app.static_folder, 'favicon.ico')
    if os.path.exists(favicon_path):
        return send_from_directory(app.static_folder, 'favicon.ico')
    return '', 204  # No Content if favicon missing

# Static file route
@app.route('/<path:path>')
def serve_static_files(path):
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    return {"error": "File not found"}, 404

# --- Run the App ---
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    if os.environ.get('RENDER'):
        # Production on Render
        socketio.run(app, host='0.0.0.0', port=port)
    else:
        # Development
        socketio.run(app, debug=True, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)
