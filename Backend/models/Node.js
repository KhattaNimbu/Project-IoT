// models/Node.js
const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema({
  nodeId: {
    type: String,
    required: true,
    unique: true
  },
  name: String,            // human-readable label
  location: {
    lat: Number,
    lng: Number
  },
  description: String,
  lastSeen: Date,
  lastAQI: Number,
  lastCategory: String
});

module.exports = mongoose.model('Node', NodeSchema);
