import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

const RAW_LATEX_COMMAND = /\\(?:[A-Za-z]+|[,;!()[\]{}_:^])/;

export const toLiveLessonMarkdown = (text: string): string => {
  const output: string[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.includes('$') && RAW_LATEX_COMMAND.test(trimmed)) {
      if (output.length > 0 && output[output.length - 1] !== '') output.push('');
      output.push(`$$${trimmed}$$`);
      output.push('');
    } else {
      output.push(line);
    }
  }
  return output.join('\n');
};

export const LiveLessonRichText = ({ text, className = '' }: { text: string; className?: string }) => (
  <div className={className}>
    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
      {toLiveLessonMarkdown(text)}
    </ReactMarkdown>
  </div>
);
