import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface RollingNumberProps {
  value: string;
  textStyle?: any;
}

export const RollingNumber: React.FC<RollingNumberProps> = ({ value, textStyle }) => {
  const digits = value.split('');
  
  return (
    <View style={styles.container}>
      {digits.map((digit, index) => {
        // If it's a number, render the rolling column, otherwise just text
        if (/\d/.test(digit)) {
          return (
            <DigitColumn
              key={`digit-${index}`}
              digit={parseInt(digit, 10)}
              textStyle={textStyle}
            />
          );
        }
        return (
          <Text key={`char-${index}`} style={textStyle}>
            {digit}
          </Text>
        );
      })}
    </View>
  );
};

interface DigitColumnProps {
  digit: number;
  textStyle?: any;
}

const DigitColumn: React.FC<DigitColumnProps> = ({ digit, textStyle }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const prevDigitRef = useRef(digit);
  const [displayDigits, setDisplayDigits] = useState<number[]>([digit]);

  // Compute a reasonable height from textStyle
  const fontSize = textStyle?.fontSize || 48;
  const height = fontSize * 1.2;

  useEffect(() => {
    const prev = prevDigitRef.current;
    if (prev !== digit) {
      // Build a sequence of numbers from prev to digit
      const sequence: number[] = [];
      let temp = prev;
      
      // Basic transition list (e.g., if prev is 2 and current is 6, sequence is [2, 3, 4, 5, 6])
      // To simulate rolling/falling down:
      if (prev < digit) {
        for (let i = prev; i <= digit; i++) sequence.push(i);
      } else {
        for (let i = prev; i >= digit; i--) sequence.push(i);
      }
      
      setDisplayDigits(sequence);
      
      // Start animation at 0 (showing prev)
      animatedValue.setValue(0);
      
      // Animate translate to the last element
      Animated.timing(animatedValue, {
        toValue: sequence.length - 1,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        // Cleanup to only keep the final digit
        setDisplayDigits([digit]);
        animatedValue.setValue(0);
        prevDigitRef.current = digit;
      });
    }
  }, [digit]);

  const inputRange = displayDigits.length > 1 ? displayDigits.map((_, i) => i) : [0, 1];
  const outputRange = displayDigits.length > 1 ? displayDigits.map((_, i) => -i * height) : [0, 0];

  const translateY = animatedValue.interpolate({
    inputRange,
    outputRange,
  });

  return (
    <View style={[styles.columnContainer, { height, width: fontSize * 0.65 }]}>
      <Animated.View style={{ transform: [{ translateY }] }}>
        {displayDigits.map((d, index) => (
          <View key={index} style={{ height, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={textStyle}>{d}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  columnContainer: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
