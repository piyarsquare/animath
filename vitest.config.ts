import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Unit tests live next to the code they verify (src/**/__tests__); the
// legacy ad-hoc scripts in sh-test/ are not vitest suites, so scope the
// include to src. Run with `npm test`.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }),
);
