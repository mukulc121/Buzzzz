// React-Core is prebuilt with RCT_METRO_PORT=8081 baked in, so `--port 8082` alone doesn't reach the app.
// Point debug builds at <Mac IP from ip.txt>:8082 (keep in sync with the root package.json scripts).
const { withAppDelegate } = require("expo/config-plugins");

const PORT = 8082;
const MARK = "metro-port plugin";
const ANCHOR = "return RCTBundleURLProvider.sharedSettings().jsBundleURL(";

module.exports = (config) =>
  withAppDelegate(config, (c) => {
    if (c.modResults.contents.includes(MARK)) return c;
    if (!c.modResults.contents.includes(ANCHOR))
      throw new Error(`${MARK}: bundleURL anchor not found in AppDelegate`);
    c.modResults.contents = c.modResults.contents.replace(
      ANCHOR,
      `// ${MARK}
    let ip = (try? String(contentsOfFile: Bundle.main.path(forResource: "ip", ofType: "txt") ?? "", encoding: .utf8))?
      .trimmingCharacters(in: .whitespacesAndNewlines)
    RCTBundleURLProvider.sharedSettings().jsLocation = "\\(ip ?? "localhost"):${PORT}"
    ${ANCHOR}`,
    );
    return c;
  });
