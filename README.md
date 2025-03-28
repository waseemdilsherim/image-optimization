# Image Optimization Tool

A Node.js tool for optimizing images in your project to reduce file size while maintaining quality.

## Features

- Optimizes PNG, JPG, JPEG, and WebP images
- Tracks optimized files to avoid reprocessing
- Provides detailed savings statistics
- Preserves original images when optimization doesn't yield improvements

## Installation

```bash
npm install
```

## Usage

1. Configure the tool by editing the constants at the top of `index.js`:

   - `IMAGE_EXTENSIONS`: File types to process
   - `IMAGE_DIRS`: Directories containing images to optimize
   - `OUTPUT_QUALITY`: Quality setting for compression (0-100)

2. Run the tool:

```bash
npm start
```

## How It Works

The tool scans the specified directories for image files, optimizes them using the Sharp library, and overwrites the originals only if the optimization results in smaller file size. It keeps track of processed files to avoid unnecessary reprocessing.
