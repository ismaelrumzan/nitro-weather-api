//https://nitro.unjs.io/config
export default defineNitroConfig({
  srcDir: "server",
  // Enables routing hints for Vercel Function insights
  compatibilityDate: '2025-07-15', // or 'latest'
 
  // Fine-grained ISR for weather endpoints
  routeRules: {
    '/api/weather/**': {
      isr: {
        expiration: 60, // cache for 60s
        allowQuery: ['units'], // cache by units (metric/imperial)
        passQuery: true,
      },
    },
  },
 
  // On-demand revalidation support (optional; see step 4)
  vercel: {
    config: {
      bypassToken: process.env.VERCEL_BYPASS_TOKEN,
    },
  },
});
