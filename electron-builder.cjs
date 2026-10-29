const draft = process.env.RELEASE_DRAFT === "1";

module.exports = {
  appId: "com.shuzee.garmentcustomizer",
  productName: "SHUZEE",
  directories: {
    output: "release",
  },
  files: [
    "dist/**/*",
    "dist-electron/**/*",
    "photoshop/**/*",
    "package.json",
    "!**/*.map",
  ],
  asar: true,
  publish: {
    provider: "github",
    owner: "Jonbert23",
    repo: "psdautomation",
    releaseType: draft ? "draft" : "release",
  },
  win: {
    target: "nsis",
    icon: "build/icon.png",
    artifactName: "${productName}-Setup-${version}.${ext}",
  },
  extraResources: [{ from: "build/icon.png", to: "icon.png" }],
  nsis: {
    oneClick: true,
    perMachine: false,
    allowToChangeInstallationDirectory: false,
    deleteAppDataOnUninstall: false,
  },
};
