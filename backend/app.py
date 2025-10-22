from flask import Flask, jsonify
from flask_cors import CORS
import random, time

app = Flask(__name__)
CORS(app)  # allow frontend to fetch data

@app.route('/api/status')
def flood_status():
    # dummy sensor data (simulate water levels)
    water_level = round(random.uniform(20, 130), 2)
    rainfall = round(random.uniform(0, 10), 2)
    temperature = round(random.uniform(20, 34), 1)

    # simple threshold logic
    if water_level > 100:
        status = "🚨 FLOOD RISK"
    elif water_level > 70:
        status = "⚠️ Warning"
    else:
        status = "✅ Safe"

    return jsonify({
        "station": "ST-1",
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
        "water_level": water_level,
        "rainfall": rainfall,
        "temperature": temperature,
        "status": status
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
