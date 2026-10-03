const releaseProfiles = new Set(['production', 'testflight']);

if (releaseProfiles.has(process.env.EAS_BUILD_PROFILE)) {
  const required = [
    ['EXPO_PUBLIC_RC_APPLE_API_KEY', 'appl_'],
    ['EXPO_PUBLIC_RC_GOOGLE_API_KEY', 'goog_'],
  ];

  for (const [name, prefix] of required) {
    const value = process.env[name];
    if (!value || !value.startsWith(prefix) || value.includes('placeholder')) {
      console.error(`Release build requires a valid ${name} in its EAS environment.`);
      process.exitCode = 1;
    }
  }
}
