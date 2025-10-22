import React, { useEffect, useState } from 'react'

export default function App() {
  const [data, setData] = useState(null)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/status') // proxy sends to Flask
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3000) // refresh every 3s
    return () => clearInterval(interval)
  }, [])

  if (!data) return <div style={{padding:20}}>Loading...</div>

  const { station, timestamp, water_level, rainfall, temperature, status } = data

  return (
    <div style={{fontFamily:'Arial', padding:20}}>
      <h1>Flood Detection Dashboard</h1>

      <div style={{display:'flex', gap:20, marginTop:20}}>
        <div style={{border:'1px solid #ddd', padding:12, width:200}}>
          <h3>Station</h3>
          <p>{station}</p>
          <p><strong>Time:</strong> {timestamp}</p>
        </div>

        <div style={{border:'1px solid #ddd', padding:12, width:200}}>
          <h3>Water Level</h3>
          <p style={{fontSize:24}}>{water_level} cm</p>
        </div>

        <div style={{border:'1px solid #ddd', padding:12, width:200}}>
          <h3>Rainfall</h3>
          <p>{rainfall} mm</p>
          <h3>Temperature</h3>
          <p>{temperature} °C</p>
        </div>
      </div>

      <div style={{
        marginTop:20,
        padding:12,
        borderRadius:6,
        background: status.includes('FLOOD') ? '#ffe6e6' : status.includes('Warning') ? '#fff0b3' : '#e6ffe6'
      }}>
        <strong>Status: </strong>{status}
      </div>
    </div>
  )
}
