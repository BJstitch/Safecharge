// screens/ChargingHistoryScreen.js
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { subscribeHistory } from "../services/sensorService";

const getStatusStyle = (status) => {
  switch (status) {
    case "Safe":
      return { bg: "#E6FFF3", text: "#00AA55", border: "#00CC77" };
    case "Warning":
      return { bg: "#FFF8E6", text: "#FF9900", border: "#FFAA00" };
    case "Stopped":
      return { bg: "#FFEEEE", text: "#FF4444", border: "#FF6666" };
    default:
      return { bg: "#F0F7FF", text: "#0099CC", border: "#0099CC" };
  }
};

const formatDate = (ts) => {
  if (!ts) return "--";
  const d = new Date(ts < 1e12 ? ts * 1000 : ts);
  return (
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
};

const ClockIcon = () => (
  <View
    style={{
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#EEF6FC",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: "#0099CC",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: 1.5,
          height: 7,
          backgroundColor: "#0099CC",
          bottom: "50%",
          borderRadius: 1,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 1.5,
          height: 5,
          backgroundColor: "#0099CC",
          bottom: "50%",
          borderRadius: 1,
          transform: [{ rotate: "90deg" }, { translateY: -3 }],
        }}
      />
    </View>
  </View>
);

const SessionCard = ({ session }) => {
  const s = getStatusStyle(session.finalStatus || session.status);
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <ClockIcon />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.dateText}>{formatDate(session.startTime)}</Text>
        <Text style={styles.metaText}>
          Avg Temp: {session.avgTemp ?? "--"} C | Max: {session.maxTemp ?? "--"}{" "}
          C
        </Text>
        <Text style={styles.metaText}>
          Duration: {session.duration ?? "--"} min
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: s.bg, borderColor: s.border },
          ]}
        >
          <Text style={[styles.badgeText, { color: s.text }]}>
            {session.finalStatus || session.status || "Safe"}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Demo data shown when Firebase has no history yet
const DEMO = [
  {
    id: "d1",
    startTime: Date.now() - 86400000,
    avgTemp: 32,
    maxTemp: 38,
    duration: 45,
    finalStatus: "Safe",
  },
  {
    id: "d2",
    startTime: Date.now() - 172800000,
    avgTemp: 39,
    maxTemp: 44,
    duration: 30,
    finalStatus: "Warning",
  },
  {
    id: "d3",
    startTime: Date.now() - 259200000,
    avgTemp: 28,
    maxTemp: 33,
    duration: 60,
    finalStatus: "Safe",
  },
];

export default function ChargingHistoryScreen() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsub = subscribeHistory((list) => {
      setSessions(list.length > 0 ? list : DEMO);
      setLoading(false);
      setRefreshing(false);
    });
    return unsub;
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Charging History</Text>
        <Text style={styles.headerSub}>Past charging sessions and records</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#0099CC" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => setRefreshing(true)}
              tintColor="#0099CC"
            />
          }
        >
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEF6FC" },
  header: {
    backgroundColor: "#EEF6FC",
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#0099CC" },
  headerSub: { fontSize: 13, color: "#888", marginTop: 4 },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  loadingText: { color: "#888", fontSize: 14 },
  scroll: { flex: 1, paddingHorizontal: 16 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLeft: { marginRight: 14, paddingTop: 2 },
  cardContent: { flex: 1 },
  dateText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 6,
  },
  metaText: { fontSize: 13, color: "#888", marginBottom: 3 },
  badge: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 13, fontWeight: "700" },
});
