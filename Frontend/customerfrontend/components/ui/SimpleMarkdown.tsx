// components/ui/SimpleMarkdown.tsx
// 팝업 상세설명에 쓰인 마크다운 텍스트를 간단히 렌더링하는 컴포넌트

import type { ReactElement } from "react";

function renderInline(text: string, keyPrefix: string) {
  // **굵게**, *기울임*, [글자](링크) 를 순서대로 처리
  const parts: (string | ReactElement)[] = [];
  let remaining = text;
  let i = 0;

  const pattern = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(\[(.+?)\]\((.+?)\))/;

  while (remaining.length > 0) {
    const match = remaining.match(pattern);
    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }
    if (match.index > 0) {
      parts.push(remaining.slice(0, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={`${keyPrefix}-${i++}`}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={`${keyPrefix}-${i++}`}>{match[4]}</em>);
    } else if (match[5]) {
      parts.push(
        <a
          key={`${keyPrefix}-${i++}`}
          href={match[7]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-gray-900 dark:text-white"
        >
          {match[6]}
        </a>
      );
    }
    remaining = remaining.slice(match.index + match[0].length);
  }

  return parts;
}

export function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  const blocks: ReactElement[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={key} className="list-disc pl-5 my-2 flex flex-col gap-1">
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item, `${key}-li-${i}`)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  lines.forEach((line, idx) => {
    const key = `b-${idx}`;
    const listMatch = line.match(/^[-*]\s+(.*)$/);

    if (listMatch) {
      listBuffer.push(listMatch[1]);
      return;
    }
    flushList(`${key}-list`);

    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={key} className="text-sm font-semibold mt-3 mb-1">
          {renderInline(line.slice(4), key)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={key} className="text-base font-semibold mt-4 mb-1.5">
          {renderInline(line.slice(3), key)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={key} className="text-lg font-bold mt-4 mb-2">
          {renderInline(line.slice(2), key)}
        </h1>
      );
    } else if (line.trim() === "") {
      blocks.push(<div key={key} className="h-2" />);
    } else {
      blocks.push(
        <p key={key} className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {renderInline(line, key)}
        </p>
      );
    }
  });
  flushList("tail-list");

  return <div className="flex flex-col">{blocks}</div>;
}
