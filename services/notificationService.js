// services/notificationService.js
// Handles Expo Push Notifications setup and sending local notifications
// when the ESP32 triggers alerts via Firebase.

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { ref, update } from "firebase/database";
import { Platform } from "react-native";
import { auth, db } from "./firebase";

// ── Register device for push notifications ────────────────────────
export async function registerForPushNotificationsAsync() {
  let token;

  if (!Device.isDevice) {
    console.warn("Push notifications only work on physical devices.");
    return null;
  }

  // Check / request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Push notification permission denied.");
    return null;
  }

  // Get Expo push token
  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("Expo push token:", token);

    // Store token in Firebase so the ESP32/server can send targeted pushes
    const uid = auth.currentUser?.uid;
    if (uid && token) {
      await update(ref(db, `/users/${uid}`), { expoPushToken: token });
    }
  } catch (e) {
    console.warn("Could not get push token:", e.message);
  }

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("safecharge-alerts", {
      name: "SafeCharge Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0099CC",
      sound: "default",
    });
  }

  return token;
}

// ── Schedule a local notification immediately ─────────────────────
// Called when Firebase detects a new alert (e.g., temperature spike)
export async function sendLocalNotification({ title, body, data = {} }) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null, // fire immediately
  });
}

// ── Alert type → notification content ────────────────────────────
export function alertToNotification(alertType = "", message = "") {
  const t = alertType.toLowerCase();

  if (t.includes("stopped")) {
    return {
      title: "⛔ Charging Stopped",
      body:
        message ||
        "Charging was stopped automatically to protect your battery.",
    };
  }
  if (t.includes("warning") || t.includes("temperature")) {
    return {
      title: "⚠️ Safety Warning",
      body: message || "Temperature or voltage is elevated. Check your device.",
    };
  }
  if (t.includes("completed")) {
    return {
      title: "✅ Charging Complete",
      body: message || "Your device has finished charging.",
    };
  }
  if (t.includes("stable")) {
    return {
      title: "🔵 Charging Stable",
      body: message || "All charging parameters are within safe limits.",
    };
  }

  return { title: "SafeCharge Alert", body: message };
}
