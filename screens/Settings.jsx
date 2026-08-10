import React, { useState } from 'react';
import { StyleSheet, View, Text, SectionList, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import GroupComponent from '../components/GroupComponent';
import ToggleSwitch from '../components/ToggleSwitch.jsx';
import { Color, Gap, FontSize, FontFamily, isDarkMode } from '../GlobalStyles';
import { useScreenSize, handleSettingsToggle, handleSettingsItemPress } from '../helper';
import { useAuth } from '../context/AuthContext';
import moment from 'moment';
import { router } from 'expo-router';


const Settings = () => {
  const isTablet = useScreenSize();
  const isDark = isDarkMode;
  const { deviceName, permission, logout } = useAuth();
  const [username, setUsername] = useState(deviceName || 'Guest User');
  const [toggles, setToggles] = useState({
    pushNotifications: false,
    notifyMessages: true,
    notifyReminders: true,
    locationAccess: false,
    dataSharing: true,
    wifiEnable: true,
  });

  const onToggle = key => {
    handleSettingsToggle(key, toggles, setToggles);
  };

  const sections = [
    {
      title: 'Account',
      data: [
        { key: 'profile', label: 'Profile', type: 'link' },
        { key: 'changePassword', label: 'Change Password', type: 'link' },
        { key: 'signOut', label: 'Sign Out', type: 'action' },
      ],
    },
    {
      title: 'Notifications',
      data: [
        { key: 'pushNotifications', label: 'Push Notifications', type: 'toggle' },
        { key: 'notifyMessages', label: 'Messages', type: 'toggle' },
        { key: 'notifyReminders', label: 'Reminders', type: 'toggle' },
      ],
    },
    {
      title: 'Privacy',
      data: [
        { key: 'locationAccess', label: 'Location Access', type: 'toggle' },
        { key: 'dataSharing', label: 'Data Sharing Preferences', type: 'toggle' },
      ],
    },
    {
      title: 'Network Configuration',
      data: [
        { key: 'wifiToggle', label: 'Wi-Fi', type: 'toggle' },
        { key: 'wifiSetup', label: 'Wi-Fi Setup', type: 'link' },
        { key: 'wifiStatus', label: 'Wi-Fi Status', type: 'info' },
      ],
    },
    {
      title: 'Power Management',
      data: [
        { key: 'batteryThresholds', label: 'Battery Thresholds and Alerts', type: 'link' },
        { key: 'generatorRules', label: 'Generator Auto-Start Rules', type: 'link' },
        { key: 'shorePowerPrefs', label: 'Shore Power Preferences', type: 'link' },
        { key: 'solarOptimization', label: 'Solar Optimization Settings', type: 'link' },
      ],
    },
    {
      title: 'Display and Interface',
      data: [
        { key: 'displayBrightness', label: 'Display Brightness Control', type: 'link' },
        { key: 'layoutCustomization', label: 'Layout Customization', type: 'link' },
        { key: 'widgetConfig', label: 'Widget Configuration', type: 'link' },
      ],
    },
    {
      title: 'Feature Specific Settings',
      data: [
        { key: 'featureSettings', label: 'Open Feature Settings', type: 'link' },
      ],
    },
    {
      title: 'About',
      data: [
        { key: 'about', label: 'About This App', type: 'link' },
      ],
    },
  ];

  const handleItemPress = (item) => {
    if (item.key === 'signOut') {
      Alert.alert('Sign Out', 'Sign this device out of the RV?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
      ]);
      return;
    }
    handleSettingsItemPress(item, Alert.alert, router);
  };

  const renderTabletSettingsCard = (section) => (
    <View key={section.title} style={[styles.tabletCard, { backgroundColor: isDark ? '#1B1B1B' : Color.colorWhite }]}>
      <Text style={[styles.tabletCardTitle, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
        {section.title}
      </Text>
      {section.data.map((item, index) => (
        <View key={item.key} style={[styles.tabletCardItem, index === section.data.length - 1 && { borderBottomWidth: 0 }]}>
          {item.type === 'toggle' ? (
            <View style={styles.tabletToggleRow}>
              <Text style={[styles.tabletItemLabel, { 
                color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200,
                opacity: (['notifyMessages', 'notifyReminders'].includes(item.key) && !toggles.pushNotifications) ? 0.5 : 1
              }]}>
                {item.label}
              </Text>
              <ToggleSwitch
                isOn={(['notifyMessages', 'notifyReminders'].includes(item.key) && !toggles.pushNotifications) ? false : toggles[item.key]}
                setIsOn={() => onToggle(item.key)}
                disabled={['notifyMessages', 'notifyReminders'].includes(item.key) && !toggles.pushNotifications}
              />
            </View>
          ) : (
            <TouchableOpacity style={styles.tabletTouchableRow} onPress={() => handleItemPress(item)}>
              <Text style={[styles.tabletItemLabel, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
                {item.label}
              </Text>
              <Text style={[styles.tabletArrow, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
                {item.type === 'info' ? 'ℹ️' : '›'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );

  if (isTablet) {
    const day = moment().format('dddd');
    const date = moment().format('MMMM Do, YYYY');

    return (
      <View style={[styles.tabletContainer, { backgroundColor: isDark ? '#1B1B1B' : Color.colorWhitesmoke_100 }]}>
        {/* Header */}
        <View style={styles.tabletHeader}>
          <View style={styles.tabletHeaderLeft}>
            <Text style={[styles.tabletDay, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>{day}</Text>
            <Text style={[styles.tabletDate, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>{date}</Text>
          </View>
          <View style={styles.tabletHeaderCenter}>
            <Text style={[styles.tabletTitle, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>Settings</Text>
          </View>
          <View style={styles.tabletHeaderRight}>
            <Image source={require('../assets/SettingGearTablet.png')} style={styles.tabletLogo} />
          </View>
        </View>

        {/* Main Content */}
        <ScrollView style={styles.tabletScrollView} showsVerticalScrollIndicator={false}>
          {/* User Profile Section */}
          <View style={[styles.tabletProfileCard, { backgroundColor: isDark ? '#1B1B1B' : Color.colorWhite }]}>
            <View style={styles.tabletProfileContent}>
              <View style={styles.tabletProfileAvatar}>
                <Text style={[styles.tabletProfileInitials, { color: isDark ? Color.colorBlack : Color.colorWhite }]}>
                  {username.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.tabletProfileInfo}>
                <Text style={[styles.tabletProfileName, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
                  {username}
                </Text>
                <Text style={[styles.tabletProfileEmail, { color: isDark ? Color.colorGray_100 : Color.colorGray_100 }]}>
                  {permission ? `Signed in as ${permission}` : 'Not signed in'}
                </Text>
              </View>
              <TouchableOpacity style={styles.tabletProfileEditButton}>
                <Text style={[styles.tabletProfileEditText, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
                  Edit
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Settings Grid */}
          <View style={styles.tabletGrid}>
            <View style={styles.tabletGridColumn}>
              {sections.slice(0, Math.ceil(sections.length / 2)).map(renderTabletSettingsCard)}
            </View>
            <View style={styles.tabletGridColumn}>
              {sections.slice(Math.ceil(sections.length / 2)).map(renderTabletSettingsCard)}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.tabletFooter}>
            <Text style={[styles.tabletFooterText, { color: isDark ? "#FFFFFF" : Color.colorGray_100 }]}>
              Coast App v1.0.0 • © 2025 All rights reserved
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Mobile View
  return (
    <View style={[styles.settings, styles.settingsLayout]}>
      <View style={[styles.mobileHeader, { backgroundColor: isDark ? '#1B1B1B' : Color.colorWhitesmoke_100 }]}>
        <Text style={[styles.screenTitle, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
          Settings
        </Text>
      </View>
      
      <SectionList
        sections={sections}
        keyExtractor={item => item.key}
        stickySectionHeadersEnabled={true}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeaderContainer, { backgroundColor: isDark ? '#1B1B1B' : Color.colorWhitesmoke_100 }]}>
            <Text style={[styles.sectionHeader, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
              {title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          if (item.type === 'link' || item.type === 'action' || item.type === 'info') {
            return (
              <TouchableOpacity style={styles.row} onPress={() => handleItemPress(item)}>
                <Text style={[styles.label, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
                  {item.label}
                </Text>
                <Text style={[styles.arrow, { color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200 }]}>
                  {item.type === 'info' ? 'ℹ️' : '›'}
                </Text>
              </TouchableOpacity>
            );
          }

          if (item.type === 'toggle') {
            const notificationKeys = ['notifyMessages', 'notifyReminders'];
            const disabled = notificationKeys.includes(item.key) && !toggles.pushNotifications;

            return (
              <View style={styles.row}>
                <Text
                  style={[styles.label, {
                    color: isDark ? Color.colorWhitesmoke_100 : Color.colorGray_200,
                    opacity: disabled ? 0.5 : 1,
                  }]}
                >
                  {item.label}
                </Text>
                <View style={styles.toggleContainer}>
                  <ToggleSwitch
                    isOn={disabled ? false : toggles[item.key]}
                    setIsOn={() => onToggle(item.key)}
                    disabled={disabled}
                  />
                </View>
              </View>
            );
          }

          return null;
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.sectionListContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Mobile Styles
  settingsLayout: {
    width: '100%',
    paddingTop: 60,
    overflow: 'hidden',
  },
  settings: {
    flex: 1,
    backgroundColor: '#1B1B1B',
  },
  mobileHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: FontSize.size_13xl,
    fontFamily: FontFamily.manropeMedium,
    textAlign: 'center',
    numberOfLines: 1,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.8,
  },
  sectionHeaderContainer: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: Color.colorGray_100,
  },
  sectionHeader: {
    fontSize: FontSize.size_lg,
    fontFamily: FontFamily.manropeBold,
    fontWeight: 'bold',
  },
  sectionListContent: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 15,
    minHeight: 56,
  },
  label: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.manropeRegular,
    flex: 1,
  },
  arrow: {
    fontSize: 18,
    marginLeft: 10,
  },
  toggleContainer: {
    marginLeft: 'auto',
  },
  separator: {
    height: 1,
    backgroundColor: Color.colorGray_100,
    marginLeft: 15,
  },

  // Tablet Styles
  tabletContainer: {
    flex: 1,
    paddingTop: 40,
  },
  tabletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Color.colorGray_100,
  },
  tabletHeaderLeft: {
    flex: 1,
  },
  tabletHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  tabletHeaderRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  tabletDay: {
    fontSize: FontSize.size_5xl,
    fontFamily: FontFamily.manropeBold,
    fontWeight: 'bold',
  },
  tabletDate: {
    fontSize: FontSize.size_lg,
    fontFamily: FontFamily.manropeRegular,
    marginTop: 4,
  },
  tabletTitle: {
    fontSize: FontSize.size_9xl,
    fontFamily: FontFamily.manropeBold,
    fontWeight: 'bold',
  },
  tabletLogo: {
    width: 60,
    height: 60,
  },
  tabletScrollView: {
    flex: 1,
    paddingHorizontal: 40,
  },
  tabletProfileCard: {
    borderRadius: 16,
    padding: 24,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tabletProfileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabletProfileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Color.colorGray_200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabletProfileInitials: {
    fontSize: FontSize.size_5xl,
    fontFamily: FontFamily.manropeBold,
    fontWeight: 'bold',
  },
  tabletProfileInfo: {
    flex: 1,
    marginLeft: 20,
  },
  tabletProfileName: {
    fontSize: FontSize.size_5xl,
    fontFamily: FontFamily.manropeBold,
    fontWeight: 'bold',
  },
  tabletProfileEmail: {
    fontSize: FontSize.size_lg,
    fontFamily: FontFamily.manropeRegular,
    marginTop: 4,
  },
  tabletProfileEditButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Color.colorGray_100,
  },
  tabletProfileEditText: {
    fontSize: FontSize.size_md,
    fontFamily: FontFamily.manropeMedium,
  },
  tabletGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  tabletGridColumn: {
    flex: 1,
    gap: 20,
  },
  tabletCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tabletCardTitle: {
    fontSize: FontSize.size_3xl,
    fontFamily: FontFamily.manropeBold,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tabletCardItem: {
    borderBottomWidth: 1,
    borderBottomColor: Color.colorGray_100,
    paddingVertical: 12,
  },
  tabletToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabletTouchableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabletItemLabel: {
    fontSize: FontSize.size_lg,
    fontFamily: FontFamily.manropeRegular,
    flex: 1,
  },
  tabletArrow: {
    fontSize: 18,
    marginLeft: 10,
  },
  tabletFooter: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  tabletFooterText: {
    fontSize: FontSize.size_sm,
    fontFamily: FontFamily.manropeRegular,
    color: '#FFFFFF',
  },
});

export default Settings;