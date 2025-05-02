/**
 * Poster module for Leedz Story
 * Handles posting stories to Instagram or other platforms
 */
const Poster = {
  // Keep track of the posting process
  isPosting: false,
  rotationInterval: null,
  rotationDegree: 0,
  
  // Start the posting process
  start: async function() {
    if (this.isPosting) {
      console.log("Already posting");
      return;
    }
    
    console.log("Starting posting process");
    this.isPosting = true;
    
    // Start the icon rotation
    this.startIconRotation();
    
    try {
      // Get the next file to post from the FileManager
      const nextFile = window.fileManager.getNextFile();
      
      if (!nextFile) {
        console.error("No files to post");
        alert("No files available to post. Please add some files first.");
        this.isPosting = false;
        this.stopIconRotation();
        return;
      }
      
      console.log("Next file to post:", nextFile.name);
      
      // Post the file to Instagram
      const success = await this.postFile(nextFile);
      
      if (success) {
        console.log("Successfully posted file:", nextFile.name);
        // Mark the file as posted
        await window.fileManager.markFileAsPlayed(nextFile.id);
      } else {
        console.error("Failed to post file:", nextFile.name);
      }
    } catch (error) {
      console.error("Error in posting process:", error);
    } finally {
      this.isPosting = false;
      this.stopIconRotation();
    }
  },
  
  // Start the icon rotation animation
  startIconRotation: function() {
    const iconElement = document.getElementById('processIcon');
    if (!iconElement) return;
    
    this.rotationDegree = 0;
    
    // Clear any existing interval
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
    
    // Start a new rotation interval
    this.rotationInterval = setInterval(() => {
      this.rotationDegree = (this.rotationDegree + 10) % 360;
      iconElement.style.transform = `rotate(${this.rotationDegree}deg)`;
    }, 50);
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
  postFile: async function(fileMetadata) {
    try {
      console.log("Preparing to post file:", fileMetadata.name);
      
      // Get the actual file only when needed using the file handle
      const file = await window.fileManager.getFileForPosting(fileMetadata.id);
      
      if (!file) {
        console.error("Could not access file:", fileMetadata.name);
        return false;
      }
      
      console.log("File accessed successfully, size:", file.size);
      
      // Post the file to Instagram
      // This is where the actual posting logic would go
      // For demo purposes, we're just simulating it
      
      // Post this story to IG
      // This would interact with Instagram's API or interface
      // FIXME FIXME FIXME
      
      // For demo purposes, just resolve after a delay
      return new Promise(resolve => {
        setTimeout(() => {
          console.log("Posted file to Instagram:", file.name);
          resolve(true);
        }, 1000);
      });
    } catch (error) {
      console.error("Error posting file:", error);
      return false;
    }
  }
};

// Export the Poster module for use in other files
window.Poster = Poster;
