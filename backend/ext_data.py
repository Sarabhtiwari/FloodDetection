import requests
import time
import random
import json
from datetime import datetime

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