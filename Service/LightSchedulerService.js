// Service/LightSchedulerService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightControlService } from './LightControlService';

const STORAGE_KEY = '@light_schedules';

class LightSchedulerService {
  constructor() {
    this.schedules = [];
    this.timers = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the scheduler by loading saved schedules
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🔄 Initializing LightSchedulerService...');
      await this.loadSchedules();
      this.initialized = true;
      console.log('✅ LightSchedulerService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize LightSchedulerService:', error);
    }
  }

  /**
   * Load schedules from AsyncStorage
   */
  async loadSchedules() {
    try {
      const savedSchedules = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedSchedules) {
        this.schedules = JSON.parse(savedSchedules);
        console.log(`📥 Loaded ${this.schedules.length} schedule(s)`);

        // Reschedule all active schedules
        this.schedules.forEach(schedule => {
          if (schedule.enabled !== false) {
            this.scheduleExecution(schedule);
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to load schedules:', error);
    }
  }

  /**
   * Save schedules to AsyncStorage
   */
  async saveSchedules() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.schedules));
      console.log('💾 Schedules saved');
    } catch (error) {
      console.error('❌ Failed to save schedules:', error);
    }
  }

  /**
   * Create a new schedule
   * @param {Object} scheduleData - Schedule configuration
   * @returns {Object} Created schedule
   */
  async createSchedule(scheduleData) {
    try {
      console.log('📅 Creating new schedule:', scheduleData);

      const schedule = {
        id: Date.now().toString(),
        lights: scheduleData.lights,
        action: scheduleData.action, // 'on' or 'off'
        time: scheduleData.time instanceof Date ? scheduleData.time.toISOString() : scheduleData.time,
        isRepeating: scheduleData.isRepeating || false,
        enabled: true,
        createdAt: new Date().toISOString(),
        lastExecuted: null,
      };

      this.schedules.push(schedule);
      await this.saveSchedules();

      // Schedule the execution
      this.scheduleExecution(schedule);

      console.log('✅ Schedule created:', schedule.id);
      return { success: true, schedule };
    } catch (error) {
      console.error('❌ Failed to create schedule:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule the execution of a schedule
   * @param {Object} schedule - Schedule to execute
   */
  scheduleExecution(schedule) {
    try {
      const scheduleTime = new Date(schedule.time);
      const now = new Date();

      // Calculate time until execution
      let timeUntilExecution = scheduleTime.getTime() - now.getTime();

      // If the schedule is for today but the time has passed, and it's repeating, schedule for tomorrow
      if (timeUntilExecution < 0 && schedule.isRepeating) {
        // Add 24 hours
        timeUntilExecution += 24 * 60 * 60 * 1000;
      }

      // If still negative (one-time schedule that has passed), don't schedule
      if (timeUntilExecution < 0) {
        console.log(`⏭️ Schedule ${schedule.id} time has passed, skipping`);
        return;
      }

      console.log(`⏰ Scheduling execution for ${schedule.id} in ${Math.round(timeUntilExecution / 1000)}s`);

      // Clear existing timer if any
      if (this.timers.has(schedule.id)) {
        clearTimeout(this.timers.get(schedule.id));
      }

      // Set new timer
      const timerId = setTimeout(() => {
        this.executeSchedule(schedule);
      }, timeUntilExecution);

      this.timers.set(schedule.id, timerId);
    } catch (error) {
      console.error(`❌ Failed to schedule execution for ${schedule.id}:`, error);
    }
  }

  /**
   * Execute a schedule
   * @param {Object} schedule - Schedule to execute
   */
  async executeSchedule(schedule) {
    try {
      console.log(`🎬 Executing schedule ${schedule.id}:`, schedule.action, schedule.lights);

      // Execute the action for each light
      const results = await Promise.allSettled(
        schedule.lights.map(async (lightId) => {
          if (schedule.action === 'on') {
            return await LightControlService.turnOnLight(lightId);
          } else {
            return await LightControlService.turnOffLight(lightId);
          }
        })
      );

      // Count successes and failures
      const successes = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
      const failures = results.length - successes;

      console.log(`✅ Schedule executed: ${successes} success, ${failures} failures`);

      // Update last executed time
      const scheduleIndex = this.schedules.findIndex(s => s.id === schedule.id);
      if (scheduleIndex !== -1) {
        this.schedules[scheduleIndex].lastExecuted = new Date().toISOString();
        await this.saveSchedules();
      }

      // If repeating, reschedule for tomorrow
      if (schedule.isRepeating) {
        console.log(`🔁 Rescheduling repeating schedule ${schedule.id}`);
        const nextTime = new Date(schedule.time);
        nextTime.setDate(nextTime.getDate() + 1);

        const updatedSchedule = {
          ...schedule,
          time: nextTime.toISOString()
        };

        // Update schedule time
        const idx = this.schedules.findIndex(s => s.id === schedule.id);
        if (idx !== -1) {
          this.schedules[idx].time = nextTime.toISOString();
          await this.saveSchedules();
        }

        this.scheduleExecution(updatedSchedule);
      } else {
        // One-time schedule, disable it
        const idx = this.schedules.findIndex(s => s.id === schedule.id);
        if (idx !== -1) {
          this.schedules[idx].enabled = false;
          await this.saveSchedules();
        }
      }

      return { success: true, results };
    } catch (error) {
      console.error(`❌ Failed to execute schedule ${schedule.id}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a schedule
   * @param {string} scheduleId - ID of schedule to delete
   */
  async deleteSchedule(scheduleId) {
    try {
      console.log(`🗑️ Deleting schedule ${scheduleId}`);

      // Clear timer
      if (this.timers.has(scheduleId)) {
        clearTimeout(this.timers.get(scheduleId));
        this.timers.delete(scheduleId);
      }

      // Remove from schedules
      this.schedules = this.schedules.filter(s => s.id !== scheduleId);
      await this.saveSchedules();

      console.log('✅ Schedule deleted');
      return { success: true };
    } catch (error) {
      console.error(`❌ Failed to delete schedule ${scheduleId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Toggle schedule enabled state
   * @param {string} scheduleId - ID of schedule to toggle
   */
  async toggleSchedule(scheduleId) {
    try {
      const schedule = this.schedules.find(s => s.id === scheduleId);
      if (!schedule) {
        throw new Error('Schedule not found');
      }

      schedule.enabled = !schedule.enabled;

      if (schedule.enabled) {
        // Re-schedule execution
        this.scheduleExecution(schedule);
      } else {
        // Clear timer
        if (this.timers.has(scheduleId)) {
          clearTimeout(this.timers.get(scheduleId));
          this.timers.delete(scheduleId);
        }
      }

      await this.saveSchedules();
      console.log(`✅ Schedule ${scheduleId} ${schedule.enabled ? 'enabled' : 'disabled'}`);

      return { success: true, enabled: schedule.enabled };
    } catch (error) {
      console.error(`❌ Failed to toggle schedule ${scheduleId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all schedules
   * @returns {Array} All schedules
   */
  getSchedules() {
    return this.schedules;
  }

  /**
   * Get schedule by ID
   * @param {string} scheduleId - ID of schedule
   * @returns {Object|null} Schedule or null if not found
   */
  getSchedule(scheduleId) {
    return this.schedules.find(s => s.id === scheduleId) || null;
  }

  /**
   * Clear all schedules
   */
  async clearAllSchedules() {
    try {
      console.log('🧹 Clearing all schedules');

      // Clear all timers
      this.timers.forEach(timerId => clearTimeout(timerId));
      this.timers.clear();

      // Clear schedules
      this.schedules = [];
      await this.saveSchedules();

      console.log('✅ All schedules cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to clear schedules:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active timers (for debugging)
   */
  getActiveTimers() {
    const timers = {};
    this.timers.forEach((timerId, scheduleId) => {
      const schedule = this.getSchedule(scheduleId);
      if (schedule) {
        timers[scheduleId] = {
          scheduleTime: schedule.time,
          enabled: schedule.enabled,
          isRepeating: schedule.isRepeating
        };
      }
    });
    return timers;
  }
}

// Create singleton instance
const lightScheduler = new LightSchedulerService();

// Initialize on import
lightScheduler.initialize().catch(err => {
  console.error('Failed to initialize LightSchedulerService:', err);
});

export default lightScheduler;
