/**
 * Leedz Story Manager - File Management Module
 * 
 * This module handles all operations related to the manifest JSON file that
 * stores video information, play order, and play history.
 */

class FileManager {
  constructor() {
    this.manifestFileName = 'Leedz_story.json';
    this.validVideoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv'];
    this.validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    this.files = [];
    this.fileHandles = {}; // Map of file ID -> file handle (not stored in JSON)
    this.sortOrder = 'date'; // Options: 'date', 'random', 'custom'
    this.lastSaveTime = null;
    
    // Load the manifest at initialization
    this.loadManifest().then(() => {
      console.log('Manifest loaded');
      this.logManifest(); // Debug
    }).catch(err => {
      console.error('Error loading manifest:', err);
    });
  }
  
  /**
   * Creates a new empty manifest
   */
  createEmptyManifest() {
    this.files = [];
    this.fileHandles = {};
    this.sortOrder = 'date';
    this.lastSaveTime = new Date().toISOString();
  }
  
  /**
   * Initialize the file manager by loading the manifest
   */
  async init() {
    await this.loadManifest();
    return this;
  }

  /**
   * Loads the manifest from Chrome storage or creates a new one
   */
  async loadManifest() {
    try {
      // Try to load from Chrome storage
      const result = await new Promise((resolve) => {
        if (chrome && chrome.storage) {
          chrome.storage.local.get('leedz_story_manifest', resolve);
        } else {
          const storedData = localStorage.getItem('leedz_story_manifest');
          resolve(storedData ? JSON.parse(storedData) : null);
        }
      });
      
      const manifest = result?.leedz_story_manifest;
      
      if (manifest) {
        this.files = manifest.files || [];
        this.sortOrder = manifest.sortOrder || 'date';
        this.lastSaveTime = manifest.lastUpdated || new Date().toISOString();
        
        // File handles cannot be stored in JSON, so they are empty after loading
        // They will be recreated when the user selects files again
        this.fileHandles = {};
        
        return true;
      } else {
        this.createEmptyManifest();
        return false;
      }
    } catch (error) {
      console.error('Error loading manifest:', error);
      this.createEmptyManifest();
      return false;
    }
  }
  
  /**
   * Saves the manifest to Chrome storage
   */
  async saveManifest() {
    try {
      // Update the last updated timestamp
      this.lastSaveTime = new Date().toISOString();
      
      // Create a copy of the manifest without the fileHandles
      const manifestToSave = {
        files: this.files,
        sortOrder: this.sortOrder,
        lastUpdated: this.lastSaveTime
      };
      
      // Save to Chrome storage
      await new Promise((resolve) => {
        if (chrome && chrome.storage) {
          chrome.storage.local.set({ 'leedz_story_manifest': manifestToSave }, resolve);
        } else {
          localStorage.setItem('leedz_story_manifest', JSON.stringify(manifestToSave));
          resolve();
        }
      });
      
      // Debug log the manifest
      this.logManifest();
      
      return true;
    } catch (error) {
      console.error('Error saving manifest:', error);
      return false;
    }
  }
  
  /**
   * Logs the manifest to the console for debugging
   */
  logManifest() {
    console.log('Current Manifest:', JSON.stringify({
      files: this.files,
      sortOrder: this.sortOrder,
      lastUpdated: this.lastSaveTime
    }, null, 2));
  }

  /**
   * Check if a file is a valid video or image file
   * @param {string} fileName - The name of the file to check
   * @returns {boolean} - True if the file is valid, false otherwise
   */
  isValidFile(fileName) {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    return this.validVideoExtensions.includes(ext) || this.validImageExtensions.includes(ext);
  }

  /**
   * Adds new files to the manifest using file handles
   * @param {FileSystemFileHandle[]} fileHandles - File handles from the file picker API
   * @returns {Promise<Object[]>} - Array of added files
   */
  async addFiles(fileHandles) {
    const validNewFiles = [];
    
    for (const handle of fileHandles) {
      try {
        if (handle.kind === 'file') {
          // Request permission to use this file later
          const permission = await handle.requestPermission({ mode: 'read' });
          
          if (permission === 'granted') {
            // Get the file to read metadata
            const file = await handle.getFile();
            
            if (this.isValidFile(file.name)) {
              // Generate a unique ID for this file
              const fileId = Date.now() + Math.floor(Math.random() * 1000);
              
              // Add to our files array
              const newFile = {
                id: fileId,
                name: file.name,
                type: file.type,
                size: file.size,
                dateAdded: new Date().toISOString(),
                playOrder: this.files.length + validNewFiles.length + 1,
                lastPlayed: null
              };
              
              validNewFiles.push(newFile);
              
              // Store the handle separately (not serialized to JSON)
              this.fileHandles[fileId] = handle;
            }
          }
        }
      } catch (error) {
        console.error('Error adding file:', error);
      }
    }
    
    // Add all valid new files at once
    this.files = [...this.files, ...validNewFiles];
    
    // Update the play order based on the current sort order
    this.updatePlayOrder();
    
    // Save the updated manifest
    await this.saveManifest();
    
    return validNewFiles;
  }
  
  /**
   * Remove a file from the manifest
   * @param {number} index - Index of the file to remove
   * @returns {Promise<boolean>} - Whether the removal was successful
   */
  async removeFile(index) {
    if (index >= 0 && index < this.files.length) {
      // Get the file ID before removing
      const fileId = this.files[index].id;
      
      // Remove from files array
      this.files.splice(index, 1);
      
      // Remove from file handles
      if (fileId && this.fileHandles[fileId]) {
        delete this.fileHandles[fileId];
      }
      
      // Update the play order
      this.updatePlayOrder();
      
      // Save the updated manifest
      await this.saveManifest();
      
      return true;
    }
    
    return false;
  }

  /**
   * Move a file up or down in the manifest
   * @param {number} index - The index of the file to move
   * @param {string} direction - 'up' or 'down'
   * @returns {boolean} - Success status
   */
  async moveFile(index, direction) {
    if (index < 0 || index >= this.files.length) {
      return false;
    }
    
    // Can't move first item up
    if (direction === 'up' && index === 0) {
      return false;
    }
    
    // Can't move last item down
    if (direction === 'down' && index === this.files.length - 1) {
      return false;
    }
    
    // Swap items
    if (direction === 'up') {
      [this.files[index - 1], this.files[index]] = [this.files[index], this.files[index - 1]];
    } else {
      [this.files[index], this.files[index + 1]] = [this.files[index + 1], this.files[index]];
    }
    
    // Update play order
    this.files.forEach((file, i) => {
      file.playOrder = i + 1;
    });
    
    await this.saveManifest();
    return true;
  }

  /**
   * Update play order based on current sort setting
   */
  updatePlayOrder() {
    // First, sort according to the current sortOrder
    if (this.sortOrder === 'date') {
      // Sort by date added (oldest first)
      this.files.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
    } else if (this.sortOrder === 'random') {
      // Shuffle the array
      this.files.sort(() => Math.random() - 0.5);
    }
    // Custom order is manually maintained via move up/down
    
    // Update play order numbers to match new array order
    this.files.forEach((file, index) => {
      file.playOrder = index + 1;
    });
  }

  /**
   * Set the sort order and update play order
   * @param {string} order - 'date', 'random', or 'custom'
   */
  async setSortOrder(order) {
    if (!['date', 'random', 'custom'].includes(order)) {
      return false;
    }
    
    this.sortOrder = order;
    this.updatePlayOrder();
    await this.saveManifest();
    return true;
  }

  /**
   * Gets the next file to play based on the play order
   * @returns {Object|null} - The next file to play, or null if no files
   */
  getNextFile() {
    if (this.files.length === 0) {
      return null;
    }
    
    let nextFile = null;
    
    // Find the file that hasn't been played yet or has the oldest last played date
    if (this.sortOrder === 'random') {
      // For random, pick a truly random file
      const randomIndex = Math.floor(Math.random() * this.files.length);
      nextFile = this.files[randomIndex];
    } else {
      // Find files that haven't been played yet
      const unplayedFiles = this.files.filter(file => !file.lastPlayed);
      
      if (unplayedFiles.length > 0) {
        // Play the first unplayed file
        nextFile = unplayedFiles[0];
      } else {
        // All files have been played, find the one with oldest last played date
        nextFile = this.files.reduce((oldest, current) => {
          if (!oldest) return current;
          return new Date(oldest.lastPlayed) < new Date(current.lastPlayed) ? oldest : current;
        }, null);
      }
    }
    
    return nextFile;
  }

  /**
   * Marks a file as played
   * @param {string|number} fileId - The ID of the file to mark as played
   * @returns {Promise<boolean>} - Whether the update was successful
   */
  async markFileAsPlayed(fileId) {
    const fileIndex = this.files.findIndex(file => file.id == fileId);
    
    if (fileIndex !== -1) {
      // Update the last played date
      this.files[fileIndex].lastPlayed = new Date().toISOString();
      
      // Save the updated manifest
      await this.saveManifest();
      
      return true;
    }
    
    return false;
  }

  /**
   * Gets a file for posting by its ID
   * @param {string|number} fileId - The ID of the file to get
   * @returns {Promise<File>} - The File object for posting
   */
  async getFileForPosting(fileId) {
    // Find the file handle
    const handle = this.fileHandles[fileId];
    
    if (!handle) {
      throw new Error(`No file handle found for ID: ${fileId}`);
    }
    
    // Check if we still have permission
    const permission = await handle.queryPermission({ mode: 'read' });
    
    if (permission !== 'granted') {
      // Ask for permission again
      const newPermission = await handle.requestPermission({ mode: 'read' });
      
      if (newPermission !== 'granted') {
        throw new Error('Permission to access the file was denied');
      }
    }
    
    // Get the actual file
    return await handle.getFile();
  }

  /**
   * Get all files in the manifest
   * @returns {Array} - All files
   */
  getAllFiles() {
    return [...this.files]; // Return a copy to prevent direct mutation
  }
  
  /**
   * Get the count of files in the manifest
   * @returns {number} - File count
   */
  getFileCount() {
    return this.files.length;
  }
  
  /**
   * Check if a file has been played within a given time period
   * @param {Object} file - The file to check
   * @param {number} hours - Hours to check
   * @returns {boolean} - Whether the file was played within the time period
   */
  wasPlayedRecently(file, hours = 24) {
    if (!file.lastPlayed) return false;
    
    const lastPlayed = new Date(file.lastPlayed);
    const now = new Date();
    const diffMs = now - lastPlayed;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours < hours;
  }
  
  /**
   * Clear all files from the manifest
   * @returns {boolean} - Success status
   */
  async clearAllFiles() {
    this.files = [];
    return await this.saveManifest();
  }
}

// Create a global instance of the FileManager
window.fileManager = new FileManager();
