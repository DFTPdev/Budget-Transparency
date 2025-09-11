#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_SRC = '/Users/secretservice/Downloads/DFTP-dashboard/dftp-site/public/data/vpap-precincts.geojson';
const DEST_DIR = 'out/app';
const DEST_FILE = 'virginia-districts.geojson';
const DEST_PATH = path.join(DEST_DIR, DEST_FILE);
const BACKUP_PATH = DEST_PATH + '.bak';

function getSha1(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha1').update(content).digest('hex');
  } catch (e) {
    return null;
  }
}

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch (e) {
    return null;
  }
}

function main() {
  try {
    const srcPath = process.env.SRC_GEOJSON || DEFAULT_SRC;
    
    if (!fs.existsSync(srcPath)) {
      console.error(JSON.stringify({ error: `Source file not found: ${srcPath}` }));
      process.exit(1);
    }

    // Create destination directory
    fs.mkdirSync(DEST_DIR, { recursive: true });

    // Backup existing destination if present
    if (fs.existsSync(DEST_PATH)) {
      try {
        fs.copyFileSync(DEST_PATH, BACKUP_PATH);
      } catch (e) {
        // best-effort backup
      }
    }

    // Copy source to destination
    fs.copyFileSync(srcPath, DEST_PATH);

    const srcSize = getFileSize(srcPath);
    const destSize = getFileSize(DEST_PATH);
    const sha1 = getSha1(DEST_PATH);

    const result = {
      copied: true,
      src: path.resolve(srcPath),
      dest: path.resolve(DEST_PATH),
      src_size: srcSize,
      dest_size: destSize,
      sha1: sha1
    };

    console.log(JSON.stringify(result));
    process.exit(0);

  } catch (err) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
