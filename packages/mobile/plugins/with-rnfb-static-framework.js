const fs = require('fs');
const path = require('path');
const { withAppDelegate, withDangerousMod, withPodfile, withXcodeProject } = require('@expo/config-plugins');

// RNFirebase pods must be packaged as modules when Expo uses static frameworks.
// Keep this in config generation so a clean EAS build receives the same Podfile.
module.exports = function withRNFirebaseStaticFramework(config) {
  config = withPodfile(config, (mod) => {
    const declaration = '$RNFirebaseAsStaticFramework = true';
    if (!mod.modResults.contents.includes(declaration)) {
      mod.modResults.contents = `${declaration}\n${mod.modResults.contents}`;
    }
    // EXConstants runs its generated shell command through `bash -c` without
    // quoting the script path. CocoaPods resolves this to our workspace path,
    // which may contain spaces, so fix the generated build phase at install.
    const marker = '  post_install do |installer|\n';
    const fix = `    installer.pods_project.targets.each do |target|\n      next unless target.name == 'EXConstants'\n      target.shell_script_build_phases.each do |phase|\n        next unless phase.name&.include?('Generate app.config for prebuilt Constants.manifest')\n        phase.shell_script = 'bash -l "$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"'\n      end\n    end\n`;
    if (!mod.modResults.contents.includes(fix)) {
      if (!mod.modResults.contents.includes(marker)) throw new Error('Could not find CocoaPods post_install');
      mod.modResults.contents = mod.modResults.contents.replace(marker, marker + fix);
    }
    return mod;
  });

  // Expo's App Check plugin imports RNFBAppCheck as a Swift module, but CocoaPods
  // links it as an Objective-C static library in this Expo configuration.
  config = withAppDelegate(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents.replace(/^import RNFBAppCheck\n/m, '');
    return mod;
  });

  config = withDangerousMod(config, [
    'ios',
    async (mod) => {
      const iosRoot = mod.modRequest.platformProjectRoot;
      const appDir = fs.readdirSync(iosRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(iosRoot, entry.name))
        .find((directory) => fs.existsSync(path.join(directory, 'AppDelegate.swift')));
      if (!appDir) throw new Error('Could not find the generated iOS AppDelegate');
      const bridgePath = fs.readdirSync(appDir)
        .filter((name) => name.endsWith('-Bridging-Header.h'))
        .map((name) => path.join(appDir, name))[0];
      if (!bridgePath) throw new Error('Could not find the generated Swift bridging header');
      const header = fs.readFileSync(bridgePath, 'utf8');
      if (!header.includes('#import <RNFBAppCheckModule.h>')) {
        fs.writeFileSync(bridgePath, `${header.trimEnd()}\n#import <RNFBAppCheckModule.h>\n`);
      }
      return mod;
    },
  ]);

  // React Native's generated bundle phase executes a path using backticks.
  // Quote the path so local builds also work when the workspace name has spaces.
  return withXcodeProject(config, (mod) => {
    const phases = mod.modResults.hash.project.objects.PBXShellScriptBuildPhase;
    for (const phase of Object.values(phases)) {
      if (!phase || typeof phase !== 'object' || !String(phase.name).includes('Bundle React Native')) continue;
      const script = phase.shellScript;
      const start = script.indexOf('`\\"$NODE_BINARY\\" --print');
      if (start < 0) continue;
      const end = script.indexOf('`', start + 1);
      if (end < 0) throw new Error('Could not find the end of the React Native bundle command');
      const command = script.slice(start + 1, end);
      phase.shellScript = `${script.slice(0, start)}bash \\"$(${command})\\"${script.slice(end + 1)}`;
    }
    return mod;
  });
};
