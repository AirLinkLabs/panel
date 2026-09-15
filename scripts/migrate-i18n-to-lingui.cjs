#!/usr/bin/env node
var fs = require("fs");
var path = require("path");

var LANG_DIR = path.join(__dirname, "../storage/lang");
var LOCALES_DIR = path.join(__dirname, "../locales");

var languages = fs.readdirSync(LANG_DIR).filter(function(entry) {
  try { return fs.statSync(path.join(LANG_DIR, entry)).isDirectory(); }
  catch(e) { return false; }
});

console.log("Migrating " + languages.length + " language(s): " + languages.join(", "));

languages.forEach(function(lang) {
  var oldPath = path.join(LANG_DIR, lang, "lang.json");
  var newPath = path.join(LOCALES_DIR, lang, "messages.json");

  if (!fs.existsSync(oldPath)) {
    console.log("  Skipping " + lang);
    return;
  }

  var raw = JSON.parse(fs.readFileSync(oldPath, "utf8"));
  var catalog = {};

  Object.keys(raw).forEach(function(key) {
    if (key.charAt(0) === "_") return;
    var value = raw[key];
    if (typeof value === "string") {
      catalog[key] = value;
    } else if (typeof value === "object" && value !== null && "one" in value && "other" in value) {
      catalog[key] = "{count, plural, one {" + value.one + "} other {" + value.other + "}}";
    }
  });

  var targetDir = path.dirname(newPath);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(newPath, JSON.stringify(catalog, null, 2) + "\n");

  var count = Object.keys(catalog).length;
  var pluralCount = Object.values(catalog).filter(function(v) { return v.indexOf("plural") !== -1; }).length;
  console.log("  " + lang + ": " + count + " messages (" + pluralCount + " plurals)");
});

console.log("Done.");
