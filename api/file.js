const fs = require("fs").promises;
const path = require("path");

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: "File path required" });
    }

    const fullPath = path.join(process.cwd(), filePath);

    // Security check
    if (!fullPath.startsWith(process.cwd())) {
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
      // Binary files are served as static files
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
}
