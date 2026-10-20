import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import { FontFamily } from "../GlobalStyles";
import { VictronEnergyService } from "../API/VictronEnergyService";

// ---- History settings ----
const STORAGE_KEY = 'energyHistory';
const SAMPLE_INTERVAL = 30 * 1000;        // sample every 30 seconds
const MAX_AGE = 24 * 60 * 60 * 1000;      // keep 24 hours of readings
const MAX_CHART_POINTS = 48;              // downsample charts to at most this many points

// Time ranges for the selector
const RANGES = {
  '1H': 1 * 60 * 60 * 1000,
  '6H': 6 * 60 * 60 * 1000,
  '24H': 24 * 60 * 60 * 1000,
};

const SystemCharts = () => {
  const { width } = useWindowDimensions();
  const [history, setHistory] = useState([]);
  const [selectedRange, setSelectedRange] = useState('1H');
  const historyRef = useRef([]);

  // Battery SOC can arrive as 0-1 (real Victron) or 0-100 (simulation).
  // Normalize to 0-100 so we never show "8960%".
  const normalizeSOC = (soc) => {
    if (soc === null || soc === undefined) return 0;
    return soc <= 1 ? soc * 100 : soc;
  };

  // ---- Load saved history, then poll and append readings ----
  useEffect(() => {
    let interval;

    const loadHistory = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const cutoff = Date.now() - MAX_AGE;
          const pruned = parsed.filter(r => r.timestamp >= cutoff);
          historyRef.current = pruned;
          setHistory(pruned);
          console.log(`EnergyCharts: loaded ${pruned.length} stored reading(s)`);
        }
      } catch (error) {
        console.error('EnergyCharts: failed to load history:', error);
      }
    };

    const sample = async () => {
      try {
        const data = await VictronEnergyService.getAllData();

        const reading = {
          timestamp: Date.now(),
          solar: data?.pvCharger?.power || 0,
          soc: normalizeSOC(data?.battery?.soc),
          grid: data?.grid?.power || 0,
          loads: data?.acLoads?.power || 0,
        };

        // Append, prune anything older than 24h, persist
        const cutoff = Date.now() - MAX_AGE;
        const updated = [...historyRef.current, reading].filter(r => r.timestamp >= cutoff);
        historyRef.current = updated;
        setHistory(updated);

        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (storageError) {
          console.warn('EnergyCharts: failed to persist history:', storageError.message);
        }
      } catch (error) {
        console.error('EnergyCharts: failed to sample Victron data:', error);
      }
    };

    loadHistory().then(() => {
      sample(); // first reading immediately
      interval = setInterval(sample, SAMPLE_INTERVAL);
    });

    return () => clearInterval(interval);
  }, []);

  // ---- Filter history to the selected range ----
  const rangeMs = RANGES[selectedRange];
  const cutoff = Date.now() - rangeMs;
  const filtered = history.filter(r => r.timestamp >= cutoff);

  // ---- Downsample to a drawable number of points (bucket averages) ----
  const downsample = (readings) => {
    if (readings.length <= MAX_CHART_POINTS) return readings;

    const bucketSize = Math.ceil(readings.length / MAX_CHART_POINTS);
    const buckets = [];

    for (let i = 0; i < readings.length; i += bucketSize) {
      const bucket = readings.slice(i, i + bucketSize);
      const avg = (key) => bucket.reduce((sum, r) => sum + r[key], 0) / bucket.length;
      buckets.push({
        timestamp: bucket[Math.floor(bucket.length / 2)].timestamp,
        solar: avg('solar'),
        soc: avg('soc'),
        grid: avg('grid'),
        loads: avg('loads'),
      });
    }

    return buckets;
  };

  const chartData = downsample(filtered);

  // ---- Min / max / average for the selected range ----
  const seriesStats = (key) => {
    if (filtered.length === 0) return { min: 0, max: 0, avg: 0 };
    const values = filtered.map(r => r[key]);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  };

  // ---- Chart labels: about 5 time labels across the x-axis ----
  const buildLabels = () => {
    const n = chartData.length;
    if (n === 0) return [];
    const labelEvery = Math.max(1, Math.floor(n / 5));
    return chartData.map((r, i) => {
      if (i % labelEvery !== 0) return '';
      const d = new Date(r.timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    });
  };

  const labels = buildLabels();
  const chartWidth = width - 40;

  const baseChartConfig = {
    backgroundGradientFrom: '#1A1A1A',
    backgroundGradientTo: '#1A1A1A',
    decimalPlaces: 0,
    labelColor: () => '#888',
    propsForDots: { r: '0' },
    propsForBackgroundLines: { stroke: '#2A2A2A' },
  };

  const chartConfigFor = (hexColor) => ({
    ...baseChartConfig,
    color: (opacity = 1) => hexColor + Math.round(opacity * 255).toString(16).padStart(2, '0'),
  });

  // ---- One chart section: title + min/max/avg + line chart ----
  const ChartSection = ({ title, dataKey, color, unit }) => {
    const stats = seriesStats(dataKey);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={[styles.colorDot, { backgroundColor: color }]} />
        </View>

        <View style={styles.statsRow}>
          <StatBox label="Min" value={`${stats.min.toFixed(unit === '%' ? 1 : 0)}${unit}`} />
          <StatBox label="Avg" value={`${stats.avg.toFixed(unit === '%' ? 1 : 0)}${unit}`} />
          <StatBox label="Max" value={`${stats.max.toFixed(unit === '%' ? 1 : 0)}${unit}`} />
        </View>

        {chartData.length >= 2 ? (
          <LineChart
            data={{
              labels,
              datasets: [{ data: chartData.map(r => r[dataKey]) }],
            }}
            width={chartWidth}
            height={200}
            chartConfig={chartConfigFor(color)}
            bezier
            withDots={false}
            withInnerLines={true}
            withOuterLines={false}
            fromZero={dataKey !== 'soc'}
            style={styles.chart}
          />
        ) : (
          <View style={styles.collectingBox}>
            <Text style={styles.collectingText}>
              Collecting data — {filtered.length} reading{filtered.length === 1 ? '' : 's'} so far
            </Text>
            <Text style={styles.collectingSubtext}>
              A new reading is sampled every 30 seconds
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.tabletContainer, { width }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Energy Charts</Text>
          <Text style={styles.subtitle}>
            Victron time-series history · {filtered.length} readings in range
          </Text>
        </View>

        {/* Time Range Selector */}
        <View style={styles.rangeSelector}>
          {Object.keys(RANGES).map(range => (
            <TouchableOpacity
              key={range}
              style={[styles.rangeButton, selectedRange === range && styles.rangeButtonActive]}
              onPress={() => setSelectedRange(range)}
            >
              <Text style={[styles.rangeText, selectedRange === range && styles.rangeTextActive]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* The four required charts */}
        <ChartSection title="Solar (PV) Output" dataKey="solar" color="#FFD700" unit="W" />
        <ChartSection title="Battery State of Charge" dataKey="soc" color="#2196F3" unit="%" />
        <ChartSection title="Grid (Shore Power) Draw" dataKey="grid" color="#F44336" unit="W" />
        <ChartSection title="AC Load Consumption" dataKey="loads" color="#4CAF50" unit="W" />
      </ScrollView>
    </View>
  );
};

// Small stat display box
const StatBox = ({ label, value }) => (
  <View style={styles.statBox}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  tabletContainer: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 32,
    fontFamily: FontFamily.latoRegular,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    color: '#AAA',
  },

  // Range selector
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
  },
  rangeButtonActive: {
    backgroundColor: '#FFB267',
  },
  rangeText: {
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
  },
  rangeTextActive: {
    color: '#1a1a1a',
  },

  // Chart sections
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '700',
    color: '#FFF',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FontFamily.latoRegular,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontFamily: FontFamily.latoRegular,
    fontWeight: '700',
    color: '#FFF',
  },

  // Charts
  chart: {
    borderRadius: 12,
  },
  collectingBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 40,
    alignItems: 'center',
    gap: 6,
  },
  collectingText: {
    fontSize: 15,
    fontFamily: FontFamily.latoRegular,
    color: '#AAA',
    fontWeight: '600',
  },
  collectingSubtext: {
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    color: '#666',
  },
});

export default SystemCharts;
