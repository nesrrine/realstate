try { require("dotenv").config(); } catch {}
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const FOLDER = process.env.CLOUDINARY_FOLDER || "real-estate";
const base = path.join(__dirname, "uploads");
const sql = [];

async function photos() {
  const dir = path.join(base, "properties");
  if (!fs.existsSync(dir)) return console.log("Pas de dossier properties");
  for (const file of fs.readdirSync(dir)) {
    try {
      const res = await cloudinary.uploader.upload(path.join(dir, file), {
        folder: `${FOLDER}/properties`,
        public_id: path.parse(file).name,
        resource_type: "image",
        overwrite: false,
      });
      console.log("PHOTO OK", file, res.secure_url);
      sql.push(`UPDATE property_images SET url = '${res.secure_url}' WHERE url = '/uploads/properties/${file}';`);
    } catch (e) {
      console.log("PHOTO ERREUR", file, e.message);
    }
  }
}

async function documents() {
  const dir = path.join(base, "documents");
  if (!fs.existsSync(dir)) return console.log("Pas de dossier documents");
  for (const file of fs.readdirSync(dir)) {
    try {
      await cloudinary.uploader.upload(path.join(dir, file), {
        public_id: `${FOLDER}/documents/${file}`,
        resource_type: "raw",
        type: "private",
        overwrite: false,
      });
      console.log("DOC OK", file);
    } catch (e) {
      console.log("DOC ERREUR", file, e.message);
    }
  }
}

(async () => {
  await photos();
  await documents();
  fs.writeFileSync("update-images.sql", sql.join("\n") + "\n");
  console.log(`\n${sql.length} lignes écrites dans update-images.sql`);
})();
