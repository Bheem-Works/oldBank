/**
 * VIM LIBRARY - EXPRESS SERVER
 * Handles file serving, directory listing, file reading, and file uploads
 */

const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = 3000;

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Serve static files (HTML, CSS, JS, images, PDFs, etc.)
app.use(express.static(__dirname));

// Parse JSON request bodies
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Get upload path from form data or default to LibraryFolder
      const uploadPath = req.body.path || "LibraryFolder";
      const fullPath = path.join(__dirname, uploadPath);

      // Security check: ensure path is within project directory
      if (!fullPath.startsWith(__dirname)) {
        return cb(new Error("Access denied: Invalid path"));
      }

      // Create directory if it doesn't exist
      await fs.mkdir(fullPath, { recursive: true });
      cb(null, fullPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Keep original filename
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types
    cb(null, true);
  },
});

// ============================================
// API ENDPOINTS
// ============================================

/**
 * GET /api/list
 * List all files and folders in a directory
 */
app.get("/api/list", async (req, res) => {
  try {
    const dirPath = req.query.path || "LibraryFolder";
    const fullPath = path.join(__dirname, dirPath);

    // Security check: ensure path is within project directory
    if (!fullPath.startsWith(__dirname)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if path exists and is a directory
    const stats = await fs.stat(fullPath).catch(() => null);
    if (!stats || !stats.isDirectory()) {
      return res.status(404).json({ error: "Directory not found" });
    }

    const items = await fs.readdir(fullPath, { withFileTypes: true });
    const folders = [];
    const files = [];

    // Separate folders and files
    for (const item of items) {
      if (item.isDirectory()) {
        folders.push(item.name);
      } else {
        files.push(item.name);
      }
    }

    // Sort alphabetically
    folders.sort();
    files.sort();

    res.json({ folders, files });
  } catch (error) {
    console.error("Error listing directory:", error);
    res
      .status(500)
      .json({ error: "Failed to list directory", message: error.message });
  }
});

/**
 * GET /api/file
 * Read file content (supports text files, markdown, etc.)
 * For binary files (PDF, images), they are served as static files
 */
app.get("/api/file", async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: "File path required" });
    }

    const fullPath = path.join(__dirname, filePath);

    // Security check: ensure path is within project directory
    if (!fullPath.startsWith(__dirname)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if file exists
    const stats = await fs.stat(fullPath).catch(() => null);
    if (!stats || !stats.isFile()) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileExtension = path.extname(filePath).toLowerCase();

    // Handle different file types
    if (
      [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".mp4", ".mp3"].includes(
        fileExtension,
      )
    ) {
      // Binary files are served as static files, return path for client to handle
      return res.json({
        content: null,
        type: "binary",
        path: filePath,
      });
    } else {
      // Text-based files: read and return content
      const content = await fs.readFile(fullPath, "utf-8");
      return res.json({
        content: content,
        type: fileExtension === ".md" ? "markdown" : "text",
      });
    }
  } catch (error) {
    console.error("Error reading file:", error);
    res
      .status(500)
      .json({ error: "Failed to read file", message: error.message });
  }
});

/**
 * POST /api/upload
 * Upload a file to the specified directory
 */
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uploadPath = req.body.path || "LibraryFolder";
    const filePath = path.join(uploadPath, req.file.filename);

    res.json({
      success: true,
      message: "File uploaded successfully",
      path: filePath,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res
      .status(500)
      .json({ error: "Failed to upload file", message: error.message });
  }
});

/**
 * POST /api/edit
 * Edit/update file content
 */
app.post("/api/edit", express.json(), async (req, res) => {
  try {
    const { path: filePath, content } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: "File path required" });
    }

    if (content === undefined) {
      return res.status(400).json({ error: "File content required" });
    }

    const fullPath = path.join(__dirname, filePath);

    // Security check: ensure path is within project directory
    if (!fullPath.startsWith(__dirname)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if file exists
    const stats = await fs.stat(fullPath).catch(() => null);
    if (!stats || !stats.isFile()) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if file is editable (text-based files only)
    const fileExtension = path.extname(filePath).toLowerCase();
    const editableExtensions = [
      ".txt",
      ".md",
      ".json",
      ".js",
      ".css",
      ".html",
      ".xml",
    ];

    if (!editableExtensions.includes(fileExtension)) {
      return res.status(400).json({ error: "File type is not editable" });
    }

    // Write updated content
    await fs.writeFile(fullPath, content, "utf-8");

    res.json({
      success: true,
      message: "File updated successfully",
      path: filePath,
    });
  } catch (error) {
    console.error("Error editing file:", error);
    res
      .status(500)
      .json({ error: "Failed to edit file", message: error.message });
  }
});

/**
 * POST /api/delete
 * Delete a file or folder
 */
app.post("/api/delete", express.json(), async (req, res) => {
  try {
    const { path: itemPath } = req.body;

    if (!itemPath) {
      return res.status(400).json({ error: "Path required" });
    }

    const fullPath = path.join(__dirname, itemPath);

    // Security check: ensure path is within project directory
    if (!fullPath.startsWith(__dirname)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Prevent deleting LibraryFolder itself
    if (fullPath === path.join(__dirname, "LibraryFolder")) {
      return res
        .status(403)
        .json({ error: "Cannot delete LibraryFolder root" });
    }

    // Check if item exists
    const stats = await fs.stat(fullPath).catch(() => null);
    if (!stats) {
      return res.status(404).json({ error: "File or folder not found" });
    }

    // Delete file or folder
    if (stats.isFile()) {
      await fs.unlink(fullPath);
    } else if (stats.isDirectory()) {
      // Recursively delete directory
      await fs.rm(fullPath, { recursive: true, force: true });
    }

    res.json({
      success: true,
      message: "Item deleted successfully",
      path: itemPath,
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    res
      .status(500)
      .json({ error: "Failed to delete item", message: error.message });
  }
});

/**
 * GET /api/folders
 * Get list of all folders for upload dropdown
 */
app.get("/api/folders", async (req, res) => {
  try {
    const folders = [];

    // Recursively get all folders
    async function getFolders(dir, basePath = "") {
      const fullPath = path.join(__dirname, dir);
      const items = await fs.readdir(fullPath, { withFileTypes: true });

      for (const item of items) {
        if (item.isDirectory()) {
          const folderPath = basePath ? `${basePath}/${item.name}` : item.name;
          folders.push({
            name: item.name,
            path:
              folderPath === "LibraryFolder"
                ? "LibraryFolder"
                : `LibraryFolder/${folderPath}`,
          });
          // Recursively get subfolders
          await getFolders(path.join(dir, item.name), folderPath);
        }
      }
    }

    await getFolders("LibraryFolder");
    res.json({ folders });
  } catch (error) {
    console.error("Error getting folders:", error);
    res
      .status(500)
      .json({ error: "Failed to get folders", message: error.message });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// Handle multer errors
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File too large. Maximum size is 50MB." });
    }
    return res
      .status(400)
      .json({ error: "Upload error", message: error.message });
  }
  next(error);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// ============================================
// SERVER STARTUP
// ============================================

app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log("VIM LIBRARY SERVER");
  console.log("=".repeat(50));
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  console.log("=".repeat(50));
});
