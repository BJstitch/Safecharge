// screens/DashboardScreen.js
//
// Battery %     → phone sensor  (expo-battery, live)
// Temperature   → ESP32 Firebase (LM35, live)  — shows "--" when relay OFF
// Voltage       → ESP32 Firebase (INA219, live) — shows "--" when relay OFF
// Current       → ESP32 Firebase (INA219, live) — shows "--" when relay OFF
// Safety status → computed from ESP32 readings
//
// RELAY BEHAVIOUR:
//   • Relay is OFF by default on boot — no charging, no sensors
//   • User taps "Start Charging" → relay ON → sensors begin streaming
//   • User taps "Stop Charging"  → relay OFF → sensors stop
//   • ESP32 auto-cuts relay if unsafe readings (Stopped status)
//   • User must tap "Start Charging" again after a safety cut
// ─────────────────────────────────────────────────────────────────
import * as Battery from "expo-battery";
import { off, onValue, ref, set } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import useSensor from "../hooks/useSensor";
import { db } from "../services/firebase";
import { scheduleLocalNotification } from "../services/notificationService";
import { subscribeAlertCount } from "../services/sensorService";

const { width } = Dimensions.get("window");
const CARD_W = (width - 44) / 2;

// ── Color helpers ──────────────────────────────────────────────────
const safetyColor = (s) =>
  s === "Stopped" ? "#FF4444" : s === "Warning" ? "#FFAA00" : "#00CC77";

const batteryColor = (pct) => {
  if (pct == null) return "#B0C4D8";
  if (pct <= 20) return "#FF4444";
  if (pct <= 40) return "#FFAA00";
  return "#00CC77";
};

const tempColor = (v) =>
  v == null ? "#B0C4D8" : v > 45 ? "#FF4444" : v > 38 ? "#FFAA00" : "#0099CC";
// INA219 measures the USB charger bus (4.5–5.2V normal range)
// Warning at 5.5V, danger at 6.0V — matches Arduino VOLT_WARN / VOLT_STOP
const voltColor = (v) =>
  v == null ? "#B0C4D8" : v > 6.0 ? "#FF4444" : v > 5.5 ? "#FFAA00" : "#0099CC";
// USB fast charging: normal up to 3A, warning 3–3.5A, danger above 3.5A
const currColor = (v) =>
  v == null ? "#B0C4D8" : v > 3.5 ? "#FF4444" : v > 3.0 ? "#FFAA00" : "#0099CC";
// Power: normal <15W, warning 15–18W, danger above 18W (USB fast charge limit)
const powerColor = (v) =>
  v == null
    ? "#B0C4D8"
    : v > 18000
      ? "#FF4444"
      : v > 15000
        ? "#FFAA00"
        : "#0099CC";

const fmt = (v, d = 1) =>
  v == null ? "--" : typeof v === "number" ? v.toFixed(d) : String(v);

// ── Write alert to Firebase /alerts ───────────────────────────────
const writeAlert = async (type, message) => {
  try {
    const alertRef = ref(db, `/alerts/${Date.now()}`);
    await set(alertRef, {
      type,
      message,
      timestamp: Date.now(),
    });
    // Also send local push notification
    await scheduleLocalNotification(type, message);
  } catch (e) {
    console.warn("Alert write failed:", e.message);
  }
};

// ── Pulse animation ────────────────────────────────────────────────
function usePulse(value) {
  const anim = useRef(new Animated.Value(1)).current;
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) {
      prev.current = value;
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1.04,
          duration: 130,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 1,
          duration: 130,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [value]);
  return anim;
}

// ── Battery card ───────────────────────────────────────────────────
const BatteryCard = ({ percent, chargingState }) => {
  const scale = usePulse(percent);
  const color = batteryColor(percent);
  const fillWidth = percent != null ? `${Math.min(percent, 100)}%` : "0%";

  const stateLabel =
    chargingState === Battery.BatteryState.CHARGING
      ? "⚡ Charging"
      : chargingState === Battery.BatteryState.FULL
        ? "✓ Full"
        : chargingState === Battery.BatteryState.UNPLUGGED
          ? "Unplugged"
          : null;

  return (
    <Animated.View style={[styles.statCard, { transform: [{ scale }] }]}>
      <View style={styles.sourceTag}>
        <View style={[styles.sourceDot, { backgroundColor: "#00CC77" }]} />
        <Text style={styles.sourceLabel}>Phone</Text>
      </View>
      <Text style={styles.statLabel}>Battery</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.statNumber, { color }]}>{percent ?? "--"}</Text>
        <Text style={[styles.statUnit, { color }]}>%</Text>
      </View>
      <View style={styles.battBar}>
        <Animated.View
          style={[
            styles.battFill,
            { width: fillWidth, backgroundColor: color },
          ]}
        />
      </View>
      {stateLabel && (
        <Text style={[styles.chargingLabel, { color }]}>{stateLabel}</Text>
      )}
    </Animated.View>
  );
};

// ── Generic ESP32 stat card ────────────────────────────────────────
const Esp32Card = ({ label, value, unit, color, subLabel }) => {
  const scale = usePulse(value);
  return (
    <Animated.View style={[styles.statCard, { transform: [{ scale }] }]}>
      <View style={styles.sourceTag}>
        <View style={[styles.sourceDot, { backgroundColor: "#0099CC" }]} />
        <Text style={styles.sourceLabel}>ESP32</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.statNumber, { color: color ?? "#0099CC" }]}>
          {value}
        </Text>
        <Text style={[styles.statUnit, { color: color ?? "#0099CC" }]}>
          {" "}
          {unit}
        </Text>
      </View>
      {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
    </Animated.View>
  );
};

// ── Relay / Charger Control Card ──────────────────────────────────
// isCharging = relay is ON and actively charging
// Shows big START button when off, big STOP button when on.
const RelayCard = ({ isCharging, safetyCut, onStart, onStop, loading }) => {
  const color = isCharging ? "#00CC77" : "#B0C4D8";
  const statusTxt = safetyCut
    ? "Stopped for Safety — tap Start to retry"
    : isCharging
      ? "Charging in progress"
      : "Charging is OFF — tap Start to begin";

  return (
    <View style={[styles.relayCard, { borderColor: color }]}>
      {/* Top colour stripe */}
      <View style={[styles.relayStripe, { backgroundColor: color }]} />

      {/* Title + badge row */}
      <View style={styles.relayTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.relayTitle}> Charger Control</Text>
          <Text style={[styles.relaySub, safetyCut && { color: "#FF4444" }]}>
            {statusTxt}
          </Text>
        </View>
        <View
          style={[
            styles.relayBadge,
            { backgroundColor: color + "22", borderColor: color },
          ]}
        >
          <View style={[styles.relayDot, { backgroundColor: color }]} />
          <Text style={[styles.relayLabel, { color }]}>
            {isCharging ? "ON" : "OFF"}
          </Text>
        </View>
      </View>

      {/* Single big action button */}
      <View style={styles.relayBtns}>
        {!isCharging ? (
          // ── START CHARGING ──────────────────────────────────────
          <TouchableOpacity
            style={[
              styles.relayBtnFull,
              styles.relayBtnStart,
              loading && styles.relayBtnDisabled,
            ]}
            onPress={onStart}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.relayBtnStartTxt}>
                {safetyCut ? "↺  Restart Charging" : "▶  Start Charging"}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          // ── STOP CHARGING ───────────────────────────────────────
          <TouchableOpacity
            style={[
              styles.relayBtnFull,
              styles.relayBtnStop,
              loading && styles.relayBtnDisabled,
            ]}
            onPress={onStop}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FF4444" size="small" />
            ) : (
              <Text style={styles.relayBtnStopTxt}>⛔ Stop Charging</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ── Bar chart ──────────────────────────────────────────────────────
const BarChart = ({ data }) => {
  const max = Math.max(...data.filter(Boolean), 1);
  return (
    <View style={styles.chartBox}>
      <View style={styles.barsRow}>
        {data.map((val, i) => {
          const ratio = val ? val / max : 0;
          const barColor =
            val > 45 ? "#FF4444" : val > 38 ? "#FFAA00" : "#00AADD";
          return (
            <View key={i} style={styles.barWrap}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(ratio * 72, 4),
                    backgroundColor: val ? barColor : "#DDE8F0",
                    opacity: 0.45 + (i / data.length) * 0.55,
                  },
                ]}
              />
              {i === data.length - 1 && val != null && (
                <Text style={[styles.barLabel, { color: barColor }]}>
                  {val.toFixed(0)}°
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ── LIVE badge ─────────────────────────────────────────────────────
const LiveBadge = ({ active }) => {
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) {
      op.setValue(1);
      return;
    }
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(op, {
          toValue: 0.15,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [active]);

  return (
    <View style={styles.liveBadge}>
      <Animated.View
        style={[
          styles.liveDot,
          {
            backgroundColor: active ? "#00CC77" : "#B0C4D8",
            opacity: active ? op : 1,
          },
        ]}
      />
      <Text
        style={[styles.liveText, { color: active ? "#00CC77" : "#B0C4D8" }]}
      >
        {active ? "ESP32 LIVE" : "WAITING FOR ESP32"}
      </Text>
    </View>
  );
};

// ── Bell button ────────────────────────────────────────────────────
const BellBtn = ({ onPress, alertCount }) => (
  <TouchableOpacity
    style={styles.bellBtn}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.bellShape} />
    <View style={styles.bellHandle} />
    {alertCount > 0 && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {alertCount > 9 ? "9+" : alertCount}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

const LastUpdate = ({ timestamp }) => {
  if (!timestamp) return null;
  const ts = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const time = new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return <Text style={styles.lastUpdate}>Last update: {time}</Text>;
};

// ── Main screen ────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }) {
  const { data, loading } = useSensor();
  const [tempHistory, setTempHistory] = useState([
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  const [alertCount, setAlertCount] = useState(0);

  // Relay / charging control
  // isCharging: relay is ON and ESP32 is streaming sensors
  // safetyCut:  ESP32 forced relay off due to unsafe readings
  const [isCharging, setIsCharging] = useState(false);
  const [safetyCut, setSafetyCut] = useState(false);
  const [relayLoading, setRelayLoading] = useState(false);

  // Temperature trend
  useEffect(() => {
    if (data?.temperature != null) {
      setTempHistory((prev) => [
        ...prev.slice(-7),
        parseFloat(data.temperature),
      ]);
    }
  }, [data?.temperature]);

  // Alert count badge
  useEffect(() => {
    const unsub = subscribeAlertCount(setAlertCount);
    return unsub;
  }, []);

  // Subscribe to /control in Firebase (ESP32 also writes here on safety cut)
  useEffect(() => {
    const ctrlRef = ref(db, "/control");
    const handler = onValue(ctrlRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        // relayOn = true means ESP32 relay is closed (charging happening)
        if (val.relayOn !== undefined) setIsCharging(!!val.relayOn);
        // safetyCut = ESP32 forced it off due to unsafe sensor readings
        if (val.safetyCut !== undefined) setSafetyCut(!!val.safetyCut);
      }
    });
    return () => off(ctrlRef, "value", handler);
  }, []);

  // ── Start charging — user taps "Start Charging" ──────────────
  // Writes to /control (single source of truth).
  // Firebase rule:  "/control": { ".write": "auth != null" }
  // ESP32 reads /control/command every loop iteration.
  const handleStartCharging = async () => {
    if (relayLoading) return;
    setRelayLoading(true);
    try {
      await set(ref(db, "/control"), {
        command: "on",
        relayOn: true,
        safetyCut: false,
      });
      await writeAlert(
        "Charging Started",
        "Charging started via the app. Sensors are now active.",
      );
    } catch (e) {
      Alert.alert("Error", "Could not start charging: " + e.message);
    } finally {
      setRelayLoading(false);
    }
  };

  // ── Stop charging — user taps "Stop Charging" ─────────────────
  const handleStopCharging = async () => {
    if (relayLoading) return;
    Alert.alert("Stop Charging", "Are you sure you want to stop charging?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Stop",
        style: "destructive",
        onPress: async () => {
          setRelayLoading(true);
          try {
            await set(ref(db, "/control"), {
              command: "off",
              relayOn: false,
              safetyCut: false,
            });
            await writeAlert(
              "Charging Stopped",
              "Charging stopped manually via the app.",
            );
          } catch (e) {
            Alert.alert("Error", "Could not stop charging: " + e.message);
          } finally {
            setRelayLoading(false);
          }
        },
      },
    ]);
  };

  const status = data?.safetyStatus ?? "Safe";

  // Build a contextual tip — override stale threshold messages from
  // sensorService which may have old 4.2V limits cached in Firebase.
  const buildTip = () => {
    if (!isCharging) return "Start charging to begin monitoring.";
    if (status === "Stopped") {
      const v = data?.voltage;
      const t = data?.temperature;
      const c = data?.current;
      if (t != null && t >= 45)
        return `Temperature too high (${t.toFixed(1)}°C). Let device cool before restarting.`;
      if (v != null && v >= 6.0)
        return `Charger voltage dangerously high (${v.toFixed(2)}V). Check your charger.`;
      if (c != null && c >= 3.5)
        return `Current too high (${c.toFixed(2)}A). Check charging cable.`;
      return "Charging stopped for safety. Tap Restart Charging when ready.";
    }
    if (status === "Warning") {
      const v = data?.voltage;
      const t = data?.temperature;
      if (t != null && t >= 38)
        return `Temperature elevated (${t.toFixed(1)}°C). Monitor closely.`;
      if (v != null && v >= 5.5)
        return `Charger voltage slightly high (${v.toFixed(2)}V). Normal USB is 4.5–5.2V.`;
      return "Readings slightly elevated. Monitoring closely.";
    }
    return data?.tip ?? "Charging is stable. All readings within safe limits.";
  };
  const tip = buildTip();
  const sColor = safetyColor(status);
  // esp32On: true only when charging is ON and ESP32 is streaming values
  const esp32On =
    isCharging && (data?.temperature != null || data?.voltage != null);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SafeCharge</Text>
          <LiveBadge active={esp32On} />
        </View>
        <BellBtn
          onPress={() => navigation.navigate("Alerts")}
          alertCount={alertCount}
        />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0099CC" />
          <Text style={styles.loadingText}>Connecting to device...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* ── Source legend ────────────────────────────────── */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#00CC77" }]}
              />
              <Text style={styles.legendTxt}>Phone sensor</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#0099CC" }]}
              />
              <Text style={styles.legendTxt}>ESP32 • LM35 / INA260</Text>
            </View>
          </View>

          {/* ── 2×2 stat cards ──────────────────────────────── */}
          <View style={styles.grid}>
            <BatteryCard
              percent={data?.battery}
              chargingState={data?.chargingState}
            />

            <Esp32Card
              label="Temperature"
              value={isCharging ? fmt(data?.temperature) : "--"}
              unit="°C"
              color={tempColor(data?.temperature)}
              subLabel={
                isCharging && data?.temperature != null
                  ? data.temperature > 38
                    ? "⚠ Elevated"
                    : "Normal"
                  : isCharging
                    ? "Connecting..."
                    : "Start charging"
              }
            />

            <Esp32Card
              label="Voltage"
              value={isCharging ? fmt(data?.voltage, 2) : "--"}
              unit="V"
              color={voltColor(data?.voltage)}
              subLabel={
                isCharging && data?.voltage != null
                  ? data.voltage > 5.5
                    ? "⚠ High"
                    : "Normal"
                  : isCharging
                    ? "Connecting..."
                    : "Start charging"
              }
            />

            <Esp32Card
              label="Current"
              value={isCharging ? fmt(data?.current, 2) : "--"}
              unit="A"
              color={currColor(data?.current)}
              subLabel={
                isCharging && data?.current != null
                  ? data.current > 3.0
                    ? "⚠ High"
                    : "Normal"
                  : isCharging
                    ? "Connecting..."
                    : "Start charging"
              }
            />
          </View>

          {/* ── Power card (full width) ─────────────────────── */}
          {isCharging && (
            <View style={styles.powerCard}>
              <View style={styles.sourceTag}>
                <View
                  style={[styles.sourceDot, { backgroundColor: "#0099CC" }]}
                />
                <Text style={styles.sourceLabel}>ESP32 • INA219</Text>
              </View>
              <View style={styles.powerRow}>
                <View style={styles.powerLeft}>
                  <Text style={styles.powerLabel}>Power</Text>
                  <View style={styles.valueRow}>
                    <Text
                      style={[
                        styles.powerNumber,
                        { color: powerColor(data?.power) },
                      ]}
                    >
                      {data?.power != null ? data.power.toFixed(1) : "--"}
                    </Text>
                    <Text
                      style={[
                        styles.powerUnit,
                        { color: powerColor(data?.power) },
                      ]}
                    >
                      {" "}
                      mW
                    </Text>
                  </View>
                </View>
                <View style={styles.powerRight}>
                  {/* Simple live power bar */}
                  <View style={styles.powerBarBg}>
                    <View
                      style={[
                        styles.powerBarFill,
                        {
                          width:
                            data?.power != null
                              ? `${Math.min((data.power / 18000) * 100, 100)}%`
                              : "0%",
                          backgroundColor: powerColor(data?.power),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.powerBarLabel}>
                    {data?.power != null
                      ? `${(data.power / 1000).toFixed(2)} W`
                      : "-- W"}
                  </Text>
                  <Text style={styles.powerSub}>Max safe: 18 W</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Charger Control Card ────────────────────────── */}
          <RelayCard
            isCharging={isCharging}
            safetyCut={safetyCut}
            onStart={handleStartCharging}
            onStop={handleStopCharging}
            loading={relayLoading}
          />

          {/* ── Charging frequency ───────────────────────────── */}
          <View style={styles.freqCard}>
            <View style={styles.freqLeft}>
              <Text style={styles.freqLabel}>Charging Sessions Today</Text>
              <Text style={styles.freqSub}>ESP32 charge counter</Text>
            </View>
            <Text style={styles.freqValue}>{data?.frequency ?? "--"}</Text>
          </View>

          {/* ── Temperature trend chart ──────────────────────── */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Temperature Trend</Text>
              <View style={styles.sourceTag}>
                <View
                  style={[styles.sourceDot, { backgroundColor: "#0099CC" }]}
                />
                <Text style={styles.sourceLabel}>LM35 / ESP32</Text>
              </View>
            </View>
            <BarChart data={tempHistory} />
            <Text style={styles.chartSub}>
              Last 8 readings • Updates in real time
            </Text>
          </View>

          {/* ── Safety status ────────────────────────────────── */}
          <View style={[styles.safetyCard, { borderColor: sColor }]}>
            <View style={[styles.safetyStripe, { backgroundColor: sColor }]} />
            <View style={styles.safetyBody}>
              <Text style={styles.safetyLabelText}>Safety Status</Text>
              <Text style={[styles.safetyValue, { color: sColor }]}>
                {status}
              </Text>
              {status === "Stopped" && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeTxt}>
                    Charging Halted by ESP32
                  </Text>
                </View>
              )}
              {status === "Warning" && (
                <View
                  style={[styles.statusBadge, { backgroundColor: "#FFF3E0" }]}
                >
                  <Text style={[styles.statusBadgeTxt, { color: "#FF9900" }]}>
                    ⚠ Monitor Closely
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Tip ─────────────────────────────────────────── */}
          <View style={[styles.tipCard, { borderLeftColor: sColor }]}>
            <View style={[styles.tipAccent, { backgroundColor: sColor }]} />
            <Text style={styles.tipText}>{tip}</Text>
          </View>

          {esp32On && <LastUpdate timestamp={data?.timestamp} />}

          {!isCharging && (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>⚡ Ready to Charge</Text>
              <Text style={styles.noticeTxt}>
                Tap {'"'}Start Charging{'"'} above to power on the relay and
                begin real-time monitoring of temperature, voltage, and current.
                {" \n\n"}
                All sensor readings are hidden until charging starts.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7FC" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E8F4FD",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A2E",
    marginBottom: 4,
  },

  bellBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  bellShape: {
    width: 20,
    height: 18,
    backgroundColor: "#0099CC",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  bellHandle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0077AA",
    marginTop: -1,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FF4444",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },

  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },

  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: { color: "#888", fontSize: 14 },

  scroll: { flex: 1, padding: 16 },

  legend: { flexDirection: "row", gap: 18, marginBottom: 14, paddingLeft: 2 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 11, color: "#888", fontWeight: "500" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 },

  statCard: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sourceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  sourceDot: { width: 6, height: 6, borderRadius: 3 },
  sourceLabel: {
    fontSize: 10,
    color: "#aaa",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
    marginBottom: 6,
  },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  statNumber: { fontSize: 26, fontWeight: "800" },
  statUnit: { fontSize: 14, fontWeight: "600" },
  subLabel: { fontSize: 10, color: "#aaa", marginTop: 5 },

  battBar: {
    marginTop: 10,
    height: 5,
    backgroundColor: "#EEF6FC",
    borderRadius: 3,
    overflow: "hidden",
  },
  battFill: { height: "100%", borderRadius: 3 },
  chargingLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 6,
    letterSpacing: 0.3,
  },

  // ── Relay / charger control card ──────────────────────────────
  relayCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  relayStripe: { height: 5 },
  relayTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 10,
  },
  relayTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  relaySub: { fontSize: 12, color: "#999", lineHeight: 18 },
  relayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  relayDot: { width: 8, height: 8, borderRadius: 4 },
  relayLabel: { fontSize: 14, fontWeight: "800" },
  relayBtns: { paddingHorizontal: 16, paddingBottom: 18 },

  // Full-width single action button
  relayBtnFull: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  relayBtnStart: {
    backgroundColor: "#0099CC",
  },
  relayBtnStop: {
    backgroundColor: "#FFEEEE",
    borderWidth: 2,
    borderColor: "#FF4444",
  },
  relayBtnDisabled: { opacity: 0.4 },
  relayBtnStartTxt: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  relayBtnStopTxt: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FF4444",
    letterSpacing: 0.3,
  },

  freqCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  freqLeft: { flex: 1 },
  freqLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 3,
  },
  freqSub: { fontSize: 11, color: "#bbb" },
  freqValue: { fontSize: 36, fontWeight: "800", color: "#0099CC" },

  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  chartTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  chartBox: {
    height: 96,
    backgroundColor: "#EEF6FC",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    justifyContent: "flex-end",
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 76,
  },
  barWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 3,
    height: 76,
  },
  bar: { width: "100%", borderRadius: 5, minHeight: 4 },
  barLabel: { fontSize: 8, fontWeight: "700", marginTop: 2 },
  chartSub: { fontSize: 11, color: "#aaa", textAlign: "center" },

  safetyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  safetyStripe: { height: 4 },
  safetyBody: { padding: 18, alignItems: "center" },
  safetyLabelText: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
    marginBottom: 6,
  },
  safetyValue: { fontSize: 28, fontWeight: "800", marginBottom: 8 },
  statusBadge: {
    backgroundColor: "#FFEEEE",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusBadgeTxt: { fontSize: 13, fontWeight: "700", color: "#FF4444" },

  tipCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  tipAccent: { width: 3, minHeight: 40, borderRadius: 2, marginRight: 12 },
  tipText: { flex: 1, fontSize: 14, color: "#444", lineHeight: 22 },

  lastUpdate: {
    fontSize: 11,
    color: "#bbb",
    textAlign: "center",
    marginBottom: 12,
  },

  noticeCard: {
    backgroundColor: "#FFF8E6",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE0A0",
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#AA7700",
    marginBottom: 6,
  },
  noticeTxt: { fontSize: 13, color: "#AA7700", lineHeight: 20 },

  // ── Power card ──────────────────────────────────────────────────
  powerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  powerRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  powerLeft: { flex: 1 },
  powerLabel: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
    marginBottom: 6,
  },
  powerNumber: { fontSize: 28, fontWeight: "800" },
  powerUnit: { fontSize: 14, fontWeight: "600" },
  powerRight: { flex: 1.2, paddingLeft: 16 },
  powerBarBg: {
    height: 10,
    backgroundColor: "#EEF6FC",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 6,
  },
  powerBarFill: { height: "100%", borderRadius: 5 },
  powerBarLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0099CC",
    marginBottom: 2,
  },
  powerSub: { fontSize: 10, color: "#bbb" },
});
