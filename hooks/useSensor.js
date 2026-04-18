// hooks/useSensor.js
//
// DATA SOURCES:
//   • Battery %     → expo-battery  (reads the phone's own hardware sensor, live)
//   • Temperature   → Firebase /sensors (ESP32 writes here over WiFi, live)
//   • Voltage       → Firebase /sensors (ESP32)
//   • Current       → Firebase /sensors (ESP32)
//   • Frequency     → Firebase /sensors (ESP32, optional field)
//
// OUTPUT shape:
// {
//   battery:      85,           ← phone %, integer 0-100, updates as phone charges/discharges
//   chargingState: 2,           ← Battery.BatteryState enum (CHARGING=2, UNPLUGGED=1, FULL=3)
//   temperature:  35.2,         ← °C from ESP32 LM35 sensor
//   voltage:      4.94,         ← V  from ESP32 INA219
//   current:      0.09,         ← A  from ESP32 INA219
//   power:        446.0,        ← mW from ESP32 INA219 (voltage × current)
//   frequency:    3,            ← times charged today (ESP32 counter, optional)
//   safetyStatus: 'Safe',       ← computed from temperature/voltage/current
//   tip:          '...',        ← computed human-readable advice
// }
// ─────────────────────────────────────────────────────────────────────────────
import * as Battery from "expo-battery";
import { useEffect, useRef, useState } from "react";
import { subscribeSensorData } from "../services/sensorService";

export default function useSensor() {
  const [esp32, setEsp32] = useState(null); // live from Firebase
  const [batteryLevel, setBatteryLevel] = useState(null); // 0.0 – 1.0 float
  const [chargingState, setChargingState] = useState(null); // Battery.BatteryState
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const levelSubRef = useRef(null);
  const stateSubRef = useRef(null);

  // ── 1. Phone battery level — read now + subscribe to live updates ─
  useEffect(() => {
    const initBattery = async () => {
      try {
        // Initial read
        const level = await Battery.getBatteryLevelAsync();
        setBatteryLevel(level);

        const state = await Battery.getBatteryStateAsync();
        setChargingState(state);

        // Live subscriptions — fire on every change
        levelSubRef.current = Battery.addBatteryLevelListener(
          ({ batteryLevel: lvl }) => {
            setBatteryLevel(lvl);
          },
        );

        stateSubRef.current = Battery.addBatteryStateListener(
          ({ batteryState }) => {
            setChargingState(batteryState);
          },
        );
      } catch (err) {
        // Simulator / physical device without battery support — fail gracefully
        setError("Battery sensor unavailable: " + err.message);
      }
    };

    initBattery();

    return () => {
      levelSubRef.current?.remove();
      stateSubRef.current?.remove();
    };
  }, []);

  // ── 2. ESP32 sensor data — live Firebase Realtime Database ───────
  useEffect(() => {
    let unsubscribe;
    try {
      unsubscribe = subscribeSensorData((sensorData) => {
        setEsp32(sensorData); // null when /sensors node is empty
        setLoading(false);
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ── 3. Merge phone + ESP32 into one data object ──────────────────
  // expo-battery returns -1 on simulator (no real battery hardware).
  // Clamp: treat any negative value as null so app shows "--" instead of "-100".
  const batteryPercent =
    batteryLevel != null && batteryLevel >= 0
      ? Math.round(batteryLevel * 100) // 0.854 → 85
      : null;

  // We have "some data" once either source responds
  const hasData = batteryPercent != null || esp32 != null;

  const mergedData = hasData
    ? {
        // Phone
        battery: batteryPercent,
        chargingState,

        // ESP32 via Firebase (null until device comes online)
        temperature: esp32?.temperature ?? null,
        voltage: esp32?.voltage ?? null,
        current: esp32?.current ?? null,
        power: esp32?.power ?? null, // mW from INA219
        frequency: esp32?.frequency ?? null,

        // Computed from ESP32 readings
        safetyStatus: esp32?.safetyStatus ?? "Safe",
        tip: esp32?.tip ?? "Waiting for ESP32 device data...",
      }
    : null;

  return {
    data: mergedData,
    // Only show global loader if BOTH sources haven't responded yet
    loading: loading && batteryPercent == null,
    error,
  };
}
