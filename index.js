const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const glob = require("glob");

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];
const IMAGE_DIRS = ["public/assets/img"];
const OUTPUT_QUALITY = 80;
const PROCESSED_FILES_LOG = path.join(__dirname, "optimized-images.json");

// Load previously processed files to avoid re-optimizing
let processedFiles = {};
try {
  if (fs.existsSync(PROCESSED_FILES_LOG)) {
    processedFiles = JSON.parse(fs.readFileSync(PROCESSED_FILES_LOG, "utf8"));
  }
} catch (error) {
  console.error("Error loading processed files log:", error);
  processedFiles = {};
}

// Get file list
function getImageFiles() {
  let allImages = [];

  IMAGE_DIRS.forEach((dir) => {
    IMAGE_EXTENSIONS.forEach((ext) => {
      const images = glob.sync(`${dir}/**/*${ext}`);
      allImages = [...allImages, ...images];
    });
  });

  return allImages;
}

// Calculate file size savings
function calculateSavings(originalSize, optimizedSize) {
  const savings = originalSize - optimizedSize;
  const percentage = (savings / originalSize) * 100;
  return {
    originalSize: (originalSize / 1024).toFixed(2) + " KB",
    optimizedSize: (optimizedSize / 1024).toFixed(2) + " KB",
    saved: (savings / 1024).toFixed(2) + " KB",
    percentage: percentage.toFixed(2) + "%",
  };
}

async function optimizeImage(filePath) {
  const stats = fs.statSync(filePath);
  const originalSize = stats.size;

  // Skip if already processed and file hasn't changed
  if (
    processedFiles[filePath] &&
    processedFiles[filePath].mtime === stats.mtime.getTime()
  ) {
    console.log(`Skipping already optimized: ${filePath}`);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const outputPath = filePath; // Overwrite original file

  try {
    const image = sharp(filePath);

    let pipeline;

    // Convert to WebP for best compression if not already WebP
    if (ext === ".webp") {
      pipeline = image.webp({ quality: OUTPUT_QUALITY });
    } else if (ext === ".png") {
      pipeline = image.png({ quality: OUTPUT_QUALITY, compressionLevel: 9 });
    } else if (ext === ".jpg" || ext === ".jpeg") {
      pipeline = image.jpeg({ quality: OUTPUT_QUALITY, mozjpeg: true });
    }

    await pipeline.toFile(outputPath + ".optimized");

    // Check if optimization actually reduced file size
    const optimizedStats = fs.statSync(outputPath + ".optimized");
    const optimizedSize = optimizedStats.size;

    if (optimizedSize < originalSize) {
      fs.renameSync(outputPath + ".optimized", outputPath);
      const savings = calculateSavings(originalSize, optimizedSize);
      console.log(
        `✅ Optimized: ${filePath} - Saved ${savings.saved} (${savings.percentage})`
      );

      // Record processed file info
      processedFiles[filePath] = {
        mtime: stats.mtime.getTime(),
        originalSize: originalSize,
        optimizedSize: optimizedSize,
      };
    } else {
      // If no savings, remove temp file and keep original
      fs.unlinkSync(outputPath + ".optimized");
      console.log(`⚠️ No savings for: ${filePath}. Keeping original.`);
    }
  } catch (error) {
    console.error(`❌ Error optimizing: ${filePath}`, error.message);
    // Clean up any temp file if it exists
    if (fs.existsSync(outputPath + ".optimized")) {
      fs.unlinkSync(outputPath + ".optimized");
    }
  }
}

async function run() {
  const imageFiles = getImageFiles();
  console.log(`Found ${imageFiles.length} images to process`);

  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;

  for (const file of imageFiles) {
    await optimizeImage(file);
  }

  // Calculate total savings
  Object.values(processedFiles).forEach((file) => {
    totalOriginalSize += file.originalSize || 0;
    totalOptimizedSize += file.optimizedSize || 0;
  });

  const totalSavings = calculateSavings(totalOriginalSize, totalOptimizedSize);
  console.log("\n======= OPTIMIZATION SUMMARY =======");
  console.log(`Total images processed: ${Object.keys(processedFiles).length}`);
  console.log(`Original size: ${totalSavings.originalSize}`);
  console.log(`Optimized size: ${totalSavings.optimizedSize}`);
  console.log(
    `Total saved: ${totalSavings.saved} (${totalSavings.percentage})`
  );

  // Save processed files log
  fs.writeFileSync(
    PROCESSED_FILES_LOG,
    JSON.stringify(processedFiles, null, 2)
  );
}

run().catch(console.error);
