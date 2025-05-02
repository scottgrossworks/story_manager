// Dashboard Script for Leedz Story Manager





// Storage module - handles persistence with fallbacks
const StorageManager = {
  // Save data to storage
  saveData: async function(key, data) {
    if (chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.set({[key]: data}, resolve);
      });
    } else {
      localStorage.setItem(key, JSON.stringify(data));
      return Promise.resolve();
    }
  },
  
  // Load data from storage
  loadData: async function(key, defaultValue = null) {
    if (chrome.storage) {
      return new Promise((resolve) => {
        chrome.storage.local.get(key, (result) => {
          resolve(result[key] || defaultValue);
        });
      });
    } else {
      const data = localStorage.getItem(key);
      return Promise.resolve(data ? JSON.parse(data) : defaultValue);
    }
  }
};

// Instagram module - handles detection of Instagram login status
const InstagramManager = {
  // Check if user is logged in to Instagram
  checkLoginStatus: async function() {

    
    // Actual implementation using Chrome tabs API
    return new Promise((resolve) => {
      if (!chrome.tabs) {
        // Not running in extension context
        resolve(false);
        return;
      }
      
      chrome.tabs.query({url: 'https://www.instagram.com/*'}, (tabs) => {
        // If Instagram tab exists, consider as logged in
        // In a real implementation, you would inject a script to check login status
        resolve(tabs && tabs.length > 0);
      });
    });
  },
  
  // Open Instagram login page
  openInstagram: function() {
    if (chrome.tabs) {
      chrome.tabs.create({url: 'https://www.instagram.com'});
    } else {
      window.open('https://www.instagram.com', '_blank');
    }
  }
};

// File selection helper for choosing files through browser dialogs
const FileSelector = {
  // Select files using system dialog
  selectFiles: async function() {
    // Define the fallback function separately for clarity
    const fallbackSelect = () => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'video/*,image/*';
        
        input.onchange = (e) => {
          const selectedFiles = Array.from(e.target.files).map(file => ({
            path: file.name, // Note: full path is not available for security reasons
            name: file.name
          }));
          resolve(selectedFiles);
        };
        
        input.click(); // Trigger the dialog
      });
    };

    // Try using modern File System Access API if available
    if (window.showOpenFilePicker) {
      return new Promise(async (resolve) => {
        try {
          const fileHandles = await window.showOpenFilePicker({ 
            multiple: true,
            types: [
              {
                description: 'Videos',
                accept: { 'video/*': ['.mp4', '.mov', '.avi'] }
              },
              {
                description: 'Images',
                accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif'] }
              }
            ]
          });
          
          // Process file handles
          const files = [];
          for (let i = 0; i < fileHandles.length; i++) {
            const file = await fileHandles[i].getFile();
            files.push({
              path: file.name, // Full path not available for security
              name: file.name
            });
          }
          resolve(files);

        } catch (err) {
          // Log the error, but don't automatically trigger fallback on cancel/error
          console.warn('File System Access API failed or cancelled:', err);
          // Resolve with empty array to indicate no files selected via this method
          resolve([]); 
        }
      });
    } else {
      // If modern API is not available, use the fallback directly
      console.log('File System Access API not available, using fallback.');
      return fallbackSelect();
    }
  }
};

// Main App Class - handles UI interactions and state
class LeedzApp {
  constructor() {
    // App state
    this.state = {
      isLoggedIn: false,
      sortOrder: 'date',
      postFrequency: {
        value: 24,
        unit: 'hours'
      },
      lastPostDate: null,
      lastLoginDate: null
    };
    
    // Cache DOM elements
    this.elements = {
      // Accordions
      accordionHeaders: document.querySelectorAll('.accordion-header'),
      loginSection: document.querySelector('[data-section="login"]').closest('.accordion-section'),
      filesSection: document.querySelector('[data-section="files"]').closest('.accordion-section'),
      orderSection: document.querySelector('[data-section="order"]').closest('.accordion-section'),
      frequencySection: document.querySelector('[data-section="frequency"]').closest('.accordion-section'),
      
      // Status displays
      loginStatus: document.getElementById('loginStatus'),
      fileCount: document.getElementById('fileCount'),
      orderType: document.getElementById('orderType'),
      frequencyValue: document.getElementById('frequencyValue'),
      
      // Buttons
      loginButton: document.getElementById('goToIGBtn'),
      selectFilesButton: document.getElementById('selectFilesBtn'),
      
      // File table
      fileTable: document.getElementById('fileTable'),
      fileTableBody: document.getElementById('fileTableBody'),
      
      // Radio inputs
      orderRadios: document.querySelectorAll('input[name="order"]'),
      timeUnitRadios: document.querySelectorAll('input[name="timeUnit"]'),
      
      // Number input
      frequencyNumber: document.getElementById('frequencyNumber')
    };
    
    // Flag to prevent rapid re-entry
    this.isToggling = false;
    
    // Initialize file manager
    this.fileManager = new FileManager();
    
    // Initialize app
    this.init();
  }
  
  // Initialize the app
  init() {
    // First, load data from storage
    Promise.all([
      this.loadData(),
      this.fileManager.init()
    ]).then(() => {
      this.setupEventListeners();
      this.checkLoginStatus();
      
      // Render UI based on state
      this.renderUI();
    });
  }
  
  // Set up all event listeners
  setupEventListeners() {
    // Accordion toggling
    this.elements.accordionHeaders.forEach(header => {
      header.addEventListener('click', () => this.toggleAccordion(header));
    });
    
    
    
    // Login button
    // 5/2 - original method -- simple 
    // just wait 1 second to check if IG login success
    /** 
    this.elements.loginButton.addEventListener('click', () => {
      InstagramManager.openInstagram();
      setTimeout(() => this.checkLoginStatus(), 1000); // Check after delay
    });
    */

    this.elements.loginButton.addEventListener('click', () => {
      InstagramManager.openInstagram();
    
      // Poll every 2 seconds for up to 30 seconds
      const maxAttempts = 15;
      let attempts = 0;
    
      const interval = setInterval(async () => {
        const isLoggedIn = await this.checkLoginStatus();
        if (isLoggedIn || ++attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 2000);
    });
    
    


    
    // Select files button
    const selectFilesHandler = (event) => {
      event.stopPropagation(); // Prevent potential bubbling issues
      this.selectAndAddFiles();
    };
    this.elements.selectFilesButton.removeEventListener('click', selectFilesHandler); // Remove previous if any
    this.elements.selectFilesButton.addEventListener('click', selectFilesHandler); // Add the listener
    
    // Order radio buttons
    this.elements.orderRadios.forEach(radio => {
      radio.addEventListener('change', () => this.handleOrderChange(radio.value));
    });
    
    // Time unit radio buttons
    this.elements.timeUnitRadios.forEach(radio => {
      radio.addEventListener('change', () => this.handleTimeUnitChange(radio.value));
    });
    
    // Frequency number input
    this.elements.frequencyNumber.addEventListener('input', (e) => this.handleFrequencyChange(e.target.value));
    
    // Validate frequency number on blur
    this.elements.frequencyNumber.addEventListener('blur', (e) => this.validateFrequencyNumber(e.target.value));
    
    // Start posting button 
    const startPostingBtn = document.getElementById('startPostingBtn');
    if (startPostingBtn) {
      startPostingBtn.addEventListener('click', () => {
        // Call the Poster module to start the posting process
        if (window.Poster) {
          window.Poster.startPosting();
        }
      });
    }
  }
  
  // Toggle accordion section
  toggleAccordion(header) {
    if (this.isToggling) {
      return;
    }
    this.isToggling = true;
    
    const section = header.closest('.accordion-section');
    const expanded = section.classList.toggle('active');
    const content = header.nextElementSibling;
    
    if (expanded) {
      content.style.maxHeight = content.scrollHeight + 'px';
    } else {
      content.style.maxHeight = null;
    }
    
    // Prevent rapid toggling
    setTimeout(() => {
      this.isToggling = false;
    }, 300);
  }
  
  // Check Instagram login status
  async checkLoginStatus() {
    const isLoggedIn = await InstagramManager.checkLoginStatus();
    this.updateLoginStatus(isLoggedIn);
    return isLoggedIn;
  }
  
  // Update login status in UI
  updateLoginStatus(isLoggedIn) {
    this.elements.loginStatus.textContent = isLoggedIn ? 'Logged In' : 'Not logged in';
    document.body.classList.toggle('logged-in', isLoggedIn);
    
    // Always make sure login button is disabled when logged in
    this.elements.loginButton.disabled = isLoggedIn;
    
    // Ensure we start with all sections collapsed
    document.querySelectorAll('.accordion-section').forEach(section => {
      section.classList.remove('active');
    });
  }
  
  // Select files and add them to the file manager
  async selectAndAddFiles() {
    try {
      const selectedFiles = await FileSelector.selectFiles();
      if (selectedFiles && selectedFiles.length > 0) {
        // Add files to the file manager
        await this.fileManager.addFiles(selectedFiles);
        
        // Update UI to reflect new files
        this.renderFileTable();
        this.updateFileCount();
      }
    } catch (error) {
      console.error('File selection error:', error);
    }
  }
  
  // Render file table
  renderFileTable() {
    // Clear table
    this.elements.fileTableBody.innerHTML = '';
    
    // Get files from file manager
    const files = this.fileManager.getAllFiles();
    
    // Add files to table
    files.forEach((file, index) => {
      const row = document.createElement('tr');
      
      // Index cell
      const indexCell = document.createElement('td');
      indexCell.textContent = file.playOrder;
      row.appendChild(indexCell);
      
      // Filename cell
      const nameCell = document.createElement('td');
      nameCell.textContent = file.name;
      row.appendChild(nameCell);
      
      // Move up cell
      const moveUpCell = document.createElement('td');
      const moveUpButton = document.createElement('span');
      moveUpButton.className = 'file-action move-up';
      moveUpButton.innerHTML = '▲';
      moveUpButton.addEventListener('click', () => this.handleMoveFile(index, 'up'));
      moveUpCell.appendChild(moveUpButton);
      row.appendChild(moveUpCell);
      
      // Move down cell
      const moveDownCell = document.createElement('td');
      const moveDownButton = document.createElement('span');
      moveDownButton.className = 'file-action move-down';
      moveDownButton.innerHTML = '▼';
      moveDownButton.addEventListener('click', () => this.handleMoveFile(index, 'down'));
      moveDownCell.appendChild(moveDownButton);
      row.appendChild(moveDownCell);
      
      // Remove cell
      const removeCell = document.createElement('td');
      const removeButton = document.createElement('span');
      removeButton.className = 'file-action remove';
      removeButton.innerHTML = '✕';
      removeButton.addEventListener('click', () => this.handleRemoveFile(index));
      removeCell.appendChild(removeButton);
      row.appendChild(removeCell);
      
      this.elements.fileTableBody.appendChild(row);
    });
  }
  
  // Update file count in UI
  updateFileCount() {
    this.elements.fileCount.textContent = `(${this.fileManager.getFileCount()} total)`;
  }
  
  // Handle moving a file up or down in the list through the FileManager
  async handleMoveFile(index, direction) {
    const success = await this.fileManager.moveFile(index, direction);
    if (success) {
      this.renderFileTable();
    }
  }
  
  // Handle removing a file from the list through the FileManager
  async handleRemoveFile(index) {
    const removed = await this.fileManager.removeFile(index);
    if (removed) {
      this.renderFileTable();
      this.updateFileCount();
    }
  }
  
  // Handle order selection change
  async handleOrderChange(value) {
    await this.fileManager.setSortOrder(value);
    this.state.sortOrder = value; // Keep local state in sync
    this.renderFileTable();
    
    // Update the display text
    const sortOrder = this.fileManager.sortOrder;
    this.elements.orderType.textContent = sortOrder === 'date' ? 'Date added' : 
                                          sortOrder === 'random' ? 'Random' : 'Custom';
  }
  
  // Handle time unit change
  handleTimeUnitChange(unit) {
    this.state.postFrequency.unit = unit;
    this.updateFrequencyDisplay();
    this.saveData();
  }
  
  // Handle frequency value change
  handleFrequencyChange(value) {
    value = parseInt(value, 10);
    if (isNaN(value)) value = 24; // Default to 24 if not a number
    
    this.state.postFrequency.value = value;
    this.updateFrequencyDisplay();
    this.saveData();
  }
  
  // Validate frequency number based on unit
  validateFrequencyNumber(value) {
    value = parseInt(value, 10);
    if (isNaN(value)) value = 24; // Default to 24 if not a number
    
    // Apply min/max based on unit
    if (this.state.postFrequency.unit === 'hours') {
      if (value < 1) value = 1;
      if (value > 24) value = 24;
    } else { // minutes
      if (value < 5) value = 5;
      if (value > 60) value = 60;
    }
    
    this.state.postFrequency.value = value;
    this.elements.frequencyNumber.value = value;
    this.updateFrequencyDisplay();
    this.saveData();
  }
  
  // Update frequency display
  updateFrequencyDisplay() {
    const value = this.state.postFrequency.value;
    const unit = this.state.postFrequency.unit;
    this.elements.frequencyValue.textContent = `Every ${value} ${unit}`;
  }
  
  // Render all UI elements based on current state
  renderUI() {
    // Update login status
    this.elements.loginStatus.textContent = this.state.isLoggedIn ? 'Logged In' : 'Not logged in';
    this.elements.loginButton.disabled = this.state.isLoggedIn;
    
    // Render file table
    this.renderFileTable();
    this.updateFileCount();
    
    // Set order radio
    this.elements.orderRadios.forEach(radio => {
      // Get sort order from file manager to ensure UI is in sync
      radio.checked = radio.value === this.fileManager.sortOrder;
    });
    
    // Update order display text
    const sortOrder = this.fileManager.sortOrder;
    this.elements.orderType.textContent = sortOrder === 'date' ? 'Date added' : 
                                          sortOrder === 'random' ? 'Random' : 'Custom';
     
    // Set frequency controls
    this.elements.frequencyNumber.value = this.state.postFrequency.value;
    this.elements.timeUnitRadios.forEach(radio => {
      radio.checked = radio.value === this.state.postFrequency.unit;
    });
    this.updateFrequencyDisplay();
  }
  
  // Load data from storage
  async loadData() {
    const data = await StorageManager.loadData('leedz_story', {
      isLoggedIn: false,
      sortOrder: 'date',
      postFrequency: {
        value: 24,
        unit: 'hours'
      },
      lastPostDate: null,
      lastLoginDate: null
    });
    
    this.state = data;
  }
  
  // Save data to storage
  async saveData() {
    await StorageManager.saveData('leedz_story', this.state);
  }
}

// When the DOM is fully loaded, initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Create app instance -- calls init()
  const app = new LeedzApp();
  
  // Expose app to window for debugging in dev mode
  window.leedzApp = app;
});