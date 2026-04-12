// server.js — Smart Air Quality Monitoring Backend
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const mqtt = require('mqtt');

const Reading = require('./models/Reading');
const Node = require('./models/Node');
const { calculateAQI, getRecommendation } = require('./utils/aqiCalculator');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── MongoDB ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// ─── MQTT ─────────────────────────────────────────────────────────────────────
const mqttOptions = {};
if (process.env.MQTT_USER) {
  mqttOptions.username = process.env.MQTT_USER;
  mqttOptions.password = process.env.MQTT_PASS;
}

const mqttClient = mqtt.connect(process.env.MQTT_BROKER, mqttOptions);

mqttClient.on('connect', () => {
  console.log('MQTT connected to broker');
  // Subscribe to all sensor nodes
  mqttClient.subscribe('sensors/+/data', (err) => {
    if (err) console.error('MQTT subscribe error:', err);
    else console.log('Subscribed to sensors/+/data');
  });
});

mqttClient.on('error', (err) => {
  console.error('MQTT error:', err);
});

mqttClient.on('message', async (topic, message) => {
  // topic format: sensors/NodeX/data
  const parts = topic.split('/');
  const nodeId = parts[1];

  let payload;
  try {
    payload = JSON.parse(message.toString());
  } catch (e) {
    console.error('Invalid JSON from', topic);
    return;
  }

  const { temperature, humidity, pm2_5, pm10, gas } = payload;

  // ── Compute AQI — three-pollutant (PM2.5 + PM10 + MQ-135 gas) ─────────────
  // All sub-indices are calculated independently using EPA linear interpolation.
  // A correction factor is applied to GP2Y1010AU0F PM readings.
  // Final AQI = MAX of all sub-indices (EPA standard — worst pollutant wins).
  const {
    aqi,
    category,
    color,
    pm25SubIndex,
    pm10SubIndex,
    gasSubIndex,
    dominantPollutant,
    correctedPM25,
    correctedPM10,
  } = calculateAQI(parseFloat(pm2_5) || 0, parseFloat(gas) || 0, parseFloat(pm10) || 0);

  const recommendation = getRecommendation(category);

  // ── Save to MongoDB ──────────────────────────────────────────────────────
  try {
    await Reading.create({
      nodeId,
      timestamp: new Date(),
      temperature: parseFloat(temperature),
      humidity: parseFloat(humidity),
      pm2_5: parseFloat(pm2_5),
      pm10: parseFloat(pm10),
      gas: parseFloat(gas),
      aqi,
      aqiCategory: category,
      pm25SubIndex,      // PM2.5 contribution to AQI
      pm10SubIndex,      // PM10 contribution to AQI
      gasSubIndex,       // Gas/MQ-135 contribution to AQI
      dominantPollutant, // which sensor drove the final AQI
      correctedPM25,     // PM2.5 after sensor correction
      correctedPM10,     // PM10 after sensor correction
    });

    // Upsert node document with latest values
    await Node.findOneAndUpdate(
      { nodeId },
      {
        lastSeen: new Date(),
        lastAQI: aqi,
        lastCategory: category
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('DB save error:', err);
  }

  // ── Publish AQI back to node for OLED display ────────────────────────────
  // Include sub-indices so the ESP32/frontend can show breakdown if needed
  const aqiPayload = JSON.stringify({
    aqi,
    category,
    color,
    recommendation,
    pm25SubIndex,
    pm10SubIndex,
    gasSubIndex,
    dominantPollutant,
    correctedPM25,
    correctedPM10,
  });
  mqttClient.publish(`sensors/${nodeId}/aqi`, aqiPayload);

  console.log(
    `[${nodeId}] PM2.5=${pm2_5}→${correctedPM25}µg/m³ (sub=${pm25SubIndex}) | ` +
    `PM10=${pm10}→${correctedPM10}µg/m³ (sub=${pm10SubIndex}) | ` +
    `Gas=${gas}ppm (sub=${gasSubIndex}) | ` +
    `AQI=${aqi} (${category}) dominant=${dominantPollutant}`
  );

  // ── Alert check ─────────────────────────────────────────────────────────
  const threshold = parseInt(process.env.AQI_ALERT_THRESHOLD) || 100;
  if (aqi > threshold) {
    console.warn(`ALERT: ${nodeId} AQI=${aqi} exceeds threshold ${threshold}`);
    // TODO: send email/SMS via nodemailer or Twilio
  }
});

// ─── REST API Routes ──────────────────────────────────────────────────────────

// GET /api/nodes — list all nodes with latest status
app.get('/api/nodes', async (req, res) => {
  try {
    const nodes = await Node.find({});
    res.json(nodes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nodes — add/update a node's metadata
app.post('/api/nodes', async (req, res) => {
  try {
    const { nodeId, name, lat, lng, description } = req.body;
    const node = await Node.findOneAndUpdate(
      { nodeId },
      { name, location: { lat, lng }, description },
      { upsert: true, new: true }
    );
    res.json(node);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nodes/:id/latest — latest reading for one node
app.get('/api/nodes/:id/latest', async (req, res) => {
  try {
    const reading = await Reading
      .findOne({ nodeId: req.params.id })
      .sort({ timestamp: -1 });
    if (!reading) return res.status(404).json({ error: 'No data yet' });
    res.json(reading);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nodes/:id/data?range=24h|7d|30d — historical data
app.get('/api/nodes/:id/data', async (req, res) => {
  try {
    const range = req.query.range || '24h';
    const rangeMap = { '24h': 24, '7d': 168, '30d': 720 };
    const hours = rangeMap[range] || 24;
    const since = new Date(Date.now() - hours * 3600 * 1000);

    const readings = await Reading
      .find({ nodeId: req.params.id, timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .select('timestamp temperature humidity pm2_5 pm10 gas aqi aqiCategory');

    res.json(readings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/summary — all nodes latest reading (for map view)
app.get('/api/summary', async (req, res) => {
  try {
    const nodes = await Node.find({});
    const summary = await Promise.all(nodes.map(async (node) => {
      const latest = await Reading
        .findOne({ nodeId: node.nodeId })
        .sort({ timestamp: -1 })
        .select('pm2_5 temperature humidity aqi aqiCategory timestamp');
      return {
        nodeId: node.nodeId,
        name: node.name,
        location: node.location,
        description: node.description,
        lastSeen: node.lastSeen,
        latest
      };
    }));
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nodes/:id/stats?range=24h — daily/weekly averages
app.get('/api/nodes/:id/stats', async (req, res) => {
  try {
    const range = req.query.range || '7d';
    const rangeMap = { '24h': 24, '7d': 168, '30d': 720 };
    const hours = rangeMap[range] || 168;
    const since = new Date(Date.now() - hours * 3600 * 1000);

    const stats = await Reading.aggregate([
      { $match: { nodeId: req.params.id, timestamp: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
          },
          avgAQI: { $avg: '$aqi' },
          maxAQI: { $max: '$aqi' },
          avgPM25: { $avg: '$pm2_5' },
          avgTemp: { $avg: '$temperature' },
          avgHum: { $avg: '$humidity' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alerts — recent AQI breaches
app.get('/api/alerts', async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) ||
      parseInt(process.env.AQI_ALERT_THRESHOLD) || 100;
    const alerts = await Reading
      .find({ aqi: { $gt: threshold } })
      .sort({ timestamp: -1 })
      .limit(50)
      .select('nodeId timestamp aqi aqiCategory pm2_5');
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});