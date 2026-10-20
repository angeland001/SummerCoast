import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView, Switch, Alert } from "react-native";
import { Color, FontFamily } from "../GlobalStyles";
import { Feather, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import lightScheduler from '../Service/LightSchedulerService';

/**
 * Modal for scheduling lights in the RV system
 * Allows users to select individual or sets of lights and schedule them to turn on/off
 *
 * @param {Object} props Component props
 * @param {boolean} props.isVisible Controls whether the modal is visible
 * @param {Function} props.onClose Callback when modal is closed
 */
const ScheduleLightsModal = ({ isVisible, onClose }) => {
  // Light groups and names - matching LightScreenTablet organization
  const lightGroups = {
    kitchen: [
      'kitchen_lights',
      'dinette_lights',
      'under_cab_lights',
      'strip_lights',
      'awning_lights',
      'porch_lights',
      'hitch_lights'
    ],
    bedroom: [
      'bed_ovhd_light',
      'left_reading_lights',
      'right_reading_lights',
      'vibe_light'
    ],
    bathroom: [
      'bath_light',
      'vanity_light',
      'shower_lights'
    ]
  };

  const lightDisplayNames = {
    'kitchen_lights': 'Kitchen Light',
    'bath_light': 'Bathroom Light',
    'bed_ovhd_light': 'Bed Light',
    'vibe_light': 'Accent Light',
    'vanity_light': 'Vanity Light',
    'awning_lights': 'Awning Lights',
    'shower_lights': 'Shower Light',
    'under_cab_lights': 'Cabinet Light',
    'hitch_lights': 'Hitch Light',
    'porch_lights': 'Porch Light',
    'left_reading_lights': 'Left Reading Light',
    'right_reading_lights': 'Right Reading Light',
    'dinette_lights': 'Dining Light',
    'strip_lights': 'Strip Light',
    'wardrobe_lights': 'Wardrobe Light'
  };

  // State management
  const [selectedTab, setSelectedTab] = useState('individual');
  const [selectedLights, setSelectedLights] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [scheduleAction, setScheduleAction] = useState('on'); // 'on' or 'off'
  const [scheduleTime, setScheduleTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [schedules, setSchedules] = useState([]);

  // Load saved schedules from the scheduler service
  const loadSchedules = async () => {
    try {
      const saved = await lightScheduler.getSchedules();
      setSchedules(saved || []);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      setSchedules([]);
    }
  };

  // Refresh the schedule list every time the modal opens
  useEffect(() => {
    if (isVisible) {
      loadSchedules();
    }
  }, [isVisible]);

  // Delete a schedule (with confirmation)
  const handleDeleteSchedule = (schedule) => {
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await lightScheduler.deleteSchedule(schedule.id);
              await loadSchedules();
            } catch (error) {
              console.error('Failed to delete schedule:', error);
              Alert.alert('Error', `Failed to delete schedule: ${error.message}`);
            }
          }
        }
      ]
    );
  };

  // Enable / disable a schedule
  const handleToggleSchedule = async (schedule) => {
    try {
      await lightScheduler.toggleSchedule(schedule.id);
      await loadSchedules();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
      Alert.alert('Error', `Failed to update schedule: ${error.message}`);
    }
  };

  // Human-readable label for a schedule's lights
  // (shows the group name if the lights exactly match a room group)
  const getScheduleLightsLabel = (lights = []) => {
    const groupLabels = {
      kitchen: 'Kitchen & Living Area',
      bedroom: 'Bedroom',
      bathroom: 'Bathroom'
    };

    for (const [groupId, groupLights] of Object.entries(lightGroups)) {
      if (
        lights.length === groupLights.length &&
        groupLights.every(id => lights.includes(id))
      ) {
        return groupLabels[groupId];
      }
    }

    if (lights.length === 1) {
      return lightDisplayNames[lights[0]] || lights[0];
    }

    return `${lights.length} lights`;
  };

  // Format a schedule's time for display (service may store it as a string)
  const formatScheduleTime = (time) => {
    const date = new Date(time);
    if (isNaN(date.getTime())) return String(time);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get all lights in a flat array
  const getAllLights = () => {
    return [...lightGroups.kitchen, ...lightGroups.bedroom, ...lightGroups.bathroom];
  };

  // Toggle individual light selection
  const toggleLightSelection = (lightId) => {
    setSelectedLights(prev => {
      if (prev.includes(lightId)) {
        return prev.filter(id => id !== lightId);
      } else {
        return [...prev, lightId];
      }
    });
  };

  // Handle group selection
  const selectGroup = (groupName) => {
    if (selectedGroup === groupName) {
      setSelectedGroup(null);
    } else {
      setSelectedGroup(groupName);
    }
  };

  // Handle time change
  const onTimeChange = (event, selectedDate) => {
    const currentDate = selectedDate || scheduleTime;
    setShowTimePicker(Platform.OS === 'ios');
    setScheduleTime(currentDate);
  };

  // Handle schedule creation
  const handleCreateSchedule = async () => {
    let lightsToSchedule = [];

    if (selectedTab === 'individual') {
      lightsToSchedule = selectedLights;
    } else if (selectedTab === 'group' && selectedGroup) {
      lightsToSchedule = lightGroups[selectedGroup];
    }

    if (lightsToSchedule.length === 0) {
      Alert.alert('No Lights Selected', 'Please select lights to schedule');
      return;
    }

    try {
      // Create schedule using LightSchedulerService
      const result = await lightScheduler.createSchedule({
        lights: lightsToSchedule,
        action: scheduleAction,
        time: scheduleTime,
        isRepeating: isRepeating
      });

      if (result.success) {
        console.log('✅ Schedule created successfully:', result.schedule);

        // Refresh the saved schedules list
        await loadSchedules();

        // Calculate time until execution - FIXED
        const now = new Date();

        // Create a date object with today's date and the selected time
        const scheduleDateTime = new Date();
        scheduleDateTime.setHours(scheduleTime.getHours());
        scheduleDateTime.setMinutes(scheduleTime.getMinutes());
        scheduleDateTime.setSeconds(0);
        scheduleDateTime.setMilliseconds(0);

        console.log('🕐 Current time:', now.toLocaleTimeString());
        console.log('📅 Schedule time from picker:', scheduleTime.toLocaleTimeString());
        console.log('🎯 Calculated schedule datetime:', scheduleDateTime.toLocaleTimeString());

        // Calculate difference in milliseconds
        let timeDiff = scheduleDateTime.getTime() - now.getTime();
        console.log('⏱️ Time difference (ms):', timeDiff, '(minutes:', Math.floor(timeDiff / 60000), ')');

        // If the time has already passed today, it will execute tomorrow
        const isTomorrow = timeDiff < 0;
        if (isTomorrow) {
          timeDiff += 24 * 60 * 60 * 1000; // Add 24 hours
        }

        const totalSeconds = Math.floor(timeDiff / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        let timeMessage = '';
        if (isTomorrow && !isRepeating) {
          timeMessage = `The schedule will execute tomorrow at ${scheduleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
        } else if (totalSeconds < 60) {
          timeMessage = `The lights will turn ${scheduleAction} in ${totalSeconds} second${totalSeconds !== 1 ? 's' : ''}.`;
        } else if (minutes < 60) {
          timeMessage = `The lights will turn ${scheduleAction} in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
        } else if (hours < 24) {
          if (remainingMinutes > 0) {
            timeMessage = `The lights will turn ${scheduleAction} in ${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`;
          } else {
            timeMessage = `The lights will turn ${scheduleAction} in ${hours} hour${hours !== 1 ? 's' : ''}.`;
          }
        } else {
          timeMessage = `The lights will turn ${scheduleAction} at ${scheduleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
        }

        Alert.alert(
          'Schedule Created!',
          `${lightsToSchedule.length} light${lightsToSchedule.length !== 1 ? 's' : ''} scheduled to turn ${scheduleAction.toUpperCase()}\n\n` +
          `${timeMessage}\n\n` +
          `Repeating: ${isRepeating ? 'Yes (Daily)' : 'No (One-time)'}`,
          [{ text: 'OK', style: 'default' }]
        );

        // Reset and close
        resetForm();
        onClose();
      } else {
        throw new Error(result.error || 'Failed to create schedule');
      }
    } catch (error) {
      console.error('❌ Failed to create schedule:', error);
      Alert.alert(
        'Error',
        `Failed to create schedule: ${error.message}`,
        [{ text: 'OK', style: 'cancel' }]
      );
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedLights([]);
    setSelectedGroup(null);
    setScheduleAction('on');
    setScheduleTime(new Date());
    setIsRepeating(false);
    setShowTimePicker(false);
  };

  // Handle modal close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Render individual lights selection
  const renderIndividualLights = () => {
    const allLights = getAllLights();

    return (
      <View style={styles.lightsContainer}>
        {allLights.map(lightId => {
          const isSelected = selectedLights.includes(lightId);

          return (
            <TouchableOpacity
              key={lightId}
              style={[styles.lightItem, isSelected && styles.lightItemSelected]}
              onPress={() => toggleLightSelection(lightId)}
              activeOpacity={0.7}
            >
              <View style={styles.lightItemContent}>
                <View style={[styles.lightIcon, isSelected && styles.lightIconSelected]}>
                  <MaterialIcons name="lightbulb" size={20} color={isSelected ? '#1a1a1a' : 'rgba(255,255,255,0.6)'} />
                </View>
                <Text style={[styles.lightName, isSelected && styles.lightNameSelected]}>
                  {lightDisplayNames[lightId] || lightId}
                </Text>
              </View>
              {isSelected && (
                <Feather name="check-circle" size={20} color="#FFB267" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render group selection
  const renderGroupSelection = () => {
    const groups = [
      { id: 'kitchen', name: 'Kitchen & Living Area', icon: 'home', count: lightGroups.kitchen.length },
      { id: 'bedroom', name: 'Bedroom', icon: 'moon', count: lightGroups.bedroom.length },
      { id: 'bathroom', name: 'Bathroom', icon: 'droplet', count: lightGroups.bathroom.length }
    ];

    return (
      <View style={styles.groupsContainer}>
        {groups.map(group => {
          const isSelected = selectedGroup === group.id;

          return (
            <TouchableOpacity
              key={group.id}
              style={[styles.groupCard, isSelected && styles.groupCardSelected]}
              onPress={() => selectGroup(group.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.groupIconContainer, isSelected && styles.groupIconContainerSelected]}>
                <Feather name={group.icon} size={32} color={isSelected ? '#1a1a1a' : '#FFB267'} />
              </View>
              <Text style={[styles.groupName, isSelected && styles.groupNameSelected]}>
                {group.name}
              </Text>
              <Text style={[styles.groupCount, isSelected && styles.groupCountSelected]}>
                {group.count} lights
              </Text>
              {isSelected && (
                <View style={styles.selectedBadge}>
                  <Feather name="check" size={16} color="#1a1a1a" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render the saved schedules list
  const renderSavedSchedules = () => {
    if (schedules.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="clock" size={40} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyStateTitle}>No schedules yet</Text>
          <Text style={styles.emptyStateText}>
            Create one from the Individual or Groups tab
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.schedulesContainer}>
        {schedules.map(schedule => {
          const isEnabled = schedule.enabled ?? schedule.isEnabled ?? true;

          return (
            <View
              key={schedule.id}
              style={[styles.scheduleCard, !isEnabled && styles.scheduleCardDisabled]}
            >
              <View style={styles.scheduleInfo}>
                <View style={styles.scheduleTopRow}>
                  <Text style={styles.scheduleTime}>
                    {formatScheduleTime(schedule.time)}
                  </Text>
                  <View style={[
                    styles.actionBadge,
                    schedule.action === 'on' ? styles.actionBadgeOn : styles.actionBadgeOff
                  ]}>
                    <Text style={styles.actionBadgeText}>
                      {schedule.action === 'on' ? 'ON' : 'OFF'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.scheduleLights} numberOfLines={1}>
                  {getScheduleLightsLabel(schedule.lights)}
                </Text>

                <View style={styles.scheduleMetaRow}>
                  <Feather
                    name="repeat"
                    size={12}
                    color={schedule.isRepeating ? '#FFB267' : 'rgba(255,255,255,0.3)'}
                  />
                  <Text style={styles.scheduleMeta}>
                    {schedule.isRepeating ? 'Repeats daily' : 'One time'}
                    {!isEnabled ? '  ·  Paused' : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.scheduleControls}>
                <Switch
                  value={isEnabled}
                  onValueChange={() => handleToggleSchedule(schedule)}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#FFB267' }}
                  thumbColor={isEnabled ? '#fff' : '#f4f3f4'}
                />
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteSchedule(schedule)}
                >
                  <Feather name="trash-2" size={18} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.modalTitle}>Schedule Lights</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Tab Selection */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'individual' && styles.activeTab]}
              onPress={() => setSelectedTab('individual')}
            >
              <MaterialIcons name="light" size={16} color={selectedTab === 'individual' ? '#1a1a1a' : 'rgba(255,255,255,0.6)'} />
              <Text style={[styles.tabText, selectedTab === 'individual' && styles.activeTabText]}>
                Individual
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'group' && styles.activeTab]}
              onPress={() => setSelectedTab('group')}
            >
              <Feather name="grid" size={16} color={selectedTab === 'group' ? '#1a1a1a' : 'rgba(255,255,255,0.6)'} />
              <Text style={[styles.tabText, selectedTab === 'group' && styles.activeTabText]}>
                Groups
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'saved' && styles.activeTab]}
              onPress={() => setSelectedTab('saved')}
            >
              <Feather name="clock" size={16} color={selectedTab === 'saved' ? '#1a1a1a' : 'rgba(255,255,255,0.6)'} />
              <Text style={[styles.tabText, selectedTab === 'saved' && styles.activeTabText]}>
                Saved{schedules.length > 0 ? ` (${schedules.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lights Selection / Saved Schedules */}
          <ScrollView style={styles.selectionArea} showsVerticalScrollIndicator={false}>
            {selectedTab === 'individual' && renderIndividualLights()}
            {selectedTab === 'group' && renderGroupSelection()}
            {selectedTab === 'saved' && renderSavedSchedules()}
          </ScrollView>

          {/* Schedule Settings + Create Button (hidden on the Saved tab) */}
          {selectedTab !== 'saved' && (
            <>
          <View style={styles.scheduleSettings}>
            {/* Action Selection */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Action</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, scheduleAction === 'on' && styles.actionButtonActive]}
                  onPress={() => setScheduleAction('on')}
                >
                  <Feather name="sun" size={16} color={scheduleAction === 'on' ? '#1a1a1a' : 'rgba(255,255,255,0.6)'} />
                  <Text style={[styles.actionButtonText, scheduleAction === 'on' && styles.actionButtonTextActive]}>
                    Turn On
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, scheduleAction === 'off' && styles.actionButtonActive]}
                  onPress={() => setScheduleAction('off')}
                >
                  <Feather name="moon" size={16} color={scheduleAction === 'off' ? '#1a1a1a' : 'rgba(255,255,255,0.6)'} />
                  <Text style={[styles.actionButtonText, scheduleAction === 'off' && styles.actionButtonTextActive]}>
                    Turn Off
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Time Picker */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Time</Text>
              <TouchableOpacity
                style={styles.timePicker}
                onPress={() => setShowTimePicker(true)}
              >
                <Feather name="clock" size={16} color="#FFB267" />
                <Text style={styles.timeText}>
                  {scheduleTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>

            {showTimePicker && (
              <DateTimePicker
                value={scheduleTime}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={onTimeChange}
              />
            )}

            {/* Repeat Toggle */}
            <View style={styles.settingRow}>
              <View style={styles.repeatLabel}>
                <Feather name="repeat" size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.settingLabel}>Repeat Daily</Text>
              </View>
              <Switch
                value={isRepeating}
                onValueChange={setIsRepeating}
                trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#FFB267' }}
                thumbColor={isRepeating ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateSchedule}
          >
            <Feather name="calendar" size={20} color="#1a1a1a" />
            <Text style={styles.createButtonText}>Create Schedule</Text>
          </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    height: '75%', // 3/4 of screen height
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontFamily: FontFamily.latoBold,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#FFB267',
  },
  tabText: {
    fontSize: 14,
    fontFamily: FontFamily.latoBold,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },
  activeTabText: {
    color: '#1a1a1a',
  },
  selectionArea: {
    flex: 1,
    marginBottom: 20,
  },
  lightsContainer: {
    gap: 8,
  },
  lightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  lightItemSelected: {
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    borderColor: '#FFB267',
  },
  lightItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightIconSelected: {
    backgroundColor: '#FFB267',
  },
  lightName: {
    fontSize: 15,
    fontFamily: FontFamily.latoRegular,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.2,
  },
  lightNameSelected: {
    color: '#ffffff',
    fontFamily: FontFamily.latoBold,
    fontWeight: '600',
  },
  groupsContainer: {
    gap: 12,
  },
  groupCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    position: 'relative',
  },
  groupCardSelected: {
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    borderColor: '#FFB267',
  },
  groupIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  groupIconContainerSelected: {
    backgroundColor: '#FFB267',
  },
  groupName: {
    fontSize: 18,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  groupNameSelected: {
    color: '#ffffff',
  },
  groupCount: {
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.2,
  },
  groupCountSelected: {
    color: '#FFB267',
    fontFamily: FontFamily.latoBold,
    fontWeight: '600',
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFB267',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleSettings: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  actionButtonActive: {
    backgroundColor: '#FFB267',
    borderColor: '#FFD4A8',
  },
  actionButtonText: {
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },
  actionButtonTextActive: {
    color: '#1a1a1a',
    fontFamily: FontFamily.latoBold,
    fontWeight: '600',
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 178, 103, 0.15)',
    borderWidth: 1.5,
    borderColor: '#FFB267',
    gap: 8,
  },
  timeText: {
    fontSize: 15,
    fontFamily: FontFamily.latoBold,
    fontWeight: '600',
    color: '#FFB267',
    letterSpacing: 0.2,
  },
  repeatLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFB267',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#FFB267',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },

  // Saved Schedules
  schedulesContainer: {
    gap: 10,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  scheduleCardDisabled: {
    opacity: 0.5,
  },
  scheduleInfo: {
    flex: 1,
    gap: 4,
  },
  scheduleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleTime: {
    fontSize: 20,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  actionBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  actionBadgeOn: {
    backgroundColor: 'rgba(255, 178, 103, 0.2)',
  },
  actionBadgeOff: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  actionBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    color: '#FFB267',
    letterSpacing: 0.5,
  },
  scheduleLights: {
    fontSize: 14,
    fontFamily: FontFamily.latoRegular,
    color: 'rgba(255,255,255,0.8)',
  },
  scheduleMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scheduleMeta: {
    fontSize: 12,
    fontFamily: FontFamily.latoRegular,
    color: 'rgba(255,255,255,0.5)',
  },
  scheduleControls: {
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontFamily: FontFamily.latoBold,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  emptyStateText: {
    fontSize: 13,
    fontFamily: FontFamily.latoRegular,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
});

export default ScheduleLightsModal;
