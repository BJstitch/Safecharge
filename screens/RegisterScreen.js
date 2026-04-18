// screens/RegisterScreen.js
import * as Google from "expo-auth-session/providers/google";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
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
import { loginWithGoogle, registerWithEmail } from "../services/authService";

WebBrowser.maybeCompleteAuthSession();

const IOS_CLIENT_ID =
  "892570929280-fedifbu8mpj3ao6coa4ukded4fn9gc6a.apps.googleusercontent.com";
const ANDROID_CLIENT_ID =
  "892570929280-jp03lro9rabp480vj0kp9pv2rh8rbr9v.apps.googleusercontent.com";
const WEB_CLIENT_ID =
  "892570929280-uneaif8hs8mukho6jamtvu3h2msfur6j.apps.googleusercontent.com";

const GoogleLogo = () => (
  <View style={styles.googleLogo}>
    <Text style={styles.googleLogoText}>G</Text>
  </View>
);

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest(
    {
      iosClientId: IOS_CLIENT_ID,
      androidClientId: ANDROID_CLIENT_ID,
      webClientId: WEB_CLIENT_ID,
      selectAccount: true,
    },
    { useProxy: true },
  );

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      if (!id_token) {
        Alert.alert("Error", "No ID token from Google.");
        return;
      }
      setGoogleLoading(true);
      loginWithGoogle(id_token)
        .then(() => navigation.replace("Onboarding"))
        .catch((err) => Alert.alert("Google Sign-In Failed", err.message))
        .finally(() => setGoogleLoading(false));
    } else if (response?.type === "error") {
      Alert.alert(
        "Google Error",
        response.error?.message || "Google sign-in failed.",
      );
    }
  }, [response]);

  const handleRegister = async () => {
    if (!fullName.trim())
      return Alert.alert("Required", "Please enter your full name.");
    if (!email.trim())
      return Alert.alert("Required", "Please enter your email address.");
    if (!password) return Alert.alert("Required", "Please enter a password.");
    if (password.length < 6)
      return Alert.alert("Weak Password", "Minimum 6 characters.");
    if (password !== confirm)
      return Alert.alert("Mismatch", "Passwords do not match.");

    setLoading(true);
    try {
      await registerWithEmail(email.trim(), password, fullName.trim());
      // Navigate to OTP verify screen after successful registration
      navigation.replace("VerifyCode", {
        mode: "register",
        email: email.trim().toLowerCase(),
      });
    } catch (err) {
      const msg =
        err.code === "auth/email-already-in-use"
          ? "Email already in use."
          : err.code === "auth/invalid-email"
            ? "Invalid email address."
            : err.message;
      Alert.alert("Registration Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || googleLoading;

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
        <Text style={styles.headerTitle}>Register</Text>
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join SafeCharge to monitor your charging sessions
          </Text>

          <TouchableOpacity
            style={[styles.googleBtn, isLoading && { opacity: 0.6 }]}
            onPress={() => {
              if (!isLoading && request) promptAsync({ useProxy: true });
            }}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color="#555" size="small" />
            ) : (
              <>
                <GoogleLogo />
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or register with email</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#aaa"
              value={fullName}
              onChangeText={setFullName}
              editable={!isLoading}
            />
          </View>
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
              editable={!isLoading}
            />
          </View>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Phone Number (optional)"
              placeholderTextColor="#aaa"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          </View>
          <View
            style={[
              styles.inputWrap,
              { flexDirection: "row", alignItems: "center" },
            ]}
          >
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPass((p) => !p)}
              style={styles.eyeBtn}
            >
              <Text style={styles.eyeText}>{showPass ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#aaa"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showPass}
              editable={!isLoading}
            />
          </View>
          <Text style={styles.hint}>
            Password must be at least 6 characters
          </Text>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#00CCEE", "#0088CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.registerBtn, isLoading && { opacity: 0.6 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerText}>Create Account</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.row}>
            <Text style={styles.grayText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.blueText}>Sign In</Text>
            </TouchableOpacity>
          </View>
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
  scroll: { padding: 24 },
  title: { fontSize: 26, fontWeight: "800", color: "#1A1A2E", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#888", marginBottom: 24, lineHeight: 20 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  googleLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#4285F4",
  },
  googleLogoText: { fontSize: 14, fontWeight: "900", color: "#4285F4" },
  googleText: { fontSize: 16, fontWeight: "700", color: "#333" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E0EEF8" },
  dividerText: { fontSize: 12, color: "#aaa", fontWeight: "500" },
  inputWrap: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0EEF8",
  },
  input: { height: 52, fontSize: 15, color: "#333" },
  eyeBtn: { paddingLeft: 10 },
  eyeText: { color: "#0099CC", fontWeight: "600", fontSize: 13 },
  hint: { fontSize: 12, color: "#aaa", marginBottom: 20, marginLeft: 4 },
  registerBtn: {
    borderRadius: 30,
    paddingVertical: 17,
    alignItems: "center",
    marginBottom: 20,
  },
  registerText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  row: { flexDirection: "row", justifyContent: "center" },
  grayText: { color: "#888", fontSize: 14 },
  blueText: { color: "#0077BB", fontWeight: "700", fontSize: 14 },
});
