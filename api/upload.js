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
    // NOTE: File uploads with FormData require middleware that's not available
    // in serverless functions. For a production app, use a storage service like:
    // - AWS S3
    // - Firebase Storage
    // - Supabase Storage
    // For now, returning success message

    res.json({
      success: false,
      message:
        "File upload not available in serverless environment. Please use Render.com or similar for full file server functionality.",
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res
      .status(500)
      .json({ error: "Failed to upload file", message: error.message });
  }
}
