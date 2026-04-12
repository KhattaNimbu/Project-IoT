/*
 * Arduino Sensor Node — Smart Air Quality Monitor (CALIBRATED VERSION)
 */

#include <DHT.h>
#include <ArduinoJson.h>

// ── DHT11 ─────────────────────────────────────────────────────────────
#define DHT_PIN       2
#define DHT_TYPE      DHT11
DHT dht(DHT_PIN, DHT_TYPE);

// ── GP2Y1010AU0F (PM2.5) ─────────────────────────────────────────────
#define DUST_LED_PIN  7
#define DUST_VO_PIN   A2

#define DUST_SAMPLING_TIME   280
#define DUST_DELTA_TIME      40
#define DUST_SLEEP_TIME      9680

float dustBaseline = 1.47;   // 🔥 YOUR CALIBRATED VALUE

// ── MQ-135 ───────────────────────────────────────────────────────────
#define MQ135_PIN     A0
#define MQ135_RL      10.0
#define MQ135_R0      16   // replace with your calibrated value later

// ── Timing ───────────────────────────────────────────────────────────
#define SEND_INTERVAL 10000

unsigned long lastSend = 0;

// ── PM2.5 CALIBRATED FUNCTION ────────────────────────────────────────
float readDustDensity() {

  float sum = 0;

  for (int i = 0; i < 15; i++) {

    digitalWrite(DUST_LED_PIN, LOW);
    delayMicroseconds(DUST_SAMPLING_TIME);

    int rawADC = analogRead(DUST_VO_PIN);

    delayMicroseconds(DUST_DELTA_TIME);
    digitalWrite(DUST_LED_PIN, HIGH);
    delayMicroseconds(DUST_SLEEP_TIME);

    float voltage = rawADC * (5.0 / 1023.0);
    sum += voltage;

    delay(20);
  }

  float avgVoltage = sum / 15.0;

  float deltaV = avgVoltage - dustBaseline;
  if (deltaV < 0) deltaV = 0;

  float density = deltaV * 30;   // 🔥 tuned sensitivity
  if (density > 500) density = 500;

  return density;
}

// ── MQ-135 FUNCTION ──────────────────────────────────────────────────
float readMQ135() {
  long sum = 0;

  for (int i = 0; i < 10; i++) {
    sum += analogRead(MQ135_PIN);
    delay(5);
  }

  float raw = sum / 10.0;
  float voltage = raw * (5.0 / 1023.0);

  if (voltage < 0.01) voltage = 0.01;

  float RS    = ((5.0 - voltage) / voltage) * MQ135_RL;
  float ratio = RS / MQ135_R0;

  float ppm = pow(10.0, -0.42 * log10(ratio) + 1.92);

  return ppm;
}

// ── SETUP ────────────────────────────────────────────────────────────
void setup() {

  Serial.begin(9600);

  pinMode(DUST_LED_PIN, OUTPUT);
  digitalWrite(DUST_LED_PIN, HIGH);

  dht.begin();

  delay(2000);
}

// ── LOOP ─────────────────────────────────────────────────────────────
void loop() {

  if (millis() - lastSend >= SEND_INTERVAL) {

    lastSend = millis();

    // DHT11
    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity)) {
      return;
    }

    // Sensors
    float dustDensity = readDustDensity();
    float gasPPM      = readMQ135();

    // JSON
    StaticJsonDocument<200> doc;

    doc["temperature"] = temperature;
    doc["humidity"]    = humidity;
    doc["pm2_5"]       = dustDensity;
    doc["pm10"]        = dustDensity * 1.3;
    doc["gas"]         = gasPPM;

    // Send to ESP32
    serializeJson(doc, Serial);
    Serial.println();
  }
}