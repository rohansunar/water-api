const fs = require('fs');
const path = require('path');

const extractedDir = path.join(__dirname, '..', 'postman-tools', 'extracted');
const outputFile = path.join(__dirname, '..', 'postman.json');

function combineModules() {
  // Read all JSON files from extracted directory
  const files = fs.readdirSync(extractedDir).filter(file => file.endsWith('.json'));

  if (files.length === 0) {
    console.error('No JSON files found in postman-tools/extracted/');
    process.exit(1);
  }

  // Read and parse the first file as base
  const baseFile = path.join(extractedDir, files[0]);
  const baseCollection = JSON.parse(fs.readFileSync(baseFile, 'utf8'));

  // Initialize combined items array
  let combinedItems = baseCollection.item || [];

  // Process remaining files
  for (let i = 1; i < files.length; i++) {
    const filePath = path.join(extractedDir, files[i]);
    const moduleData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Merge items if they exist
    if (moduleData.item && Array.isArray(moduleData.item)) {
      combinedItems = combinedItems.concat(moduleData.item);
    }
  }

  // Update collection info
  baseCollection.info.name = 'Water Delivery API Collection';

  // Sort top-level items alphabetically by name
  combinedItems.sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });

  // Set combined items
  baseCollection.item = combinedItems;

  // Write the combined collection
  fs.writeFileSync(outputFile, JSON.stringify(baseCollection, null, 2));
  console.log(`Combined collection written to ${outputFile}`);
}

combineModules();