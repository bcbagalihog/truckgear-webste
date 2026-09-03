import sharp from "sharp";
import path from "path";
import fs from "fs";

// Path where cropped thumbnails will be saved
const partsUploadDir = path.join(process.cwd(), "public", "uploads", "parts");
if (!fs.existsSync(partsUploadDir)) {
  fs.mkdirSync(partsUploadDir, { recursive: true });
}

// Fallback upload directory in root uploads/parts if public doesn't exist
const rootPartsUploadDir = path.join(process.cwd(), "uploads", "parts");
if (!fs.existsSync(rootPartsUploadDir)) {
  fs.mkdirSync(rootPartsUploadDir, { recursive: true });
}

/**
 * Crops a sub-image from a Base64 encoded JPEG/PNG image buffer using normalized coordinates [ymin, xmin, ymax, xmax] (0 to 1000 scale).
 * Saves the cropped image as a JPEG thumbnail and returns the public relative URL.
 */
export async function cropCatalogItemImage(
  imageBase64: string,
  box2d: number[] // [ymin, xmin, ymax, xmax] normalized 0-1000
): Promise<string | null> {
  try {
    if (!box2d || box2d.length !== 4) {
      return null;
    }

    const [ymin, xmin, ymax, xmax] = box2d;
    if (ymin >= ymax || xmin >= xmax) {
      return null;
    }

    // Strip Base64 header if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width || 1600;
    const imgHeight = metadata.height || 1200;

    // Convert normalized (0-1000) coordinates to pixel positions
    const top = Math.max(0, Math.min(imgHeight - 1, Math.round((ymin / 1000) * imgHeight)));
    const left = Math.max(0, Math.min(imgWidth - 1, Math.round((xmin / 1000) * imgWidth)));
    const height = Math.max(1, Math.min(imgHeight - top, Math.round(((ymax - ymin) / 1000) * imgHeight)));
    const width = Math.max(1, Math.min(imgWidth - left, Math.round(((xmax - xmin) / 1000) * imgWidth)));

    const fileName = `part-crop-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
    const publicFilePath = path.join(partsUploadDir, fileName);
    const rootFilePath = path.join(rootPartsUploadDir, fileName);

    await sharp(imageBuffer)
      .extract({ left, top, width, height })
      .jpeg({ quality: 85 })
      .toFile(publicFilePath);

    // Copy to root uploads/parts as fallback
    try {
      fs.copyFileSync(publicFilePath, rootFilePath);
    } catch (_) {}

    return `/uploads/parts/${fileName}`;
  } catch (error) {
    console.error("[CATALOG_CROPPER_ERROR]", error);
    return null;
  }
}
