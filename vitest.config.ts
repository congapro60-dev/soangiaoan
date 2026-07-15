import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // soangiaoan/ là bản sao cục bộ không track git (.gitignore) — loại khỏi test để
    // không chạy trùng toàn bộ suite và không bị lệch khi mirror đó không được cập nhật.
    exclude: [...configDefaults.exclude, 'soangiaoan/**'],
  },
});
