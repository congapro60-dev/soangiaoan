import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // soangiaoan/ là bản sao cục bộ không track git (.gitignore) — loại khỏi test để
    // không chạy trùng toàn bộ suite và không bị lệch khi mirror đó không được cập nhật.
    // tests/rules cần Firestore emulator → chạy riêng bằng `npm run test:rules`,
    // không để `npm run test` gọi vào rồi fail vì không có emulator.
    exclude: [...configDefaults.exclude, 'soangiaoan/**', 'tests/rules/**'],
  },
});
