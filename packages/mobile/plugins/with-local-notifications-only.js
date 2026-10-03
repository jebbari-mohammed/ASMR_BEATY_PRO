const { withEntitlementsPlist } = require('@expo/config-plugins');

// The release schedules reminders on the device. Expo Notifications adds an
// APNs entitlement for remote push by default, which this app does not use.
module.exports = (config) =>
  withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
