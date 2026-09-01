/*
 * UrjaSetu - ESP32 Protected 5-12V Bench Rig Firmware (v0.2.0)
 * ============================================================
 * 2x INA219 sensors (source + load), low-voltage DC load, MOSFET actuator.
 *
 * PRD safety boundary: 5-12V DC bench rig ONLY.
 * Never connect household mains. Manual physical cutoff overrides software.
 *
 * Hardware:
 *   - ESP32 dev board
 *   - 2x INA219 (addr 0x40=source, 0x41=load) on I2C (SDA=21, SCL=22)
 *   - MOSFET gate on GPIO26 (low-voltage DC load switch)
 *   - Status LED on GPIO2
 *   - Manual cutoff button on GPIO0 (active low)
 *   - Protection: TVS + polyfuse on 5-12V rail
 *
 * Transport: MQTT (urjasetu/{siteId}/{deviceId}/telemetry|commands|events)
 *
 * Author: Build with Bharat
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_INA219.h>

// ---- Pins ----
static const int LOAD_SW_PIN = 26;
static const int STATUS_LED = 2;
static const int CUTOFF_BTN = 0;  // active low

// ---- INA219 ----
Adafruit_INA219 ina219_source(0x40);
Adafruit_INA219 ina219_load(0x41);

// ---- Limits (protected rig) ----
static const float MAX_VOLTAGE = 12.0;
static const float MIN_VOLTAGE = 5.0;
static const float MAX_CURRENT = 2.0;

// ---- Network / MQTT (fill in your credentials) ----
const char *WIFI_SSID = "YOUR_SSID";
const char *WIFI_PASSWORD = "YOUR_PASS";
const char *MQTT_HOST = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char *SITE_ID = "site-01";
const char *DEVICE_ID = "esp32-bench-01";

// Topics: urjasetu/{siteId}/{deviceId}/{telemetry|commands|events}
String TOPIC_TELEM;
String TOPIC_CMD;
String TOPIC_EVENTS;

WiFiClient net;
PubSubClient client(net);

// ---- State ----
float energyWh = 0.0;
unsigned long lastSampleMs = 0;
unsigned long lastPublishMs = 0;
unsigned long lastCmdCheckMs = 0;
bool loadEnabled = false;
bool fault = false;
bool manualCutoff = false;
int sequence = 0;

// ---- Command tracking (idempotency + expiry) ----
String lastExecutedCmdId = "";
unsigned long cmdExpiryMs = 0;

// ---- Read INA219 channels ----
struct ChannelReading {
  float voltage_v;
  float current_a;
  float power_w;
  String label;
};

ChannelReading readSource() {
  ChannelReading r;
  r.voltage_v = ina219_source.getBusVoltage_V();
  r.current_a = ina219_source.getCurrent_mA() / 1000.0;
  r.power_w = r.voltage_v * r.current_a;
  r.label = "source";
  return r;
}

ChannelReading readLoad() {
  ChannelReading r;
  r.voltage_v = ina219_load.getBusVoltage_V();
  r.current_a = ina219_load.getCurrent_mA() / 1000.0;
  r.power_w = r.voltage_v * r.current_a;
  r.label = "load";
  return r;
}

void checkProtection(float v, float i) {
  if (v > MAX_VOLTAGE || v < MIN_VOLTAGE || i > MAX_CURRENT) {
    fault = true;
    digitalWrite(LOAD_SW_PIN, LOW);
    loadEnabled = false;
    digitalWrite(STATUS_LED, HIGH);
    publishEvent("FAULT", "protection triggered");
  }
}

void checkManualCutoff() {
  if (digitalRead(CUTOFF_BTN) == LOW) {
    manualCutoff = true;
    digitalWrite(LOAD_SW_PIN, LOW);
    loadEnabled = false;
    digitalWrite(STATUS_LED, HIGH);
    publishEvent("MANUAL_STOP", "physical cutoff activated");
  }
}

void publishTelemetry(ChannelReading src, ChannelReading load) {
  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = getISOTime();
  doc["sequence"] = sequence;
  doc["source"]["voltage_v"] = src.voltage_v;
  doc["source"]["current_a"] = src.current_a;
  doc["source"]["power_w"] = src.power_w;
  doc["source"]["label"] = src.label;
  doc["load"]["voltage_v"] = load.voltage_v;
  doc["load"]["current_a"] = load.current_a;
  doc["load"]["power_w"] = load.power_w;
  doc["load"]["label"] = load.label;
  doc["mode"] = fault ? "fault" : "normal";
  doc["faults"] = fault ? "protection" : "";
  doc["provenance"] = "MEASURED";

  char buffer[512];
  serializeJson(doc, buffer);
  client.publish(TOPIC_TELEM.c_str(), buffer);
}

void publishEvent(String type, String detail) {
  JsonDocument doc;
  doc["device_id"] = DEVICE_ID;
  doc["event_type"] = type;
  doc["detail"] = detail;
  doc["timestamp"] = getISOTime();
  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(TOPIC_EVENTS.c_str(), buffer);
}

String getISOTime() {
  // Simple ISO timestamp from millis (no NTP in demo)
  unsigned long ms = millis();
  return "2025-01-01T00:00:" + String(ms / 1000) + "Z";
}

void handleCommand(char *topic, byte *payload, unsigned int length) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) return;

  const char *cmdId = doc["command_id"] | "";
  const char *action = doc["action"] | "";
  unsigned long expiresAt = doc["expires_at_ms"] | 0;

  // Idempotency: reject duplicate command
  if (String(cmdId) == lastExecutedCmdId) {
    publishEvent("CMD_REJECTED", "duplicate command");
    return;
  }

  // Expiry: reject expired command
  if (expiresAt > 0 && millis() > expiresAt) {
    publishEvent("CMD_EXPIRED", "command expired before execution");
    return;
  }

  // Manual cutoff overrides all software commands
  if (manualCutoff) {
    publishEvent("CMD_REJECTED", "manual cutoff active");
    return;
  }

  if (String(action) == "start" && !fault) {
    digitalWrite(LOAD_SW_PIN, HIGH);
    loadEnabled = true;
    lastExecutedCmdId = String(cmdId);
    publishEvent("CMD_ACK", "load started");
  } else if (String(action) == "stop") {
    digitalWrite(LOAD_SW_PIN, LOW);
    loadEnabled = false;
    lastExecutedCmdId = String(cmdId);
    publishEvent("CMD_ACK", "load stopped");
  } else if (String(action) == "estop") {
    digitalWrite(LOAD_SW_PIN, LOW);
    loadEnabled = false;
    fault = true;
    lastExecutedCmdId = String(cmdId);
    publishEvent("CMD_ACK", "emergency stop");
  }
}

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    digitalWrite(STATUS_LED, !digitalRead(STATUS_LED));
  }
  digitalWrite(STATUS_LED, LOW);
}

void connectMQTT() {
  while (!client.connected()) {
    String clientId = "urjasetu-" + String(random(0xFFFFL), HEX);
    if (client.connect(clientId.c_str())) {
      client.subscribe(TOPIC_CMD.c_str());
      publishEvent("ONLINE", "device connected");
    } else {
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  TOPIC_TELEM = "urjasetu/" + String(SITE_ID) + "/" + String(DEVICE_ID) + "/telemetry";
  TOPIC_CMD = "urjasetu/" + String(SITE_ID) + "/" + String(DEVICE_ID) + "/commands";
  TOPIC_EVENTS = "urjasetu/" + String(SITE_ID) + "/" + String(DEVICE_ID) + "/events";

  pinMode(LOAD_SW_PIN, OUTPUT);
  pinMode(STATUS_LED, OUTPUT);
  pinMode(CUTOFF_BTN, INPUT_PULLUP);
  digitalWrite(LOAD_SW_PIN, LOW);  // default OFF

  Wire.begin(21, 22);
  ina219_source.begin();
  ina219_load.begin();

  connectWiFi();
  client.setServer(MQTT_HOST, MQTT_PORT);
  client.setCallback(handleCommand);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!client.connected()) connectMQTT();
  client.loop();

  checkManualCutoff();

  unsigned long now = millis();

  // sample every 200ms
  if (now - lastSampleMs >= 200) {
    lastSampleMs = now;
    ChannelReading src = readSource();
    ChannelReading load = loadEnabled ? readLoad() : (ChannelReading){0, 0, 0, "load"};

    checkProtection(load.voltage_v, load.current_a);

    if (loadEnabled && !fault && !manualCutoff) {
      energyWh += load.power_w * (200.0 / 3600000.0);
    }

    if (loadEnabled && !fault) {
      digitalWrite(STATUS_LED, (uint8_t)((now / 200UL) % 2UL));
    }
  }

  // publish telemetry every 2s
  if (now - lastPublishMs >= 2000) {
    lastPublishMs = now;
    sequence++;
    ChannelReading src = readSource();
    ChannelReading load = loadEnabled ? readLoad() : (ChannelReading){0, 0, 0, "load"};
    publishTelemetry(src, load);
  }
}
