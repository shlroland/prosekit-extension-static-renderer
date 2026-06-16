import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      // https://vitest.dev/config/browser/playwright
      provider: playwright({
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write'],
        },
      }),
      instances: [{ browser: 'chromium' }],
    },
  },
})
