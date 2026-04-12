/*
 * ============================================================
 *  AirSense — ESP32-WROOM-32 MQTT Gateway
 * ============================================================
 *  Reads JSON from Arduino Uno/Mega via UART
 *  Publishes sensor data to MQTT broker over WiFi
 *  Receives computed AQI from Node.js server
 *  Displays AQI + readings on SSD1306 OLED (I2C)
 *
 *  Board setting in Arduino IDE
 *  ─────────────────────────────────────────────────────────
 *  Tools → Board        : "ESP32 Dev Module"
 *  Tools → Upload Speed : 115200
 *  Tools → CPU Freq     : 240 MHz
 *  Tools → Flash Size   : 4MB
 *  Tools → Port         : your COM port
 *
 *  Libraries (Sketch → Include Library → Manage Libraries)
 *  ─────────────────────────────────────────────────────────
 *  PubSubClient     — Nick O'Leary       (MQTT)
 *  ArduinoJson      — Benoit Blanchon    (JSON)
 *  Adafruit SSD1306 — Adafruit           (OLED driver)
 *  Adafruit GFX Library — Adafruit       (OLED graphics)
 *
 *  WROOM-32 WIRING
 *  ─────────────────────────────────────────────────────────
 *  OLED SSD1306
 *    VCC  → ESP32 3.3V   (pin labeled 3V3)
 *    GND  → ESP32 GND
 *    SDA  → GPIO21       (hardware I2C SDA — fixed on WROOM)
 *    SCL  → GPIO22       (hardware I2C SCL — fixed on WROOM)
 *
 *  Arduino → ESP32 Serial link
 *    Arduino TX (pin 1) → 1kΩ resistor → GPIO16
 *                         junction between resistors → 2kΩ → GND
 *    ESP32 GPIO17       → Arduino RX pin 0  (optional)
 *    Arduino GND        → ESP32 GND         (REQUIRED)
 *
 *  IMPORTANT: GPIO6, 7, 8, 9, 10, 11 are RESERVED on WROOM
 *  (connected to internal flash) — never connect anything there.
 *
 *  Power
 *    Power ESP32 and Arduino from SEPARATE USB cables.
 *    They only need to share GND.
 * ============================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ═══════════════════════════════════════════════════════════
//  CONFIGURE THESE BEFORE FLASHING
// ═══════════════════════════════════════════════════════════
#define NODE_ID        "Node1"            // unique ID per board
#define WIFI_SSID      "Wifi (Armaan)"   // your WiFi name
#define WIFI_PASSWORD  "5544332211"   // your WiFi password
#define MQTT_BROKER    "192.168.137.1"    // Windows laptop IP (run ipconfig)
#define MQTT_PORT      1883
// ═══════════════════════════════════════════════════════════

// ── WROOM-32 Pin Assignments ─────────────────────────────────────────────────
//
//  UART2 — receives JSON from Arduino
//  GPIO16 = RX2  (hardware UART2 receive)
//  GPIO17 = TX2  (hardware UART2 transmit — optional)
//
//  NOTE: On ESP32-WROOM, GPIO16 and GPIO17 are safe to use.
//  They are NOT connected to internal flash (unlike GPIO6-11).
//
#define UART_RX_PIN   16    // Arduino TX → voltage divider → this pin
#define UART_TX_PIN   17    // this pin → Arduino RX (optional)
#define UART_BAUD     9600  // must match Arduino Serial.begin() baud rate

//  I2C — OLED display
//  GPIO21 = SDA  (fixed hardware I2C on WROOM — cannot be changed)
//  GPIO22 = SCL  (fixed hardware I2C on WROOM — cannot be changed)
//
#define I2C_SDA       21
#define I2C_SCL       22

// ── OLED ─────────────────────────────────────────────────────────────────────
#define SCREEN_WIDTH   128
#define SCREEN_HEIGHT   64
#define OLED_I2C_ADDR  0x3C   // most SSD1306 modules use 0x3C; try 0x3D if blank

// ── MQTT Topics ───────────────────────────────────────────────────────────────
// These match exactly what the Node.js backend subscribes/publishes to
#define TOPIC_DATA   "sensors/" NODE_ID "/data"   // ESP32 publishes here
#define TOPIC_AQI    "sensors/" NODE_ID "/aqi"    // server replies here

// ── Timing ────────────────────────────────────────────────────────────────────
#define WIFI_TIMEOUT_MS       20000   // max wait for WiFi connection
#define MQTT_RETRY_DELAY_MS    2000   // delay between MQTT reconnect attempts
#define MQTT_MAX_RETRIES          5   // attempts before giving up per cycle
#define AQI_DISPLAY_DURATION  30000   // show AQI screen for 30s, then go back to live readings

// ── Objects ───────────────────────────────────────────────────────────────────
WiFiClient       wifiClient;
PubSubClient     mqttClient(wifiClient);
Adafruit_SSD1306 oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ── Global state ──────────────────────────────────────────────────────────────
String        serialBuffer    = "";     // incoming chars from Arduino
int           lastAQI         = -1;     // latest AQI received from server
String        lastCategory    = "--";   // AQI category string
float         lastTemp        = 0.0f;
float         lastHum         = 0.0f;
bool          showingAQI      = false;
unsigned long lastAQITime     = 0;
unsigned long lastPublishTime = 0;

// ─────────────────────────────────────────────────────────────────────────────
//  OLED DISPLAY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

// Generic status screen — used for boot messages, WiFi status, errors
void oledStatus(const char* line1, const char* line2 = "") {
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);
  oled.setTextSize(1);

  oled.setCursor(0, 0);
  oled.print(NODE_ID);

  oled.drawFastHLine(0, 12, 128, SSD1306_WHITE); // FIXED

  oled.setCursor(0, 16); // FIXED
  oled.println(line1);

  oled.setCursor(0, 28);
  oled.println(line2);

  oled.display();
}

// Live sensor readings screen — shown while waiting for AQI reply
void oledShowReadings(float temp, float hum, float dust, float gas) {
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);
  oled.setTextSize(1);

  oled.setCursor(0, 0);
  oled.print(NODE_ID);
  oled.print(" [live]");

  oled.drawFastHLine(0, 12, 128, SSD1306_WHITE); // FIXED

  oled.setCursor(0, 16); // 🔥 MAIN FIX (was 13)
  oled.print("T: ");  oled.print(temp, 1); oled.println(" C");
  oled.print("H: ");  oled.print(hum,  1); oled.println(" %");
  oled.print("PM: "); oled.print(dust, 0); oled.println(" ug/m3");
  oled.print("Gas:"); oled.print(gas,  0); oled.println(" ppm");

  oled.setCursor(88, 56);
  oled.print(WiFi.status() == WL_CONNECTED ? "W:OK" : "W:--");

  oled.setCursor(110, 56);
  oled.print(mqttClient.connected() ? "M:OK" : "M:--");

  oled.display();
}

// AQI result screen — shown after server sends back the computed AQI
void oledShowAQI() {
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);

  oled.setTextSize(1);
  oled.setCursor(0, 0);
  oled.print(NODE_ID);

  oled.drawFastHLine(0, 12, 128, SSD1306_WHITE); // FIXED

  oled.setTextSize(3);
  oled.setCursor(0, 16); // FIXED
  oled.print("AQI");

  oled.setTextSize(2);
  String aqiStr = String(lastAQI);
  int aqiX = 128 - (aqiStr.length() * 12);
  oled.setCursor(max(60, aqiX), 18); // slight adjust
  oled.print(aqiStr);

  oled.setTextSize(1);
  oled.setCursor(0, 40); // adjusted
  oled.println(lastCategory.substring(0, 21));

  oled.setCursor(0, 52);
  oled.print("T:");
  oled.print(lastTemp, 1);
  oled.print("C  H:");
  oled.print(lastHum,  0);
  oled.print("%");

  int barWidth = (lastAQI > 0) ? map(constrain(lastAQI, 0, 500), 0, 500, 0, 122) : 0;
  oled.drawRect(0, 58, 122, 5, SSD1306_WHITE);
  oled.fillRect(0, 58, barWidth, 5, SSD1306_WHITE);

  oled.display();
}

// ─────────────────────────────────────────────────────────────────────────────
//  WiFi
// ─────────────────────────────────────────────────────────────────────────────
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  oledStatus("Connecting WiFi...", WIFI_SSID);
  Serial.printf("[WiFi] Connecting to %s\n", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(300);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected — IP: %s\n", WiFi.localIP().toString().c_str());
    oledStatus("WiFi Connected!", WiFi.localIP().toString().c_str());
    delay(1200);
  } else {
    Serial.println("\n[WiFi] FAILED — will retry in loop");
    oledStatus("WiFi FAILED", "retrying...");
    delay(1000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  MQTT
// ─────────────────────────────────────────────────────────────────────────────

// Called when broker pushes a message to subscribed topic
void onMQTTMessage(char* topic, byte* payload, unsigned int length) {
  // Build string from raw bytes
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  Serial.printf("[MQTT] Received on %s: %s\n", topic, msg.c_str());

  // Parse the AQI reply JSON from server
  // Expected: {"aqi":87,"category":"Moderate","color":"#ffff00","recommendation":"..."}
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, msg);
  if (err) {
    Serial.printf("[MQTT] JSON parse error: %s\n", err.c_str());
    return;
  }

  lastAQI      = doc["aqi"]      | -1;
  lastCategory = (const char*)(doc["category"] | "--");
  showingAQI   = true;
  lastAQITime  = millis();

  Serial.printf("[MQTT] AQI=%d  Category=%s\n", lastAQI, lastCategory.c_str());
  oledShowAQI();
}

void reconnectMQTT() {
  if (mqttClient.connected()) return;
  if (WiFi.status() != WL_CONNECTED) return;  // no point trying without WiFi

  oledStatus("Connecting MQTT...", MQTT_BROKER);

  for (int attempt = 0; attempt < MQTT_MAX_RETRIES && !mqttClient.connected(); attempt++) {
    Serial.printf("[MQTT] Attempt %d — broker: %s:%d\n", attempt + 1, MQTT_BROKER, MQTT_PORT);

    // Client ID must be unique — NODE_ID + chip ID suffix
    String clientId = "ESP32-WROOM-";
    clientId += NODE_ID;
    clientId += "-";
    clientId += String((uint32_t)ESP.getEfuseMac(), HEX);  // unique per chip

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("[MQTT] Connected!");

      // Subscribe to the AQI reply topic
      if (mqttClient.subscribe(TOPIC_AQI)) {
        Serial.printf("[MQTT] Subscribed to: %s\n", TOPIC_AQI);
      }
      oledStatus("MQTT Connected!", TOPIC_AQI);
      delay(600);

    } else {
      Serial.printf("[MQTT] Failed, rc=%d — retrying in %d ms\n",
                    mqttClient.state(), MQTT_RETRY_DELAY_MS);
      delay(MQTT_RETRY_DELAY_MS);
    }
  }
}

// Publish one JSON payload to the MQTT broker
void publishSensorData(float temp, float hum, float dust, float pm10, float gas) {
  if (!mqttClient.connected()) return;

  // Build outgoing JSON — field names MUST match what server.js expects:
  // { nodeId, temperature, humidity, pm2_5, pm10, gas }
  StaticJsonDocument<256> doc;
  doc["nodeId"]      = NODE_ID;
  doc["temperature"] = serialized(String(temp, 1));
  doc["humidity"]    = serialized(String(hum,  1));
  doc["pm2_5"]       = serialized(String(dust, 1));
  doc["pm10"]        = serialized(String(pm10, 1));
  doc["gas"]         = serialized(String(gas,  1));

  char payload[256];
  serializeJson(doc, payload);

  bool ok = mqttClient.publish(TOPIC_DATA, payload);
  Serial.printf("[MQTT] Publish %s: %s\n", ok ? "OK" : "FAIL", payload);
}

// ─────────────────────────────────────────────────────────────────────────────
//  SERIAL DATA FROM ARDUINO
// ─────────────────────────────────────────────────────────────────────────────

// Process one complete JSON line received from Arduino
// Arduino sends: {"temperature":"27.3","humidity":"55.0","pm2_5":"42.1","pm10":"54.7","gas":"418.2"}
void processArduinoLine(String line) {
  line.trim();

  // Ignore empty or suspiciously short lines (status messages, garbage)
  if (line.length() < 15) return;
  if (!line.startsWith("{")) return;

  Serial.printf("[Arduino] Received: %s\n", line.c_str());

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, line);
  if (err) {
    Serial.printf("[Arduino] JSON error: %s\n", err.c_str());
    return;
  }

  float temp = doc["temperature"] | 0.0f;
  float hum  = doc["humidity"]    | 0.0f;
  float dust = doc["pm2_5"]       | 0.0f;
  float pm10 = doc["pm10"]        | dust * 1.3f;  // fallback if not sent
  float gas  = doc["gas"]         | 0.0f;

  // Cache temp + humidity for AQI screen display
  lastTemp = temp;
  lastHum  = hum;

  // Show live readings on OLED (only if not currently showing AQI)
  if (!showingAQI) {
    oledShowReadings(temp, hum, dust, gas);
  }

  // Publish to MQTT → backend processes and sends AQI reply
  publishSensorData(temp, hum, dust, pm10, gas);
}

// ─────────────────────────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  // USB Serial — for debugging in Arduino Serial Monitor (115200 baud)
  Serial.begin(115200);
  delay(500);
  Serial.println("\n╔══════════════════════════════╗");
  Serial.println(  "║  AirSense ESP32-WROOM v2.0   ║");
  Serial.println(  "╚══════════════════════════════╝");
  Serial.printf("Node ID   : %s\n", NODE_ID);
  Serial.printf("Broker    : %s:%d\n", MQTT_BROKER, MQTT_PORT);
  Serial.printf("Topic pub : %s\n", TOPIC_DATA);
  Serial.printf("Topic sub : %s\n", TOPIC_AQI);
  Serial.printf("Chip ID   : %llX\n", ESP.getEfuseMac());

  // ── I2C + OLED ────────────────────────────────────────────────────────────
  // GPIO21 = SDA, GPIO22 = SCL on WROOM (hardware I2C — must use these)
  Wire.begin(I2C_SDA, I2C_SCL);

  if (!oled.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDR)) {
    Serial.println("[OLED] Init FAILED — check wiring and I2C address");
    // Continue anyway — system works without OLED
  } else {
    Serial.println("[OLED] Init OK");
    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);
    oled.setTextSize(1);
    oled.setCursor(20, 20);
    oled.println("AirSense v2.0");
    oled.setCursor(10, 35);
    oled.println("ESP32-WROOM-32");
    oled.display();
    delay(1500);
  }

  // ── UART2 — reads JSON from Arduino ───────────────────────────────────────
  // GPIO16 = RX2, GPIO17 = TX2
  // These are safe on WROOM (not connected to internal flash)
  Serial2.begin(UART_BAUD, SERIAL_8N1, UART_RX_PIN, UART_TX_PIN);
  Serial.printf("[UART2] Started on GPIO%d(RX) GPIO%d(TX) at %d baud\n",
                UART_RX_PIN, UART_TX_PIN, UART_BAUD);

  // ── WiFi ──────────────────────────────────────────────────────────────────
  connectWiFi();

  // ── MQTT ──────────────────────────────────────────────────────────────────
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMQTTMessage);
  mqttClient.setBufferSize(512);   // increase buffer for longer payloads
  mqttClient.setKeepAlive(60);     // send PINGREQ every 60s to keep connection alive
  reconnectMQTT();

  Serial.println("[Setup] Complete — entering main loop");
  oledStatus("System Ready", "waiting for data...");
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN LOOP
// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  // ── Maintain WiFi ──────────────────────────────────────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Loop] WiFi lost — reconnecting...");
    connectWiFi();
  }

  // ── Maintain MQTT ──────────────────────────────────────────────────────────
  if (!mqttClient.connected()) {
    Serial.println("[Loop] MQTT disconnected — reconnecting...");
    reconnectMQTT();
  }

  // MUST call this every loop — processes incoming messages and sends keepalives
  mqttClient.loop();

  // ── Auto-flip OLED back to live readings ───────────────────────────────────
  if (showingAQI && (millis() - lastAQITime > AQI_DISPLAY_DURATION)) {
    showingAQI = false;
    Serial.println("[OLED] Switching back to live readings");
  }

  // ── Read characters from Arduino (Serial2) ─────────────────────────────────
  // Arduino sends JSON terminated with '\n' every 10 seconds.
  // We accumulate characters into serialBuffer until we see '\n',
  // then process the complete line.
  while (Serial2.available()) {
    char c = (char)Serial2.read();

    if (c == '\n') {
      // End of message — process what we collected
      processArduinoLine(serialBuffer);
      serialBuffer = "";          // reset for next message
    } else if (c == '\r') {
      // Ignore carriage return (Windows-style line endings)
    } else {
      serialBuffer += c;

      // Safety: if buffer grows too large something went wrong — reset it
      if (serialBuffer.length() > 300) {
        Serial.println("[UART2] Buffer overflow — resetting");
        serialBuffer = "";
      }
    }
  }

  // ── Small yield to keep WiFi stack happy ───────────────────────────────────
  // Do NOT use delay() here — it blocks mqttClient.loop() and causes disconnects
  yield();
}
