const fs = require("fs").promises;
const path = require("path");

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const folders = [];

    // Recursively get all folders
    async function getFolders(dir, basePath = "") {
      const fullPath = path.join(process.cwd(), dir);
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
}
