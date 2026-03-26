/// <reference types="vitest/config" />
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../libs/shared/vitest.config';

/**
 * Ozi Reorder — uses Neon (serverless Postgres), PostHog
 */
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      // App-specific overrides go here
    },
  })
);
