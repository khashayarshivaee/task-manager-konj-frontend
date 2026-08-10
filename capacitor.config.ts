import type {
  CapacitorConfig,
} from '@capacitor/cli';

import {
  KeyboardStyle,
} from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'pro.konj.taskmanager',

  appName: 'Task Manager Konj',

  webDir: 'www',

  plugins: {
    Keyboard: {
      /*
       * Keep the native iOS keyboard
       * consistent with our light UI.
       */
      style:
      KeyboardStyle.Light,

      /*
       * Prevent the area behind/below
       * the keyboard from appearing black.
       *
       * Capacitor reads the color from
       * the web app DOM background.
       */
      autoBackdropColor: 'dom',
    },
  },
};

export default config;
