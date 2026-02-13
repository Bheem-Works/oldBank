const fs = require("fs").promises;
const path = require("path");

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const dirPath = req.query.path || "LibraryFolder";
    const fullPath = path.join(process.cwd(), dirPath);

    // Security check
    if (!fullPath.startsWith(process.cwd())) {
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
}
