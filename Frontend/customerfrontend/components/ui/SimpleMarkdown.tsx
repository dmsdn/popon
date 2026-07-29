// components/ui/SimpleMarkdown.tsx
//
// [신규] 팝업 등록할 때 "상세설명"에 마크다운으로 작성한 내용을, 상세페이지에서
// 그대로(꾸며진 형태로) 보여주기 위한 렌더러예요. 이 프로젝트의 package.json을
// 직접 본 적이 없어서 react-markdown 같은 라이브러리가 설치되어 있는지 확신할 수
// 없어요 - 그래서 새 패키지 없이, 자주 쓰는 문법만 직접 파싱해서 처리해요.
//
// 지원: # ## ### 제목, **굵게**, *기울임*, [글자](링크), - 목록, 줄바꿈/문단
// 지원 안 함: 표, 코드블록, 중첩 목록 등 더 복잡한 문법 (필요하시면 추가해드릴게요)

function renderInline(text: string, keyPrefix: string) {
  // **굵게**, *기울임*, [글자](링크) 를 순서대로 처리
  const parts: (string | JSX.Element)[] = [];
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
          className="underline text-gray-900"
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
  const blocks: JSX.Element[] = [];
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
        <p key={key} className="text-sm text-gray-600 leading-relaxed">
          {renderInline(line, key)}
        </p>
      );
    }
  });
  flushList("tail-list");

  return <div className="flex flex-col">{blocks}</div>;
}
