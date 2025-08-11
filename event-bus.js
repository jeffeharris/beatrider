// Event Bus for decoupling music and game systems
// Allows components to communicate without direct dependencies

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.oneTimeListeners = new Map();
    this.debugMode = false;
  }
  
  // Subscribe to an event
  on(event, callback, context = null) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push({ callback, context });
    return () => this.off(event, callback); // Return unsubscribe function
  }
  
  // Subscribe to an event once
  once(event, callback, context = null) {
    if (!this.oneTimeListeners.has(event)) {
      this.oneTimeListeners.set(event, []);
    }
    this.oneTimeListeners.get(event).push({ callback, context });
  }
  
  // Unsubscribe from an event
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.findIndex(c => c.callback === callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  // Emit an event
  emit(event, data = null) {
    if (this.debugMode) {
      console.log(`[EventBus] ${event}`, data);
    }
    
    // Regular listeners
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      callbacks.forEach(({ callback, context }) => {
        callback.call(context, data);
      });
    }
    
    // One-time listeners
    if (this.oneTimeListeners.has(event)) {
      const callbacks = this.oneTimeListeners.get(event);
      callbacks.forEach(({ callback, context }) => {
        callback.call(context, data);
      });
      this.oneTimeListeners.delete(event);
    }
  }
  
  // Clear all listeners for an event
  clear(event) {
    this.listeners.delete(event);
    this.oneTimeListeners.delete(event);
  }
  
  // Clear all listeners
  clearAll() {
    this.listeners.clear();
    this.oneTimeListeners.clear();
  }
  
  // Enable debug logging
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
}

// Create singleton instance
const eventBus = new EventBus();

// Define event types as constants to avoid typos
export const EVENTS = {
  // Music events
  BEAT: 'beat',
  BAR: 'bar',
  SECTION: 'section',
  
  // Specific instrument hits
  KICK: 'kick',
  SNARE: 'snare',
  HIHAT: 'hihat',
  ACID: 'acid',
  STAB: 'stab',
  SUB: 'sub',
  
  // Music state changes
  TEMPO_CHANGE: 'tempo_change',
  ENERGY_CHANGE: 'energy_change',
  TENSION_CHANGE: 'tension_change',
  TRACK_MUTE: 'track_mute',
  TRACK_UNMUTE: 'track_unmute',
  
  // Game events  
  ENEMY_SPAWN: 'enemy_spawn',
  ENEMY_DESTROYED: 'enemy_destroyed',
  OBSTACLE_SPAWN: 'obstacle_spawn',
  POWERUP_SPAWN: 'powerup_spawn',
  POWERUP_COLLECTED: 'powerup_collected',
  
  // Player events
  PLAYER_SHOOT: 'player_shoot',
  PLAYER_HIT: 'player_hit',
  PLAYER_JUMP: 'player_jump',
  PLAYER_LANE_CHANGE: 'player_lane_change',
  
  // Game state
  GAME_START: 'game_start',
  GAME_OVER: 'game_over',
  SCORE_UPDATE: 'score_update',
  COMBO_UPDATE: 'combo_update',
  
  // UI events
  UI_PANEL_TOGGLE: 'ui_panel_toggle',
  UI_SOUND_CHANGE: 'ui_sound_change',
  UI_GRID_TOGGLE: 'ui_grid_toggle'
};

export default eventBus;