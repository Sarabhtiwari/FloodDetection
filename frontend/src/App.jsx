import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

// --- Configuration ---
// Connect to the Flask-SocketIO server
// Make sure this matches the port in app_socket.py
const SOCKET_URL = process.env.NODE_ENV === "production"
  ? process.env.REACT_APP_BACKEND_URL
  : "http://localhost:5000";

// This is the initial state for the dashboard, using the correct simple keys
const defaultData = {
  latitude: "--",
  longitude: "--",
  rainfall_mm: "--",
  temperature_c: "--",
  humidity_percent: "--",
  discharge_m3s: "--", // Added the missing key
  waterLevel_m: "--",
  elevation_m: "--",
  landCover: "--",
  soilType: "--",
  last_updated: "--",
  prediction: {
    message: "Waiting for first data update...",
    flood_probability: null,
  },
};

// --- Main App Component ---
export default function App() {
  const [data, setData] = useState(defaultData);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Create socket instance
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    // --- Socket Event Listeners ---
    socket.on("connect", () => {
      setConnected(true);
      console.info("Socket connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      setConnected(false);
      console.warn("Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connect error:", err.message);
    });

    // This is the most important listener.
    // It updates the dashboard when the 'sensorUpdate' event is received.
    socket.on("sensorUpdate", (payload) => {
      if (payload && typeof payload === "object") {
        console.log("Received sensorUpdate:", payload);
        // The payload from the server directly becomes the new data
        // We update state, falling back to previous state for any missing keys
        setData(prevData => ({
          ...prevData, // Keep old values
          ...payload  // Overwrite with new payload
        }));
      }
    });

    // --- Cleanup ---
    // Disconnect the socket when the component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // --- UI Helper Functions ---

  // Formats the timestamp
  const formatTimestamp = (isoString) => {
    if (!isoString || isoString === "--") return "--";
    try {
      return new Date(isoString).toLocaleString();
    } catch (e) {
      return isoString;
    }
  };

  // Dynamically set background color based on prediction
  const getBgColor = (message) => {
    const msg = String(message).toLowerCase();
    if (msg.includes("flood")) return "bg-red-100";
    if (msg.includes("no flood")) return "bg-green-100";
    return "bg-gray-100";
  };

  const predMessage = data.prediction?.message || "No prediction";
  const predProbability = data.prediction?.flood_probability;

  // --- Render ---
  return (
    <div
      className={`min-h-screen ${getBgColor(
        predMessage
      )} p-4 md:p-8 transition-colors duration-500 font-sans`}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Live Flood Risk Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Status:</span>
            <span
              className={`font-semibold ${
                connected ? "text-green-600" : "text-red-600"
              }`}
            >
              {connected ? "Connected" : "Disconnected"}
            </span>
            <div
              className={`w-3 h-3 rounded-full ${
                connected ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
          </div>
        </header>

        {/* Subheader */}
        <p className="text-gray-600 mb-6">
          Automatically updating with latest sensor data and predictions.
        </p>

        {/* Main Content: Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Live Data */}
          <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Live Data
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* ---
              FIX: Using the correct simple keys from the payload
              (e.g., data.rainfall_mm instead of data.Rainfall)
              --- */}
              <Metric title="Rainfall (mm)" value={data.rainfall_mm} />
              <Metric title="Temperature (°C)" value={data.temperature_c} />
              <Metric title="Humidity (%)" value={data.humidity_percent} />
              <Metric
                title="River Discharge (m³/s)"
                value={data.discharge_m3s}
              />
              <Metric title="Water Level (m)" value={data.waterLevel_m} />
              {/* <Metric title="Elevation (m)" value={data.elevation_m} /> */}
              {/* <Metric title="Land Cover" value={data.landCover} /> */}
              {/* <Metric title="Soil Type" value={data.soilType} /> */}
              {/* <Metric title="Latitude" value={data.latitude} /> */}
              {/* <Metric title="Longitude" value={data.longitude} /> */}
            </div>
            <div className="text-sm text-gray-500 mt-6 pt-4 border-t">
              Last Updated:{" "}
              <span className="font-medium">
                {formatTimestamp(data.last_updated)}
              </span>
            </div>
          </div>

          {/* Right Column: Prediction */}
          <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-lg flex flex-col items-center justify-center">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Prediction
            </h2>
            <div
              className={`text-3xl font-bold mb-4 ${
                String(predMessage).toLowerCase().includes("flood")
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {predMessage}
            </div>
            {predProbability !== null &&
              !isNaN(predProbability) && (
                <div className="text-lg text-gray-600">
                  Flood Probability:
                  <span className="font-bold ml-2">
                    {(predProbability * 100).toFixed(1)}%
                  </span>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-component for displaying a single metric ---
function Metric({ title, value }) {
  // Format numbers to 2 decimal places, but show strings as-is
  const formattedValue =
    typeof value === "number" ? value.toFixed(2) : value || "--";

  return (
    <div className="bg-gray-50 p-4 rounded-md shadow-sm">
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="text-2xl font-bold text-gray-800 mt-1">
        {formattedValue}
      </div>
    </div>
  );
}

