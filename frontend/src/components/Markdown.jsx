import "./markdown.css";

function Markdown({ source, tone = "light" }) {
  const lines = (source ?? "").split("\n");
  const out = [];
  const toneClass = tone === "dark" ? "md-dark" : "md-light";

  let inCode = false;
  let codeBuf = [];
  let currentListType = null;
  let currentListItems = [];
  let currentTableRows = [];

  const flushCode = (key) => {
    out.push(
      <pre key={key} className="md-code-block">
        <code>{codeBuf.join("\n")}</code>
      </pre>
    );
    codeBuf = [];
  };

  const normalizeTableRow = (row) =>
    row
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim());

  const isTableSeparatorLine = (line) => {
    const cells = normalizeTableRow(line);
    return (
      cells.length > 0 &&
      cells.every((cell) => /^:?-{3,}:?$/.test(cell) || cell === "")
    );
  };

  const flushList = () => {
    if (!currentListItems.length) return;

    out.push(
      currentListType === "ol" ? (
        <ol key={`list-${out.length}`} className="md-list">
          {currentListItems}
        </ol>
      ) : (
        <ul key={`list-${out.length}`} className="md-list">
          {currentListItems}
        </ul>
      )
    );

    currentListType = null;
    currentListItems = [];
  };

  const flushTable = () => {
    if (!currentTableRows.length) return;

    if (currentTableRows.length > 1 && isTableSeparatorLine(currentTableRows[1])) {
      const headerCells = normalizeTableRow(currentTableRows[0]);
      const bodyRows = currentTableRows.slice(2).map(normalizeTableRow);

      out.push(
        <table key={`table-${out.length}`} className="md-table">
          <thead>
            <tr>
              {headerCells.map((cell, index) => (
                <th key={index}>{inline(cell)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{inline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else {
      currentTableRows.forEach((row, rowIndex) => {
        out.push(
          <p key={`table-fallback-${out.length}-${rowIndex}`} className="md-body">
            {inline(row)}
          </p>
        );
      });
    }

    currentTableRows = [];
  };

  const inline = (text) => {
    const parts = [];
    const regex = /(!\[[^\]]+\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
    let last = 0;
    let match;
    let index = 0;

    while ((match = regex.exec(text))) {
      if (match.index > last) parts.push(text.slice(last, match.index));

      const token = match[0];
      if (token.startsWith("!")) {
        const closeBracketIdx = token.indexOf("]");
        const alt = token.slice(2, closeBracketIdx);
        const url = token.slice(closeBracketIdx + 2, -1);
        parts.push(
          <img
            key={index += 1}
            src={url}
            alt={alt}
            className="md-image"
          />
        );
      } else if (token.startsWith("[")) {
        const closeBracketIdx = token.indexOf("]");
        const label = token.slice(1, closeBracketIdx);
        const url = token.slice(closeBracketIdx + 2, -1);
        parts.push(
          <a
            key={index += 1}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="md-link"
          >
            {label}
          </a>
        );
      } else if (token.startsWith("**") || token.startsWith("__")) {
        parts.push(
          <strong key={index += 1} className="md-strong">
            {token.slice(2, -2)}
          </strong>
        );
      } else if (
        (token.startsWith("*") && token.endsWith("*")) ||
        (token.startsWith("_") && token.endsWith("_"))
      ) {
        parts.push(
          <em key={index += 1} className="md-emphasis">
            {token.slice(1, -1)}
          </em>
        );
      } else if (token.startsWith("`")) {
        parts.push(
          <code key={index += 1} className="md-inline-code">
            {token.slice(1, -1)}
          </code>
        );
      }

      last = match.index + token.length;
    }

    if (last < text.length) parts.push(text.slice(last));

    return parts;
  };

  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    const trimmedLine = line.trim();

    if (line.startsWith("```")) {
      flushList();
      flushTable();
      if (inCode) {
        flushCode(`code-${idx}`);
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    const isTableCandidate =
      line.includes("|") &&
      !trimmedLine.startsWith("> ") &&
      !trimmedLine.startsWith("- ") &&
      !trimmedLine.match(/^\d+\.\s+/) &&
      !trimmedLine.startsWith("#");

    if (currentTableRows.length > 0 || isTableCandidate) {
      if (isTableCandidate) {
        currentTableRows.push(line);
        continue;
      }

      flushTable();
    }

    const orderedMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      flushTable();
      if (currentListType !== "ol") {
        flushList();
        currentListType = "ol";
      }

      currentListItems.push(
        <li key={`ol-${idx}`} className="md-list-item">
          {inline(orderedMatch[2])}
        </li>
      );
      continue;
    }

    if (trimmedLine.startsWith("- ")) {
      flushTable();
      if (currentListType !== "ul") {
        flushList();
        currentListType = "ul";
      }

      currentListItems.push(
        <li key={`ul-${idx}`} className="md-list-item">
          {inline(line.slice(line.indexOf("- ") + 2))}
        </li>
      );
      continue;
    }

    flushList();

    if (trimmedLine === "") {
      flushTable();
      out.push(<div key={`spacer-${idx}`} className="md-spacer" />);
      continue;
    }

    if (trimmedLine.startsWith("### ")) {
      out.push(
        <h3 key={idx} className="md-h3">
          {trimmedLine.slice(4)}
        </h3>
      );
    } else if (trimmedLine.startsWith("## ")) {
      out.push(
        <h2 key={idx} className="md-h2">
          {trimmedLine.slice(3)}
        </h2>
      );
    } else if (trimmedLine.startsWith("# ")) {
      out.push(
        <h1 key={idx} className="md-h1">
          {trimmedLine.slice(2)}
        </h1>
      );
    } else if (trimmedLine.startsWith("> ")) {
      out.push(
        <blockquote key={idx} className="md-blockquote">
          {inline(trimmedLine.slice(2))}
        </blockquote>
      );
    } else {
      out.push(
        <p key={idx} className="md-body">
          {inline(line)}
        </p>
      );
    }
  }

  flushList();
  flushTable();
  if (inCode) flushCode("code-end");

  return <div className={`md-root ${toneClass}`}>{out}</div>;
}

export { Markdown };