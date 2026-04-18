// App.js
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import useAuth from "./hooks/useAuth";
import { registerForPushNotificationsAsync } from "./services/notificationService";

import AlertsScreen from "./screens/AlertsScreen";
import ChargingHistoryScreen from "./screens/ChargingHistoryScreen";
import DashboardScreen from "./screens/DashboardScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import LoginScreen from "./screens/LoginScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import RegisterScreen from "./screens/RegisterScreen";
import SafetyGuideScreen from "./screens/SafetyGuideScreen";
import SettingsScreen from "./screens/SettingsScreen";
import SplashScreen from "./screens/SplashScreen";
import VerifyCodeScreen from "./screens/VerifyCodeScreen";

// Handle notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ── Tab icons ─────────────────────────────────────────────────────
const HomeIcon = ({ color }) => (
  <View
    style={{
      alignItems: "center",
      justifyContent: "center",
      width: 26,
      height: 26,
    }}
  >
    <View
      style={{
        width: 16,
        height: 12,
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        borderWidth: 2,
        borderColor: color,
        borderBottomWidth: 0,
      }}
    />
    <View style={{ width: 1.5, height: 8, backgroundColor: color }} />
    <View
      style={{
        width: 22,
        height: 2,
        backgroundColor: color,
        position: "absolute",
        top: 0,
      }}
    />
  </View>
);

const HistoryIcon = ({ color }) => (
  <View
    style={{
      width: 22,
      height: 24,
      borderWidth: 2,
      borderColor: color,
      borderRadius: 4,
      padding: 3,
      justifyContent: "space-around",
    }}
  >
    {[0, 1, 2].map((i) => (
      <View
        key={i}
        style={{
          height: 2,
          backgroundColor: color,
          borderRadius: 1,
          width: "70%",
        }}
      />
    ))}
  </View>
);

const ShieldIcon = ({ color }) => (
  <View
    style={{
      width: 24,
      height: 26,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <View
      style={{
        width: 18,
        height: 20,
        backgroundColor: "transparent",
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        borderBottomLeftRadius: 9,
        borderBottomRightRadius: 9,
        borderWidth: 2,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 6,
          height: 1.5,
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
      <View
        style={{
          width: 1.5,
          height: 5,
          backgroundColor: color,
          borderRadius: 1,
          marginTop: -1,
        }}
      />
    </View>
  </View>
);

const GearIcon = ({ color }) => (
  <View
    style={{
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: color,
      }}
    />
    {[0, 45, 90, 135].map((deg) => (
      <View
        key={deg}
        style={{
          position: "absolute",
          width: 3,
          height: 22,
          backgroundColor: color,
          borderRadius: 1.5,
          transform: [{ rotate: `${deg}deg` }],
          opacity: 0.35,
        }}
      />
    ))}
  </View>
);

// ── Bottom tabs ───────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#E8F4FD",
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#0099CC",
        tabBarInactiveTintColor: "#B0C4D8",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginTop: 2 },
        tabBarIcon: ({ color }) => {
          if (route.name === "Dashboard") return <HomeIcon color={color} />;
          if (route.name === "History") return <HistoryIcon color={color} />;
          if (route.name === "Safety") return <ShieldIcon color={color} />;
          if (route.name === "Settings") return <GearIcon color={color} />;
          return null;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: "Monitor" }}
      />
      <Tab.Screen
        name="History"
        component={ChargingHistoryScreen}
        options={{ tabBarLabel: "History" }}
      />
      <Tab.Screen
        name="Safety"
        component={SafetyGuideScreen}
        options={{ tabBarLabel: "Safety" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: "Settings" }}
      />
    </Tab.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────────────
export default function App() {
  const { user, loading } = useAuth();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (!user) return;

    registerForPushNotificationsAsync();

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification tapped:", response);
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0099CC" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            // ── Authenticated screens ──
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="Alerts" component={AlertsScreen} />
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
            </>
          ) : (
            // ── Auth screens ──
            <>
              <Stack.Screen name="Splash" component={SplashScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
              />
              <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F7FC",
  },
});
