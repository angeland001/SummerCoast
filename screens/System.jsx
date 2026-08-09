import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import Map from "../components/Map";
import { useScreenSize, formatGridPower, getBatterySOC, getBatteryPower, getBatteryVoltage, getBatteryCurrent, getSystemStatus } from "../helper";
import VictronEnergyPanel from "../components/VictronEnergyPanel";
import EnergyFlowDiagram from "../components/EnergyFlowDiagram";
import { VictronEnergyService } from "../API/VictronEnergyService";
import BatteryCard from "../components/BatteryCard.jsx";
import { HorizontalLine, VerticalLine, ConnectionDot } from '../components/Lines.js';
import PVChargerCard from "../components/PVChargerCard.jsx";
import GlowingCard from '../components/GlowingCards.jsx';

// The tablet energy diagram (cards + connection lines) is laid out in a
// fixed 968x435 design space and scaled as one unit to fit the screen,
// so the hand-tuned line positions stay aligned on every device.
const DIAGRAM_W = 968;
const DIAGRAM_H = 435;

const System = () => {
  const isTablet = useScreenSize();
  const [victronData, setVictronData] = useState(null);
  const [energyError, setEnergyError] = useState(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(12.5);
  const [refreshing, setRefreshing] = useState(false);
  const [diagramArea, setDiagramArea] = useState(null);

  const fetchVictronData = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await VictronEnergyService.getAllData();
      setVictronData(data);
      setEnergyError(null);

      // Update battery level if available
      if (data && data.battery && data.battery.voltage) {
        setBatteryLevel(data.battery.voltage);
      }
    } catch (error) {
      console.error("Failed to load Victron data:", error);
      setEnergyError("Could not connect to the Victron system");
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Fetch Victron data when component mounts
  useEffect(() => {
    fetchVictronData();

    // Set up refresh interval
    const intervalId = setInterval(fetchVictronData, 10000); // Refresh every 10 seconds

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [fetchVictronData]);
  
  // Handle Victron panel error
  const handleEnergyError = (error) => {
    setEnergyError(error);
  };
  
  // Toggle between simple and detailed energy views
  const toggleEnergyView = () => {
    setShowDetailedView(!showDetailedView);
  };


  const diagramScale = diagramArea
    ? Math.min(diagramArea.width / DIAGRAM_W, diagramArea.height / DIAGRAM_H)
    : 1;

  // Tablet view with integrated Victron data
  if (isTablet) {
    return (
      <SafeAreaView style={styles.tabletContainer}>
        {/* ————————————— HEADER ————————————— */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerDay}>Victron System</Text>
            <Text style={styles.headerDate}>Overview</Text>
          </View>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
          />
        </View>

        {/* ————————————— DIAGRAM CONTAINER ————————————— */}
        <View
          style={styles.diagramArea}
          onLayout={(e) => setDiagramArea(e.nativeEvent.layout)}
        >
          {diagramArea && (
          <View
            style={{
              width: DIAGRAM_W * diagramScale,
              height: DIAGRAM_H * diagramScale,
            }}
          >
          <View style={[styles.diagramCanvas, { transform: [{ scale: diagramScale }] }]}>
          {/* ————————————— TOP ROW OF CARDS ————————————— */}
          <View style={styles.panelRow}>
            <GlowingCard glowColor="#D32F2F" style={styles.cardWrapper}>
              <View style={styles.redCard}>
                <View style={styles.redCardHeader}>
                  <Text style={styles.redCardHeaderText}>Grid Power</Text>
                </View>
                <Text style={styles.cardValue}>
                  {formatGridPower(victronData)}
                </Text>
              </View>
            </GlowingCard>
            
            <GlowingCard glowColor="#6CB4EE" style={styles.cardWrapper}>
              <Image
                source={require('../assets/victron.png')}
                style={styles.blueCard}
                resizeMode="cover"
              />
            </GlowingCard>
            
            <GlowingCard glowColor="#228B22" style={styles.cardWrapper}>
              <View style={styles.greenCard}>
                <View style={styles.greenCardHeader}>
                  <Text style={styles.greenCardHeaderText}>AC Loads</Text>
                </View>
                <Text style={styles.cardValue}>
                  {victronData ? `${victronData.acLoads.power}W` : "--"}
                </Text>
                <Text style={styles.cardSubtitle}>
                  L1 + L2
                </Text>
              </View>
            </GlowingCard>
          </View>

          {/* ————————————— BOTTOM ROW OF CARDS ————————————— */}
          <View style={styles.panelRow}>
            <BatteryCard>
              {victronData ? (
                <>
                  <Text style={styles.cardValue}>
                    {`${getBatterySOC(victronData)}%`}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {`${getBatteryPower(victronData)}W`}
                  </Text>
                </>
              ) : (
                <Text style={styles.cardValue}>--</Text>
              )}
            </BatteryCard>
            
            <GlowingCard glowColor="#228B22" style={styles.cardWrapper}>
              <View style={styles.darkerGreenCard}>
                <View style={styles.darkerGreenCardHeader}>
                  <Text style={styles.greenCardHeaderText}>DC Power</Text>
                </View>
                <Text style={[styles.cardValue, { top: 20 }]}>
                  {victronData ? `${victronData.dcSystem.power}W` : "--"}
                </Text>
              </View>
            </GlowingCard>
            
            <GlowingCard glowColor="#FFBF00" style={styles.cardWrapper}>
              <PVChargerCard
                power={
                  victronData
                    ? `${victronData.pvCharger.power.toFixed(0)}W`
                    : '0W'
                }
                imageSource={require('../assets/smartsolar.png')}   
                cardOffset={{ top: 10, left: 0 }}     // tweak these anytime
                imageOffset={{ top: 60, left: -74 }}   //   ″      ″
              />
            </GlowingCard>
          </View>

          {/* ————————————— CONNECTION LINES ————————————— */}
          
          {/* Red to Blue (Left to Center in top row) */}
          <ConnectionDot top={87} left={270}></ConnectionDot>
          <ConnectionDot top={88} left={402}></ConnectionDot>
          <HorizontalLine top={86} left={245} width={160}></HorizontalLine>
          
          {/* Blue to Green (Center to Right in top row) */}
          <ConnectionDot top={87} left={570}></ConnectionDot>
          <ConnectionDot top={165} left={486}></ConnectionDot>
          <ConnectionDot top={88} left={702}></ConnectionDot>
          <HorizontalLine top={86} left={560} width={200}></HorizontalLine>

          {/* Vertical line from Blue box down */}
          <VerticalLine top={140} left={485} height={130}></VerticalLine>
          <ConnectionDot top={272} left={255}></ConnectionDot>
          
          <ConnectionDot top={272} left={312}></ConnectionDot>
          <VerticalLine top={269} left={311} height={78}></VerticalLine>
          <HorizontalLine top={345} left={312} width={65}></HorizontalLine>

          <ConnectionDot top={346} left={312}></ConnectionDot>

          <HorizontalLine top={271} left={260} width={55}></HorizontalLine>
          <ConnectionDot top={346} left={365}></ConnectionDot>

          <HorizontalLine top={271} left={315} width={170}></HorizontalLine>
          <ConnectionDot top={273} left={486}></ConnectionDot>

          <HorizontalLine top={271} left={490} width={155}></HorizontalLine>
          <ConnectionDot top={273} left={646}></ConnectionDot>

          <VerticalLine top={269} left={645} height={78}></VerticalLine>
          <ConnectionDot top={346} left={647}></ConnectionDot>

          <HorizontalLine top={345} left={650} width={85}></HorizontalLine>
          </View>
          </View>
          )}
        </View>
      </SafeAreaView>
    );
  }
  
  // Enhanced Mobile view with Victron data integration
  return (
    <SafeAreaView style={styles.mobileContainer}>
      <ScrollView 
        overScrollMode="never"
        contentContainerStyle={styles.mobileContent}
        showsVerticalScrollIndicator={false}
        decelerationRate={0.8}
      >
        {/* ————————————— MOBILE HEADER ————————————— */}
        <View style={styles.mobileHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.mobileHeaderTitle}>RV Energy System</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: getSystemStatus(victronData).color }]} />
              <Text style={styles.statusText}>{getSystemStatus(victronData).status}</Text>
              {refreshing && <Text style={styles.refreshText}>Updating...</Text>}
            </View>
          </View>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.mobileLogo}
          />
        </View>

        {/* ————————————— MAIN ENERGY CARDS ————————————— */}
        <View style={styles.energyCardsContainer}>
          {/* Battery Card - Full Width */}
          <GlowingCard glowColor="#2196F3" style={styles.batteryCardWrapper}>
            <View style={styles.mobileBatteryCard}>
              <View style={styles.batteryHeader}>
                <Text style={styles.batteryHeaderText}>Battery System</Text>
                <Text style={styles.batteryTime}>
                  {victronData?.battery?.timeToGo || '--:--'}
                </Text>
              </View>
              <View style={styles.batteryMainContent}>
                <View style={styles.batteryLeft}>
                  <Text style={styles.batterySOC}>{getBatterySOC(victronData)}%</Text>
                  <Text style={styles.batterySOCLabel}>State of Charge</Text>
                </View>
                <View style={styles.batteryRight}>
                  <View style={styles.batteryStats}>
                    <Text style={styles.batteryStatValue}>{getBatteryVoltage(victronData)}V</Text>
                    <Text style={styles.batteryStatLabel}>Voltage</Text>
                  </View>
                  <View style={styles.batteryStats}>
                    <Text style={styles.batteryStatValue}>{getBatteryCurrent(victronData)}A</Text>
                    <Text style={styles.batteryStatLabel}>Current</Text>
                  </View>
                  <View style={styles.batteryStats}>
                    <Text style={[styles.batteryStatValue, { 
                      color: getBatteryPower(victronData) > 0 ? '#4CAF50' : '#FF5722' 
                    }]}>
                      {getBatteryPower(victronData)}W
                    </Text>
                    <Text style={styles.batteryStatLabel}>
                      {getBatteryPower(victronData) > 0 ? 'Charging' : 'Discharging'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </GlowingCard>

          {/* Top Row - Solar and Grid */}
          <View style={styles.topRowCards}>
            <GlowingCard glowColor="#FFBF00" style={styles.halfCardWrapper}>
              <View style={styles.solarCard}>
                <View style={styles.cardHeaderMobile}>
                  <Text style={styles.cardHeaderTextMobile}>Solar</Text>
                </View>
                <Text style={styles.cardValueMobile}>
                  {victronData ? `${victronData.pvCharger.power}W` : '--'}
                </Text>
                <Text style={styles.cardSubtitleMobile}>
                  {victronData ? `${victronData.pvCharger.dailyYield}kWh today` : '--'}
                </Text>
              </View>
            </GlowingCard>

            <GlowingCard glowColor="#D32F2F" style={styles.halfCardWrapper}>
              <View style={styles.gridCard}>
                <View style={styles.cardHeaderMobile}>
                  <Text style={styles.cardHeaderTextMobile}>Shore Power</Text>
                </View>
                <Text style={styles.cardValueMobile}>
                  {victronData && victronData.grid && victronData.grid.isConnected ? 
                    `${victronData.grid.power}W` : 'Disconnected'}
                </Text>
                {victronData && victronData.grid && victronData.grid.isConnected && (
                  <Text style={styles.cardSubtitleMobile}>
                    {victronData.grid.voltage}V • {victronData.grid.frequency}Hz
                  </Text>
                )}
              </View>
            </GlowingCard>
          </View>

          {/* Bottom Row - AC Loads and DC System */}
          <View style={styles.bottomRowCards}>
            <GlowingCard glowColor="#4CAF50" style={styles.halfCardWrapper}>
              <View style={styles.acLoadsCard}>
                <View style={styles.cardHeaderMobile}>
                  <Text style={styles.cardHeaderTextMobile}>AC Loads</Text>
                </View>
                <Text style={styles.cardValueMobile}>
                  {victronData ? `${victronData.acLoads.power}W` : '--'}
                </Text>
                <Text style={styles.cardSubtitleMobile}>
                  Appliances & Outlets
                </Text>
              </View>
            </GlowingCard>

            <GlowingCard glowColor="#9C27B0" style={styles.halfCardWrapper}>
              <View style={styles.dcSystemCard}>
                <View style={styles.cardHeaderMobile}>
                  <Text style={styles.cardHeaderTextMobile}>DC System</Text>
                </View>
                <Text style={styles.cardValueMobile}>
                  {victronData ? `${victronData.dcSystem.power}W` : '--'}
                </Text>
                <Text style={styles.cardSubtitleMobile}>
                  Lights & 12V Devices
                </Text>
              </View>
            </GlowingCard>
          </View>
        </View>

        {/* ————————————— SYSTEM OVERVIEW ————————————— */}
        <GlowingCard glowColor="#607D8B" style={styles.overviewCardWrapper}>
          <View style={styles.systemOverviewCard}>
            <Text style={styles.overviewTitle}>System Overview</Text>
            <View style={styles.overviewContent}>
              <View style={styles.overviewRow}>
                <Text style={styles.overviewLabel}>AC Input:</Text>
                <Text style={styles.overviewValue}>
                  {victronData?.systemOverview?.acInput || 'Unknown'}
                </Text>
              </View>
              <View style={styles.overviewRow}>
                <Text style={styles.overviewLabel}>System State:</Text>
                <Text style={styles.overviewValue}>
                  {victronData?.systemOverview?.state || 'Unknown'}
                </Text>
              </View>
              <View style={styles.overviewRow}>
                <Text style={styles.overviewLabel}>AC Mode:</Text>
                <Text style={styles.overviewValue}>
                  {victronData?.systemOverview?.mode || 'Unknown'}
                </Text>
              </View>
              <View style={styles.overviewRow}>
                <Text style={styles.overviewLabel}>Data Source:</Text>
                <Text style={[styles.overviewValue, { 
                  color: victronData?.apiStatus === 'connected' ? '#4CAF50' : '#FF9800' 
                }]}>
                  {victronData?.apiStatus === 'connected' ? 'Live Data' : 
                   victronData?.apiStatus === 'simulation' ? 'Simulation' : 'Cached'}
                </Text>
              </View>
            </View>
          </View>
        </GlowingCard>

        {/* ————————————— DETAILED VIEW TOGGLE ————————————— */}
        <TouchableOpacity 
          style={styles.detailToggleButton} 
          onPress={toggleEnergyView}
        >
          <Text style={styles.detailToggleText}>
            {showDetailedView ? 'Hide Details' : 'View Detailed Analysis'}
          </Text>
        </TouchableOpacity>

        {/* ————————————— DETAILED VIEW ————————————— */}
        {showDetailedView && (
          <>
            <VictronEnergyPanel 
              onError={handleEnergyError} 
              refreshInterval={10000} 
            />
            <EnergyFlowDiagram energyData={victronData} />
          </>
        )}

        {/* ————————————— MAP SECTION ————————————— */}
        <View style={styles.mapSection}>
          <Text style={styles.mapTitle}>Live Location</Text>
          <View style={styles.mapContainer}>
            <Map />
          </View>
        </View>

        {/* ————————————— ERROR STATE ————————————— */}
        {energyError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{energyError}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchVictronData}
            >
              <Text style={styles.retryText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Tablet styles (unchanged)
  tabletContainer: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerDay: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "600",
  },
  headerDate: {
    color: "#fff",
    fontSize: 16,
  },
  logo: {
    width: 70,
    height: 45,
    backgroundColor: "#fff",
    borderRadius: 8,
  },
  diagramArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagramCanvas: {
    width: DIAGRAM_W,
    height: DIAGRAM_H,
    transformOrigin: 'top left',
    position: 'relative',
  },
  panelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    zIndex: 1,
  },
  
  // Card header styles
  redCardHeader: {
    backgroundColor: '#FE6F5E',
    width: '100%',
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
    position: 'absolute',
    top: 10,
  },

  greenCardHeader: {
    backgroundColor: '#50C878',
    width: '100%',
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
    position: 'absolute',
    top: 10,
  },

  darkerGreenCardHeader: {
    backgroundColor: '#004225',
    width: '100%',
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
    position: 'absolute',
    top: 10,
  },
 
  redCardHeaderText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  greenCardHeaderText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  darkerGreenCardHeaderText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Top row cards
  redCard: {
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    width: 250,
    height: 180,
    backgroundColor: "#D32F2F",
    position: "relative",
    paddingTop: 40,
  
    // Glow
    shadowColor: "#FF6B6B",         // Soft red glow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10, // Android
  },
  
  blueCard: {
    borderRadius: 12,
    marginHorizontal: 8,
    width: 160,    // was 180
    height: 160,   // was 140
    backgroundColor: "#1976D2",
    shadowColor: "#6CB4EE",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
    overflow: "hidden",
  },
  
  greenCard: {
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    width: 250,
    height: 180,
    backgroundColor: "#388E3C",
    position: "relative",
    paddingTop: 40,
  
    // Glow
    shadowColor: "#A0FF9F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  
  darkerGreenCard: {
    marginTop: 95,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    right: 35,
    width: 220,
    height: 110,
    backgroundColor: "#1B5E20",
  
    // Glow
    shadowColor: "#66FF99",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  cardValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  cardSubtitle: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },
  victronLogo: {
    width: 80,
    height: 15,
    marginTop: 8,
    tintColor: '#fff',
  },

  // Enhanced Mobile Styles
  mobileContainer: {
    flex: 1,
    backgroundColor: "#211D1D", // Match your brown theme
  },
  mobileContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flex: 1,
  },
  mobileHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },
  refreshText: {
    color: '#FFB267',
    fontSize: 12,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  mobileLogo: {
    width: 50,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },

  // Energy Cards Container
  energyCardsContainer: {
    marginBottom: 20,
  },

  // Battery Card (Full Width)
  batteryCardWrapper: {
    marginBottom: 16,
  },
  mobileBatteryCard: {
    backgroundColor: '#1976D2',
    borderRadius: 16,
    padding: 20,
    minHeight: 140,
  },
  batteryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  batteryHeaderText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  batteryTime: {
    color: '#BBDEFB',
    fontSize: 14,
    fontWeight: '500',
  },
  batteryMainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batteryLeft: {
    flex: 1,
  },
  batterySOC: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 40,
  },
  batterySOCLabel: {
    color: '#BBDEFB',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  batteryRight: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flex: 1,
  },
  batteryStats: {
    alignItems: 'center',
  },
  batteryStatValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  batteryStatLabel: {
    color: '#BBDEFB',
    fontSize: 10,
    fontWeight: '400',
    marginTop: 2,
    textAlign: 'center',
  },

  // Top Row Cards (Solar & Grid)
  topRowCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  halfCardWrapper: {
    flex: 1,
    marginHorizontal: 6,
  },
  solarCard: {
    backgroundColor: '#FF8F00',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    justifyContent: 'center',
  },
  gridCard: {
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    justifyContent: 'center',
  },

  // Bottom Row Cards (AC Loads & DC System)
  bottomRowCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  acLoadsCard: {
    backgroundColor: '#388E3C',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    justifyContent: 'center',
  },
  dcSystemCard: {
    backgroundColor: '#7B1FA2',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    justifyContent: 'center',
  },

  // Mobile Card Common Styles
  cardHeaderMobile: {
    marginBottom: 8,
  },
  cardHeaderTextMobile: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },
  cardValueMobile: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitleMobile: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '400',
    opacity: 0.8,
  },

  // System Overview Card
  overviewCardWrapper: {
    marginBottom: 20,
  },
  systemOverviewCard: {
    backgroundColor: '#455A64',
    borderRadius: 12,
    padding: 20,
  },
  overviewTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  overviewContent: {
    gap: 12,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overviewLabel: {
    color: '#B0BEC5',
    fontSize: 14,
    fontWeight: '500',
  },
  overviewValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Detail Toggle Button
  detailToggleButton: {
    backgroundColor: '#FFB267',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  detailToggleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Map Section
  mapSection: {
    marginBottom: 20,
  },
  mapTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 200,
  },

  // Error State
  errorContainer: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },

  // Legacy styles for backward compatibility
  simplePanelContainer: {
    backgroundColor: '#211D1D',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  viewDetailText: {
    fontSize: 12,
    color: '#FFB267',
  },
  simpleEnergyData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  energyItem: {
    alignItems: 'center',
    paddingHorizontal: 5,
    marginBottom: 12,
    width: '48%', // Allow for 2 items in a row on smaller screens
  },
  energyValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  energyLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  energyDetail: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
  },
  tanksContainer: {
    backgroundColor: '#211D1D',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  }
});

export default System;