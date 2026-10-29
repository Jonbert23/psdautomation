import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const draft = process.argv.includes("--draft");
if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
  console.error("Set GH_TOKEN to publish a GitHub Release. git push does not update installed apps.");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgPath = path.join(root, "package.json");

if (!draft) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const parts = String(pkg.version)
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  pkg.version = parts.slice(0, 3).join(".");
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`Publishing stable release ${pkg.version}`);
} else {
  console.log("Publishing a draft release. Installed apps will not offer this update.");
}

const env = { ...process.env, RELEASE_DRAFT: draft ? "1" : "0" };

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, env, stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["run", "build"]);
run("npx", ["electron-builder", "--win", "--publish", "always"]);
