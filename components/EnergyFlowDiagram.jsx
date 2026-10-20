import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Rect, Text as SvgText, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Wrap SVG's Circle for animation
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const EnergyFlowDiagram = ({ energyData }) => {
  if (!energyData) return null;

  const {
    battery,
    acLoads,
    pvCharger,
    dcSystem,
  } = energyData;

  const isActive = (power) => power > 0;
  const powerLabel = (watts) => (watts === 0 ? '--W' : `${Math.abs(watts)}W`);
  const isBatteryCharging = battery.current > 0;

  // Display formatting: the data source produces unrounded floats
  // (e.g. 80.89999999999995), so round at display time only.
  // SOC can arrive as 0-1 (real Victron) or 0-100 (simulation) — normalize.
  const socLabel = (() => {
    const soc = battery.soc || 0;
    const pct = soc <= 1 ? soc * 100 : soc;
    return pct.toFixed(1);
  })();
  const voltageLabel = Number(battery.voltage || 0).toFixed(1);
  const currentLabel = Number(battery.current || 0).toFixed(1);

  // Animation progress shared value
  const flowProgress = useSharedValue(0);

  useEffect(() => {
    flowProgress.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      false
    );
  }, []);

  // Animated props
  const pvToInverterProps = useAnimatedProps(() => {
    const x = 90 + (120 - 90) * flowProgress.value;
    const y = 30 + (80 - 30) * flowProgress.value;
    return { cx: x, cy: y };
  });

  const inverterToLoadsProps = useAnimatedProps(() => {
    const x = 180 + (210 - 180) * flowProgress.value;
    const y = 100 + (30 - 100) * flowProgress.value;
    return { cx: x, cy: y };
  });

  const batteryToInverterProps = useAnimatedProps(() => {
    const y = 150 + (120 - 150) * flowProgress.value;
    return { cx: 150, cy: y };
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Energy Flow</Text>
      </View>

      <View style={styles.diagramContainer}>
        <Svg height="200" width="100%" viewBox="0 0 300 200">
          {/* PV Charger */}
          <Rect
            x="10"
            y="10"
            width="80"
            height="40"
            rx="5"
            ry="5"
            fill={isActive(pvCharger.power) ? "#4CAF50" : "#333"}
          />
          <SvgText x="50" y="30" textAnchor="middle" fill="white" fontWeight="bold" fontSize="10">PV Charger</SvgText>
          <SvgText x="50" y="45" textAnchor="middle" fill="white" fontSize="10">{powerLabel(pvCharger.power)}</SvgText>

          {/* Inverter */}
          <Rect
            x="120"
            y="80"
            width="60"
            height="40"
            rx="5"
            ry="5"
            fill="#1976D2"
          />
          <SvgText x="150" y="100" textAnchor="middle" fill="white" fontWeight="bold" fontSize="10">Inverting</SvgText>
          <SvgText x="150" y="115" textAnchor="middle" fill="white" fontSize="10">{powerLabel(dcSystem.power)}</SvgText>

          {/* AC Loads */}
          <Rect
            x="210"
            y="10"
            width="80"
            height="40"
            rx="5"
            ry="5"
            fill={isActive(acLoads.power) ? "#F44336" : "#333"}
          />
          <SvgText x="250" y="30" textAnchor="middle" fill="white" fontWeight="bold" fontSize="10">AC Loads</SvgText>
          <SvgText x="250" y="45" textAnchor="middle" fill="white" fontSize="10">{powerLabel(acLoads.power)}</SvgText>

          {/* Battery */}
          <Rect
            x="120"
            y="150"
            width="60"
            height="40"
            rx="5"
            ry="5"
            fill={isBatteryCharging ? "#4CAF50" : "#FFC107"}
          />
          <SvgText x="150" y="170" textAnchor="middle" fill="black" fontWeight="bold" fontSize="10">{socLabel}%</SvgText>
          <SvgText x="150" y="185" textAnchor="middle" fill="black" fontSize="9">{voltageLabel}V {currentLabel}A</SvgText>

          {/* Lines */}
          <Line x1="90" y1="30" x2="120" y2="80" stroke="#4CAF50" strokeWidth="2" />
          <Line x1="180" y1="100" x2="210" y2="30" stroke="#F44336" strokeWidth="2" />
          <Line x1="150" y1="150" x2="150" y2="120" stroke="#FFC107" strokeWidth="2" />

          {/* Animated flow indicators */}
          <AnimatedCircle
            animatedProps={pvToInverterProps}
            r="3"
            fill={isActive(pvCharger.power) ? "#4CAF50" : "#666"}
          />
          <AnimatedCircle
            animatedProps={inverterToLoadsProps}
            r="3"
            fill={isActive(acLoads.power) ? "#F44336" : "#666"}
          />
          <AnimatedCircle
            animatedProps={batteryToInverterProps}
            r="3"
            fill={isBatteryCharging ? "#4CAF50" : "#FFC107"}
          />
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Charging/Input</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#F44336' }]} />
          <Text style={styles.legendText}>Consumption</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FFC107' }]} />
          <Text style={styles.legendText}>Discharging</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#211D1D',
    borderRadius: 15,
    padding: 16,
    marginVertical: 10,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  diagramContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    color: '#CCC',
    fontSize: 12,
  },
});

export default EnergyFlowDiagram;
