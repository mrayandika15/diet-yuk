module.exports = {
  globDirectory: "dist",
  globPatterns: ["**/*.{html,js,css,json,ico,svg,png,ttf}"],
  globIgnores: ["sw.js", "workbox-*.js"],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  swDest: "dist/sw.js",
  navigateFallback: "/index.html",
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /\\.(?:png|jpe?g|webp|gif|svg)(?:\\?.*)?$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "diet-yuk-images",
        expiration: {
          maxEntries: 80,
          maxAgeSeconds: 60 * 60 * 24 * 30,
        },
      },
    },
    {
      urlPattern: /\\.(?:css|woff2?|ttf)(?:\\?.*)?$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "diet-yuk-assets",
        expiration: {
          maxEntries: 40,
          maxAgeSeconds: 60 * 60 * 24 * 365,
        },
      },
    },
  ],
};
