import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: 'Welcome to SafeCharge',
    description:
      'SafeCharge automatically monitors your device during charging and protects it from unsafe conditions. No manual control needed.',
    icon: 'shield',
  },
  {
    id: 2,
    title: 'Your Charging Dashboard',
    description:
      'Battery level and charging frequency\nTemperature, voltage, current readings\nSafety status at a glance',
    icon: 'dashboard',
  },
  {
    id: 3,
    title: 'Charging Status States',
    description:
      'SafeCharge evaluates readings and displays one of three states based on real-time monitoring.',
    icon: 'status',
    extras: ['✓  Safe', '⚠  Warning', '✕  Charging Stopped'],
  },
  {
    id: 4,
    title: 'Alerts & Notifications',
    description: 'Stay informed about important charging events.',
    icon: 'bell',
    extras: [
      '• Temperature Warning',
      '• Charging Stopped for Safety',
      '• Charging Completed',
      '• Stable Charging Notification',
    ],
    note: 'Alerts notify you when action is taken or required.',
  },
  {
    id: 5,
    title: 'Charging History',
    description: 'Review previous charging sessions.',
    icon: 'history',
    extras: [
      '• Session date and time',
      '• Average temperature',
      '• Maximum temperature',
      '• Charging duration',
      '• Final safety result',
    ],
    note: 'Helps you understand charging patterns and battery health.',
  },
];

const ShieldIcon = ({ color = '#00AADD', size = 100 }) => (
  <View style={{ width: size, height: size * 1.1, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size * 0.75, height: size * 0.85,
      backgroundColor: color,
      borderTopLeftRadius: size * 0.3,
      borderTopRightRadius: size * 0.3,
      borderBottomLeftRadius: size * 0.38,
      borderBottomRightRadius: size * 0.38,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <View style={{
        width: size * 0.45, height: size * 0.22,
        backgroundColor: '#fff',
        borderRadius: 4,
      }} />
    </View>
    {/* Outer glow ring */}
    <View style={{
      position: 'absolute',
      width: size * 0.9, height: size,
      borderTopLeftRadius: size * 0.35,
      borderTopRightRadius: size * 0.35,
      borderBottomLeftRadius: size * 0.45,
      borderBottomRightRadius: size * 0.45,
      borderWidth: 3, borderColor: 'rgba(0,180,255,0.2)',
    }} />
  </View>
);

const StatusIcon = () => (
  <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 16 }}>
    {/* Central green shield */}
    <View style={{
      width: 80, height: 88,
      backgroundColor: '#00CC77',
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
      alignItems: 'center', justifyContent: 'center',
      zIndex: 2,
    }}>
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800' }}>✓</Text>
    </View>
    {/* Outer light ring */}
    <View style={{
      position: 'absolute',
      width: 100, height: 110,
      borderTopLeftRadius: 30, borderTopRightRadius: 30,
      borderBottomLeftRadius: 38, borderBottomRightRadius: 38,
      borderWidth: 3, borderColor: 'rgba(0,204,119,0.2)',
      zIndex: 1,
    }} />
    {/* Warning badge left */}
    <View style={{
      position: 'absolute',
      left: -20, top: 20,
      backgroundColor: '#FF9900',
      width: 28, height: 28, borderRadius: 6,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>▲</Text>
    </View>
    {/* Danger badge right */}
    <View style={{
      position: 'absolute',
      right: -20, top: 20,
      backgroundColor: '#FF4444',
      width: 28, height: 28, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>!</Text>
    </View>
  </View>
);

const BellIcon = () => (
  <View style={{ alignItems: 'center', justifyContent: 'center', width: 100, height: 100 }}>
    <View style={{
      width: 70, height: 68,
      backgroundColor: '#00AADD',
      borderTopLeftRadius: 35, borderTopRightRadius: 35,
      borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
      alignItems: 'center',
      position: 'relative',
    }}>
      {/* notification badge */}
      <View style={{
        position: 'absolute',
        top: -8, right: -6,
        backgroundColor: '#FF4444',
        width: 22, height: 22, borderRadius: 11,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#fff',
      }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>1</Text>
      </View>
      {/* Bell handle */}
      <View style={{
        width: 10, height: 10,
        backgroundColor: '#0077AA',
        borderRadius: 5,
        marginTop: 55,
      }} />
    </View>
    {/* Sound waves */}
    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
      {[1, 2, 3].map(i => (
        <View key={i} style={{ width: 3, height: 8 * i, backgroundColor: '#00AADD', borderRadius: 2 }} />
      ))}
      {[3, 2].map((i, idx) => (
        <View key={idx} style={{ width: 3, height: 8 * i, backgroundColor: '#00AADD', borderRadius: 2 }} />
      ))}
    </View>
  </View>
);

const HistoryIcon = () => (
  <View style={{ width: 80, height: 90, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: 65, height: 80,
      backgroundColor: '#fff',
      borderRadius: 10,
      borderWidth: 2, borderColor: '#E0EEF8',
      padding: 10,
      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8,
      elevation: 3,
    }}>
      {/* chart bars */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 40, marginBottom: 8 }}>
        {[30, 45, 35, 50, 40].map((h, i) => (
          <View key={i} style={{
            flex: 1, height: h, backgroundColor: '#00AADD',
            borderRadius: 3, opacity: 0.7 + i * 0.06,
          }} />
        ))}
      </View>
      {[1, 0.6, 0.4].map((w, i) => (
        <View key={i} style={{
          height: 3, backgroundColor: '#E0EEF8',
          width: `${w * 100}%`, borderRadius: 2, marginBottom: 4,
        }} />
      ))}
    </View>
    {/* Clock overlay */}
    <View style={{
      position: 'absolute', right: -4, top: 4,
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: '#EEF6FC',
      borderWidth: 2, borderColor: '#E0EEF8',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: 12 }}>🕐</Text>
    </View>
  </View>
);

const DashboardPreview = () => (
  <View style={{ width: 200, padding: 16, backgroundColor: '#F0F7FC', borderRadius: 16, gap: 8 }}>
    {[
      { label: 'Battery', val: '-- %', color: '#0099CC' },
      { label: 'Temperature', val: '-- °C', color: '#0099CC' },
      { label: 'Voltage', val: '-- V', color: '#0099CC' },
      { label: 'Current', val: '-- A', color: '#0099CC' },
    ].map((item) => (
      <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: '#555', fontSize: 12 }}>{item.label}</Text>
        <Text style={{ color: item.color, fontWeight: '700', fontSize: 12 }}>{item.val}</Text>
      </View>
    ))}
    <View style={{ backgroundColor: '#E8F8F2', borderRadius: 8, padding: 8, alignItems: 'center', marginTop: 4 }}>
      <Text style={{ fontSize: 10, color: '#555' }}>Safety Status</Text>
      <Text style={{ fontWeight: '700', color: '#1A1A2E' }}>Safe</Text>
    </View>
  </View>
);

export default function OnboardingScreen({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);

  const goNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      navigation.navigate('Main');
    }
  };

  const skip = () => navigation.navigate('Main');

  const renderIcon = (icon) => {
    switch (icon) {
      case 'shield': return <ShieldIcon />;
      case 'status': return <StatusIcon />;
      case 'bell': return <BellIcon />;
      case 'history': return <HistoryIcon />;
      case 'dashboard': return <DashboardPreview />;
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {slides.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.iconArea}>
              {renderIcon(slide.icon)}
            </View>

            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>

            {slide.extras && slide.extras.map((extra, i) => (
              <Text key={i} style={[
                styles.extra,
                extra.startsWith('✓') ? styles.safe :
                extra.startsWith('⚠') ? styles.warning :
                extra.startsWith('✕') ? styles.danger : null
              ]}>
                {extra}
              </Text>
            ))}
            {slide.note && <Text style={styles.note}>{slide.note}</Text>}
          </View>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.footer}>
        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.footerBtns}>
          <TouchableOpacity onPress={skip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={goNext} activeOpacity={0.85} style={{ flex: 1, marginLeft: 16 }}>
            <LinearGradient
              colors={['#00CCEE', '#0088CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextBtn}
            >
              <Text style={styles.nextText}>
                {currentIndex === slides.length - 1 ? 'Done' : 'Next'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9FF',
  },
  slide: {
    width,
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 20,
  },
  iconArea: {
    alignItems: 'center',
    marginBottom: 40,
    minHeight: 130,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 14,
    lineHeight: 34,
  },
  description: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
    marginBottom: 16,
  },
  extra: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 24,
  },
  safe: { color: '#00AA55' },
  warning: { color: '#FF9900' },
  danger: { color: '#FF4444' },
  note: {
    fontSize: 13,
    color: '#888',
    marginTop: 10,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
    backgroundColor: '#F5F9FF',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  dot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD8E8',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#0099CC',
  },
  footerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipBtn: {
    width: 80,
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
  nextBtn: {
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
});