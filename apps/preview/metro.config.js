const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// Pulsar preset bundles ship as .pulsar assets.
config.resolver.assetExts.push("pulsar", "riv");
module.exports = config;
