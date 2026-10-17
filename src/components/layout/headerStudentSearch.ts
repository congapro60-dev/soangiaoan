import type { AppData, Student } from '../../types';

export interface HeaderStudentSearchResult {
  classId: string;
  className: string;
  student: Student;
}

const normalizeSearchText = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('vi')
  .trim();

export const filterHeaderStudents = (query: string, data: AppData, limit = 8): HeaderStudentSearchResult[] => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return data.classes.flatMap(cls => cls.students.map(student => ({
    classId: cls.id,
    className: cls.name,
    student,
  })))
    .map(result => {
      const name = normalizeSearchText(result.student.name);
      const code = normalizeSearchText(result.student.code);
      const score = name === normalizedQuery || code === normalizedQuery ? 0
        : name.startsWith(normalizedQuery) || code.startsWith(normalizedQuery) ? 1
          : name.includes(normalizedQuery) || code.includes(normalizedQuery) ? 2 : 3;
      return { result, score };
    })
    .filter(item => item.score < 3)
    .sort((a, b) => a.score - b.score || a.result.student.name.localeCompare(b.result.student.name, 'vi'))
    .slice(0, limit)
    .map(item => item.result);
};
