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

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

function readPackage() {
  return JSON.parse(fs.readFileSync(pkgPath, "utf8"));
}

function committedVersion() {
  const result = spawnSync("git", ["show", "HEAD:package.json"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) return null;
  return JSON.parse(result.stdout).version;
}

if (!draft) {
  let pkg = readPackage();
  if (pkg.version === committedVersion()) {
    const parts = String(pkg.version)
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);
    while (parts.length < 3) parts.push(0);
    parts[2] += 1;
    pkg.version = parts.slice(0, 3).join(".");
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
  console.log(`Publishing stable release ${pkg.version}`);

  // electron-builder 26 publishes immediately. GitHub rejects that with
  // "Published releases must have a valid tag" unless the tag already exists.
  const tag = `v${pkg.version}`;
  const localTag = spawnSync("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`], { cwd: root, encoding: "utf8" });
  if (localTag.status !== 0) {
    console.log(`Creating git tag ${tag}`);
    git(["tag", tag]);
  }
  const remoteTag = spawnSync("git", ["ls-remote", "--tags", "origin", `refs/tags/${tag}`], { cwd: root, encoding: "utf8" });
  if (remoteTag.status !== 0) {
    if (remoteTag.stderr) process.stderr.write(remoteTag.stderr);
    process.exit(remoteTag.status ?? 1);
  }
  if (!remoteTag.stdout.includes(`refs/tags/${tag}`)) {
    console.log(`Pushing git tag ${tag}`);
    git(["push", "origin", `refs/tags/${tag}`]);
  }
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
