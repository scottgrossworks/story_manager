// Leedz Poster - Handles Instagram posting logic
// Separated from dashboard.js for cleaner code organization

// The Poster module manages Instagram interactions for posting
const Poster = {
  // Flag to track if posting is active
  isPosting: false,
  
  // Reference to the rotation animation interval
  rotationInterval: null,
  
  // Rotation angle tracker
  currentRotation: 0,
  
  // File Manager instance 
  fileManager: null,
  
  // Start the posting process
  startPosting: function() {
    if (this.isPosting) return false; // Don't start if already running
    
    // Initialize file manager if needed
    if (!this.fileManager) {
      this.fileManager = new FileManager();
      this.fileManager.init();
    }
    
    this.isPosting = true;
    
    // Start icon rotation
    this.startIconRotation();
    
    // Get next file to post based on sort order and settings
    this.postNextFile();
     
    return true;
  },
  
  // Post the next file based on current settings
  postNextFile: function() {
    if (!this.isPosting) return;
    
    // Get frequency settings from LeedzApp
    const frequency = {
      value: 24,
      unit: 'hours'
    };
    
    if (window.leedzApp && window.leedzApp.state.postFrequency) {
      frequency.value = window.leedzApp.state.postFrequency.value;
      frequency.unit = window.leedzApp.state.postFrequency.unit;
    }
    
    // Get next file to post
    const nextFile = this.fileManager.getNextFile(frequency);
    
    if (!nextFile) {
      console.warn("No files available for posting");
      this.completePoster();
      return;
    }
    
    console.log("Posting file:", nextFile.name);
    
    // Post the file
    this.postFile(nextFile).then(success => {
      if (success) {
        // Mark as played
        this.fileManager.markFileAsPlayed(nextFile.id);
        
        // Complete the posting process
        this.completePoster();
      } else {
        console.error("Failed to post file:", nextFile.name);
        this.completePoster();
      }
    });
  },
  
  // Handle posting completion
  completePoster: function() {
    if (!this.isPosting) return;
    
    this.isPosting = false;
    this.stopIconRotation();
    
    console.log("Posting process completed");
    
    // Update dashboard if needed
    if (window.leedzApp) {
      // Update last post date
      window.leedzApp.state.lastPostDate = new Date();
      
      // Update file last played dates if needed
      // TODO: Implement this based on which files were actually posted
      
      // Save the updated state
      window.leedzApp.saveData();
    }
  },
  
  // Start the icon rotation animation
  startIconRotation: function() {
    // Get the process icon element
    const iconElement = document.getElementById('processIcon');
    if (!iconElement) return;
    
    // Make sure it's visible
    iconElement.style.display = 'inline-block';
    this.currentRotation = 0;
    
    // Clear any existing interval
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
    
    // Start rotation animation
    this.rotationInterval = setInterval(() => {
      this.currentRotation += 5; // Increment by 5 degrees each frame
      if (this.currentRotation >= 360) {
        this.currentRotation = 0;
      }
      iconElement.style.transform = `rotate(${this.currentRotation}deg)`;
    }, 50); // Update every 50ms for smooth animation
  },
  
  // Stop the icon rotation animation
  stopIconRotation: function() {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }
    
    // Reset the icon rotation
    const iconElement = document.getElementById('processIcon');
    if (iconElement) {
      iconElement.style.transform = 'rotate(0deg)';
    }
  },
  
  // Post a single file to Instagram
  postFile: function(file) {
    return new Promise((resolve, reject) => {
      console.log("Posting file to Instagram:", file.name);
      
      // TODO: Implement actual Instagram posting logic
      // This would interact with Instagram's API or interface
      
      // For demo purposes, just resolve after a delay
      setTimeout(() => {
        // Update the file's last played date
        file.lastPlayed = new Date();
        resolve(true);
      }, 1000);
    });
  }
};

// Export the Poster module for use in other files
window.Poster = Poster;
