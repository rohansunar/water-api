const fs = require('fs');
const path = require('path');

// Define the mapping from modules to folder names
const moduleMapping = {
  admin: [
    'System Monitoring',
    'Background Services',
    'Cache Management',
    'Admin Management',
    'Product Moderation',
    'Order Management',
    'Refund Management',
    'Dispute Management',
    'Escalation Management'
  ],
  auth: [
    'Authentication',
    'Vendor Authentication',
    'Rider Authentication'
  ],
  rider: [
    'Task Management',
    'Rider Operations',
    'Earnings & Performance',
    'Shift Management',
    'Notifications & Support'
  ],
  customer: [
    'Customer Management',
    'Wallet Management'
  ],
  vendor: [
    'Vendor Payments',
    'Vendor Analytics & Reports',
    'Vendor Inventory Management'
  ],
  complaint: [
    'Complaint Management'
  ],
  order: [
    'Order Management',
    'Vendor Orders'
  ],
  product: [
    'Vendor Products',
    'Product Discovery'
  ],
  refund: [
    'Refund Management'
  ],
  store: [
    'Store Management',
    'Vendor Store Management'
  ],
  subscription: [
    'Subscription Management'
  ],
  commission: [
    'Commission Management'
  ]
};

// Read the original postman.json
const postmanPath = path.join(__dirname, '..', 'postman.json');
const postmanData = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));

// Ensure the extracted directory exists
const extractedDir = path.join(__dirname, '..', 'postman-tools', 'extracted');
if (!fs.existsSync(extractedDir)) {
  fs.mkdirSync(extractedDir, { recursive: true });
}

// Function to create module collection
function createModuleCollection(moduleName, folderNames) {
  // Filter items that match the folder names
  const filteredItems = postmanData.item.filter(item =>
    folderNames.includes(item.name)
  );

  // Only create file if there are items
  if (filteredItems.length === 0) {
    console.log(`Skipping ${moduleName}: no folders found`);
    return;
  }

  // Create the new collection
  const moduleCollection = {
    info: {
      ...postmanData.info,
      name: `Water Delivery API - ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`
    },
    variable: postmanData.variable,
    auth: postmanData.auth,
    event: postmanData.event,
    item: filteredItems
  };

  // Write to file
  const outputPath = path.join(extractedDir, `${moduleName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(moduleCollection, null, 2));
  console.log(`Created ${outputPath}`);
}

// Process each module
Object.entries(moduleMapping).forEach(([moduleName, folderNames]) => {
  createModuleCollection(moduleName, folderNames);
});

console.log('Module extraction completed.');