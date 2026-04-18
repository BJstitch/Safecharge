// screens/SettingsScreen.js
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  changePassword,
  logout,
  updateDisplayName,
} from "../services/authService";
import { auth } from "../services/firebase";

const Row = ({ label, onPress }) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowArrow}>{">"}</Text>
  </TouchableOpacity>
);

const Toggle = ({ label, value, onToggle }) => (
  <TouchableOpacity style={styles.row} onPress={onToggle} activeOpacity={0.8}>
    <Text style={styles.rowLabel}>{label}</Text>
    <View style={[styles.checkbox, value && styles.checkboxOn]}>
      {value && <Text style={styles.checkmark}>ok</Text>}
    </View>
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }) {
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(false);

  const user = auth.currentUser;
  const displayName = user?.displayName || "User";
  const email = user?.email || "";
  const initial = displayName.charAt(0).toUpperCase();

  const handleEditProfile = () => {
    Alert.prompt(
      "Edit Name",
      "Enter your new display name:",
      async (newName) => {
        if (!newName?.trim()) return;
        setLoading(true);
        try {
          await updateDisplayName(newName.trim());
          Alert.alert("Updated", "Your name has been updated.");
        } catch (err) {
          Alert.alert("Error", err.message);
        } finally {
          setLoading(false);
        }
      },
      "plain-text",
      displayName,
    );
  };

  const handleChangePassword = () => {
    Alert.prompt(
      "Current Password",
      "Enter your current password to continue:",
      (current) => {
        if (!current) return;
        Alert.prompt(
          "New Password",
          "Enter your new password (min 6 characters):",
          async (newPass) => {
            if (!newPass || newPass.length < 6) {
              return Alert.alert(
                "Too Short",
                "Password must be at least 6 characters.",
              );
            }
            setLoading(true);
            try {
              await changePassword(current, newPass);
              Alert.alert("Done", "Your password has been updated.");
            } catch (err) {
              const msg =
                err.code === "auth/wrong-password"
                  ? "Current password is incorrect."
                  : err.code === "auth/requires-recent-login"
                    ? "Please log out and log in again first."
                    : err.message;
              Alert.alert("Error", msg);
            } finally {
              setLoading(false);
            }
          },
          "secure-text",
        );
      },
      "secure-text",
    );
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await logout();
          } catch (err) {
            Alert.alert("Error", err.message);
          } finally {
            setLoading(false);
          }
          // Firebase auth state updates → App.js shows AuthStack automatically
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#0099CC" />
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}
      >
        {/* User info */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{email}</Text>
          </View>
        </View>

        {/* Account */}
        <Text style={styles.section}>Account Settings</Text>
        <View style={styles.card}>
          <Row label="Edit Profile" onPress={handleEditProfile} />
          <View style={styles.divider} />
          <Row label="Change Password" onPress={handleChangePassword} />
        </View>

        {/* Preferences */}
        <Text style={styles.section}>Preferences</Text>
        <View style={styles.card}>
          <Toggle
            label="Push Notifications"
            value={notifications}
            onToggle={() => setNotifications((p) => !p)}
          />
        </View>

        {/* More */}
        <Text style={styles.section}>More</Text>
        <View style={styles.card}>
          <Row
            label="Help and Guide"
            onPress={() =>
              Alert.alert(
                "Help",
                "SafeCharge monitors your battery in real time to keep it safe.",
              )
            }
          />
          <View style={styles.divider} />
          <Row
            label="About SafeCharge"
            onPress={() =>
              Alert.alert(
                "About",
                "SafeCharge v1.0\nBuilt for battery safety monitoring.",
              )
            }
          />
          <View style={styles.divider} />
          <Row
            label="Privacy Policy"
            onPress={() =>
              Alert.alert(
                "Privacy Policy",
                "We do not share your data with third parties.",
              )
            }
          />
          <View style={styles.divider} />
          <Row
            label="Terms and Conditions"
            onPress={() =>
              Alert.alert(
                "Terms",
                "By using SafeCharge you agree to our terms of service.",
              )
            }
          />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutCard}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>Log Out</Text>
          <Text style={styles.logoutArrow}>{">"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7FC" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99,
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E8F4FD",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#0099CC" },
  scroll: { flex: 1, padding: 16 },
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0099CC",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  userName: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },
  userEmail: { fontSize: 13, color: "#888", marginTop: 2 },
  section: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0099CC",
    marginBottom: 10,
    marginTop: 4,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 17,
  },
  rowLabel: { fontSize: 15, color: "#1A1A2E" },
  rowArrow: { fontSize: 18, color: "#aaa" },
  divider: { height: 1, backgroundColor: "#F0F7FC", marginHorizontal: 16 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: "#0077CC", borderColor: "#0077CC" },
  checkmark: { color: "#fff", fontSize: 10, fontWeight: "700" },
  logoutCard: {
    backgroundColor: "#FFF0F0",
    borderRadius: 16,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#FFCCCC",
  },
  logoutText: { fontSize: 16, fontWeight: "700", color: "#FF4444" },
  logoutArrow: { fontSize: 18, color: "#FF4444" },
});
