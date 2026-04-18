// screens/SafetyGuideScreen.js
//
// Displays:
//  • Safe temperature range bands
//  • Visual gradient bar (Safe → Warning → High Risk)
//  • Common risk factors that increase charging heat
//  • Best practices section
//
import { LinearGradient } from "expo-linear-gradient";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const TEMP_RANGES = [
  {
    range: "0°C – 45°C",
    label: "Safe",
    desc: "Optimal charging zone. All systems operating normally.",
    bg: "#E8FFF4",
    border: "#00CC77",
    text: "#00AA55",
    icon: "✓",
  },
  {
    range: "45°C – 50°C",
    label: "Warning",
    desc: "Elevated temperature. Monitor closely and reduce load.",
    bg: "#FFF8E6",
    border: "#FFAA00",
    text: "#FF9900",
    icon: "⚠",
  },
  {
    range: "Above 50°C",
    label: "High Risk",
    desc: "Dangerous. SafeCharge will stop charging automatically.",
    bg: "#FFF0F0",
    border: "#FF6666",
    text: "#FF4444",
    icon: "✕",
  },
];

const RISK_FACTORS = [
  {
    icon: "🛋️",
    title: "Soft Surfaces",
    desc: "Charging on beds or sofas traps heat underneath the device.",
  },
  {
    icon: "☀️",
    title: "Direct Sunlight",
    desc: "High room temperature or sun exposure raises ambient heat.",
  },
  {
    icon: "🔌",
    title: "Damaged Cables",
    desc: "Faulty cables or adapters cause unstable current flow.",
  },
  {
    icon: "📱",
    title: "Heavy App Usage",
    desc: "Running intensive apps while charging increases heat.",
  },
  {
    icon: "🧥",
    title: "Covered Device",
    desc: "Covering your phone while charging blocks heat dissipation.",
  },
  {
    icon: "⏳",
    title: "Overnight Charging",
    desc: "Leaving charging unattended for long periods is risky.",
  },
];

const BEST_PRACTICES = [
  "Use original or certified charging cables and adapters",
  "Charge on hard flat surfaces with good ventilation",
  "Keep the device below 45°C during charging",
  "Avoid gaming or video streaming while charging",
  "Unplug when battery reaches 80–90% for best longevity",
  "If the device gets hot, remove the case while charging",
];

const TempRangeCard = ({ item }) => (
  <View
    style={[
      styles.rangeCard,
      { backgroundColor: item.bg, borderColor: item.border },
    ]}
  >
    <View style={styles.rangeLeft}>
      <View
        style={[
          styles.rangeIconBubble,
          { backgroundColor: item.border + "33" },
        ]}
      >
        <Text style={[styles.rangeIcon, { color: item.text }]}>
          {item.icon}
        </Text>
      </View>
    </View>
    <View style={styles.rangeRight}>
      <View style={styles.rangeTitleRow}>
        <Text style={styles.rangeTemp}>{item.range}</Text>
        <View style={[styles.rangeBadge, { backgroundColor: item.border }]}>
          <Text style={styles.rangeBadgeText}>{item.label}</Text>
        </View>
      </View>
      <Text style={styles.rangeDesc}>{item.desc}</Text>
    </View>
  </View>
);

const RiskCard = ({ item }) => (
  <View style={styles.riskCard}>
    <Text style={styles.riskIcon}>{item.icon}</Text>
    <View style={styles.riskText}>
      <Text style={styles.riskTitle}>{item.title}</Text>
      <Text style={styles.riskDesc}>{item.desc}</Text>
    </View>
  </View>
);

export default function SafetyGuideScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow}>{"<"}</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Charging Safety</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hero subtitle */}
        <Text style={styles.heroSub}>
          Quick guidance to reduce overheating and unsafe charging risks.
        </Text>

        {/* ── Section 1: Temperature ranges ─────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBubble}>
              <Text style={styles.sectionEmoji}>🌡️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Safe Temperature Range</Text>
              <Text style={styles.sectionSub}>
                Use these ranges to interpret the temperature reading.
              </Text>
            </View>
          </View>

          {TEMP_RANGES.map((item) => (
            <TempRangeCard key={item.label} item={item} />
          ))}

          {/* Gradient bar */}
          <View style={styles.gradientBarWrap}>
            <View style={styles.gradientBarLabels}>
              <Text style={styles.gradLabel}>Safe</Text>
              <Text style={styles.gradLabel}>Warning</Text>
              <Text style={styles.gradLabel}>High Risk</Text>
            </View>
            <LinearGradient
              colors={["#00CC77", "#FFAA00", "#FF4444"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBar}
            />
          </View>
        </View>

        {/* ── Section 2: Risk factors ───────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View
              style={[styles.sectionIconBubble, { backgroundColor: "#FFF3E0" }]}
            >
              <Text style={styles.sectionEmoji}>⚠️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Common Risk Factors</Text>
              <Text style={styles.sectionSub}>
                These behaviors can increase heat and charging risk.
              </Text>
            </View>
          </View>

          {RISK_FACTORS.map((item) => (
            <RiskCard key={item.title} item={item} />
          ))}
        </View>

        {/* ── Section 3: Best practices ─────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View
              style={[styles.sectionIconBubble, { backgroundColor: "#E8F4FF" }]}
            >
              <Text style={styles.sectionEmoji}>✅</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Best Practices</Text>
              <Text style={styles.sectionSub}>
                Follow these tips for safe and efficient charging.
              </Text>
            </View>
          </View>

          {BEST_PRACTICES.map((tip, i) => (
            <View key={i} style={styles.practiceRow}>
              <View style={styles.practiceBullet}>
                <Text style={styles.practiceBulletText}>{i + 1}</Text>
              </View>
              <Text style={styles.practiceTip}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* ── SafeCharge note ───────────────────────────────────── */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>⚡ How SafeCharge Protects You</Text>
          <Text style={styles.noteText}>
            SafeCharge monitors your device in real time using ESP32 sensors
            (M35 temperature sensor and INA219 voltage/current sensor). When
            readings exceed safe thresholds, charging is automatically stopped
            and you receive an instant notification.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: { fontSize: 22, color: "#0077BB", fontWeight: "700" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#0077BB" },

  scroll: { flex: 1, paddingHorizontal: 16 },

  heroSub: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  sectionIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E8FFF4",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionEmoji: { fontSize: 22 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  sectionSub: { fontSize: 12, color: "#999", lineHeight: 18 },

  // Temperature range cards
  rangeCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
    alignItems: "center",
    gap: 12,
  },
  rangeLeft: { alignItems: "center", justifyContent: "center" },
  rangeIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeIcon: { fontSize: 18, fontWeight: "800" },
  rangeRight: { flex: 1 },
  rangeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  rangeTemp: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  rangeBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  rangeBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  rangeDesc: { fontSize: 12, color: "#666", lineHeight: 18 },

  // Gradient bar
  gradientBarWrap: { marginTop: 10 },
  gradientBarLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  gradLabel: { fontSize: 10, color: "#aaa", fontWeight: "600" },
  gradientBar: { height: 8, borderRadius: 4 },

  // Risk factor cards
  riskCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F7FC",
  },
  riskIcon: { fontSize: 22, marginTop: 2 },
  riskText: { flex: 1 },
  riskTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  riskDesc: { fontSize: 13, color: "#777", lineHeight: 19 },

  // Best practices
  practiceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F7FC",
  },
  practiceBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#0099CC",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  practiceBulletText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  practiceTip: { flex: 1, fontSize: 13, color: "#444", lineHeight: 20 },

  // SafeCharge note
  noteCard: {
    backgroundColor: "#EEF6FC",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#C0DFF4",
    marginBottom: 16,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0077BB",
    marginBottom: 8,
  },
  noteText: { fontSize: 13, color: "#446", lineHeight: 21 },
});
