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
    const { path: filePath, content } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: "File path required" });
    }

    if (content === undefined) {
      return res.status(400).json({ error: "File content required" });
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
}
