// utils/aqiCalculator.js
//
// Three-pollutant AQI calculation:
//   1. PM2.5 sub-index  — from GP2Y1010AU0F dust sensor  (µg/m³)
//   2. PM10  sub-index  — from GP2Y1010AU0F dust sensor  (µg/m³, estimated)
//   3. Gas sub-index    — from MQ-135 gas sensor          (PPM)
//
// EPA standard rule: final AQI = MAX of all individual sub-indices.
// The pollutant with the highest sub-index "dominates" and sets the category.
//
// SENSOR CORRECTION:
//   The GP2Y1010AU0F is a cheap optical dust sensor that systematically
//   over-reads compared to laboratory reference instruments. A correction
//   factor is applied to bring readings in line with reality.
//
//   The MQ-135 outputs a general "air quality" PPM — NOT pure CO₂.
//   Its breakpoints here are tuned for the actual output range of the
//   MQ-135 in ambient/indoor conditions (typically 10–200 PPM).

// ── Sensor correction factors ─────────────────────────────────────────────────
// GP2Y1010AU0F correction: the sensor over-reads by ~2–3x in typical conditions.
// A factor of 0.40 brings readings in line with co-located reference monitors.
// Adjust this value up if your AQI reads too LOW, or down if too HIGH.
const PM_CORRECTION_FACTOR = 0.40;

// ── PM2.5 breakpoints (EPA standard, 24-hr) ──────────────────────────────────
// Source: EPA AQI Technical Assistance Document, Table 2 (revised 2024)
const PM25_BREAKPOINTS = [
  { cLow: 0.0,   cHigh: 9.0,   iLow: 0,   iHigh: 50,  category: 'Good',                          color: '#00e400' },
  { cLow: 9.1,   cHigh: 35.4,  iLow: 51,  iHigh: 100, category: 'Moderate',                       color: '#ffff00' },
  { cLow: 35.5,  cHigh: 55.4,  iLow: 101, iHigh: 150, category: 'Unhealthy for Sensitive Groups', color: '#ff7e00' },
  { cLow: 55.5,  cHigh: 125.4, iLow: 151, iHigh: 200, category: 'Unhealthy',                      color: '#ff0000' },
  { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300, category: 'Very Unhealthy',                 color: '#8f3f97' },
  { cLow: 225.5, cHigh: 500.4, iLow: 301, iHigh: 500, category: 'Hazardous',                      color: '#7e0023' },
];

// ── PM10 breakpoints (EPA standard, 24-hr) ────────────────────────────────────
// Source: EPA AQI Technical Assistance Document, Table 2
const PM10_BREAKPOINTS = [
  { cLow: 0,     cHigh: 54,   iLow: 0,   iHigh: 50,  category: 'Good',                          color: '#00e400' },
  { cLow: 54.1,  cHigh: 154,  iLow: 51,  iHigh: 100, category: 'Moderate',                       color: '#ffff00' },
  { cLow: 154.1, cHigh: 254,  iLow: 101, iHigh: 150, category: 'Unhealthy for Sensitive Groups', color: '#ff7e00' },
  { cLow: 254.1, cHigh: 354,  iLow: 151, iHigh: 200, category: 'Unhealthy',                      color: '#ff0000' },
  { cLow: 354.1, cHigh: 424,  iLow: 201, iHigh: 300, category: 'Very Unhealthy',                 color: '#8f3f97' },
  { cLow: 424.1, cHigh: 604,  iLow: 301, iHigh: 500, category: 'Hazardous',                      color: '#7e0023' },
];

// ── MQ-135 gas PPM breakpoints ────────────────────────────────────────────────
// The MQ-135 in ambient air reads roughly 10–200+ PPM (NOT CO₂ thousands).
// These breakpoints are calibrated for the actual sensor output range:
//   Clean air   : 10–30 PPM
//   Normal      : 30–60 PPM
//   Moderate    : 60–100 PPM
//   Poor        : 100–200 PPM
//   Very poor   : 200+ PPM
const GAS_BREAKPOINTS = [
  { cLow: 0,     cHigh: 30,   iLow: 0,   iHigh: 50,  category: 'Good',                          color: '#00e400' },
  { cLow: 30.1,  cHigh: 60,   iLow: 51,  iHigh: 100, category: 'Moderate',                       color: '#ffff00' },
  { cLow: 60.1,  cHigh: 100,  iLow: 101, iHigh: 150, category: 'Unhealthy for Sensitive Groups', color: '#ff7e00' },
  { cLow: 100.1, cHigh: 200,  iLow: 151, iHigh: 200, category: 'Unhealthy',                      color: '#ff0000' },
  { cLow: 200.1, cHigh: 400,  iLow: 201, iHigh: 300, category: 'Very Unhealthy',                 color: '#8f3f97' },
  { cLow: 400.1, cHigh: 1000, iLow: 301, iHigh: 500, category: 'Hazardous',                      color: '#7e0023' },
];

// ── AQI category metadata ─────────────────────────────────────────────────────
const CATEGORY_META = {
  'Good':                          { color: '#00e400' },
  'Moderate':                      { color: '#ffff00' },
  'Unhealthy for Sensitive Groups':{ color: '#ff7e00' },
  'Unhealthy':                     { color: '#ff0000' },
  'Very Unhealthy':                { color: '#8f3f97' },
  'Hazardous':                     { color: '#7e0023' },
};

// ── Core interpolation function ───────────────────────────────────────────────
// Applies the EPA linear interpolation formula to any pollutant breakpoint table.
// Returns { subIndex, category, color } or null if value is out of range.
function interpolate(value, breakpoints) {
  if (value < 0) value = 0;

  const bp = breakpoints.find(b => value >= b.cLow && value <= b.cHigh);

  if (!bp) {
    // Above the highest breakpoint — clamp to maximum
    const last = breakpoints[breakpoints.length - 1];
    return { subIndex: last.iHigh, category: last.category, color: last.color };
  }

  // EPA formula: AQI = round( ((Ih - Il) / (Bph - Bpl)) * (Cp - Bpl) + Il )
  const subIndex = Math.round(
    ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (value - bp.cLow) + bp.iLow
  );

  return { subIndex, category: bp.category, color: bp.color };
}

// ── Main exported function ────────────────────────────────────────────────────
/**
 * Calculate AQI from PM2.5, PM10, and MQ-135 gas readings.
 *
 * Applies a correction factor to PM2.5/PM10 values to compensate for
 * the GP2Y1010AU0F sensor's tendency to over-read.
 *
 * @param {number} pm25Raw  - Raw PM2.5 concentration in µg/m³ from GP2Y1010AU0F
 * @param {number} gasPpm   - PPM from MQ-135
 * @param {number} pm10Raw  - Raw PM10 concentration in µg/m³ (often pm2_5 * 1.3)
 *
 * @returns {object} {
 *   aqi               : number  — final AQI (max of all sub-indices)
 *   category           : string  — AQI category name
 *   color              : string  — hex color for the category
 *   pm25SubIndex       : number  — PM2.5 contribution alone
 *   pm10SubIndex       : number  — PM10 contribution alone
 *   gasSubIndex        : number  — gas/MQ-135 contribution alone
 *   dominantPollutant  : string  — which sensor drove the final AQI
 *   correctedPM25      : number  — PM2.5 after correction factor
 *   correctedPM10      : number  — PM10 after correction factor
 * }
 */
function calculateAQI(pm25Raw, gasPpm, pm10Raw) {
  // Sanitise inputs — treat missing/invalid as 0
  const safePM25Raw = (typeof pm25Raw === 'number' && isFinite(pm25Raw) && pm25Raw >= 0) ? pm25Raw : 0;
  const safePM10Raw = (typeof pm10Raw === 'number' && isFinite(pm10Raw) && pm10Raw >= 0) ? pm10Raw : 0;
  const safeGas     = (typeof gasPpm  === 'number' && isFinite(gasPpm)  && gasPpm  >= 0) ? gasPpm  : 0;

  // Apply correction factor to PM readings (GP2Y1010AU0F over-reads)
  // Truncate to 1 decimal place per EPA convention
  const correctedPM25 = Math.round(safePM25Raw * PM_CORRECTION_FACTOR * 10) / 10;
  const correctedPM10 = Math.round(safePM10Raw * PM_CORRECTION_FACTOR * 10) / 10;

  // Calculate each sub-index independently
  const pm25Result = interpolate(correctedPM25, PM25_BREAKPOINTS);
  const pm10Result = interpolate(correctedPM10, PM10_BREAKPOINTS);
  const gasResult  = interpolate(safeGas,       GAS_BREAKPOINTS);

  const pm25SubIndex = pm25Result.subIndex;
  const pm10SubIndex = pm10Result.subIndex;
  const gasSubIndex  = gasResult.subIndex;

  // EPA rule: final AQI = highest individual sub-index
  const finalAQI = Math.max(pm25SubIndex, pm10SubIndex, gasSubIndex);

  // The dominant pollutant determines the category and color
  let dominantPollutant, category, color;
  if (finalAQI === gasSubIndex && gasSubIndex > pm25SubIndex && gasSubIndex > pm10SubIndex) {
    dominantPollutant = 'gas';
    category          = gasResult.category;
    color             = gasResult.color;
  } else if (finalAQI === pm10SubIndex && pm10SubIndex > pm25SubIndex) {
    dominantPollutant = 'pm10';
    category          = pm10Result.category;
    color             = pm10Result.color;
  } else {
    dominantPollutant = 'pm2_5';
    category          = pm25Result.category;
    color             = pm25Result.color;
  }

  return {
    aqi:               finalAQI,
    category,
    color,
    pm25SubIndex,
    pm10SubIndex,
    gasSubIndex,
    dominantPollutant,
    correctedPM25,
    correctedPM10,
  };
}

// ── Health recommendations ────────────────────────────────────────────────────
/**
 * Returns a health recommendation string for a given AQI category.
 */
function getRecommendation(category) {
  const recommendations = {
    'Good':
      'Air quality is satisfactory. Enjoy outdoor activities.',
    'Moderate':
      'Air quality is acceptable. Unusually sensitive individuals should limit prolonged outdoor exertion.',
    'Unhealthy for Sensitive Groups':
      'Members of sensitive groups may experience health effects. General public is not affected.',
    'Unhealthy':
      'Everyone may begin to experience health effects. Sensitive groups should limit outdoor activity.',
    'Very Unhealthy':
      'Health alert: everyone may experience serious health effects. Avoid outdoor activities.',
    'Hazardous':
      'Health warning — emergency conditions. Everyone should avoid all outdoor activities.',
  };
  return recommendations[category] || 'No recommendation available.';
}

module.exports = { calculateAQI, getRecommendation };