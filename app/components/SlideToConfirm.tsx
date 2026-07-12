import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface SlideToConfirmProps {
  onConfirm: () => void;
  title: string;
  colors: any;
}

const BUTTON_WIDTH = Dimensions.get('window').width - 80;
const SLIDER_WIDTH = 56;
const MAX_SLIDE = BUTTON_WIDTH - SLIDER_WIDTH - 8;

export const SlideToConfirm: React.FC<SlideToConfirmProps> = ({ onConfirm, title, colors }) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  const onConfirmRef = useRef(onConfirm);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  // Loop animation for guiding arrows
  useEffect(() => {
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 3,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (isConfirmed) return;
        let newValue = gestureState.dx;
        if (newValue < 0) newValue = 0;
        if (newValue > MAX_SLIDE) newValue = MAX_SLIDE;
        slideAnim.setValue(newValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isConfirmed) return;
        if (gestureState.dx > MAX_SLIDE * 0.8) {
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
            bounciness: 10,
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

  // Calculate chevrons opacity based on loop value
  const opacities = [0, 1, 2].map((index) => {
    return pulseAnim.interpolate({
      inputRange: [index, index + 1, index + 2],
      outputRange: [0.2, 1, 0.2],
      extrapolate: 'clamp',
    });
  });

  // Text opacity fades out as user slides it
  const textOpacity = slideAnim.interpolate({
    inputRange: [0, MAX_SLIDE * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' }]}>
      {/* Background track */}
      <View style={[styles.track, { backgroundColor: '#EEF2FF' }]}>
        <Animated.View style={[styles.guideRow, { opacity: textOpacity }]}>
          <Text style={[styles.title, { color: '#4F46E5', marginRight: 8 }]}>{title}</Text>
          <View style={styles.chevronsContainer}>
            <Animated.View style={{ opacity: opacities[0] }}>
              <Feather name="chevron-right" size={16} color="#818CF8" />
            </Animated.View>
            <Animated.View style={{ opacity: opacities[1], marginLeft: -4 }}>
              <Feather name="chevron-right" size={16} color="#4F46E5" />
            </Animated.View>
            <Animated.View style={{ opacity: opacities[2], marginLeft: -4 }}>
              <Feather name="chevron-right" size={16} color="#312E81" />
            </Animated.View>
          </View>
        </Animated.View>
      </View>

      {/* Active gradient track */}
      <Animated.View style={[styles.activeTrack, { width: activeWidth }]}>
        <LinearGradient
          colors={[colors.primary, '#8B5CF6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.activeTextContainer}>
          <View style={styles.guideRow}>
            <Text style={[styles.title, { color: '#ffffff', marginRight: 8 }]}>{title}</Text>
            <View style={[styles.chevronsContainer, { opacity: 0 }]}>
              <Animated.View>
                <Feather name="chevron-right" size={16} />
              </Animated.View>
              <Animated.View style={{ marginLeft: -4 }}>
                <Feather name="chevron-right" size={16} />
              </Animated.View>
              <Animated.View style={{ marginLeft: -4 }}>
                <Feather name="chevron-right" size={16} />
              </Animated.View>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* The draggable thumb */}
      <Animated.View
        style={[
          styles.thumb,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={[colors.primary, '#8B5CF6']}
          style={styles.thumbGradient}
        >
          <Feather name={isConfirmed ? "check" : "chevrons-right"} size={26} color="#ffffff" />
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
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 4,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  track: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: SLIDER_WIDTH / 2 + 12,
  },
  chevronsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 32,
    overflow: 'hidden',
  },
  activeTextContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  thumb: {
    width: SLIDER_WIDTH,
    height: SLIDER_WIDTH,
    borderRadius: SLIDER_WIDTH / 2,
    position: 'absolute',
    left: 4,
    top: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    backgroundColor: '#ffffff',
  },
  thumbGradient: {
    flex: 1,
    borderRadius: SLIDER_WIDTH / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
