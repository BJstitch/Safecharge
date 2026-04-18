// services/sensorService.js
//
// Firebase Realtime Database structure:
//
//   /sensors          → ESP32 writes live readings here
//     temperature: 34.5    (°C from DS18B20/NTC via M35 board)
//     voltage: 4.12        (V from INA219)
//     current: 1.85        (A from INA219)
//     frequency: 3         (times charged today, ESP32 counter)
//     timestamp: 1709123456
//
//   /chargingHistory  → ESP32 writes session records when charging ends
//     <pushId>:
//       startTime: 1709120000
//       endTime:   1709123600
//       avgTemp:   34.5
//       maxTemp:   42.1
//       minTemp:   28.0
//       duration:  60        (minutes)
//       finalStatus: "Safe"  | "Warning" | "Stopped"
//       avgVoltage: 4.10
//       avgCurrent: 1.80
//
//   /alerts           → App or ESP32 pushes alert events here
//     <pushId>:
//       type: "Temperature Warning" | "Charging Stopped" | "Charging Completed" | "Stable Charging"
//       message: "..."
//       timestamp: 1709123456   (Unix seconds)
//       createdAt: <serverTimestamp>
//
// Firebase Security Rules — add to fix the index warning:
//   {
//     "rules": {
//       "alerts": { ".indexOn": ["timestamp"] },
//       "chargingHistory": { ".indexOn": ["startTime"] }
//     }
//   }
//
// ─────────────────────────────────────────────────────────────────
import {
  limitToLast,
  off,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  serverTimestamp,
} from "firebase/database";
import { db } from "./firebase";

// ── Safety thresholds ─────────────────────────────────────────────
//
// IMPORTANT: INA219 is wired on the USB CHARGER CABLE (5V bus),
// NOT on the phone battery (3.7–4.2V). So voltage thresholds are
// set for the charger bus, not the battery:
//
//   Temperature : warn >38°C,   stop >45°C
//   Voltage     : warn >5.5V,   stop >6.0V   (USB bus, normal 4.5–5.2V)
//   Current     : warn >3.0A,   stop >3.5A   (USB fast charge limit)
//
// These MUST match the Arduino VOLT_WARN / VOLT_STOP constants.
//
export const computeSafetyStatus = ({ temperature, voltage, current } = {}) => {
  const hasData = temperature != null || voltage != null || current != null;
  if (!hasData) return "Safe";

  if (
    (temperature != null && temperature > 45) ||
    (voltage != null && voltage > 6.0) ||
    (current != null && current > 3.5)
  )
    return "Stopped";

  if (
    (temperature != null && temperature > 38) ||
    (voltage != null && voltage > 5.5) ||
    (current != null && current > 3.0)
  )
    return "Warning";

  return "Safe";
};

export const getSafetyTip = (status, data = {}) => {
  const { temperature, voltage, current } = data;
  switch (status) {
    case "Stopped":
      if (temperature != null && temperature > 45)
        return `🌡 Temperature critically high (${temperature.toFixed(1)}°C). Let device cool before restarting.`;
      if (voltage != null && voltage > 6.0)
        return `⚡ Charger voltage too high (${voltage.toFixed(2)}V — limit 6.0V). Check your charger.`;
      if (current != null && current > 3.5)
        return `🔌 Current too high (${current.toFixed(2)}A — limit 3.5A). Check your charging cable.`;
      return "⛔ Charging stopped automatically for safety. Tap Restart when ready.";

    case "Warning":
      if (temperature != null && temperature > 38)
        return `🌡 Temperature elevated (${temperature.toFixed(1)}°C). Monitor closely — limit is 45°C.`;
      if (voltage != null && voltage > 5.5)
        return `⚡ Charger voltage slightly high (${voltage.toFixed(2)}V). Normal USB range is 4.5–5.2V.`;
      if (current != null && current > 3.0)
        return `🔌 Current elevated (${current.toFixed(2)}A). Fast charging detected — monitoring closely.`;
      return "⚠ Some readings are elevated. Monitoring closely.";

    default:
      return "✅ All charging parameters are within safe limits. Charging is proceeding normally.";
  }
};

// ── Live sensor subscription (ESP32 → /sensors) ───────────────────
export const subscribeSensorData = (callback) => {
  const sensorRef = ref(db, "/sensors");
  onValue(sensorRef, (snapshot) => {
    if (snapshot.exists()) {
      const raw = snapshot.val();
      const status = computeSafetyStatus(raw);
      callback({
        ...raw,
        safetyStatus: status,
        tip: getSafetyTip(status, raw),
      });
    } else {
      callback(null);
    }
  });
  return () => off(sensorRef);
};

// ── Charging history — live, ordered by startTime ─────────────────
export const subscribeHistory = (callback) => {
  // orderByChild requires ".indexOn": ["startTime"] in Firebase rules
  const histQuery = query(
    ref(db, "/chargingHistory"),
    orderByChild("startTime"),
    limitToLast(50),
  );
  onValue(histQuery, (snapshot) => {
    if (snapshot.exists()) {
      const raw = snapshot.val();
      const list = Object.entries(raw)
        .map(([id, val]) => ({ id, ...val }))
        .sort((a, b) => (b.startTime || 0) - (a.startTime || 0)); // newest first
      callback(list);
    } else {
      callback([]);
    }
  });
  return () => off(histQuery);
};

// ── Alerts — live, ordered by timestamp ───────────────────────────
export const subscribeAlerts = (callback) => {
  // orderByChild requires ".indexOn": ["timestamp"] in Firebase rules
  const alertsQuery = query(
    ref(db, "/alerts"),
    orderByChild("timestamp"),
    limitToLast(50),
  );
  onValue(alertsQuery, (snapshot) => {
    if (snapshot.exists()) {
      const raw = snapshot.val();
      const list = Object.entries(raw)
        .map(([id, val]) => ({
          id,
          type: val.type || "Alert",
          message: val.message || "",
          timestamp:
            val.timestamp || val.createdAt || Math.floor(Date.now() / 1000),
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      callback(list);
    } else {
      callback([]);
    }
  });
  return () => off(alertsQuery);
};

// Subscribe to just the alert count (for badge)
export const subscribeAlertCount = (callback) => {
  const alertsRef = ref(db, "/alerts");
  onValue(alertsRef, (snapshot) => {
    callback(snapshot.exists() ? Object.keys(snapshot.val()).length : 0);
  });
  return () => off(alertsRef);
};

// ── Write an alert to Firebase ────────────────────────────────────
// Called by app logic when sensor thresholds are crossed
export const writeAlert = async (type, message) => {
  const alertsRef = ref(db, "/alerts");
  await push(alertsRef, {
    type,
    message,
    timestamp: Math.floor(Date.now() / 1000),
    createdAt: serverTimestamp(),
  });
};

// ── Write a charging history session ─────────────────────────────
// Useful for testing; normally ESP32 writes this directly
export const writeChargingSession = async (sessionData) => {
  const histRef = ref(db, "/chargingHistory");
  await push(histRef, {
    ...sessionData,
    createdAt: serverTimestamp(),
  });
};
