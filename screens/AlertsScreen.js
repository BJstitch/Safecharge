// screens/AlertsScreen.js
//
// Displays real-time alerts from Firebase /alerts
// Alerts are created by:
//   1. useSensor.js when ESP32 safety status changes
//   2. ESP32 firmware writing directly to /alerts
//
// Firebase rules needed (add to Firebase console → Rules):
//   {
//     "rules": {
//       "alerts": { ".indexOn": ["timestamp"] }
//     }
//   }
// ─────────────────────────────────────────────────────────────────
import {
  limitToLast,
  off,
  onValue,
  orderByChild,
  query,
  ref,
  remove,
} from "firebase/database";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../services/firebase";

// ── Helpers ────────────────────────────────────────────────────────
const getAlertStyle = (type = "") => {
  const t = type.toLowerCase();
  if (t.includes("stopped"))
    return { color: "#FF4444", bg: "#FFF0F0", icon: "⛔", border: "#FFCCCC" };
  if (t.includes("warning") || t.includes("temperature"))
    return { color: "#FF9900", bg: "#FFF8E6", icon: "⚠️", border: "#FFDD88" };
  if (t.includes("completed"))
    return { color: "#00AA55", bg: "#E8FFF4", icon: "✅", border: "#88DDAA" };
  if (t.includes("stable"))
    return { color: "#0099CC", bg: "#EEF6FC", icon: "🔵", border: "#88CCEE" };
  return { color: "#888888", bg: "#F5F5F5", icon: "📌", border: "#DDDDDD" };
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "--";
  const ts = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  const time = new Date(ts).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = new Date(ts).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `Today ${time}`;
  if (days === 1) return `Yesterday ${time}`;
  return `${date} ${time}`;
};

// ── Alert card ─────────────────────────────────────────────────────
const AlertCard = ({ alert, isNew, onDismiss }) => {
  const translateY = useRef(new Animated.Value(isNew ? -20 : 0)).current;
  const opacity = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const style = getAlertStyle(alert.type);

  useEffect(() => {
    if (!isNew) return;
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateY }],
          opacity,
          borderColor: isNew ? style.border : "transparent",
          borderWidth: isNew ? 1.5 : 0,
        },
      ]}
    >
      {/* Color accent bar */}
      <View style={[styles.accentBar, { backgroundColor: style.color }]} />

      {/* Icon */}
      <View style={[styles.iconBubble, { backgroundColor: style.bg }]}>
        <Text style={styles.iconText}>{style.icon}</Text>
      </View>

      {/* Content */}
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text
            style={[styles.alertType, { color: style.color }]}
            numberOfLines={1}
          >
            {alert.type}
          </Text>
          {isNew && (
            <View style={[styles.newPill, { backgroundColor: style.color }]}>
              <Text style={styles.newPillText}>NEW</Text>
            </View>
          )}
        </View>
        <Text style={styles.alertMessage}>{alert.message}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.alertTime}>
            {formatTimestamp(alert.timestamp)}
          </Text>
          <TouchableOpacity
            onPress={() => onDismiss(alert.id)}
            style={styles.dismissBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

// ── Filter pill ────────────────────────────────────────────────────
const Pill = ({ label, active, color, onPress, count }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[
      styles.pill,
      active && { backgroundColor: color, borderColor: color },
    ]}
  >
    <Text style={[styles.pillLabel, active && { color: "#fff" }]}>{label}</Text>
    {count > 0 && (
      <View
        style={[
          styles.pillCount,
          { backgroundColor: active ? "rgba(255,255,255,0.3)" : color },
        ]}
      >
        <Text style={[styles.pillCountTxt, active && { color: "#fff" }]}>
          {count}
        </Text>
      </View>
    )}
  </TouchableOpacity>
);

// ── Stat chip ──────────────────────────────────────────────────────
const StatChip = ({ count, label, color }) => (
  <View style={[styles.statChip, { borderColor: color + "55" }]}>
    <Text style={[styles.statCount, { color }]}>{count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ── Empty state ────────────────────────────────────────────────────
const EmptyState = ({ filter }) => (
  <View style={styles.emptyWrap}>
    <Text style={styles.emptyEmoji}>🛡️</Text>
    <Text style={styles.emptyTitle}>All Clear</Text>
    <Text style={styles.emptySub}>
      {filter === "all"
        ? "No alerts yet.\nSafeCharge is monitoring in real time."
        : "No alerts match this filter."}
    </Text>
  </View>
);

// ── Filter definitions ─────────────────────────────────────────────
const FILTERS = [
  { key: "all", label: "All", color: "#0099CC" },
  { key: "stopped", label: "Stopped", color: "#FF4444" },
  { key: "warning", label: "Warning", color: "#FF9900" },
  { key: "safe", label: "Safe", color: "#00AA55" },
];

const matchesFilter = (type = "", key) => {
  const t = type.toLowerCase();
  if (key === "stopped") return t.includes("stopped");
  if (key === "warning")
    return t.includes("warning") || t.includes("temperature");
  if (key === "safe") return t.includes("stable") || t.includes("completed");
  return true;
};

// ── Main screen ────────────────────────────────────────────────────
export default function AlertsScreen({ navigation }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [newIds, setNewIds] = useState(new Set());

  const prevIds = useRef(new Set());
  const scrollRef = useRef(null);

  // ── Real-time Firebase subscription ───────────────────────────
  useEffect(() => {
    const alertsQuery = query(
      ref(db, "/alerts"),
      orderByChild("timestamp"),
      limitToLast(50),
    );

    const handleSnapshot = (snapshot) => {
      setConnected(true);
      setLoading(false);
      setRefreshing(false);

      if (!snapshot.exists()) {
        setAlerts([]);
        prevIds.current = new Set();
        return;
      }

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

      // Detect new alerts after initial load
      if (prevIds.current.size > 0) {
        const incoming = new Set(list.map((a) => a.id));
        const fresh = new Set(
          [...incoming].filter((id) => !prevIds.current.has(id)),
        );
        if (fresh.size > 0) {
          setNewIds(fresh);
          scrollRef.current?.scrollTo({ y: 0, animated: true });
          setTimeout(() => setNewIds(new Set()), 6000);
        }
      }

      prevIds.current = new Set(list.map((a) => a.id));
      setAlerts(list);
    };

    const handleError = (error) => {
      console.error("AlertsScreen Firebase error:", error.message);
      setConnected(false);
      setLoading(false);
      setRefreshing(false);
    };

    onValue(alertsQuery, handleSnapshot, handleError);
    return () => off(alertsQuery, "value", handleSnapshot);
  }, []);

  // ── Dismiss alert ──────────────────────────────────────────────
  const handleDismiss = (id) => {
    Alert.alert("Dismiss Alert", "Remove this alert from the list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Dismiss",
        style: "destructive",
        onPress: async () => {
          try {
            await remove(ref(db, `/alerts/${id}`));
          } catch (e) {
            Alert.alert("Error", "Could not dismiss alert: " + e.message);
          }
        },
      },
    ]);
  };

  // ── Clear all alerts ───────────────────────────────────────────
  const handleClearAll = () => {
    Alert.alert("Clear All Alerts", "Delete all alerts permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          try {
            await remove(ref(db, "/alerts"));
          } catch (e) {
            Alert.alert("Error", "Could not clear alerts: " + e.message);
          }
        },
      },
    ]);
  };

  // ── Derived data ───────────────────────────────────────────────
  const filtered = alerts.filter((a) => matchesFilter(a.type, filter));

  const counts = {
    stopped: alerts.filter((a) => matchesFilter(a.type, "stopped")).length,
    warning: alerts.filter((a) => matchesFilter(a.type, "warning")).length,
    safe: alerts.filter((a) => matchesFilter(a.type, "safe")).length,
    total: alerts.length,
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>Alerts</Text>
          <View style={styles.liveRow}>
            <Animated.View
              style={[
                styles.liveDot,
                {
                  backgroundColor: loading
                    ? "#BBBBBB"
                    : connected
                      ? "#00CC77"
                      : "#FF4444",
                },
              ]}
            />
            <Text
              style={[
                styles.liveText,
                {
                  color: loading
                    ? "#BBBBBB"
                    : connected
                      ? "#00CC77"
                      : "#FF4444",
                },
              ]}
            >
              {loading ? "Connecting…" : connected ? "LIVE" : "OFFLINE"}
            </Text>
          </View>
        </View>
        {alerts.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* ── Stats row ───────────────────────────────────────────── */}
      {!loading && alerts.length > 0 && (
        <View style={styles.statsRow}>
          <StatChip count={counts.stopped} label="Stopped" color="#FF4444" />
          <StatChip count={counts.warning} label="Warnings" color="#FF9900" />
          <StatChip count={counts.safe} label="Safe" color="#00AA55" />
          <StatChip count={counts.total} label="Total" color="#0099CC" />
        </View>
      )}

      {/* ── Filter pills ─────────────────────────────────────────── */}
      {!loading && alerts.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {FILTERS.map((f) => (
            <Pill
              key={f.key}
              label={f.label}
              active={filter === f.key}
              color={f.color}
              count={f.key !== "all" ? counts[f.key] : 0}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </ScrollView>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0099CC" />
          <Text style={styles.loadingText}>Connecting to Firebase…</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            filtered.length === 0 && { flex: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => setRefreshing(true)}
              tintColor="#0099CC"
            />
          }
        >
          {filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            filtered.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                isNew={newIds.has(alert.id)}
                onDismiss={handleDismiss}
              />
            ))
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8F4FD",
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: "#0077BB", fontWeight: "600" },
  headerMid: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5 },
  liveText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: "#FFCCCC",
  },
  clearText: { fontSize: 12, fontWeight: "700", color: "#FF4444" },

  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
  },
  statChip: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  statCount: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 9, color: "#888", marginTop: 2, fontWeight: "600" },

  pillRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#CBD8E8",
    backgroundColor: "#fff",
  },
  pillLabel: { fontSize: 13, fontWeight: "600", color: "#777" },
  pillCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  pillCountTxt: { fontSize: 10, fontWeight: "800", color: "#fff" },

  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: { fontSize: 14, color: "#888" },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 36 },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  accentBar: { width: 5 },
  iconBubble: { width: 54, alignItems: "center", justifyContent: "center" },
  iconText: { fontSize: 22 },
  cardBody: {
    flex: 1,
    paddingTop: 14,
    paddingBottom: 12,
    paddingRight: 14,
    paddingLeft: 4,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  alertType: { fontSize: 14, fontWeight: "800", flex: 1 },
  newPill: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newPillText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  alertMessage: {
    fontSize: 13,
    color: "#555",
    lineHeight: 20,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  alertTime: { fontSize: 11, color: "#AAAAAA" },
  dismissBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F3F3F3",
  },
  dismissText: { fontSize: 11, color: "#999", fontWeight: "600" },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 18 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A2E",
    marginBottom: 10,
  },
  emptySub: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
  },
});
