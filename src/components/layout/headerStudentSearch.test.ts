import { describe, expect, it } from 'vitest';
import { filterHeaderStudents } from './headerStudentSearch';
import type { AppData } from '../../types';

const data = {
  classes: [
    { id: 'class-1', name: '10A1', students: [
      { id: 'student-1', name: '\u004e\u0067\u0075\u0079\u00ean \u00c1\u006e\u0068', code: 'HS-001' },
      { id: 'student-2', name: 'Tr\u1ea7n B\u00ecnh', code: 'HS-002' },
    ] },
    { id: 'class-2', name: '10A2', students: [
      { id: 'student-3', name: '\u004e\u0067\u0075\u0079\u00ean An', code: 'HS-003' },
      { id: 'student-4', name: '\u0110\u1eb7ng Minh', code: 'HS-004' },
      { id: 'student-5', name: '\u0110\u1ed7 Lan', code: 'HS-005' },
    ] },
  ],
} as AppData;

describe('filterHeaderStudents', () => {
  it('matches accents and codes, ranks exact matches, includes class, caps results', () => {
    expect(filterHeaderStudents('nguyen anh', data)[0]).toMatchObject({ student: { name: '\u004e\u0067\u0075\u0079\u00ean \u00c1\u006e\u0068' }, className: '10A1' });
    expect(filterHeaderStudents('hs-002', data)[0].student.name).toBe('Tr\u1ea7n B\u00ecnh');
    expect(filterHeaderStudents('nguyen', data)).toHaveLength(2);
    expect(filterHeaderStudents('dang', data)[0].student.name).toBe('\u0110\u1eb7ng Minh');
    expect(filterHeaderStudents('do', data)[0].student.name).toBe('\u0110\u1ed7 Lan');
    expect(filterHeaderStudents('hs', { ...data, classes: [{ ...data.classes[0], students: Array.from({ length: 10 }, (_, index) => ({ ...data.classes[0].students[0], id: `student-${index}`, code: `HS-${index}` })) }] } as AppData, 8)).toHaveLength(8);
  });
});
