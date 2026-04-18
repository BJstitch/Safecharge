// screens/ForgotPasswordScreen.js
//
// Flow:
//   1. User enters email → tap "Send Code"
//   2. We generate a 4-digit OTP, store it in Firebase /otps/{sanitisedEmail}
//      with a 10-minute TTL, and send a password-reset email via Firebase Auth
//      (Firebase Auth's resetPassword also delivers the reset link; the OTP is
//       our in-app verification layer on top).
//   3. Navigate to VerifyCodeScreen with mode="reset"
//   4. After code verified → ResetPasswordScreen (change password)
//
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { sendPasswordResetWithCode } from "../services/authService";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed)
      return Alert.alert("Required", "Please enter your email address.");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return Alert.alert(
        "Invalid Email",
        "Please enter a valid email address.",
      );
    }

    setLoading(true);
    try {
      await sendPasswordResetWithCode(trimmed);
      navigation.navigate("VerifyCode", { mode: "reset", email: trimmed });
    } catch (err) {
      const msg =
        err.code === "auth/user-not-found"
          ? "No account found with this email."
          : err.code === "auth/invalid-email"
            ? "Invalid email address."
            : err.message;
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forgot Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon */}
          <View style={styles.iconWrap}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🔑</Text>
            </View>
          </View>

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter the email address linked to your account and we'll send a
            4-digit verification code.
          </Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            onPress={handleSend}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#00CCEE", "#0088CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.sendBtn, loading && { opacity: 0.6 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendText}>Send Code</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToLogin}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
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

  scroll: { padding: 28, paddingTop: 32, alignItems: "center" },

  iconWrap: { marginBottom: 28 },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  iconEmoji: { fontSize: 40 },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1A1A2E",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },

  inputWrap: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0EEF8",
  },
  input: { height: 52, fontSize: 15, color: "#333" },

  sendBtn: {
    width: 280,
    borderRadius: 30,
    paddingVertical: 17,
    alignItems: "center",
    marginBottom: 20,
  },
  sendText: { color: "#fff", fontWeight: "700", fontSize: 17 },

  backToLogin: { paddingVertical: 8 },
  backToLoginText: { color: "#0077BB", fontWeight: "600", fontSize: 14 },
});
