import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface DeliverySliderProps {
  onConfirm: () => void;
  title: string;
  colors: any;
}

const BUTTON_WIDTH = Dimensions.get('window').width - 40;
const SLIDER_WIDTH = 56;
const MAX_SLIDE = BUTTON_WIDTH - SLIDER_WIDTH - 8;

export const DeliverySlider: React.FC<DeliverySliderProps> = ({ onConfirm, title, colors }) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const wobbleAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  
  const onConfirmRef = useRef(onConfirm);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  useEffect(() => {
    // Pulse animation for the guiding arrows
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true })
      ])
    ).start();

    // Continuous shimmer effect across the text
    Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 2500, useNativeDriver: true })
    ).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Start wobble animation to simulate driving when the user grabs the scooter
        Animated.loop(
          Animated.sequence([
            Animated.timing(wobbleAnim, { toValue: -2, duration: 80, useNativeDriver: false }),
            Animated.timing(wobbleAnim, { toValue: 2, duration: 80, useNativeDriver: false })
          ])
        ).start();
      },
      onPanResponderMove: (_, gestureState) => {
        if (isConfirmed) return;
        let newValue = gestureState.dx;
        if (newValue < 0) newValue = 0;
        if (newValue > MAX_SLIDE) newValue = MAX_SLIDE;
        slideAnim.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isConfirmed) return;
        
        wobbleAnim.stopAnimation();
        wobbleAnim.setValue(0);

        if (gestureState.dx > MAX_SLIDE * 0.7) {
          Animated.spring(slideAnim, {
            toValue: MAX_SLIDE,
            useNativeDriver: false,
            bounciness: 0,
          }).start(() => {
            setIsConfirmed(true);
            onConfirmRef.current();
          });
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 12,
          }).start();
        }
      },
    })
  ).current;

  const activeWidth = slideAnim.interpolate({
    inputRange: [0, MAX_SLIDE],
    outputRange: [SLIDER_WIDTH + 8, BUTTON_WIDTH],
    extrapolate: 'clamp',
  });

  const textOpacity = slideAnim.interpolate({
    inputRange: [0, MAX_SLIDE * 0.5],
    outputRange: [1, 0.1], // Soft fade for the base text so the new vibrant track stands out
    extrapolate: 'clamp',
  });

  // Calculate the rotation based on how far they have slid (wheelie effect)
  const rotation = slideAnim.interpolate({
    inputRange: [0, MAX_SLIDE / 2, MAX_SLIDE],
    outputRange: ['0deg', '-5deg', '0deg'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
      
      {/* Target Docking Zone */}
      <View style={styles.dockZone}>
         <View style={[styles.dockCircle, { borderColor: `${colors.primary}40` }]} />
      </View>

      {/* Base Text Layer (Visible when idle) */}
      <Animated.View style={[styles.textContainer, { opacity: textOpacity }]} pointerEvents="none">
        <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
        
        {/* Shimmer Highlight */}
        <Animated.View style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(255,255,255,0.8)',
            width: 30,
            transform: [{
              translateX: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-150, 300] })
            }]
          }
        ]} />

        {/* Pulsing Chevrons */}
        <Animated.View style={{ marginLeft: 8, flexDirection: 'row', alignItems: 'center' }}>
          <Feather name="chevron-right" size={16} color={colors.primary} style={{ opacity: 0.3 }} />
          <Animated.View style={{ marginLeft: -6, transform: [{ translateX: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }) }] }}>
             <Feather name="chevron-right" size={16} color={colors.primary} style={{ opacity: 0.8 }} />
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Premium Active Track (Vibrant solid fill that masks white text) */}
      <Animated.View style={[styles.activeTrack, { width: activeWidth, backgroundColor: colors.primary, overflow: 'hidden' }]}>
         <View style={styles.maskedTextContainer}>
            <Text style={[styles.title, { color: '#ffffff' }]}>{title}</Text>
            <View style={{ marginLeft: 8, flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="check" size={18} color="#ffffff" />
            </View>
         </View>
      </Animated.View>

      {/* The Draggable Scooter Thumb */}
      <Animated.View
        style={[
          styles.thumb,
          { 
            transform: [
              { translateX: slideAnim },
              { translateY: wobbleAnim }, // Bounces up and down when dragged
              { rotate: rotation } // Leans forward slightly when dragged
            ],
            shadowColor: colors.primary,
            zIndex: 10
          }
        ]}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={isConfirmed ? ['#10B981', '#059669'] : [colors.primary, '#6366F1']}
          style={styles.thumbGradient}
        >
          <MaterialCommunityIcons 
            name={isConfirmed ? "check-bold" : "moped"} 
            size={28} 
            color="#ffffff" 
            style={{ transform: [{ translateX: isConfirmed ? 0 : 2 }] }} // Minor optical alignment
          />
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: BUTTON_WIDTH,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  dockZone: {
    position: 'absolute',
    right: 4,
    width: SLIDER_WIDTH,
    height: SLIDER_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dockCircle: {
    width: SLIDER_WIDTH - 8,
    height: SLIDER_WIDTH - 8,
    borderRadius: (SLIDER_WIDTH - 8) / 2,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  textContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  activeTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 32,
    zIndex: 5,
  },
  maskedTextContainer: {
    width: BUTTON_WIDTH,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: SLIDER_WIDTH,
    height: SLIDER_WIDTH,
    borderRadius: SLIDER_WIDTH / 2,
    position: 'absolute',
    left: 4,
    top: 4,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: '#ffffff',
  },
  thumbGradient: {
    flex: 1,
    borderRadius: SLIDER_WIDTH / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
