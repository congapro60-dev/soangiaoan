import { CASIO_REMINDER, formatCasioKeys, getCasioGuideForLesson } from '../../lib/liveLesson/casioGuide';

/**
 * Bảng hướng dẫn bấm Casio fx-580VN X hiện trên màn hình tương tác (quyết định thầy
 * 2026-10-25). Học sinh bấm máy thật của mình; đây chỉ là bảng chỉ dẫn từng phím.
 *
 * Không render gì với bài không cần Casio — tránh nhồi nội dung cho đủ.
 */
export function CasioKeyGuide({ lessonIdOrSourceKey }: { lessonIdOrSourceKey: string }) {
  const steps = getCasioGuideForLesson(lessonIdOrSourceKey);
  if (!steps) return null;
  return (
    <section className="student-casio-guide" aria-label="Hướng dẫn bấm máy tính Casio fx-580VN X">
      <header>
        <p className="student-casio-eyebrow">Máy tính của em — bấm theo đúng thứ tự</p>
        <h3 className="student-casio-title">Casio fx-580VN X</h3>
      </header>
      <ol className="student-casio-steps">
        {steps.map(step => (
          <li key={step.order} className="student-casio-step">
            <span className="student-casio-order" aria-hidden="true">{step.order}</span>
            <div className="student-casio-body">
              <p className="student-casio-instruction">{step.instruction}</p>
              <p className="student-casio-keys">
                {step.keys.map((key, index) => (
                  <span key={`${step.order}-${key}-${index}`}>
                    <kbd className="student-casio-key">{key}</kbd>
                    {index < step.keys.length - 1 && <span className="student-casio-arrow" aria-hidden="true"> → </span>}
                  </span>
                ))}
              </p>
              {step.expected && <p className="student-casio-expected">Màn hình phải hiện: <strong>{step.expected}</strong></p>}
              <span className="sr-only">Các phím: {formatCasioKeys(step)}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className="student-casio-reminder">{CASIO_REMINDER}</p>
    </section>
  );
}
