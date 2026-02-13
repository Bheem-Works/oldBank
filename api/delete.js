const fs = require("fs").promises;
const path = require("path");

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { path: itemPath } = req.body;

    if (!itemPath) {
      return res.status(400).json({ error: "Path required" });
    }

    const fullPath = path.join(process.cwd(), itemPath);

    // Security check
    if (!fullPath.startsWith(process.cwd())) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Prevent deleting LibraryFolder itself
    if (fullPath === path.join(process.cwd(), "LibraryFolder")) {
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
}
