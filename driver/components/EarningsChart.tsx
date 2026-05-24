import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import Colors from "@/constants/colors";

interface EarningsChartProps {
  data: { day: string; amount: number }[];
  height?: number;
}

export function EarningsChart({ data, height = 160 }: EarningsChartProps) {
  const maxAmount = Math.max(...data.map((d) => d.amount));
  const barWidth = 28;
  const gap = 10;
  const chartWidth = data.length * (barWidth + gap) - gap;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>This Week</Text>
      <View style={styles.chartArea}>
        <Svg width={chartWidth} height={height - 30}>
          {data.map((item, index) => {
            const barHeight = (item.amount / maxAmount) * (height - 50);
            const x = index * (barWidth + gap);
            const y = height - 40 - barHeight;
            const isToday = index === data.length - 1;

            return (
              <React.Fragment key={item.day}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill={isToday ? Colors.primary : Colors.surfaceContainerHigh}
                />
              </React.Fragment>
            );
          })}
        </Svg>
        <View style={styles.labelsRow}>
          {data.map((item, index) => (
            <View key={item.day} style={{ width: barWidth, marginHorizontal: gap / 2 }}>
              <Text style={[styles.label, index === data.length - 1 && styles.labelToday]}>
                {item.day}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.05,
    marginBottom: 14,
  },
  chartArea: {
    alignItems: "center",
  },
  labelsRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
  },
  labelToday: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
});
