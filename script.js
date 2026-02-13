/* ============================================
   VIM LIBRARY - JAVASCRIPT
   ============================================ */

// Global state management
const AppState = {
  currentPath: "LibraryFolder",
  currentView: "home", // 'home', 'library', 'upload', 'file'
  isAdmin: false,
  navigationHistory: [], // Track navigation history (both files and folders)
  currentState: null, // Current navigation state
  originalFileContent: null, // Store original content for edit cancellation
};

// Admin password
const ADMIN_PASSWORD = "misoloveeggs";

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

/**
 * Show the home/welcome section
 */
function showHome() {
  AppState.currentView = "home";
  document.getElementById("welcomeSection").style.display = "block";
  document.getElementById("libraryContainer").classList.remove("active");
  document.getElementById("fileViewer").classList.remove("active");
  document.getElementById("uploadSection").classList.remove("active");
}

/**
 * Show the library browser
 */
function showLibrary() {
  AppState.currentView = "library";
  document.getElementById("welcomeSection").style.display = "none";
  document.getElementById("libraryContainer").classList.add("active");
  document.getElementById("fileViewer").classList.remove("active");
  document.getElementById("uploadSection").classList.remove("active");
  navigateToPath("", false); // false = don't add to history when initializing
}

/**
 * Show the file upload section (requires admin)
 */
function showUpload() {
  if (!AppState.isAdmin) {
    showAdminModal();
    return;
  }
  AppState.currentView = "upload";
  document.getElementById("welcomeSection").style.display = "none";
  document.getElementById("libraryContainer").classList.remove("active");
  document.getElementById("fileViewer").classList.remove("active");
  document.getElementById("uploadSection").classList.add("active");
}

// ============================================
// ADMIN AUTHENTICATION
// ============================================

/**
 * Show admin login modal
 */
function showAdminModal() {
  const modal = document.getElementById("adminModal");
  modal.classList.add("active");
  document.getElementById("adminPassword").value = "";
  document.getElementById("adminError").style.display = "none";
  document.getElementById("adminPassword").focus();
}

/**
 * Close admin modal
 */
function closeAdminModal() {
  const modal = document.getElementById("adminModal");
  modal.classList.remove("active");
}

/**
 * Check admin password
 */
function checkAdminPassword() {
  const password = document.getElementById("adminPassword").value;
  const errorDiv = document.getElementById("adminError");

  if (password === ADMIN_PASSWORD) {
    AppState.isAdmin = true;
    closeAdminModal();
    showUpload();
  } else {
    errorDiv.textContent = "Incorrect password. Please try again.";
    errorDiv.style.display = "block";
    document.getElementById("adminPassword").value = "";
    document.getElementById("adminPassword").focus();
  }
}

// Allow Enter key to submit password
document.addEventListener("DOMContentLoaded", function () {
  const passwordInput = document.getElementById("adminPassword");
  if (passwordInput) {
    passwordInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        checkAdminPassword();
      }
    });
  }
});

// ============================================
// LIBRARY NAVIGATION
// ============================================

/**
 * Navigate to a specific path in the library
 * @param {string} path - Relative path from LibraryFolder
 * @param {boolean} addToHistory - Whether to add this navigation to history (default: true)
 */
function navigateToPath(path, addToHistory = true) {
  // Save current state to history before navigating
  if (addToHistory && AppState.currentState) {
    AppState.navigationHistory.push({
      type: AppState.currentState.type, // 'folder' or 'file'
      path: AppState.currentState.path,
      view: AppState.currentState.view,
    });
  }

  AppState.currentPath = path ? `LibraryFolder/${path}` : "LibraryFolder";

  // Update current state
  AppState.currentState = {
    type: "folder",
    path: AppState.currentPath,
    view: "library",
  };

  updateBreadcrumb(path);
  loadDirectory(AppState.currentPath);

  // Update back button visibility
  updateBackButton();
}

/**
 * Update breadcrumb navigation based on current path
 * @param {string} path - Current relative path
 */
function updateBreadcrumb(path) {
  const breadcrumb = document.getElementById("breadcrumb");

  if (!path) {
    breadcrumb.innerHTML =
      "<span onclick=\"navigateToPath('')\">Library</span>";
    return;
  }

  const parts = path.split("/");
  let breadcrumbHTML = "<span onclick=\"navigateToPath('')\">Library</span>";
  let currentPath = "";

  parts.forEach((part, index) => {
    currentPath += (currentPath ? "/" : "") + part;
    const isLast = index === parts.length - 1;
    breadcrumbHTML += ` / `;

    if (isLast) {
      breadcrumbHTML += `<span>${part}</span>`;
    } else {
      breadcrumbHTML += `<span onclick="navigateToPath('${currentPath}')">${part}</span>`;
    }
  });

  breadcrumb.innerHTML = breadcrumbHTML;
}

/**
 * Load directory contents from server
 * @param {string} path - Full path to directory
 */
async function loadDirectory(path) {
  const fileList = document.getElementById("fileList");
  fileList.innerHTML = '<li class="loading">Loading...</li>';

  try {
    const response = await fetch(`/api/list?path=${encodeURIComponent(path)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    displayFiles(data.files || [], data.folders || [], path);
  } catch (error) {
    console.error("Error loading directory:", error);
    fileList.innerHTML = `<li class="error-message">Error loading directory: ${error.message}</li>`;
  }
}

/**
 * Display files and folders in the library view
 * @param {Array} files - Array of file names
 * @param {Array} folders - Array of folder names
 * @param {string} currentPath - Current directory path
 */
function displayFiles(files, folders, currentPath) {
  const fileList = document.getElementById("fileList");
  fileList.innerHTML = "";

  // Display folders first
  folders.forEach((folder) => {
    const li = document.createElement("li");
    li.className = "folder-item";
    li.innerHTML = `
            <span class="folder-icon">📁</span>
            <span class="item-name">${folder}</span>
        `;
    li.onclick = () => {
      const newPath = currentPath ? `${currentPath}/${folder}` : folder;
      navigateToPath(newPath.replace("LibraryFolder/", ""));
    };
    fileList.appendChild(li);
  });

  // Display files with appropriate icons based on extension
  files.forEach((file) => {
    const li = document.createElement("li");
    li.className = "file-item";
    const icon = getFileIcon(file);
    li.innerHTML = `
            <span class="file-icon">${icon}</span>
            <span class="item-name">${file}</span>
        `;
    li.onclick = () => {
      const filePath = currentPath ? `${currentPath}/${file}` : file;
      loadFile(filePath);
    };
    fileList.appendChild(li);
  });

  if (folders.length === 0 && files.length === 0) {
    fileList.innerHTML = '<li class="loading">No items found</li>';
  }
}

/**
 * Get appropriate icon for file based on extension
 * @param {string} filename - Name of the file
 * @returns {string} - Emoji icon
 */
function getFileIcon(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const iconMap = {
    md: "📄",
    txt: "📝",
    pdf: "📕",
    doc: "📘",
    docx: "📘",
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
    gif: "🖼️",
    mp4: "🎬",
    mp3: "🎵",
    zip: "📦",
    rar: "📦",
  };
  return iconMap[ext] || "📄";
}

// ============================================
// FILE READING FUNCTIONS
// ============================================

/**
 * Load and display file content
 * @param {string} filePath - Full path to file
 * @param {boolean} addToHistory - Whether to add this navigation to history (default: true)
 */
async function loadFile(filePath, addToHistory = true) {
  // Save current state to history before loading file
  if (addToHistory && AppState.currentState) {
    AppState.navigationHistory.push({
      type: AppState.currentState.type, // 'folder' or 'file'
      path: AppState.currentState.path,
      view: AppState.currentState.view,
    });
  }

  const fileViewer = document.getElementById("fileViewer");
  const fileTitle = document.getElementById("fileTitle");
  const fileContent = document.getElementById("fileContent");
  const fileContentEdit = document.getElementById("fileContentEdit");
  const backBtn = document.getElementById("backBtn");
  const editBtn = document.getElementById("editBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  const fileName = filePath.split("/").pop();
  fileTitle.textContent = fileName;
  fileContent.textContent = "Loading...";
  fileContent.className = "file-content";
  fileContentEdit.style.display = "none";
  fileContent.style.display = "block";

  // Update current state
  AppState.currentState = {
    type: "file",
    path: filePath,
    view: "file",
  };

  // Update back button visibility
  updateBackButton();

  // Show edit/delete buttons only for text files and if admin
  const fileExtension = fileName.split(".").pop().toLowerCase();
  const isTextFile = ["txt", "md"].includes(fileExtension);
  editBtn.style.display = AppState.isAdmin && isTextFile ? "block" : "none";
  deleteBtn.style.display = AppState.isAdmin ? "block" : "none";

  fileViewer.classList.add("active");
  document.getElementById("libraryContainer").classList.remove("active");

  try {
    const response = await fetch(
      `/api/file?path=${encodeURIComponent(filePath)}`,
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Handle different file types
    if (data.type === "binary" || fileExtension === "pdf") {
      displayPDF(filePath, fileContent);
      editBtn.style.display = "none";
    } else if (["jpg", "jpeg", "png", "gif"].includes(fileExtension)) {
      displayImage(filePath, fileContent);
      editBtn.style.display = "none";
    } else if (data.type === "markdown" || fileExtension === "md") {
      displayMarkdown(data.content, fileContent);
    } else {
      displayText(data.content, fileContent);
    }

    // Store original content for edit
    AppState.originalFileContent = data.content || "";
  } catch (error) {
    console.error("Error loading file:", error);
    fileContent.textContent = `Error: Could not load file "${fileName}".\n\n${error.message}`;
    fileContent.className = "file-content error-message";
  }
}

/**
 * Update back button visibility based on history
 */
function updateBackButton() {
  const backBtn = document.getElementById("backBtn");
  backBtn.style.display =
    AppState.navigationHistory.length > 0 ? "block" : "none";
}

/**
 * Go back to previous navigation state (file or folder)
 */
function goBack() {
  // Add activity feedback
  console.log("🔙 Going back to library folder...");
  console.log("Navigation history:", AppState.navigationHistory);

  if (AppState.navigationHistory.length === 0) {
    // No history, go to library root
    console.log("No history found, navigating to library root");
    closeFileViewer();
    navigateToPath("", false);
    return;
  }

  // Get the previous state from history
  const previousState = AppState.navigationHistory.pop();
  console.log("Restored state:", previousState);

  // Restore the previous state
  if (previousState.type === "file") {
    // Restore file view
    console.log("Loading previous file:", previousState.path);
    loadFile(previousState.path, false); // false = don't add to history when going back
  } else if (previousState.type === "folder") {
    // Restore folder view
    const relativePath = previousState.path.replace("LibraryFolder/", "");
    console.log("Navigating to previous folder:", relativePath);
    navigateToPath(relativePath, false); // false = don't add to history when going back
  }

  // Update back button visibility
  updateBackButton();
}

/**
 * Display PDF file using iframe
 * @param {string} filePath - Path to PDF file
 * @param {HTMLElement} container - Container element
 */
function displayPDF(filePath, container) {
  container.innerHTML = `<iframe src="/${filePath}" class="pdf-viewer"></iframe>`;
}

/**
 * Display markdown content with formatting
 * @param {string} content - Markdown content
 * @param {HTMLElement} container - Container element
 */
function displayMarkdown(content, container) {
  container.className = "file-content markdown";

  // Basic markdown parsing
  let html = content
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/`(.*?)`/gim, "<code>$1</code>")
    .replace(/\n\n/gim, "</p><p>")
    .replace(/^\n/gim, "<p>")
    .replace(/\n$/gim, "</p>");

  container.innerHTML = `<p>${html}</p>`;
}

/**
 * Display image file
 * @param {string} filePath - Path to image file
 * @param {HTMLElement} container - Container element
 */
function displayImage(filePath, container) {
  container.innerHTML = `<img src="/${filePath}" alt="Image" style="max-width: 100%; height: auto; border-radius: 8px;">`;
}

/**
 * Display plain text content
 * @param {string} content - Text content
 * @param {HTMLElement} container - Container element
 */
function displayText(content, container) {
  container.textContent = content;
  container.className = "file-content";
}

/**
 * Close file viewer and return to library
 */
function closeFileViewer() {
  document.getElementById("fileViewer").classList.remove("active");
  document.getElementById("libraryContainer").classList.add("active");
  // Don't clear history when closing - user might want to go back
}

// ============================================
// FILE EDIT FUNCTIONS
// ============================================

/**
 * Enter edit mode for current file
 */
function editFile() {
  const fileContent = document.getElementById("fileContent");
  const fileContentEdit = document.getElementById("fileContentEdit");
  const editActions = document.getElementById("editActions");
  const editBtn = document.getElementById("editBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  // Store original content if not already stored
  if (!AppState.originalFileContent) {
    AppState.originalFileContent = fileContent.textContent;
  }

  // Switch to edit mode
  fileContent.style.display = "none";
  fileContentEdit.style.display = "block";
  fileContentEdit.value = AppState.originalFileContent;
  editActions.style.display = "flex";
  editBtn.style.display = "none";
  deleteBtn.style.display = "none";

  // Focus on textarea
  fileContentEdit.focus();
}

/**
 * Save edited file
 */
async function saveFile() {
  const fileContentEdit = document.getElementById("fileContentEdit");
  const newContent = fileContentEdit.value;

  if (!AppState.currentFilePath) {
    alert("No file selected");
    return;
  }

  try {
    const response = await fetch("/api/edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: AppState.currentFilePath,
        content: newContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save file");
    }

    // Update displayed content
    const fileContent = document.getElementById("fileContent");
    const fileExtension = AppState.currentFilePath
      .split(".")
      .pop()
      .toLowerCase();

    if (fileExtension === "md") {
      displayMarkdown(newContent, fileContent);
    } else {
      displayText(newContent, fileContent);
    }

    // Exit edit mode
    cancelEdit();

    // Show success message
    const fileViewer = document.getElementById("fileViewer");
    const successMsg = document.createElement("div");
    successMsg.className = "success-message";
    successMsg.textContent = "File saved successfully!";
    fileViewer.insertBefore(successMsg, fileViewer.firstChild);
    setTimeout(() => successMsg.remove(), 3000);
  } catch (error) {
    alert(`Error saving file: ${error.message}`);
  }
}

/**
 * Cancel edit mode
 */
function cancelEdit() {
  const fileContent = document.getElementById("fileContent");
  const fileContentEdit = document.getElementById("fileContentEdit");
  const editActions = document.getElementById("editActions");
  const editBtn = document.getElementById("editBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  fileContent.style.display = "block";
  fileContentEdit.style.display = "none";
  editActions.style.display = "none";
  editBtn.style.display = "block";
  deleteBtn.style.display = "block";
}

// ============================================
// FILE DELETE FUNCTIONS
// ============================================

/**
 * Delete current file
 */
async function deleteFile() {
  if (!AppState.currentFilePath) {
    alert("No file selected");
    return;
  }

  const fileName = AppState.currentFilePath.split("/").pop();
  const confirmDelete = confirm(
    `Are you sure you want to delete "${fileName}"? This action cannot be undone.`,
  );

  if (!confirmDelete) {
    return;
  }

  try {
    const response = await fetch("/api/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: AppState.currentFilePath,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete file");
    }

    // Close file viewer and refresh library
    closeFileViewer();
    // Clear history after deletion
    AppState.navigationHistory = [];
    const pathParts = AppState.currentPath.split("/");
    const parentPath = pathParts.slice(0, -1).join("/") || "LibraryFolder";
    navigateToPath(parentPath.replace("LibraryFolder/", ""), false);
    updateBackButton();
  } catch (error) {
    alert(`Error deleting file: ${error.message}`);
  }
}

// ============================================
// FILE UPLOAD FUNCTIONS
// ============================================

/**
 * Handle file input change
 * @param {HTMLInputElement} input - File input element
 */
function handleFileSelect(input) {
  const fileNameDisplay = document.getElementById("fileNameDisplay");
  const uploadBtn = document.getElementById("uploadBtn");

  if (input.files && input.files.length > 0) {
    const fileName = input.files[0].name;
    fileNameDisplay.textContent = `Selected: ${fileName}`;
    fileNameDisplay.style.display = "block";
    uploadBtn.disabled = false;
  } else {
    fileNameDisplay.style.display = "none";
    uploadBtn.disabled = true;
  }
}

/**
 * Handle file upload form submission
 * @param {Event} event - Form submit event
 */
async function handleUpload(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const uploadBtn = document.getElementById("uploadBtn");
  const uploadStatus = document.getElementById("uploadStatus");

  // Validate file is selected
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files || fileInput.files.length === 0) {
    uploadStatus.innerHTML =
      '<div class="error-message">Please select a file to upload.</div>';
    return;
  }

  // Disable button during upload
  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading...";
  uploadStatus.innerHTML = '<div class="loading">Uploading file...</div>';

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Upload failed");
    }

    const data = await response.json();
    uploadStatus.innerHTML = `<div class="success-message">File uploaded successfully! Path: ${data.path}</div>`;

    // Reset form
    event.target.reset();
    document.getElementById("fileNameDisplay").style.display = "none";

    // Refresh library view if we're in library
    if (AppState.currentView === "library") {
      loadDirectory(AppState.currentPath);
    }
  } catch (error) {
    console.error("Upload error:", error);
    uploadStatus.innerHTML = `<div class="error-message">Upload failed: ${error.message}</div>`;
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload File";
  }
}

/**
 * Load folders for upload dropdown
 */
async function loadFoldersForUpload() {
  try {
    const response = await fetch("/api/folders");
    if (!response.ok) {
      throw new Error("Failed to load folders");
    }

    const data = await response.json();
    const select = document.getElementById("uploadPath");

    // Clear existing options except the first one
    while (select.options.length > 1) {
      select.remove(1);
    }

    // Add folders as options
    data.folders.forEach((folder) => {
      const option = document.createElement("option");
      option.value = folder.path;
      option.textContent =
        folder.path.replace("LibraryFolder/", "") || "Library Root";
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading folders:", error);
  }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", function () {
  // Show home view by default
  showHome();

  // Initialize current state
  AppState.currentState = {
    type: "home",
    path: null,
    view: "home",
  };

  // Load folders for upload dropdown
  loadFoldersForUpload();

  // Set up file input change handler
  const fileInput = document.getElementById("fileInput");
  if (fileInput) {
    fileInput.addEventListener("change", function () {
      handleFileSelect(this);
    });
  }

  // Set up upload form handler
  const uploadForm = document.getElementById("uploadForm");
  if (uploadForm) {
    uploadForm.addEventListener("submit", handleUpload);
  }

  // Initialize back button visibility
  updateBackButton();

  console.log("VIM Library initialized");
});
