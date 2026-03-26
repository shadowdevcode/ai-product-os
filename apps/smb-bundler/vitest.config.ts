/// <reference types="vitest/config" />
import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../libs/shared/vitest.config';

/**
 * SMB Bundler — uses Neon (serverless Postgres), PostHog, Google Gemini
 */
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      // App-specific overrides go here
    },
  })
);
