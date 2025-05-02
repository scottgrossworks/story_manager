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
      // Fallback to localStorage for testing
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
      // Fallback to localStorage for testing
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
        console.warn('Chrome tabs API not available, using mock login data');
        resolve(MOCK_DATA.instagramLoggedIn);
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

// File Manager - handles file selection and management
const FileManager = {
  // Select files using system dialog
  selectFiles: function() { // Make it return a Promise consistently


    // Define the fallback function separately for clarity
    const fallbackSelect = () => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'video/*,image/*';
        
        input.onchange = (e) => {
          const selectedFiles = Array.from(e.target.files).map((file, index) => ({
            id: Date.now() + index,
            path: file.name, // Note: full path is not available for security
            name: file.name,
            dateAdded: new Date(),
            playOrder: index + 1, // Initial order based on selection
            lastPlayed: null
          }));
          resolve(selectedFiles);
        };
        
        input.click(); // Trigger the dialog
      });
    };

    // Try using modern File System Access API if available
    if (window.showOpenFilePicker) {
      return new Promise(async (resolve) => { // Wrap modern API in promise for consistency
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
              id: Date.now() + i,
              path: file.name, // Note: full path is not available for security
              name: file.name,
              dateAdded: new Date(),
              playOrder: i + 1, // Initial order based on selection
              lastPlayed: null
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
      files: [],
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
    
    // Initialize app
    this.init();
  }
  
  // Initialize the app
  init() {
    // First, load data from storage
    this.loadData().then(() => {
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
      this.handleFileSelection();
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
  }
  
  // Toggle accordion section
  toggleAccordion(header) {
    // Prevent re-entry if already toggling
    if (this.isToggling) {
      return;
    }
    this.isToggling = true;

    const clickedSection = header.closest('.accordion-section');
    // Check if the clicked section is currently active
    const isActive = clickedSection.classList.contains('active');

    // First, remove 'active' class from all sections
    document.querySelectorAll('.accordion-section').forEach(section => {
      // Optimization: Check before removing
      if (section !== clickedSection && section.classList.contains('active')) {
          section.classList.remove('active');
      }
    });

    // Toggle the 'active' class on the clicked section
    if (!isActive) {
      clickedSection.classList.add('active');
    } else {
      // If it was active, remove the class (effectively toggling off)
      clickedSection.classList.remove('active');
    }

    // Reset flag after a short delay to allow UI updates and prevent bounce
    setTimeout(() => {
      this.isToggling = false;
    }, 100); // 100ms delay seems reasonable
  }
  
  // Check Instagram login status
  async checkLoginStatus() {
    const isLoggedIn = await InstagramManager.checkLoginStatus();
    this.state.isLoggedIn = isLoggedIn;
    this.state.lastLoginDate = isLoggedIn ? new Date() : this.state.lastLoginDate;
    
    // Update UI
    this.updateLoginStatus(isLoggedIn);
    this.saveData();
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
  
  // Handle file selection
  async handleFileSelection() {
    try {
      const selectedFiles = await FileManager.selectFiles();
      if (selectedFiles && selectedFiles.length > 0) {
        // Add to existing files
        this.state.files = [...this.state.files, ...selectedFiles];
        // Update play order
        this.updatePlayOrder();
        // Save data
        this.saveData();
        // Update UI
        this.renderFileTable();
        this.updateFileCount();
      }
    } catch (error) {
      console.error('File selection error:', error);
    }
  }
  
  // Update play order based on current sort
  updatePlayOrder() {
    if (this.state.sortOrder === 'date') {
      // Sort by date added
      this.state.files.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
    } else if (this.state.sortOrder === 'alphabetical') {
      // Sort alphabetically
      this.state.files.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.state.sortOrder === 'random') {
      // Shuffle the array
      this.state.files = this.state.files.sort(() => Math.random() - 0.5);
    }
    // Custom order is manually maintained via move up/down
    
    // Update play order property
    this.state.files.forEach((file, index) => {
      file.playOrder = index + 1;
    });
  }
  
  // Render file table
  renderFileTable() {
    // Clear table
    this.elements.fileTableBody.innerHTML = '';
    
    // Add files to table
    this.state.files.forEach((file, index) => {
      const row = document.createElement('tr');
      
      // Index cell
      const indexCell = document.createElement('td');
      indexCell.textContent = file.playOrder;
      row.appendChild(indexCell);
      
      // Filename cell
      const nameCell = document.createElement('td');
      nameCell.textContent = file.path;
      row.appendChild(nameCell);
      
      // Move up cell
      const moveUpCell = document.createElement('td');
      const moveUpButton = document.createElement('span');
      moveUpButton.className = 'file-action move-up';
      moveUpButton.innerHTML = '▲';
      moveUpButton.addEventListener('click', () => this.moveFile(index, 'up'));
      moveUpCell.appendChild(moveUpButton);
      row.appendChild(moveUpCell);
      
      // Move down cell
      const moveDownCell = document.createElement('td');
      const moveDownButton = document.createElement('span');
      moveDownButton.className = 'file-action move-down';
      moveDownButton.innerHTML = '▼';
      moveDownButton.addEventListener('click', () => this.moveFile(index, 'down'));
      moveDownCell.appendChild(moveDownButton);
      row.appendChild(moveDownCell);
      
      // Remove cell
      const removeCell = document.createElement('td');
      const removeButton = document.createElement('span');
      removeButton.className = 'file-action remove';
      removeButton.innerHTML = '✕';
      removeButton.addEventListener('click', () => this.removeFile(index));
      removeCell.appendChild(removeButton);
      row.appendChild(removeCell);
      
      this.elements.fileTableBody.appendChild(row);
    });
  }
  
  // Update file count in UI
  updateFileCount() {
    this.elements.fileCount.textContent = `(${this.state.files.length} total)`;
    
    // Update color to green
    this.elements.fileCount.style.color = 'var(--LEEDZ_DARKGREEN)';
  }
  
  // Move file up or down in the list
  moveFile(index, direction) {
    if (direction === 'up' && index > 0) {
      // Swap with previous item
      [this.state.files[index], this.state.files[index - 1]] = 
      [this.state.files[index - 1], this.state.files[index]];
    } else if (direction === 'down' && index < this.state.files.length - 1) {
      // Swap with next item
      [this.state.files[index], this.state.files[index + 1]] = 
      [this.state.files[index + 1], this.state.files[index]];
    }
    
    // Update play order
    this.updatePlayOrder();
    
    // Update UI and save
    this.renderFileTable();
    this.saveData();
  }
  
  // Remove file from list
  removeFile(index) {
    this.state.files.splice(index, 1);
    
    // Update play order
    this.updatePlayOrder();
    
    // Update UI and save
    this.renderFileTable();
    this.updateFileCount();
    this.saveData();
  }
  
  // Handle order selection change
  handleOrderChange(value) {
    console.log(`Order changed to: ${value}`); // Temporary log
    this.state.sortOrder = value;
    this.updatePlayOrder(); // Re-sort based on new order
    this.renderFileTable(); // Re-render table if order affects display
    
    // Update the display text
    let orderText = 'Date added'; // Default
    if (value === 'alphabetical') { // Keep existing case just in case
      orderText = 'Alphabetical';
    } else if (value === 'random') {
      orderText = 'Random';
    } else if (value === 'custom') {
      orderText = 'Custom';
    }
    this.elements.orderType.textContent = orderText;
    
    this.saveData(); // Save the new state
  }
  
  // Handle time unit change
  handleTimeUnitChange(unit) {
    this.state.postFrequency.unit = unit;
    this.updateFrequencyDisplay();
    this.saveData();
  }
  
  // Handle frequency value change
  handleFrequencyChange(value) {
    // Update UI immediately
    this.state.postFrequency.value = parseInt(value) || 1;
    this.updateFrequencyDisplay();
    
    // Validate the number
    this.validateFrequencyNumber(value);
  }
  
  // Validate frequency number based on unit
  validateFrequencyNumber(value) {
    const input = this.elements.frequencyNumber;
    const num = parseInt(value);
    
    // Remove any previous error class
    input.classList.remove('input-error');
    
    // Validate based on unit
    if (this.state.postFrequency.unit === 'hours') {
      if (num < 1 || num > 24) {
        input.classList.add('input-error');
        return false;
      }
    } else if (this.state.postFrequency.unit === 'minutes') {
      if (num < 1 || num > 60) {
        input.classList.add('input-error');
        return false;
      }
    }
    
    // Valid, save data
    this.state.postFrequency.value = num;
    this.saveData();
    return true;
  }
  
  // Update frequency display
  updateFrequencyDisplay() {
    this.elements.frequencyValue.textContent = `Every ${this.state.postFrequency.value} ${this.state.postFrequency.unit}.`;
  }
  
  // Render all UI elements based on current state
  renderUI() {
    // Update login status
    this.updateLoginStatus(this.state.isLoggedIn);
    
    // Render file table and count
    this.renderFileTable();
    this.updateFileCount();
    
    // Set order radio buttons
    this.elements.orderRadios.forEach(radio => {
      radio.checked = radio.value === this.state.sortOrder;
    });
    this.elements.orderType.textContent = this.state.sortOrder === 'date' ? 'Date added' : 
                                          this.state.sortOrder === 'alphabetical' ? 'Alphabetical' : 
                                          this.state.sortOrder === 'random' ? 'Random' : 'Custom';
    
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
      files: [],
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