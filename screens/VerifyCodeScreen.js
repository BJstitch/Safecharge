// screens/VerifyCodeScreen.js
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    resendVerificationEmail,
    verifyEmailCode,
} from "../services/authService";

export default function VerifyCodeScreen({ navigation, route }) {
  const { mode = "register", email = "" } = route.params ?? {};

  const [digits, setDigits] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Fixed: create refs individually (not in array — violates hooks rules)
  const ref0 = useRef(null);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);
  const refs = [ref0, ref1, ref2, ref3];

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleDigit = (val, index) => {
    const cleaned = val.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    if (cleaned && index < 3) {
      refs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  const code = digits.join("");

  const handleVerify = async () => {
    if (code.length < 4) {
      return Alert.alert("Incomplete", "Please enter all 4 digits.");
    }
    setLoading(true);
    try {
      await verifyEmailCode(email, code, mode);
      if (mode === "register") {
        navigation.replace("Onboarding");
      } else {
        // For reset: Firebase already sent reset email link, inform user
        Alert.alert(
          "Verified ✅",
          "Check your email inbox for the password reset link. Click it to set a new password, then log in.",
          [{ text: "Go to Login", onPress: () => navigation.replace("Login") }],
        );
      }
    } catch (err) {
      Alert.alert("Verification Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await resendVerificationEmail(email, mode);
      setCountdown(60);
      Alert.alert("Sent!", `A new code has been sent to ${email}`);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setResending(false);
    }
  };

  // Fixed: safe back navigation — replace was used so no history stack
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace("Login");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Code</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>✉️</Text>
            </View>
          </View>

          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            Enter the 4-digit code sent to{"\n"}
            <Text style={styles.emailText}>{email}</Text>
          </Text>

          <View style={styles.digitsRow}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={refs[i]}
                style={[styles.digitBox, d ? styles.digitBoxFilled : null]}
                value={d}
                onChangeText={(val) => handleDigit(val, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
                editable={!loading}
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={handleVerify}
            disabled={loading || code.length < 4}
            activeOpacity={0.85}
            style={{ marginTop: 8 }}
          >
            <LinearGradient
              colors={["#00CCEE", "#0088CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.verifyBtn,
                (loading || code.length < 4) && { opacity: 0.5 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyText}>Verify</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendGray}>Didn't receive? </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={countdown > 0 || resending}
            >
              {resending ? (
                <ActivityIndicator size="small" color="#0077BB" />
              ) : (
                <Text
                  style={[
                    styles.resendLink,
                    countdown > 0 && { color: "#aaa" },
                  ]}
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EEF6FC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingTop: 50,
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
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  iconWrap: { marginBottom: 24 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  iconText: { fontSize: 36 },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A2E",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
  },
  emailText: { color: "#0077BB", fontWeight: "700" },
  digitsRow: { flexDirection: "row", gap: 14, marginBottom: 32 },
  digitBox: {
    width: 60,
    height: 68,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E0EEF8",
    fontSize: 28,
    fontWeight: "800",
    color: "#1A1A2E",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  digitBoxFilled: { borderColor: "#0099CC", backgroundColor: "#F0F9FF" },
  verifyBtn: {
    width: 280,
    borderRadius: 30,
    paddingVertical: 17,
    alignItems: "center",
    marginBottom: 24,
  },
  verifyText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  resendRow: { flexDirection: "row", alignItems: "center" },
  resendGray: { color: "#888", fontSize: 14 },
  resendLink: { color: "#0077BB", fontWeight: "700", fontSize: 14 },
});
