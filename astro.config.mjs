// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static output — deployable to Vercel or Netlify with zero server runtime.
// The waitlist write happens client-side via the Firebase Web SDK, protected
// by create-only Firestore security rules (see firestore.rules).
export default defineConfig({
  output: 'static',
  site: 'https://fauran.pk',
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    // Inline small assets to cut requests on metered connections.
    assets: 'assets',
  },
});
