const { withAndroidManifest } = require("expo/config-plugins");

module.exports = (config) =>
  withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application?.[0];
    if (!app) throw new Error("Local relay plugin: Android application is missing.");
    // Connection validation permits plain WS only for private and loopback addresses.
    app.$["android:usesCleartextTraffic"] = "true";
    return mod;
  });
