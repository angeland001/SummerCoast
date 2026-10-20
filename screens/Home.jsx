import React, { useState, useEffect } from "react";
import { 
  StyleSheet, 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  FlatList, 
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  ScrollView,
  RefreshControl
} from "react-native";
import {
  Color,
  Border,
  FontFamily,
  FontSize,
  Gap,
  Padding,
  isDarkMode
} from "../GlobalStyles";
import { useScreenSize, getWeatherIcon, fetchHourlyWeather, formatWeatherItem } from "../helper";
import { fetchHourlyWeatherByCoords } from "../helper/weather/weatherHelpers";
import * as Location from "expo-location";
import AirCon from "./AirCon.jsx";
import ToggleSwitch from "../components/ToggleSwitch.jsx";

const { width, height } = Dimensions.get('window');

const Home = () => {
  const [showAirCon, setShowAirCon] = useState(false);
  const isTablet = useScreenSize();
  const [hourlyWeather, setHourlyWeather] = useState([]);
  const [weatherCondition, setWeatherCondition] = useState('sunny');
  const [isEnergyMode, setIsEnergyMode] = useState(false);
  const [currentTemp, setCurrentTemp] = useState(73);
  const [humidity, setHumidity] = useState(36);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [locationName, setLocationName] = useState("Chattanooga, TN");

  const toggleAirCon = () => {
    setShowAirCon(!showAirCon);
  };

  const renderWeatherItem = ({ item }) => {
    const { hour, weatherIcon, tempF } = formatWeatherItem(item);

    return (
      <View style={styles.weatherItemContainer}>
        <Text style={styles.weatherHour}>{hour}</Text>
        <Text style={styles.weatherIcon}>{weatherIcon}</Text>
        <Text style={styles.weatherTemp}>{tempF}°F</Text>
      </View>
    );
  };

  // Weather loading lives outside useEffect so both the 30-minute timer
  // and pull-to-refresh can call it.
  // Tries GPS-based weather first, falls back to Chattanooga if GPS fails.
  const loadWeatherData = async () => {
    setRefreshing(true);

    try {
      let weatherData;

      try {
        // Ask for location permission and get current GPS position
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Location permission not granted');
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const { forecasts, locationName: cityName } = await fetchHourlyWeatherByCoords(
          position.coords.latitude,
          position.coords.longitude,
          isTablet
        );

        weatherData = forecasts;
        setLocationName(cityName);
      } catch (gpsError) {
        // Permission denied or GPS unavailable — fall back to hardcoded city
        console.warn("GPS weather unavailable, falling back to Chattanooga:", gpsError.message);
        weatherData = await fetchHourlyWeather("Chattanooga", isTablet);
        setLocationName("Chattanooga, TN");
      }

      setHourlyWeather(weatherData);

      const updateTime = new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });

      setLastUpdated(updateTime);
      console.log("Weather refreshed at:", updateTime);

      // Set weather condition for the first forecast
      if (weatherData.length > 0) {
        setWeatherCondition(weatherData[0].weather[0].description);
      }
    } catch (error) {
      console.error("Error fetching weather data:", error);
      // Set fallback data
      setHourlyWeather([]);
      setWeatherCondition('partly cloudy');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWeatherData();

    // 30 minutes. For testing, temporarily set to 10 * 1000 (10 seconds)
    // and confirm the "Updated" time changes — then change it back.
    const WEATHER_REFRESH_INTERVAL = 30 * 60 * 1000;

    const weatherTimer = setInterval(() => {
      loadWeatherData();
    }, WEATHER_REFRESH_INTERVAL);

    return () => {
      clearInterval(weatherTimer);
    };
  }, [isTablet]);

  if (isTablet) {
    return (
      <SafeAreaView style={styles.overview}>
        <StatusBar 
          barStyle={isDarkMode ? "light-content" : "dark-content"} 
          backgroundColor={isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100}
        />
        <View style={styles.tabletContainer}>
          <FlatList
            data={hourlyWeather}
            renderItem={renderWeatherItem}
            keyExtractor={(item, index) => index.toString()}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.overview}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100}
      />
      
      {/* Background Image */}
      <View style={styles.imageContainer}>
        <Image
          style={styles.backgroundImage}
          contentFit="cover"
          source={require("../assets/homeImage.png")}
        />
      </View>

      {/* Main Content — ScrollView enables pull-to-refresh */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadWeatherData}
            tintColor="#FFB267"
            colors={["#FFB267"]}
            progressBackgroundColor="#1a1a1a"
          />
        }
      >
        <View style={styles.contentContainer}>
          {/* Weather Forecast Section */}
          <View style={styles.weatherContainer}>
            <View style={styles.weatherHeader}>
              <Text style={styles.weatherTitle}>Hourly Forecast</Text>
              <Text style={styles.locationText}>{locationName}</Text>
            </View>
          
          {hourlyWeather.length > 0 ? (
            <FlatList
              data={hourlyWeather}
              renderItem={renderWeatherItem}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weatherList}
            />
          ) : (
            <View style={styles.weatherPlaceholder}>
              <Text style={styles.weatherPlaceholderText}>Loading weather...</Text>
            </View>
          )}
        </View>

        {/* Control Cards */}
        <View style={styles.cardsContainer}>
          {/* Humidity/Energy Card */}
          <View style={[styles.cardCommon, styles.humidityCard]}>
            <View style={styles.cardHeader}>
              <Image
                style={styles.humidityIcon}
                contentFit="cover"
                source={require("../assets/humidity.png")}
              />
              <Text style={styles.cardValue}>{humidity}%</Text>
            </View>
            
            <Text style={styles.cardLabel}>Humidity Level</Text>
            
            <View style={styles.dividerLine} />
            
            <View style={styles.energyModeContainer}>
              <Text style={styles.energyModeLabel}>Energy Mode</Text>
              <ToggleSwitch 
                isOn={isEnergyMode} 
                setIsOn={setIsEnergyMode} 
              />
            </View>
          </View>

          {/* Temperature/AC Card */}
          <View style={[styles.cardCommon, styles.temperatureCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardValue}>{currentTemp}°F</Text>
            </View>
            
            <Text style={styles.cardLabel}>Indoor Temperature</Text>
            
            <View style={styles.dividerLine} />
            
            <TouchableOpacity 
              style={styles.acControlButton}
              onPress={toggleAirCon}
              activeOpacity={0.8}
            >
              <Text style={styles.acButtonText}>Adjust A/C</Text>
            </TouchableOpacity>
          </View>
        </View>


      </View>
      </ScrollView>

      {/* Air Con Modal Overlay */}
      {showAirCon && (
        <View style={styles.airConOverlay}>
          <View style={styles.airConContainer}>
            <AirCon onClose={toggleAirCon} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  overview: {
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    flex: 1,
  },
  
 

  // Phone Layout Styles
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.5, // Use 50% of screen height
    zIndex: 1,
  },
  
  backgroundImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  
  scrollArea: {
    flex: 1,
    zIndex: 2,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: height * 0.42,
  },
  
  // Weather Section
  weatherContainer: {
    backgroundColor: isDarkMode ? Color.colorGray_100 : Color.colorSilver,
    borderRadius: Border.br_5xl,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  weatherTitle: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: FontSize.size_mid,
    fontFamily: FontFamily.manropeSemiBold,
  },
  
  locationText: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: FontSize.textXSM_size,
    fontFamily: FontFamily.manropeRegular,
    opacity: 0.7,
  },
  
  weatherList: {
    paddingVertical: 8,
  },
  
  weatherItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginRight: 16,
    backgroundColor: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    borderRadius: Border.br_xs,
    minWidth: 70,
  },
  
  weatherHour: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: FontSize.textXSM_size,
    fontFamily: FontFamily.manropeRegular,
    marginBottom: 4,
  },
  
  weatherIcon: {
    fontSize: 24,
    marginVertical: 6,
  },
  
  weatherTemp: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: FontSize.textXSM_size,
    fontFamily: FontFamily.manropeSemiBold,
    marginTop: 4,
  },
  
  weatherPlaceholder: {
    padding: 20,
    alignItems: 'center',
  },
  
  weatherPlaceholderText: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: FontSize.textXSM_size,
    fontFamily: FontFamily.manropeRegular,
    opacity: 0.6,
  },
  
  // Control Cards
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  
  cardCommon: {
    flex: 1,
    backgroundColor: isDarkMode ? Color.colorGray_100 : Color.colorSilver,
    borderRadius: Border.br_5xl,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  humidityIcon: {
    height: 24,
    width: 24,
    marginRight: 8,
    tintColor: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
  },
  
  cardValue: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: FontSize.size_17xl,
    fontFamily: FontFamily.manropeBold,
  },
  
  cardLabel: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: FontSize.textXSM_size,
    fontFamily: FontFamily.manropeRegular,
    marginBottom: 12,
    opacity: 0.8,
  },
  
  dividerLine: {
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? Color.colorGray_200 : Color.colorDarkslategray_200,
    marginBottom: 12,
    opacity: 0.3,
  },
  
  energyModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  energyModeLabel: {
    color: isDarkMode ? Color.colorWhitesmoke_100 : Color.colorDarkslategray_200,
    fontSize: FontSize.textXSM_size,
    fontFamily: FontFamily.manropeRegular,
  },
  
  acControlButton: {
    backgroundColor: Color.colorSandybrown,
    borderRadius: Border.br_13xl,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  acButtonText: {
    color: isDarkMode ? Color.colorGray_200 : Color.colorWhitesmoke_100,
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.manropeSemiBold,
  },
  
  // Air Con Modal
  airConOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  airConContainer: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: height * 0.8,
    borderRadius: Border.br_5xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 20,
      },
    }),
  },
});

export default Home;