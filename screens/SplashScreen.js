import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const LightningIcon = () => (
  <View style={styles.iconContainer}>
    <View style={styles.boltOuter}>
      {/* Lightning bolt using Views */}
      <View style={styles.boltTop} />
      <View style={styles.boltBottom} />
    </View>
  </View>
);

export default function SplashScreen({ navigation }) {
  return (
    <LinearGradient
      colors={['#33CCFF', '#0066BB', '#0044AA']}
      style={styles.container}
      start={{ x: 0.3, y: 0 }}
      end={{ x: 0.7, y: 1 }}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        {/* Lightning Bolt Icon */}
        <View style={styles.iconWrapper}>
          <Bolt />
        </View>

        {/* Title */}
        <Text style={styles.title}>SAFECHARGE</Text>
        <Text style={styles.subtitle}>Smart. Safe. Efficient.</Text>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.85}
          >
            <Text style={styles.registerText}>Register</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const Bolt = () => (
  <View style={{ alignItems: 'center', justifyContent: 'center', width: 80, height: 80 }}>
    {/* SVG-like lightning bolt using clipped views */}
    <View style={{
      width: 0, height: 0,
      borderStyle: 'solid',
      borderLeftWidth: 22, borderRightWidth: 8,
      borderTopWidth: 0, borderBottomWidth: 45,
      borderLeftColor: 'transparent', borderRightColor: 'transparent',
      borderBottomColor: 'rgba(100,220,255,0.9)',
      marginBottom: -8,
      marginLeft: 10,
    }} />
    <View style={{
      width: 0, height: 0,
      borderStyle: 'solid',
      borderLeftWidth: 8, borderRightWidth: 22,
      borderTopWidth: 45, borderBottomWidth: 0,
      borderLeftColor: 'transparent', borderRightColor: 'transparent',
      borderTopColor: 'rgba(100,220,255,0.9)',
      marginTop: -8,
      marginRight: 10,
    }} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconWrapper: {
    marginBottom: 30,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 3,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 60,
    letterSpacing: 0.5,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  registerBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  registerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  loginBtn: {
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginText: {
    color: '#0077BB',
    fontWeight: '700',
    fontSize: 17,
  },
});