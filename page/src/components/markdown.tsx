'use client';
import Markdown from "react-markdown";

export async function MarkdownToHtml({ content }: { content: string }) {
  return content;
  // return <Markdown>{content}</Markdown>;
}