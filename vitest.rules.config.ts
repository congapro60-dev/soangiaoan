import { defineConfig } from 'vitest/config';

// Config riêng cho kiểm thử firestore.rules — cần Firestore emulator đang chạy.
// Gọi qua `npm run test:rules`, không dùng chung với vitest.config.ts (file đó
// loại trừ tests/rules để `npm run test` không fail khi không có emulator).
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/rules/**/*.test.ts'],
    // Emulator dùng chung một instance Firestore cho mọi file → chạy tuần tự để
    // clearFirestore() của file này không xoá dữ liệu file kia đang dùng.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
