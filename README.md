# Leedz Story Manager

© 2025 The Leedz. All rights reserved.  
theleedz.com@gmail.com

---

## Table of Contents

1. [Overview](#overview)  
2. [The Problem](#the-problem)  
3. [TOS Compliance](#tos-compliance)  
4. [App Functionality](#app-functionality)  
5. [Installation Guide](#installation-guide)  
6. [Legal Note](#legal-note)

---

## Overview

**Leedz Story Manager** is a browser extension that helps users queue and schedule Instagram Stories using a clean visual interface. It is built specifically to remain compliant with Facebook/Meta’s Terms of Service while solving for gaps in their native tools.

---

## The Problem

Meta provides first-party scheduling tools for professional accounts—but these tools are notoriously unreliable, inconsistently available, and often bug-prone. Many users find features randomly disabled or throttled with no explanation, while official support blames "temporary bugs."

Leedz Story Manager was built in direct response to these frustrations.

---

## TOS Compliance

Leedz Story Manager is designed to **respect Meta’s platform rules**:

- It requires **manual file selection** and **explicit user interaction**.
- It uses **Chrome’s approved extension APIs**—not unofficial APIs, scraping, or emulated behavior.
- All data is stored **locally** in the browser—no remote uploads or scraping involved.
- It mimics a natural, user-driven workflow while allowing light automation **within the bounds of ordinary use**.

This tool does **not**:
- Log in programmatically
- Interact with Instagram APIs
- Automate without direct user input

---

## App Functionality

- Users select video/image files from their system.
- The extension saves and displays those files in an ordered playlist.
- Users configure post frequency (e.g., every 24 hours).
- A visual dashboard allows file reordering, deletion, and frequency control.
- When activated, the tool prompts the user to open Instagram, then guides posting from the queue.

Internally, a manifest (`leedz_story.json`) stores:
- Filename, date added, play order, and last played timestamp.
- User's desired posting interval and sort method.

The UI includes:
- Accordion-style collapsible panels
- Real-time login status detection
- Persistent storage between sessions

---

## Installation Guide


1. Users must unzip it.
2. Open `chrome://extensions`
3. Select **Load unpacked**
4. Choose the unzipped folder.

---

## Legal Note

While this tool was built with compliance in mind, **Meta’s enforcement policies are opaque and subject to change without notice.** Use of this tool does not guarantee immunity from platform reviews or restrictions.

That said, **Leedz Story Manager exists to help creators stay visible, stay compliant, and stay in control**—even when the official tools fail to do so.

---

Questions? Reach out: theleedz.com@gmail.com
uploading new file from desktop
