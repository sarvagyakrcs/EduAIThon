import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nightOwl } from "react-syntax-highlighter/dist/esm/styles/hljs";

interface CodeBlockProps {
  code: string;
  language?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = "jsx" }) => {
  return (
    <SyntaxHighlighter language={language} style={nightOwl} customStyle={{ background: "none", border: "none" }}>
      {code}
    </SyntaxHighlighter>
  );
};

export default CodeBlock;