// Learnova Modern - Advanced Frontend Client
// Modern JavaScript with Web APIs, AI Integration, and Innovative Features

// ============================================
// Modern Configuration & State Management
// ============================================

class ModernAppConfig {
  constructor() {
    this.API_BASE_URL = this.detectEnvironment();
    this.SOCKET_URL = this.API_BASE_URL;
    this.WS_RECONNECT_INTERVAL = 3000;
    this.MAX_RECONNECT_ATTEMPTS = 5;
    this.API_TIMEOUT = 30000;
    this.OFFLINE_STORAGE_KEY = 'learnova_offline_data';
    this.PWA_INSTALL_PROMPT_KEY = 'pwa_install_dismissed';
  }

  detectEnvironment() {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const port = window.location.port;

      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://${hostname}:${port || '5000'}`;
      }
      return window.location.origin;
    }
    return 'http://localhost:5000';
  }
}

const CONFIG = new ModernAppConfig();

// ============================================
// Advanced State Management with Proxy
// ============================================

class ReactiveAppState {
  constructor() {
    this._data = {
      user: null,
      token: localStorage.getItem('auth_token'),
      socket: null,
      connectionStatus: 'disconnected',
      currentSection: 'dashboard',
      currentTab: 'ai-practice',
      theme: localStorage.getItem('theme') || 'light',
      isOnline: navigator.onLine,
      notifications: [],
      cache: new Map(),
      offlineQueue: [],
      performance: {
        loadTime: 0,
        apiCalls: 0,
        cacheHits: 0
      }
    };

    this.listeners = new Map();
    this.proxy = this.createReactiveProxy();
    this.initializeOfflineSupport();
    this.initializePerformanceMonitoring();

    return this.proxy;
  }

  createReactiveProxy() {
    return new Proxy(this._data, {
      set: (target, property, value) => {
        const oldValue = target[property];
        target[property] = value;

        // Persist important data
        this.persistData(property, value);

        // Notify listeners
        this.notifyListeners(property, value, oldValue);

        // Update UI reactively
        this.updateUI(property, value);

        return true;
      },

      get: (target, property) => {
        if (typeof target[property] === 'function') {
          return target[property].bind(target);
        }
        return target[property];
      }
    });
  }

  persistData(property, value) {
    const persistentProps = ['user', 'theme', 'currentSection'];
    if (persistentProps.includes(property)) {
      try {
        localStorage.setItem(`app_${property}`, JSON.stringify(value));
      } catch (error) {
        console.warn('Failed to persist data:', error);
      }
    }
  }

  notifyListeners(property, value, oldValue) {
    const listeners = this.listeners.get(property) || [];
    listeners.forEach(callback => {
      try {
        callback(value, oldValue);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  updateUI(property, value) {
    // Reactive UI updates based on state changes
    switch (property) {
      case 'theme':
        this.applyTheme(value);
        break;
      case 'connectionStatus':
        this.updateConnectionIndicator(value);
        break;
      case 'user':
        this.updateUserInterface(value);
        break;
      case 'notifications':
        this.updateNotificationBadge(value);
        break;
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcons = {
      light: { show: 'moon', hide: 'sun' },
      dark: { show: 'sun', hide: 'moon' }
    };

    const lightIcon = document.querySelector('.light-icon');
    const darkIcon = document.querySelector('.dark-icon');

    if (lightIcon && darkIcon) {
      if (theme === 'dark') {
        lightIcon.classList.add('hidden');
        darkIcon.classList.remove('hidden');
      } else {
        lightIcon.classList.remove('hidden');
        darkIcon.classList.add('hidden');
      }
    }
  }

  updateConnectionIndicator(status) {
    const indicator = document.getElementById('connectionStatus');
    if (indicator) {
      const statusText = indicator.querySelector('.status-text');
      const statusPulse = indicator.querySelector('.status-pulse');

      if (statusText) statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);

      indicator.className = `connection-status ${status}`;

      if (statusPulse) {
        statusPulse.className = `status-pulse ${status}`;
      }
    }
  }

  updateUserInterface(user) {
    if (!user) return;

    const updates = [
      ['userName', user.name],
      ['userEmail', user.email],
      ['dashboardName', user.name.split(' ')[0]],
      ['userInitials', user.name.split(' ').map(n => n[0]).join('')]
    ];

    updates.forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });

    // Update avatar
    if (user.avatar) {
      const avatarImg = document.querySelector('.avatar-img');
      if (avatarImg) avatarImg.src = user.avatar;
    }
  }

  updateNotificationBadge(notifications) {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
      const count = notifications.length;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'block' : 'none';
    }
  }

  addEventListener(property, callback) {
    if (!this.listeners.has(property)) {
      this.listeners.set(property, []);
    }
    this.listeners.get(property).push(callback);
  }

  removeEventListener(property, callback) {
    const listeners = this.listeners.get(property) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  initializeOfflineSupport() {
    // Service Worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered:', registration))
        .catch(error => console.log('SW registration failed:', error));
    }

    // Online/offline detection
    window.addEventListener('online', () => {
      this._data.isOnline = true;
      this.processOfflineQueue();
      showNotification('Connection restored', 'success');
    });

    window.addEventListener('offline', () => {
      this._data.isOnline = false;
      showNotification('Working offline', 'warning');
    });
  }

  initializePerformanceMonitoring() {
    // Performance observer for monitoring
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === 'navigation') {
            this._data.performance.loadTime = entry.loadEventEnd - entry.fetchStart;
          }
        });
      });
      observer.observe({ entryTypes: ['navigation'] });
    }
  }

  async processOfflineQueue() {
    const queue = [...this._data.offlineQueue];
    this._data.offlineQueue = [];

    for (const request of queue) {
      try {
        await apiService.makeRequest(request.endpoint, request.options);
        console.log('Processed offline request:', request);
      } catch (error) {
        console.error('Failed to process offline request:', error);
        this._data.offlineQueue.push(request); // Re-queue failed requests
      }
    }
  }
}

const appState = new ReactiveAppState();

// ============================================
// Enhanced API Service with Modern Features
// ============================================

class ModernAPIService {
  constructor() {
    this.baseURL = CONFIG.API_BASE_URL;
    this.timeout = CONFIG.API_TIMEOUT;
    this.cache = new Map();
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      retryMultiplier: 2
    };
  }

  async makeRequest(endpoint, options = {}) {
    const cacheKey = this.generateCacheKey(endpoint, options);

    // Check cache for GET requests
    if ((!options.method || options.method === 'GET') && this.cache.has(cacheKey)) {
      appState.performance.cacheHits++;
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
        return cached.data;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    // Handle offline mode
    if (!appState.isOnline && options.method !== 'GET') {
      appState.offlineQueue.push({ endpoint, options });
      throw new Error('Request queued for when connection is restored');
    }

    const url = `${this.baseURL}/api${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(appState.token && { 'Authorization': `Bearer ${appState.token}` })
      },
      timeout: this.timeout
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Handle FormData (for file uploads)
    if (finalOptions.body instanceof FormData) {
      delete finalOptions.headers['Content-Type'];
    } else if (finalOptions.body && typeof finalOptions.body === 'object') {
      finalOptions.body = JSON.stringify(finalOptions.body);
    }

    try {
      appState.performance.apiCalls++;

      const response = await this.fetchWithRetry(url, finalOptions);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache successful GET requests
      if ((!options.method || options.method === 'GET') && data.success) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);

      // Handle specific error types
      if (error.message.includes('401') || error.message.includes('403')) {
        this.handleAuthError();
      }

      throw error;
    }
  }

  async fetchWithRetry(url, options, attempt = 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (attempt < this.retryConfig.maxRetries && !error.name === 'AbortError') {
        const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.retryMultiplier, attempt - 1);
        console.log(`Retrying request (attempt ${attempt + 1}/${this.retryConfig.maxRetries}) after ${delay}ms`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  generateCacheKey(endpoint, options) {
    return `${endpoint}_${JSON.stringify(options.body || {})}_${options.method || 'GET'}`;
  }

  handleAuthError() {
    appState.token = null;
    appState.user = null;
    localStorage.removeItem('auth_token');
    showAuthOverlay();
    showNotification('Session expired. Please log in again.', 'warning');
  }

  clearCache() {
    this.cache.clear();
    console.log('API cache cleared');
  }

  // Authentication methods with enhanced error handling
  async login(credentials) {
    try {
      showLoadingState('Signing you in...');

      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: credentials
      });

      if (response.success && response.token) {
        appState.token = response.token;
        appState.user = response.user;
        localStorage.setItem('auth_token', response.token);

        // Track login event
        this.trackEvent('user_login', { method: 'email' });
      }

      return response;
    } finally {
      hideLoadingState();
    }
  }

  async register(userData) {
    try {
      showLoadingState('Creating your account...');

      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: userData
      });

      if (response.success && response.token) {
        appState.token = response.token;
        appState.user = response.user;
        localStorage.setItem('auth_token', response.token);

        // Track registration event
        this.trackEvent('user_register', { method: 'email' });
      }

      return response;
    } finally {
      hideLoadingState();
    }
  }

  async logout() {
    try {
      await this.makeRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      appState.token = null;
      appState.user = null;
      localStorage.removeItem('auth_token');
      this.clearCache();

      // Track logout event
      this.trackEvent('user_logout');
    }
  }

  // Enhanced user methods
  async getUserProfile() {
    return await this.makeRequest('/user/profile');
  }

  async updateUserProfile(data) {
    const response = await this.makeRequest('/user/profile', {
      method: 'PUT',
      body: data
    });

    if (response.success) {
      appState.user = { ...appState.user, ...response.user };
    }

    return response;
  }

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);

    return await this.makeRequest('/user/avatar', {
      method: 'POST',
      body: formData
    });
  }

  // AI methods with caching
  async generateQuestions(params) {
    return await this.makeRequest('/ai/generate-questions', {
      method: 'POST',
      body: params
    });
  }

  async sendChatMessage(message, context = {}) {
    return await this.makeRequest('/ai/chat', {
      method: 'POST',
      body: { message, context }
    });
  }

  async getPerformanceAnalysis() {
    return await this.makeRequest('/analytics/performance');
  }

  // Study groups methods
  async getStudyGroups() {
    return await this.makeRequest('/study-groups');
  }

  async createStudyGroup(groupData) {
    return await this.makeRequest('/study-groups', {
      method: 'POST',
      body: groupData
    });
  }

  // Event tracking for analytics
  trackEvent(eventName, properties = {}) {
    const event = {
      name: eventName,
      properties,
      timestamp: Date.now(),
      userId: appState.user?.id,
      sessionId: this.getSessionId()
    };

    console.log('Event tracked:', event);

    // Store events for batch sending
    const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    events.push(event);
    localStorage.setItem('analytics_events', JSON.stringify(events.slice(-100))); // Keep last 100 events
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  }
}

const apiService = new ModernAPIService();

// ============================================
// Advanced Socket Service with Reconnection
// ============================================

class ModernSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = CONFIG.MAX_RECONNECT_ATTEMPTS;
    this.reconnectInterval = CONFIG.WS_RECONNECT_INTERVAL;
    this.eventHandlers = new Map();
    this.messageQueue = [];
    this.heartbeatInterval = null;
    this.connectionPromise = null;
  }

  async connect() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._establishConnection();
    return this.connectionPromise;
  }

  async _establishConnection() {
    if (!appState.token) {
      console.warn('Cannot connect socket: No auth token');
      return;
    }

    try {
      if (this.socket) {
        this.socket.disconnect();
      }

      const options = {
        auth: { token: appState.token },
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true
      };

      this.socket = io(CONFIG.SOCKET_URL, options);
      appState.socket = this.socket;

      this.setupEventHandlers();
      this.startHeartbeat();

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket.once('connect', () => {
          clearTimeout(timeout);
          resolve(this.socket);
        });

        this.socket.once('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Socket connection error:', error);
      this.handleConnectionError();
      throw error;
    }
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('🔌 Connected to server via WebSocket');
      appState.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.connectionPromise = null;

      // Process queued messages
      this.processMessageQueue();

      showNotification('Connected to real-time services', 'success');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
      appState.connectionStatus = 'disconnected';

      this.stopHeartbeat();

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect automatically
        return;
      }

      this.handleConnectionError();
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      appState.connectionStatus = 'error';
      this.handleConnectionError();
    });

    // Real-time event handlers
    this.socket.on('user-online', (data) => {
      this.handleUserOnline(data);
    });

    this.socket.on('user-offline', (data) => {
      this.handleUserOffline(data);
    });

    this.socket.on('collaboration-update', (data) => {
      this.handleCollaborationUpdate(data);
    });

    this.socket.on('practice-update', (data) => {
      this.handlePracticeUpdate(data);
    });

    this.socket.on('notification', (data) => {
      this.handleRealtimeNotification(data);
    });

    this.socket.on('heartbeat-ack', (data) => {
      // Connection is alive
    });
  }

  handleConnectionError() {
    appState.connectionStatus = 'connecting';

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts);

      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        this.connectionPromise = null;
        this.connect();
      }, delay);
    } else {
      appState.connectionStatus = 'failed';
      showNotification('Connection failed. Please refresh the page.', 'error');
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('heartbeat');
      }
    }, 30000); // Every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push({ event, data });
    }
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const { event, data } = this.messageQueue.shift();
      this.socket.emit(event, data);
    }
  }

  // Event handlers
  handleUserOnline(data) {
    showNotification(`User came online`, 'info');
    this.updateUserPresence(data.userId, true);
  }

  handleUserOffline(data) {
    this.updateUserPresence(data.userId, false);
  }

  handleCollaborationUpdate(data) {
    // Handle real-time collaboration updates
    const { userId, type, content } = data;
    console.log('Collaboration update:', data);

    // Update collaborative workspace
    this.updateCollaborativeWorkspace(data);
  }

  handlePracticeUpdate(data) {
    // Handle practice session updates
    console.log('Practice update:', data);
    this.updatePracticeInterface(data);
  }

  handleRealtimeNotification(data) {
    appState.notifications.push(data);
    showNotification(data.message, data.type || 'info');
  }

  updateUserPresence(userId, isOnline) {
    const presenceIndicators = document.querySelectorAll(`[data-user-id="${userId}"] .presence-indicator`);
    presenceIndicators.forEach(indicator => {
      indicator.className = `presence-indicator ${isOnline ? 'online' : 'offline'}`;
    });
  }

  updateCollaborativeWorkspace(data) {
    const workspace = document.getElementById('collaborativeWorkspace');
    if (workspace) {
      // Update workspace content based on collaboration data
      this.renderCollaborationUpdate(workspace, data);
    }
  }

  updatePracticeInterface(data) {
    const practiceInterface = document.getElementById('practiceInterface');
    if (practiceInterface) {
      // Update practice interface with real-time data
      this.renderPracticeUpdate(practiceInterface, data);
    }
  }

  renderCollaborationUpdate(container, data) {
    const updateElement = document.createElement('div');
    updateElement.className = 'collaboration-update';
    updateElement.innerHTML = `
      <div class="update-header">
        <span class="user-name">${data.userName || 'User'}</span>
        <span class="update-time">${new Date(data.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="update-content">${data.content}</div>
    `;

    container.appendChild(updateElement);
    container.scrollTop = container.scrollHeight;
  }

  renderPracticeUpdate(container, data) {
    const updateElement = document.createElement('div');
    updateElement.className = 'practice-update';
    updateElement.innerHTML = `
      <div class="update-info">
        Progress: ${data.progress}% | Accuracy: ${data.accuracy}%
      </div>
    `;

    container.appendChild(updateElement);
  }

  // Public methods for emitting events
  joinStudyGroup(groupId) {
    this.emit('join-study-group', groupId);
  }

  joinLiveSession(sessionId) {
    this.emit('join-live-session', sessionId);
  }

  sendCollaborationUpdate(data) {
    this.emit('collaboration-update', data);
  }

  sendPracticeUpdate(data) {
    this.emit('practice-update', data);
  }

  startTyping(roomId) {
    this.emit('typing', { roomId });
  }

  disconnect() {
    this.stopHeartbeat();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      appState.socket = null;
    }

    appState.connectionStatus = 'disconnected';
  }
}

const socketService = new ModernSocketService();

// ============================================
// Modern UI Components & Interactions
// ============================================

class ModernUIManager {
  constructor() {
    this.animationQueue = [];
    this.isAnimating = false;
    this.observers = {
      intersection: null,
      resize: null,
      mutation: null
    };

    this.initializeModernFeatures();
  }

  initializeModernFeatures() {
    this.setupIntersectionObserver();
    this.setupResizeObserver();
    this.setupGestureHandlers();
    this.initializeAnimations();
    this.setupKeyboardShortcuts();
    this.initializeAccessibility();
  }

  setupIntersectionObserver() {
    this.observers.intersection = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const animationType = element.dataset.animate;
          const delay = parseInt(element.dataset.delay) || 0;

          if (animationType) {
            setTimeout(() => {
              this.animateElement(element, animationType);
            }, delay);
          }

          // Lazy load images
          if (element.dataset.src) {
            element.src = element.dataset.src;
            element.removeAttribute('data-src');
          }

          this.observers.intersection.unobserve(element);
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1
    });

    // Observe elements with animation attributes
    this.observeAnimatedElements();
  }

  observeAnimatedElements() {
    const animatedElements = document.querySelectorAll('[data-animate]');
    animatedElements.forEach(el => {
      this.observers.intersection.observe(el);
    });
  }

  setupResizeObserver() {
    this.observers.resize = new ResizeObserver((entries) => {
      entries.forEach(entry => {
        const element = entry.target;

        // Handle chart resizing
        if (element.querySelector('canvas')) {
          this.resizeCharts(element);
        }

        // Handle responsive layouts
        this.updateResponsiveLayout(element);
      });
    });

    // Observe main container
    const container = document.querySelector('.container');
    if (container) {
      this.observers.resize.observe(container);
    }
  }

  setupGestureHandlers() {
    let startX, startY, currentX, currentY;
    let isSwipping = false;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });

    document.addEventListener('touchmove', (e) => {
      if (!startX || !startY) return;

      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;

      const diffX = Math.abs(currentX - startX);
      const diffY = Math.abs(currentY - startY);

      if (diffX > diffY && diffX > 50) {
        isSwipping = true;

        // Handle swipe gestures
        if (currentX > startX) {
          // Swipe right
          this.handleSwipeGesture('right');
        } else {
          // Swipe left
          this.handleSwipeGesture('left');
        }
      }
    });

    document.addEventListener('touchend', () => {
      startX = startY = currentX = currentY = null;
      isSwipping = false;
    });
  }

  handleSwipeGesture(direction) {
    const currentSection = appState.currentSection;
    const sections = ['dashboard', 'learning-hub', 'analytics-center', 'community-space', 'ai-assistant', 'profile-settings'];
    const currentIndex = sections.indexOf(currentSection);

    if (direction === 'left' && currentIndex < sections.length - 1) {
      showSection(sections[currentIndex + 1]);
    } else if (direction === 'right' && currentIndex > 0) {
      showSection(sections[currentIndex - 1]);
    }
  }

  initializeAnimations() {
    // GSAP timeline for complex animations
    if (typeof gsap !== 'undefined') {
      this.masterTimeline = gsap.timeline();
      this.setupScrollAnimations();
    }
  }

  setupScrollAnimations() {
    // Parallax effects
    const heroElements = document.querySelectorAll('.hero-background, .floating-shapes');
    heroElements.forEach(element => {
      gsap.to(element, {
        y: () => window.innerHeight * 0.5,
        ease: "none",
        scrollTrigger: {
          trigger: element,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });
    });
  }

  animateElement(element, animationType) {
    const animations = {
      fadeInUp: () => {
        gsap.fromTo(element, 
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
        );
      },
      fadeInLeft: () => {
        gsap.fromTo(element,
          { opacity: 0, x: -30 },
          { opacity: 1, x: 0, duration: 0.6, ease: "power2.out" }
        );
      },
      fadeInRight: () => {
        gsap.fromTo(element,
          { opacity: 0, x: 30 },
          { opacity: 1, x: 0, duration: 0.6, ease: "power2.out" }
        );
      },
      scaleIn: () => {
        gsap.fromTo(element,
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" }
        );
      },
      slideInUp: () => {
        gsap.fromTo(element,
          { opacity: 0, y: 100 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
        );
      }
    };

    const animation = animations[animationType];
    if (animation) {
      animation();
    } else {
      // Fallback CSS animation
      element.style.animation = `${animationType} 0.6s ease-out forwards`;
    }
  }

  setupKeyboardShortcuts() {
    const shortcuts = {
      'cmd+k': () => toggleCommandPalette(),
      'ctrl+k': () => toggleCommandPalette(),
      'cmd+/': () => showKeyboardShortcuts(),
      'ctrl+/': () => showKeyboardShortcuts(),
      'escape': () => handleEscapeKey(),
      'cmd+shift+d': () => toggleDarkMode(),
      'ctrl+shift+d': () => toggleDarkMode(),
      '1': () => showSection('dashboard'),
      '2': () => showSection('learning-hub'),
      '3': () => showSection('analytics-center'),
      '4': () => showSection('community-space'),
      '5': () => showSection('ai-assistant'),
      '6': () => showSection('profile-settings')
    };

    document.addEventListener('keydown', (e) => {
      const key = this.getShortcutKey(e);

      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    });
  }

  getShortcutKey(e) {
    let key = '';

    if (e.ctrlKey || e.metaKey) {
      key += (e.ctrlKey ? 'ctrl+' : 'cmd+');
    }
    if (e.shiftKey) key += 'shift+';
    if (e.altKey) key += 'alt+';

    key += e.key.toLowerCase();

    return key;
  }

  initializeAccessibility() {
    // Skip links
    this.createSkipLinks();

    // Focus management
    this.setupFocusManagement();

    // Screen reader announcements
    this.setupScreenReaderSupport();

    // High contrast mode detection
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      document.documentElement.classList.add('high-contrast');
    }

    // Reduced motion detection
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('reduced-motion');
    }
  }

  createSkipLinks() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      border-radius: 0 0 4px 4px;
      z-index: 10000;
      opacity: 0;
      transition: all 0.3s;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '0';
      skipLink.style.opacity = '1';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
      skipLink.style.opacity = '0';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  setupFocusManagement() {
    // Focus trap for modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('.modal.active, .command-palette:not(.hidden)');
        if (modal) {
          this.trapFocus(e, modal);
        }
      }
    });
  }

  trapFocus(e, container) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }

  setupScreenReaderSupport() {
    // Create live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    liveRegion.id = 'live-region';
    document.body.appendChild(liveRegion);
  }

  announceToScreenReader(message) {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }

  // Public methods
  updateChartVisibility() {
    const charts = document.querySelectorAll('canvas');
    charts.forEach(chart => {
      const rect = chart.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

      if (isVisible && chart.dataset.chart) {
        this.renderChart(chart);
      }
    });
  }

  renderChart(canvas) {
    const chartType = canvas.dataset.chart;
    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (canvas.chartInstance) {
      canvas.chartInstance.destroy();
    }

    // Create new chart based on type
    const chartConfig = this.getChartConfig(chartType);
    if (chartConfig) {
      canvas.chartInstance = new Chart(ctx, chartConfig);
    }
  }

  getChartConfig(type) {
    const configs = {
      subjects: {
        type: 'doughnut',
        data: {
          labels: ['Machine Learning', 'Web Development', 'Data Structures'],
          datasets: [{
            data: [30, 40, 30],
            backgroundColor: ['#667eea', '#f093fb', '#10b981'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          }
        }
      },
      accuracy: {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          datasets: [{
            data: [65, 72, 68, 75, 78],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { display: false },
            y: { display: false }
          }
        }
      },
      time: {
        type: 'bar',
        data: {
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
          datasets: [{
            data: [20, 35, 40, 30],
            backgroundColor: '#f59e0b',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { display: false },
            y: { display: false }
          }
        }
      },
      streak: {
        type: 'line',
        data: {
          labels: Array.from({length: 15}, (_, i) => i + 1),
          datasets: [{
            data: Array.from({length: 15}, () => Math.floor(Math.random() * 10) + 5),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { display: false },
            y: { display: false }
          }
        }
      }
    };

    return configs[type];
  }

  resizeCharts(container) {
    const charts = container.querySelectorAll('canvas');
    charts.forEach(chart => {
      if (chart.chartInstance) {
        chart.chartInstance.resize();
      }
    });
  }

  updateResponsiveLayout(element) {
    const width = element.offsetWidth;

    // Update layout based on container width
    if (width < 768) {
      element.classList.add('mobile');
      element.classList.remove('tablet', 'desktop');
    } else if (width < 1024) {
      element.classList.add('tablet');
      element.classList.remove('mobile', 'desktop');
    } else {
      element.classList.add('desktop');
      element.classList.remove('mobile', 'tablet');
    }
  }
}

const uiManager = new ModernUIManager();

// ============================================
// Application Initialization & Event Handlers
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Learnova Modern Platform Loading...');

  try {
    // Initialize theme
    applyStoredTheme();

    // Check authentication
    if (appState.token) {
      await validateAndInitialize();
    } else {
      showAuthOverlay();
    }

    // Setup event handlers
    setupEventHandlers();

    // Initialize PWA features
    initializePWA();

    // Setup command palette
    setupCommandPalette();

    // Initialize 3D background
    initialize3DBackground();

    console.log('✅ Modern platform loaded successfully!');
  } catch (error) {
    console.error('❌ Platform initialization failed:', error);
    showNotification('Failed to initialize platform', 'error');
  }
});

async function validateAndInitialize() {
  try {
    showLoadingState('Loading your learning experience...');

    // Validate token and get user data
    const userData = await apiService.getUserProfile();
    if (userData.success) {
      appState.user = userData.user;
      await initializeMainApp();
    } else {
      throw new Error('Invalid session');
    }
  } catch (error) {
    console.error('Token validation failed:', error);
    showAuthOverlay();
  } finally {
    hideLoadingState();
  }
}

async function initializeMainApp() {
  hideAuthOverlay();
  showMainApp();

  // Connect to real-time services
  try {
    await socketService.connect();
  } catch (error) {
    console.error('Socket connection failed:', error);
  }

  // Load initial data
  await loadDashboardData();

  // Setup navigation
  setupNavigation();

  // Initialize UI components
  uiManager.observeAnimatedElements();
  uiManager.updateChartVisibility();

  // Start periodic updates
  startPeriodicUpdates();
}

function setupEventHandlers() {
  // Authentication tab switching
  const authTabs = document.querySelectorAll('.auth-tab');
  authTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      switchAuthTab(this.dataset.tab);
    });
  });

  // Auth form submissions
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Password visibility toggle
  const passwordToggles = document.querySelectorAll('.password-toggle');
  passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', function() {
      const input = this.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        this.innerHTML = '<i data-lucide="eye-off"></i>';
      } else {
        input.type = 'password';
        this.innerHTML = '<i data-lucide="eye"></i>';
      }
      lucide.createIcons();
    });
  });

  // Form validation
  const inputs = document.querySelectorAll('input[required]');
  inputs.forEach(input => {
    input.addEventListener('blur', () => validateInput(input));
    input.addEventListener('input', () => clearValidationError(input));
  });

  // Password strength checker
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach(input => {
    if (input.id.includes('register')) {
      input.addEventListener('input', () => checkPasswordStrength(input));
    }
  });
}

function switchAuthTab(tab) {
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');
  const indicator = document.querySelector('.tab-indicator');

  tabs.forEach(t => t.classList.remove('active'));
  forms.forEach(f => f.classList.remove('active'));

  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`${tab}Form`).classList.add('active');

  // Move indicator
  const activeTab = document.querySelector(`[data-tab="${tab}"]`);
  const tabRect = activeTab.getBoundingClientRect();
  const containerRect = activeTab.parentElement.getBoundingClientRect();

  indicator.style.left = `${tabRect.left - containerRect.left}px`;
  indicator.style.width = `${tabRect.width}px`;
}

async function handleLogin(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const credentials = {
    email: formData.get('email'),
    password: formData.get('password')
  };

  // Validate inputs
  if (!validateEmail(credentials.email)) {
    showFieldError('loginEmail', 'Please enter a valid email address');
    return;
  }

  if (credentials.password.length < 6) {
    showFieldError('loginPassword', 'Password must be at least 6 characters');
    return;
  }

  try {
    const response = await apiService.login(credentials);

    if (response.success) {
      showNotification('Welcome back!', 'success');
      await initializeMainApp();
    } else {
      throw new Error(response.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    showNotification(error.message || 'Login failed', 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const userData = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword')
  };

  // Validate inputs
  let hasErrors = false;

  if (userData.name.length < 2) {
    showFieldError('registerName', 'Name must be at least 2 characters');
    hasErrors = true;
  }

  if (!validateEmail(userData.email)) {
    showFieldError('registerEmail', 'Please enter a valid email address');
    hasErrors = true;
  }

  if (userData.password.length < 6) {
    showFieldError('registerPassword', 'Password must be at least 6 characters');
    hasErrors = true;
  }

  if (userData.password !== userData.confirmPassword) {
    showFieldError('confirmPassword', 'Passwords do not match');
    hasErrors = true;
  }

  if (hasErrors) return;

  try {
    const response = await apiService.register(userData);

    if (response.success) {
      showNotification('Account created successfully!', 'success');
      await initializeMainApp();
    } else {
      throw new Error(response.error || 'Registration failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showNotification(error.message || 'Registration failed', 'error');
  }
}

function validateInput(input) {
  const value = input.value.trim();
  let error = '';

  if (input.hasAttribute('required') && !value) {
    error = 'This field is required';
  } else if (input.type === 'email' && value && !validateEmail(value)) {
    error = 'Please enter a valid email address';
  } else if (input.type === 'password' && value.length > 0 && value.length < 6) {
    error = 'Password must be at least 6 characters';
  }

  if (error) {
    showFieldError(input.id, error);
    return false;
  } else {
    clearFieldError(input.id);
    return true;
  }
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const validation = field.parentElement.querySelector('.form-validation');

  field.classList.add('error');
  if (validation) {
    validation.textContent = message;
    validation.classList.add('error');
  }
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  const validation = field.parentElement.querySelector('.form-validation');

  field.classList.remove('error');
  if (validation) {
    validation.textContent = '';
    validation.classList.remove('error');
  }
}

function clearValidationError(input) {
  clearFieldError(input.id);
}

function checkPasswordStrength(input) {
  const password = input.value;
  const strengthBar = input.parentElement.querySelector('.strength-fill');
  const strengthText = input.parentElement.querySelector('.strength-text');

  if (!strengthBar || !strengthText) return;

  let strength = 0;
  let message = 'Very weak';

  if (password.length >= 6) strength += 1;
  if (password.length >= 10) strength += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[^\w\s]/.test(password)) strength += 1;

  const strengthLevels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['#ef4444', '#f59e0b', '#eab308', '#10b981', '#059669'];

  message = strengthLevels[strength] || 'Very weak';
  const color = strengthColors[strength] || '#ef4444';

  strengthBar.style.width = `${(strength / 5) * 100}%`;
  strengthBar.style.backgroundColor = color;
  strengthText.textContent = message;
}

function applyStoredTheme() {
  const storedTheme = localStorage.getItem('theme') || 'light';
  appState.theme = storedTheme;
}

function toggleTheme() {
  const newTheme = appState.theme === 'light' ? 'dark' : 'light';
  appState.theme = newTheme;
  localStorage.setItem('theme', newTheme);

  showNotification(`Switched to ${newTheme} mode`, 'success');
}

function showAuthOverlay() {
  const authOverlay = document.getElementById('authOverlay');
  const mainApp = document.getElementById('mainApp');

  if (authOverlay) {
    authOverlay.style.display = 'flex';
    authOverlay.classList.remove('hidden');
  }

  if (mainApp) {
    mainApp.style.display = 'none';
    mainApp.classList.add('hidden');
  }
}

function hideAuthOverlay() {
  const authOverlay = document.getElementById('authOverlay');
  if (authOverlay) {
    authOverlay.style.display = 'none';
    authOverlay.classList.add('hidden');
  }
}

function showMainApp() {
  const mainApp = document.getElementById('mainApp');
  if (mainApp) {
    mainApp.style.display = 'block';
    mainApp.classList.remove('hidden');
  }
}

function showLoadingState(message = 'Loading...') {
  const overlay = document.getElementById('loadingOverlay');
  const text = document.getElementById('loadingText');

  if (overlay) {
    overlay.style.display = 'flex';
    overlay.classList.remove('hidden');
  }

  if (text) {
    text.textContent = message;
  }
}

function hideLoadingState() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.classList.add('hidden');
  }
}

// ============================================
// Navigation & Section Management
// ============================================

function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-pill');
  navButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const sectionId = this.getAttribute('data-section');
      showSection(sectionId);
    });
  });

  const tabButtons = document.querySelectorAll('.tab');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const tabId = this.getAttribute('data-tab');
      showTab(tabId);
    });
  });

  // Load current section
  showSection(appState.currentSection);
}

function showSection(sectionId) {
  // Update navigation
  const navButtons = document.querySelectorAll('.nav-pill');
  navButtons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-section') === sectionId);
  });

  // Update sections with animation
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => {
    if (section.id === sectionId) {
      section.classList.add('active');
      section.style.display = 'block';

      // Trigger entrance animation
      gsap.fromTo(section, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
      );
    } else {
      section.classList.remove('active');
      section.style.display = 'none';
    }
  });

  appState.currentSection = sectionId;

  // Load section-specific data
  loadSectionData(sectionId);

  // Update page title
  updatePageTitle(sectionId);

  // Announce to screen reader
  uiManager.announceToScreenReader(`Navigated to ${sectionId.replace('-', ' ')} section`);
}

function showTab(tabId) {
  const container = document.querySelector('.tabs-modern');
  if (!container) return;

  const tabs = container.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');
  const indicator = container.querySelector('.tab-indicator');

  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
  });

  panels.forEach(panel => {
    if (panel.id === tabId) {
      panel.classList.add('active');
      panel.style.display = 'block';
    } else {
      panel.classList.remove('active');
      panel.style.display = 'none';
    }
  });

  // Move indicator
  const activeTab = container.querySelector(`[data-tab="${tabId}"]`);
  if (activeTab && indicator) {
    const tabRect = activeTab.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    indicator.style.left = `${tabRect.left - containerRect.left}px`;
    indicator.style.width = `${tabRect.width}px`;
  }

  appState.currentTab = tabId;
}

function updatePageTitle(sectionId) {
  const titles = {
    'dashboard': 'Dashboard - Learnova',
    'learning-hub': 'AI Learning Hub - Learnova',
    'analytics-center': 'Analytics - Learnova',
    'community-space': 'Community - Learnova',
    'ai-assistant': 'AI Assistant - Learnova',
    'profile-settings': 'Profile Settings - Learnova'
  };

  document.title = titles[sectionId] || 'Learnova - AI Learning Platform';
}

async function loadSectionData(sectionId) {
  try {
    switch(sectionId) {
      case 'dashboard':
        await loadDashboardData();
        break;
      case 'learning-hub':
        await loadLearningHubData();
        break;
      case 'analytics-center':
        await loadAnalyticsData();
        break;
      case 'ai-assistant':
        await loadAIAssistantData();
        break;
      // Add other section data loading
    }
  } catch (error) {
    console.error(`Error loading ${sectionId} data:`, error);
  }
}

async function loadDashboardData() {
  try {
    // Load user performance
    const performance = await apiService.getPerformanceAnalysis();
    if (performance.success) {
      updateDashboardStats(performance.analysis);
      updateAIRecommendations(performance.analysis);
    }

    // Load recent activity
    loadActivityFeed();

    // Update charts
    setTimeout(() => {
      uiManager.updateChartVisibility();
    }, 500);
  } catch (error) {
    console.error('Dashboard data loading error:', error);
  }
}

async function loadLearningHubData() {
  // Load subjects and practice data
  console.log('Loading learning hub data...');
}

async function loadAnalyticsData() {
  // Load analytics charts and insights
  console.log('Loading analytics data...');
}

async function loadAIAssistantData() {
  // Initialize AI chat interface
  console.log('Loading AI assistant data...');
}

function updateDashboardStats(analysis) {
  if (!analysis) return;

  const updates = [
    ['heroAccuracy', `${analysis.overallAccuracy || 78}%`],
    ['avgAccuracy', `${analysis.overallAccuracy || 78}%`],
    ['heroStreak', `${appState.user?.stats?.currentStreak || 15}`],
    ['currentStreak', `${appState.user?.stats?.currentStreak || 15}`]
  ];

  updates.forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      // Animate number change
      gsap.to(element, {
        textContent: value,
        duration: 0.5,
        ease: "power2.out",
        snap: { textContent: 1 }
      });
    }
  });
}

function updateAIRecommendations(analysis) {
  const container = document.getElementById('aiRecommendations');
  if (!container || !analysis) return;

  const recommendations = analysis.recommendations || [
    'Focus on neural network fundamentals',
    'Practice more data structure problems',
    'Review machine learning concepts daily'
  ];

  container.innerHTML = '';

  recommendations.forEach((rec, index) => {
    const card = document.createElement('div');
    card.className = 'recommendation-card';
    card.innerHTML = `
      <div class="rec-icon">💡</div>
      <div class="rec-content">
        <p>${rec}</p>
        <button class="rec-action" onclick="followRecommendation(${index})">
          Take Action
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

function loadActivityFeed() {
  const container = document.getElementById('activityFeed');
  if (!container) return;

  const activities = [
    { type: 'practice', message: 'Completed Machine Learning practice session', time: '2 minutes ago', icon: '🎯' },
    { type: 'achievement', message: 'Earned "Consistent Learner" badge', time: '1 hour ago', icon: '🏆' },
    { type: 'collaboration', message: 'Joined "AI Study Group" session', time: '3 hours ago', icon: '👥' },
    { type: 'ai', message: 'AI generated 10 new practice questions', time: '5 hours ago', icon: '🤖' }
  ];

  container.innerHTML = '';

  activities.forEach(activity => {
    const item = document.createElement('div');
    item.className = `activity-item ${activity.type}`;
    item.innerHTML = `
      <div class="activity-icon">${activity.icon}</div>
      <div class="activity-content">
        <p class="activity-message">${activity.message}</p>
        <span class="activity-time">${activity.time}</span>
      </div>
    `;

    container.appendChild(item);
  });
}

// ============================================
// PWA & Modern Web Features
// ============================================

function initializePWA() {
  // PWA install prompt
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showPWAInstallPrompt();
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    showNotification('App installed successfully!', 'success');
    hidePWAInstallPrompt();
  });

  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('Running as PWA');
  }

  // Install PWA function
  window.installPWA = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    deferredPrompt = null;
    hidePWAInstallPrompt();
  };

  // Dismiss PWA prompt
  window.dismissPWAPrompt = () => {
    hidePWAInstallPrompt();
    localStorage.setItem(CONFIG.PWA_INSTALL_PROMPT_KEY, 'true');
  };
}

function showPWAInstallPrompt() {
  const dismissed = localStorage.getItem(CONFIG.PWA_INSTALL_PROMPT_KEY);
  if (dismissed) return;

  const prompt = document.getElementById('pwaInstallPrompt');
  if (prompt) {
    prompt.classList.remove('hidden');

    // Auto-hide after 10 seconds
    setTimeout(() => {
      hidePWAInstallPrompt();
    }, 10000);
  }
}

function hidePWAInstallPrompt() {
  const prompt = document.getElementById('pwaInstallPrompt');
  if (prompt) {
    prompt.classList.add('hidden');
  }
}

// ============================================
// Command Palette
// ============================================

function setupCommandPalette() {
  const commandBtn = document.getElementById('commandBtn');
  const commandPalette = document.getElementById('commandPalette');
  const commandInput = document.getElementById('commandInput');

  if (commandBtn) {
    commandBtn.addEventListener('click', toggleCommandPalette);
  }

  if (commandInput) {
    commandInput.addEventListener('input', handleCommandSearch);
    commandInput.addEventListener('keydown', handleCommandKeydown);
  }

  // Close on escape or outside click
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideCommandPalette();
    }
  });

  document.addEventListener('click', (e) => {
    if (commandPalette && !commandPalette.contains(e.target) && !commandBtn.contains(e.target)) {
      hideCommandPalette();
    }
  });
}

function toggleCommandPalette() {
  const palette = document.getElementById('commandPalette');
  const input = document.getElementById('commandInput');

  if (palette) {
    if (palette.classList.contains('hidden')) {
      showCommandPalette();
    } else {
      hideCommandPalette();
    }
  }
}

function showCommandPalette() {
  const palette = document.getElementById('commandPalette');
  const input = document.getElementById('commandInput');

  if (palette) {
    palette.classList.remove('hidden');
    loadCommandResults();

    if (input) {
      setTimeout(() => input.focus(), 100);
    }
  }
}

function hideCommandPalette() {
  const palette = document.getElementById('commandPalette');
  if (palette) {
    palette.classList.add('hidden');
  }
}

function handleCommandSearch(e) {
  const query = e.target.value.toLowerCase();
  loadCommandResults(query);
}

function handleCommandKeydown(e) {
  const results = document.querySelectorAll('.command-result');
  let currentIndex = Array.from(results).findIndex(r => r.classList.contains('selected'));

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      currentIndex = (currentIndex + 1) % results.length;
      updateCommandSelection(currentIndex);
      break;

    case 'ArrowUp':
      e.preventDefault();
      currentIndex = currentIndex <= 0 ? results.length - 1 : currentIndex - 1;
      updateCommandSelection(currentIndex);
      break;

    case 'Enter':
      e.preventDefault();
      if (currentIndex >= 0 && results[currentIndex]) {
        executeCommand(results[currentIndex].dataset.command);
      }
      break;
  }
}

function loadCommandResults(query = '') {
  const container = document.getElementById('commandResults');
  if (!container) return;

  const commands = [
    { id: 'dashboard', name: 'Go to Dashboard', description: 'View your learning overview', icon: 'home', shortcut: '1' },
    { id: 'learning-hub', name: 'Open Learning Hub', description: 'Access AI-powered learning tools', icon: 'brain', shortcut: '2' },
    { id: 'ai-practice', name: 'Start AI Practice', description: 'Begin personalized practice session', icon: 'target' },
    { id: 'ai-chat', name: 'Chat with AI Assistant', description: 'Ask questions and get help', icon: 'bot' },
    { id: 'analytics', name: 'View Analytics', description: 'Check your performance metrics', icon: 'trending-up', shortcut: '3' },
    { id: 'community', name: 'Join Community', description: 'Connect with other learners', icon: 'users', shortcut: '4' },
    { id: 'theme-toggle', name: 'Toggle Theme', description: 'Switch between light and dark mode', icon: 'sun', shortcut: 'Ctrl+Shift+D' },
    { id: 'logout', name: 'Logout', description: 'Sign out of your account', icon: 'log-out' }
  ];

  const filtered = query ? commands.filter(cmd => 
    cmd.name.toLowerCase().includes(query) || 
    cmd.description.toLowerCase().includes(query)
  ) : commands;

  container.innerHTML = '';

  filtered.forEach((cmd, index) => {
    const result = document.createElement('div');
    result.className = `command-result ${index === 0 ? 'selected' : ''}`;
    result.dataset.command = cmd.id;
    result.innerHTML = `
      <div class="command-icon">
        <i data-lucide="${cmd.icon}"></i>
      </div>
      <div class="command-info">
        <div class="command-name">${cmd.name}</div>
        <div class="command-description">${cmd.description}</div>
      </div>
      ${cmd.shortcut ? `<kbd class="command-shortcut">${cmd.shortcut}</kbd>` : ''}
    `;

    result.addEventListener('click', () => executeCommand(cmd.id));
    result.addEventListener('mouseenter', () => updateCommandSelection(index));

    container.appendChild(result);
  });

  // Recreate Lucide icons
  lucide.createIcons();
}

function updateCommandSelection(index) {
  const results = document.querySelectorAll('.command-result');
  results.forEach((result, i) => {
    result.classList.toggle('selected', i === index);
  });
}

function executeCommand(commandId) {
  hideCommandPalette();

  switch (commandId) {
    case 'dashboard':
    case 'learning-hub':
    case 'analytics':
    case 'community':
      showSection(commandId === 'analytics' ? 'analytics-center' : 
                  commandId === 'community' ? 'community-space' : commandId);
      break;

    case 'ai-practice':
      showSection('learning-hub');
      showTab('ai-practice');
      break;

    case 'ai-chat':
      showSection('ai-assistant');
      break;

    case 'theme-toggle':
      toggleTheme();
      break;

    case 'logout':
      logout();
      break;

    default:
      console.log('Unknown command:', commandId);
  }
}

// ============================================
// 3D Background Animation
// ============================================

function initialize3DBackground() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.offsetWidth / canvas.offsetHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Create geometric particles
    const geometry = new THREE.BufferGeometry();
    const particlesCount = 50;
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 10;
      positions[i + 1] = (Math.random() - 0.5) * 10;
      positions[i + 2] = (Math.random() - 0.5) * 10;

      colors[i] = Math.random();
      colors[i + 1] = Math.random();
      colors[i + 2] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.8
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    camera.position.z = 5;

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);

      particles.rotation.x += 0.001;
      particles.rotation.y += 0.002;

      renderer.render(scene, camera);
    }

    animate();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      camera.aspect = canvas.offsetWidth / canvas.offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    });

    resizeObserver.observe(canvas);
  } catch (error) {
    console.error('3D background initialization failed:', error);
  }
}

// ============================================
// Utility Functions & Modern Features
// ============================================

function showNotification(message, type = 'info', duration = 5000) {
  const container = document.getElementById('toastContainer') || document.body;

  const notification = document.createElement('div');
  notification.className = `toast-notification ${type}`;

  const icons = {
    success: 'check-circle',
    error: 'x-circle',
    warning: 'alert-triangle',
    info: 'info'
  };

  notification.innerHTML = `
    <div class="toast-content">
      <i data-lucide="${icons[type] || icons.info}"></i>
      <span>${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i data-lucide="x"></i>
    </button>
  `;

  container.appendChild(notification);

  // Animate in
  gsap.fromTo(notification,
    { opacity: 0, x: 300 },
    { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
  );

  // Auto-remove
  setTimeout(() => {
    gsap.to(notification, {
      opacity: 0,
      x: 300,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        if (notification.parentNode) {
          notification.remove();
        }
      }
    });
  }, duration);

  // Recreate Lucide icons
  lucide.createIcons();
}

function startPeriodicUpdates() {
  // Update connection status every 30 seconds
  setInterval(async () => {
    if (appState.connectionStatus === 'connected') {
      try {
        await apiService.makeRequest('/health');
      } catch (error) {
        appState.connectionStatus = 'disconnected';
      }
    }
  }, 30000);

  // Update charts every minute
  setInterval(() => {
    uiManager.updateChartVisibility();
  }, 60000);

  // Send analytics events batch every 5 minutes
  setInterval(() => {
    sendAnalyticsBatch();
  }, 300000);
}

function sendAnalyticsBatch() {
  const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
  if (events.length > 0) {
    console.log('Sending analytics batch:', events.length, 'events');
    // In production, send to analytics service
    localStorage.setItem('analytics_events', '[]');
  }
}

// ============================================
// Global Functions (exposed to window)
// ============================================

// Navigation functions
window.showSection = showSection;
window.showTab = showTab;

// Authentication functions
window.logout = async () => {
  try {
    await apiService.logout();
    socketService.disconnect();
    showNotification('Logged out successfully', 'success');
    showAuthOverlay();
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// Theme functions
window.toggleTheme = toggleTheme;
window.toggleDarkMode = toggleTheme;

// Command palette functions
window.toggleCommandPalette = toggleCommandPalette;

// Quick actions
window.startAIPractice = () => {
  showSection('learning-hub');
  showTab('ai-practice');
  showNotification('Starting AI practice session...', 'info');
};

window.openAIChat = () => {
  showSection('ai-assistant');
  const input = document.getElementById('aiChatInput');
  if (input) {
    setTimeout(() => input.focus(), 500);
  }
};

window.joinLiveSession = () => {
  showSection('community-space');
  showNotification('Looking for active sessions...', 'info');
};

window.createContent = () => {
  showSection('learning-hub');
  showTab('content-studio');
  showNotification('Opening content studio...', 'info');
};

// AI functions
window.sendAIMessage = async () => {
  const input = document.getElementById('aiChatInput');
  if (!input || !input.value.trim()) return;

  const message = input.value.trim();
  input.value = '';

  // Add user message to chat
  addMessageToChat('user', message);

  try {
    // Show typing indicator
    showTypingIndicator(true);

    const response = await apiService.sendChatMessage(message, {
      currentSection: appState.currentSection,
      currentTab: appState.currentTab
    });

    if (response.success) {
      addMessageToChat('ai', response.response);

      if (response.suggestions && response.suggestions.length > 0) {
        addSuggestionsToChat(response.suggestions);
      }
    } else {
      throw new Error(response.error || 'AI response failed');
    }
  } catch (error) {
    console.error('AI chat error:', error);
    addMessageToChat('ai', 'Sorry, I encountered an error. Please try again.');
  } finally {
    showTypingIndicator(false);
  }
};

function addMessageToChat(type, content) {
  const container = document.getElementById('aiChatMessages');
  if (!container) return;

  const message = document.createElement('div');
  message.className = `message ${type}-message`;

  if (type === 'user') {
    message.innerHTML = `
      <div class="message-content user-content">
        <div class="message-text">${content}</div>
      </div>
      <div class="message-avatar user-avatar">
        ${appState.user?.name?.charAt(0) || 'U'}
      </div>
    `;
  } else {
    message.innerHTML = `
      <div class="message-avatar">
        <lottie-player 
          src="https://assets1.lottiefiles.com/packages/lf20_V9t630.json" 
          background="transparent" 
          speed="1" 
          style="width: 32px; height: 32px;" 
          loop 
          autoplay>
        </lottie-player>
      </div>
      <div class="message-content">
        <div class="message-text">${content}</div>
        <div class="message-actions">
          <button class="msg-action" onclick="likeMessage(this)">
            <i data-lucide="thumbs-up"></i>
          </button>
          <button class="msg-action" onclick="copyMessage(this)">
            <i data-lucide="copy"></i>
          </button>
        </div>
      </div>
    `;
  }

  container.appendChild(message);
  container.scrollTop = container.scrollHeight;

  // Animate message appearance
  gsap.fromTo(message,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
  );

  // Recreate Lucide icons
  lucide.createIcons();
}

function addSuggestionsToChat(suggestions) {
  const container = document.getElementById('aiChatMessages');
  if (!container) return;

  const suggestionsDiv = document.createElement('div');
  suggestionsDiv.className = 'message ai-message';
  suggestionsDiv.innerHTML = `
    <div class="message-avatar">
      <i data-lucide="lightbulb"></i>
    </div>
    <div class="message-content">
      <div class="message-text">
        <strong>💡 Suggestions:</strong>
        <ul>
          ${suggestions.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;

  container.appendChild(suggestionsDiv);
  container.scrollTop = container.scrollHeight;

  // Recreate Lucide icons
  lucide.createIcons();
}

function showTypingIndicator(show) {
  const container = document.getElementById('aiChatMessages');
  if (!container) return;

  let indicator = container.querySelector('.typing-indicator');

  if (show && !indicator) {
    indicator = document.createElement('div');
    indicator.className = 'message ai-message typing-indicator';
    indicator.innerHTML = `
      <div class="message-avatar">
        <i data-lucide="bot"></i>
      </div>
      <div class="message-content">
        <div class="typing-animation">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;

    container.appendChild(indicator);
    container.scrollTop = container.scrollHeight;

    // Recreate Lucide icons
    lucide.createIcons();
  } else if (!show && indicator) {
    indicator.remove();
  }
}

// Message actions
window.likeMessage = (button) => {
  button.classList.toggle('liked');
  const icon = button.querySelector('i');
  if (button.classList.contains('liked')) {
    icon.setAttribute('data-lucide', 'thumbs-up');
    icon.style.color = '#10b981';
  } else {
    icon.setAttribute('data-lucide', 'thumbs-up');
    icon.style.color = '';
  }
  lucide.createIcons();
};

window.copyMessage = async (button) => {
  const messageText = button.closest('.message-content').querySelector('.message-text').textContent;

  try {
    await navigator.clipboard.writeText(messageText);
    showNotification('Message copied to clipboard', 'success');
  } catch (error) {
    console.error('Copy failed:', error);
    showNotification('Failed to copy message', 'error');
  }
};

// Quick prompt functions
window.quickPrompt = (type) => {
  const prompts = {
    'explain': 'Can you explain a complex concept in simple terms?',
    'generate': 'Generate 5 practice questions for my weakest topic',
    'analyze': 'Analyze my recent learning performance and suggest improvements',
    'plan': 'Create a personalized study plan for the next week'
  };

  const input = document.getElementById('aiChatInput');
  if (input && prompts[type]) {
    input.value = prompts[type];
    input.focus();
  }
};

// Keyboard shortcuts
window.handleEscapeKey = () => {
  hideCommandPalette();
  // Close any open modals or overlays
};

window.showKeyboardShortcuts = () => {
  showNotification('Keyboard shortcuts: Cmd/Ctrl+K (Command Palette), 1-6 (Navigate), Cmd/Ctrl+Shift+D (Toggle Theme)', 'info', 8000);
};

// Initialize Lucide icons when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

console.log('🎉 Learnova Modern Client loaded successfully!');
