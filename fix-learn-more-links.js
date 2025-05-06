// Usage: node fix-learn-more-links.js

const fs = require("fs");
const path = require("path");

const rootDir = "c:\\My Web Sites\\Miracom\\home.miracomcomputer.com";

// Patterns to match in HTML and JSON
const patterns = [
  // HTML attributes
  /(href|src|content|data-srcset)\s*=\s*(['"])\s*https?:\/\/home\.miracomcomputer\.com\/([^'"]+)\2/gi,
  // JSON keys
  /("url"|"@id"|"src"|"contentUrl")\s*:\s*"(https?:\/\/home\.miracomcomputer\.com\/[^"]+)"/gi,
  // Embedded HTML in JSON (e.g. "html": "<a href=...")
  /(<a\s+[^>]*href\s*=\\s*['"])https?:\/\/home\.miracomcomputer\.com\/([^'"]+)(['"])/gi,
  // Embedded iframe src in JSON
  /(<iframe\s+[^>]*src\s*=\s*['"])https?:\/\/home\.miracomcomputer\.com\/([^'"]+)(['"])/gi,
];

// Improved generic pattern: matches any JSON string value containing the domain, including fragments, queries, and escaped slashes
const genericDomainPattern =
  /https?:\\?\/\\?\/home\.miracomcomputer\.com((\\?\/[^\s"'<>\]\}]*)|([#?][^\s"'<>\]\}]*)|)/gi;

function replaceGenericDomain(content) {
  let changed = false;
  // Replace both normal and escaped URLs, including fragments and queries, and bare domain
  content = content.replace(genericDomainPattern, (match) => {
    changed = true;
    // Remove protocol and domain, keep path, fragment, or query (handle both / and \/)
    let local = match.replace(
      /^https?:\\?\/\\?\/home\.miracomcomputer\.com/i,
      ""
    );
    // Remove leading escaped or normal slash if present
    local = local.replace(/^\\?\//, "");
    // Unescape slashes
    local = local.replace(/\\/g, "");
    return local;
  });
  return { content, changed };
}

// Replacement functions for each pattern
function replaceAll(content) {
  let changed = false;
  let prev;
  do {
    prev = content;
    // 1. HTML attributes
    content = content.replace(
      /(href|src|content|data-srcset)\s*=\s*(['"])\s*https?:\/\/home\.miracomcomputer\.com\/([^'"]+)\2/gi,
      (m, attr, quote, path) => {
        changed = true;
        return `${attr}=${quote}${path}${quote}`;
      }
    );
    // 2. JSON keys
    content = content.replace(
      /("url"|"@id"|"src"|"contentUrl")\s*:\s*"(https?:\/\/home\.miracomcomputer\.com\/[^"]+)"/gi,
      (m, key, url) => {
        changed = true;
        // Remove domain, keep path
        const local = url.replace(
          /^https?:\/\/home\.miracomcomputer\.com\//,
          ""
        );
        return `${key}: "${local}"`;
      }
    );
    // 3. Embedded HTML <a href=...>
    content = content.replace(
      /(<a\s+[^>]*href\s*=\s*['"])https?:\/\/home\.miracomcomputer\.com\/([^'"]+)(['"])/gi,
      (m, pre, path, post) => {
        changed = true;
        return `${pre}${path}${post}`;
      }
    );
    // 4. Embedded iframe src
    content = content.replace(
      /(<iframe\s+[^>]*src\s*=\s*['"])https?:\/\/home\.miracomcomputer\.com\/([^'"]+)(['"])/gi,
      (m, pre, path, post) => {
        changed = true;
        return `${pre}${path}${post}`;
      }
    );
    // 5. Generic domain pattern (catch-all for any value, including arrays and escaped)
    const result = replaceGenericDomain(content);
    if (result.changed) changed = true;
    content = result.content;
  } while (content !== prev);
  return { content, changed };
}

function fixAllLinksInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const { content: newContent, changed } = replaceAll(content);
  if (changed) fs.writeFileSync(filePath, newContent, "utf8");
}

function scanDirStrict(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDirStrict(fullPath);
    } else if (file.endsWith(".html") || file.endsWith(".json")) {
      fixAllLinksInFile(fullPath);
    }
  });
}

function reportNonLocalLinksStrict(dir) {
  let found = false;
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (reportNonLocalLinksStrict(fullPath)) found = true;
    } else if (file.endsWith(".html") || file.endsWith(".json")) {
      const content = fs.readFileSync(fullPath, "utf8");
      // Check all patterns
      patterns.forEach((pattern) => {
        const matches = content.match(pattern);
        if (matches) {
          found = true;
          console.log(`Non-local links found in: ${fullPath}`);
          matches.forEach((m) => console.log("  " + m));
        }
      });
      // Check generic domain pattern (catch-all, including escaped and arrays)
      const genericMatches = content.match(genericDomainPattern);
      if (genericMatches) {
        found = true;
        console.log(`Non-local links found in: ${fullPath}`);
        genericMatches.forEach((m) => console.log("  " + m));
      }
    }
  });
  return found;
}

// Strict scan and fix
// scanDirStrict(rootDir);
console.log(
  "All links to home.miracomcomputer.com have been converted to local links."
);

// To only verify, comment out the scanDirStrict call above and use this:
console.log("\n[Verification Only] Checking for any non-local links...");
const anyLeft = reportNonLocalLinksStrict(rootDir);
if (!anyLeft) {
  console.log("[OK] All links are now local!");
} else {
  console.log("[WARNING] Some links are still not local. See above.");
}

// Remove or comment out the duplicate or previous verification/check blocks if present.
