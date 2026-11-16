// Optional single-file package for MPage hosts that require inline assets.
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const html = read("index.html")
  .replace(
    /<link\s+rel="stylesheet"\s+href="styles\.css"\s*\/?\s*>/,
    () => "<style>\n" + read("styles.css") + "\n</style>"
  )
  .replace(
    '<script src="app.js"></script>',
    () => "<script>\n" + read("app.js") + "\n</script>"
  );
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist/index.html"), html);
fs.copyFileSync(path.join(root, "logo.png"), path.join(root, "dist/logo.png"));
console.log("Built dist/index.html and dist/logo.png; nothing was deployed.");
