"use strict";

const fs = require("fs");
const path = require("path");
const { TextDecoder } = require("util");

const ROOT = process.cwd();
const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".svg",
  ".txt",
  ".yml",
  ".yaml",
]);
const TEXT_FILES = new Set([
  ".editorconfig",
  ".gitattributes",
  ".gitignore",
]);
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const MOJIBAKE_PATTERN = /(?:\u00c2[\u0080-\u00bf]|\u00c3[\u0080-\u00bf]|\u00c4[\u0080-\u00bf\u2018\u2019]|\u00c6[\u0080-\u00bf]|\u00e1[\u00ba-\u00bb][\u0080-\u00bf\u2018\u2019]|\ufffd)/u;

const errors = [];

for (const file of listTextFiles(ROOT)) {
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  const bytes = fs.readFileSync(file);

  if (bytes.subarray(0, 3).equals(UTF8_BOM)) {
    errors.push(`${relative}: has UTF-8 BOM; save as UTF-8 without BOM`);
    continue;
  }

  let text;
  try {
    text = UTF8_DECODER.decode(bytes);
  } catch {
    errors.push(`${relative}: is not valid UTF-8`);
    continue;
  }

  if (MOJIBAKE_PATTERN.test(text)) {
    errors.push(`${relative}: contains likely mojibake text`);
  }
}

if (errors.length) {
  console.error("Encoding check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("encoding ok");

function* listTextFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      yield* listTextFiles(path.join(dir, entry.name));
      continue;
    }

    if (!entry.isFile()) continue;

    const file = path.join(dir, entry.name);
    const extension = path.extname(entry.name).toLowerCase();
    if (TEXT_EXTENSIONS.has(extension) || TEXT_FILES.has(entry.name)) {
      yield file;
    }
  }
}
