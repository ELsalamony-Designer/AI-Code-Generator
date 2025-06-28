const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");
const archiver = require("archiver");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const PROJECTS_DIR = path.join(__dirname, "projects");
fs.ensureDirSync(PROJECTS_DIR);

app.post("/generate", async (req, res) => {
  const { prompt, type } = req.body;
  if (!prompt || !type) return res.status(400).json({ error: "بيانات ناقصة" });

  const projectId = Date.now().toString();
  const projectPath = path.join(PROJECTS_DIR, projectId);
  await fs.ensureDir(projectPath);

  // 🎯 توليد ملفات بناء على الـ Prompt
  const files = extractFilenames(prompt);
  if (files.length === 0) {
    files.push("main.txt"); // ملف افتراضي لو مفيش أسماء واضحة
  }

  for (const name of files) {
    const filePath = path.join(projectPath, name);
    await fs.outputFile(filePath, `// ملف ${name}\n// تم توليده بناءً على وصفك: ${prompt}`);
  }

  // 🗜️ ضغط المجلد
  const zipPath = projectPath + ".zip";
  await createZip(projectPath, zipPath);

  // رابط التحميل
  const downloadUrl = `/download/${path.basename(zipPath)}`;
  res.json({ url: downloadUrl });
});

function extractFilenames(prompt) {
  // لو المستخدم كتب أسماء ملفات في الـ prompt هنطلعها
  const matches = prompt.match(/[\w\-]+\.(js|txt|lua|gd|html|css)/g);
  return matches || [];
}

function createZip(folderPath, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip");
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(folderPath, false);
    archive.finalize();
  });
}

app.use("/download", express.static(PROJECTS_DIR));

app.listen(3000, () => {
  console.log("✅ السيرفر شغال على http://localhost:3000");
});
