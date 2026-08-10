import React from "react";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import RootNavigator from "../navigation/RootNavigator";
import TabletNavigator from "../navigation/TabletNavigator";
import { NavigationContainer } from "@react-navigation/native";
import useScreenSize from "../helper/useScreenSize";
import { AuthProvider, useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();
  const isTablet = useScreenSize();

  // Session restore in progress - show a splash instead of flashing login.
  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#FFB267" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <StatusBar hidden />
        <LoginScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar hidden />
      <NavigationContainer>
        {isTablet ? <TabletNavigator /> : <RootNavigator />}
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
});
