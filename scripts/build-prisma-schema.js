const fs = require("fs");
const path = require("path");

const baseSchema = fs.readFileSync("prisma/base.prisma", "utf-8");
const modelsDir = "prisma/models";
const outputFile = "prisma/schema.prisma";

let modelFiles = fs.readdirSync(modelsDir)
  .filter(file => file.endsWith(".prisma"))
  .map(file => fs.readFileSync(path.join(modelsDir, file), "utf-8"))
  .join("\n\n");

const finalSchema = `${baseSchema}\n\n${modelFiles}`;

fs.writeFileSync(outputFile, finalSchema);

console.log("✅ Prisma schema built successfully.");