import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { V871OwnerPrivatePackageCard, V871ArtifactInspector } from './V832StudioPage';
import type { V871PackageSummary } from '../services/v832StudioService';
import type { V871OwnerPackage } from '../lib/lessonCompiler/v832/v871PackageExporter';

describe('V832StudioPage owner-private package status card', () => {
  it('renders actual artifact text and math safely with file selection and downloads', () => {
    const pkg = { files: [{ name: '00_READ_ME.md', mediaType: 'text/markdown', sha256: 'a'.repeat(64),
      content: '# Nội dung thật\n\n$x^2$\n\n<script>alert(1)</script>\n\n![ảnh](https://example.invalid/private)' }] } as V871OwnerPackage;
    const html = renderToStaticMarkup(<V871ArtifactInspector packageData={pkg} isCurrent={() => true} />);
    expect(html).toContain('Nội dung thật'); expect(html).toContain('katex');
    expect(html).toContain('00_READ_ME.md'); expect(html).toContain('Tải tệp đang xem'); expect(html).toContain('Tải toàn bộ ZIP');
    expect(html).not.toContain('<script>'); expect(html).not.toContain('<img');
  });
  const sampleSummary: V871PackageSummary = {
    version: '8.8.1',
    access: 'OWNER_PRIVATE',
    releaseStatus: 'NOT_CERTIFIED',
    sourceHash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    contentHash: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
    packageHash: 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
    artifactCount: 14,
    sourceSnapshotFingerprint: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
    irDraftId: 'v832-111111111111111111111111',
    irRevision: 1,
    generatedAt: '2026-10-09T09:30:00.000Z',
  };

  it('renders owner-private success card with bounded metadata and no answers, PII or owner UID', () => {
    const html = renderToStaticMarkup(
      <V871OwnerPrivatePackageCard
        state={{
          status: 'ready',
          summary: sampleSummary,
          sourceDraftId: 'lesson-gen-12345678901234567890',
        }}
      />
    );

    // Vietnamese copy requirements
    expect(html).toContain('Đã tạo bản gói riêng tư của giáo viên');
    expect(html).toContain('14 tệp học liệu');
    expect(html).not.toContain('artifacts');
    expect(html).toContain('Chưa được chứng nhận để dạy');

    // Metadata hashes
    expect(html).toContain(sampleSummary.sourceHash);
    expect(html).toContain(sampleSummary.contentHash);
    expect(html).toContain(sampleSummary.packageHash);

    // SourceLink from persisted source draft ID uses route path /lesson-gen/:draftId
    expect(html).toContain('/lesson-gen/lesson-gen-12345678901234567890');
    expect(html).not.toContain('/lesson-gen?draft=');

    // Security & privacy: MUST NOT render answers, rubrics, learner PII or teacher UID
    expect(html).not.toContain('teacher-owner-123');
    expect(html).not.toContain('u_1 = 3');
    expect(html).not.toContain('workedSolution');
    expect(html).not.toContain('correctAnswer');
    expect(html).not.toContain('fake-public-link');
    expect(html).not.toContain('ready_to_teach');
  });

  it('renders needs authoring notice for legacy IR lacking V8.8.1 experience extension without claiming success or using teacher jargon', () => {
    const html = renderToStaticMarkup(
      <V871OwnerPrivatePackageCard
        state={{
          status: 'needs_authoring',
          sourceDraftId: 'lesson-gen-12345678901234567890',
          errorCode: 'V871_EXTENSION_REQUIRED',
        }}
      />
    );

    expect(html).toContain('Trải nghiệm V8.8.1 cần được soạn thảo hoặc rà soát');
    expect(html).not.toContain('M2c');
    expect(html).not.toContain('Đã tạo bản gói riêng tư của giáo viên');
    expect(html).not.toContain('Chưa được chứng nhận để dạy');
  });

  it('renders explicit error with diagnostics for malformed recognized extensions instead of masking as needs_authoring', () => {
    const html = renderToStaticMarkup(
      <V871OwnerPrivatePackageCard
        state={{
          status: 'error',
          sourceDraftId: 'lesson-gen-12345678901234567890',
          errorMessage: 'V871_EXTENSION_INVALID:root.activities.A1.signature',
        }}
      />
    );

    expect(html).toContain('Lỗi tạo bản gói riêng tư');
    expect(html).toContain('V871_EXTENSION_INVALID:root.activities.A1.signature');
    expect(html).not.toContain('Đã tạo bản gói riêng tư của giáo viên');
  });

  it('renders reload conflict notification when CAS detects stale revision or fingerprint', () => {
    const html = renderToStaticMarkup(
      <V871OwnerPrivatePackageCard
        state={{
          status: 'conflict',
          sourceDraftId: 'lesson-gen-12345678901234567890',
          errorMessage: 'Bản nháp nguồn hoặc IR đã bị sửa đổi; tải lại trước khi tạo gói.',
        }}
        onReload={() => {}}
      />
    );

    expect(html).toContain('Xung đột phiên bản bản nháp');
    expect(html).toContain('Tải lại bản nháp');
  });

  it('renders unavailable notice when IR lacks linked source draft', () => {
    const html = renderToStaticMarkup(
      <V871OwnerPrivatePackageCard
        state={{
          status: 'unavailable',
          reason: 'Chưa liên kết bản nháp nguồn gốc.',
        }}
      />
    );

    expect(html).toContain('Chưa có nguồn gốc');
    expect(html).not.toContain('Đã tạo bản gói riêng tư của giáo viên');
  });

  it('renders loading state without leaking metadata', () => {
    const html = renderToStaticMarkup(
      <V871OwnerPrivatePackageCard
        state={{
          status: 'loading',
        }}
      />
    );

    expect(html).toContain('Đang kiểm tra bản gói riêng tư V8.8.1…');
  });
});
