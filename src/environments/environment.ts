export const environment = {
  production: false,
  apnsEnvironment: 'development' as const,
  apiUrl: 'https://api.konj.pro/api',

  reverb: {
    key: 'd31848c8ae2cc6b4897db4911353fcc3',
    host: 'api.konj.pro',
    wsPort: 80,
    wssPort: 443,
    forceTLS: true,
  },
};
