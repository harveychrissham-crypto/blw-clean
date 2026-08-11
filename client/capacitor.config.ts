import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.blwcampusministry.app',
  appName: 'BLW Campus Ministry',
  webDir: 'dist',

  server: {
    url: 'https://blweastandcentralafrica.onrender.com',
    cleartext: false,
  },

  ios: {
    contentInset: 'automatic',
  },

  android: {
    allowMixedContent: false,
  },
};

export default config;