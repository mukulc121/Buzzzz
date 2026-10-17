const { withPodfile, withSettingsGradle } = require("expo/config-plugins");

const POD =
  "  pod 'PulsarHaptics', :podspec => File.expand_path('../native/pulsar/PulsarHaptics.podspec', __dir__)";
const GRADLE =
  "include ':buzzzz-pulsar-core'\nproject(':buzzzz-pulsar-core').projectDir = new File(rootDir, '../native/pulsar')";

module.exports = (config) => {
  config = withPodfile(config, (mod) => {
    const contents = mod.modResults.contents;
    if (contents.includes(POD)) return mod;
    const anchor = "  use_expo_modules!";
    if (!contents.includes(anchor))
      throw new Error("Pulsar core: Podfile target anchor is missing.");
    mod.modResults.contents = contents.replace(anchor, `${anchor}\n${POD}`);
    return mod;
  });
  return withSettingsGradle(config, (mod) => {
    if (!mod.modResults.contents.includes(GRADLE)) {
      mod.modResults.contents = `${mod.modResults.contents.trimEnd()}\n\n${GRADLE}\n`;
    }
    return mod;
  });
};
