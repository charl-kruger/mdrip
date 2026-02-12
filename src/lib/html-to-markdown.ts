import { parseDocument } from "htmlparser2";
import type {
  Node as DomNode,
  ChildNode,
  Element,
  DataNode,
  Document,
} from "domhandler";

const SKIP_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "svg",
  "canvas",
  "iframe",
  "form",
  "input",
  "button",
]);

const BLOCK_TAGS = new Set([
  "article",
  "section",
  "main",
  "div",
  "p",
  "header",
  "footer",
  "aside",
  "figure",
  "figcaption",
  "details",
  "summary",
  "dl",
  "dt",
  "dd",
]);

interface RenderContext {
  baseUrl?: string;
  inPre: boolean;
  listDepth: number;
}

function isElement(node: DomNode): node is Element {
  return node.type === "tag" || node.type === "script" || node.type === "style";
}

function isText(node: DomNode): node is DataNode {
  return node.type === "text";
}

function getChildren(node: DomNode): ChildNode[] {
  return "children" in node && Array.isArray(node.children) ? node.children : [];
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ");
}

function resolveHref(value: string, baseUrl?: string): string {
  if (!baseUrl) {
    return value;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function getTextContent(node: DomNode): string {
  if (isText(node)) {
    return node.data;
  }

  return getChildren(node).map((child) => getTextContent(child)).join("");
}

function normalizeMarkdown(markdown: string): string {
  const cleaned = markdown
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned ? `${cleaned}\n` : "";
}

function renderInlineChildren(children: ChildNode[], ctx: RenderContext): string {
  const rendered = children.map((child) => renderNode(child, ctx)).join("");
  return rendered.replace(/\s+/g, " ");
}

function block(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  return `\n\n${trimmed}\n\n`;
}

function renderListItem(
  node: Element,
  ordered: boolean,
  index: number,
  ctx: RenderContext,
): string {
  const marker = ordered ? `${index + 1}. ` : "- ";
  const indent = "  ".repeat(ctx.listDepth);

  const contentNodes: ChildNode[] = [];
  const nestedLists: string[] = [];

  for (const child of getChildren(node)) {
    if (isElement(child) && (child.name === "ul" || child.name === "ol")) {
      nestedLists.push(
        renderList(child, child.name === "ol", {
          ...ctx,
          listDepth: ctx.listDepth + 1,
        }),
      );
      continue;
    }

    contentNodes.push(child);
  }

  const text = renderInlineChildren(contentNodes, ctx).trim();
  let output = `${indent}${marker}${text}`.trimEnd();

  if (nestedLists.length > 0) {
    output += `\n${nestedLists.join("\n")}`;
  }

  return output;
}

function renderList(node: Element, ordered: boolean, ctx: RenderContext): string {
  const items = getChildren(node).filter(
    (child): child is Element => isElement(child) && child.name === "li",
  );

  if (items.length === 0) {
    return "";
  }

  const lines = items.map((item, index) => renderListItem(item, ordered, index, ctx));

  return block(lines.join("\n"));
}

function renderBlockquote(node: Element, ctx: RenderContext): string {
  const content = renderChildren(node, ctx).trim();
  if (!content) {
    return "";
  }

  const lines = content
    .split("\n")
    .map((line) => (line.trim() ? `> ${line}` : ">"))
    .join("\n");

  return `\n\n${lines}\n\n`;
}

function renderTable(node: Element, ctx: RenderContext): string {
  const rows: string[][] = [];

  const pushRow = (row: Element) => {
    const cells = getChildren(row).filter(
      (child): child is Element =>
        isElement(child) && (child.name === "th" || child.name === "td"),
    );

    if (cells.length === 0) {
      return;
    }

    rows.push(cells.map((cell) => renderInlineChildren(getChildren(cell), ctx).trim()));
  };

  const visit = (current: Element) => {
    if (current.name === "tr") {
      pushRow(current);
      return;
    }

    for (const child of getChildren(current)) {
      if (isElement(child)) {
        visit(child);
      }
    }
  };

  visit(node);

  if (rows.length === 0) {
    return "";
  }

  const colCount = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => {
    const out = [...row];
    while (out.length < colCount) {
      out.push("");
    }
    return out;
  });

  const header = normalizedRows[0];
  const body = normalizedRows.slice(1);
  const separator = new Array(colCount).fill("---");

  const markdownRows = [header, separator, ...body].map(
    (row) => `| ${row.join(" | ")} |`,
  );

  return block(markdownRows.join("\n"));
}

function renderPre(node: Element): string {
  const className = node.attribs.class || "";
  const languageMatch = className.match(/(?:language|lang)-([a-zA-Z0-9+-]+)/);
  const language = languageMatch ? languageMatch[1] : "";

  const raw = getTextContent(node).replace(/\r\n/g, "\n").trimEnd();
  if (!raw) {
    return "";
  }

  return `\n\n\`\`\`${language}\n${raw}\n\`\`\`\n\n`;
}

function renderChildren(node: DomNode, ctx: RenderContext): string {
  return getChildren(node).map((child) => renderNode(child, ctx)).join("");
}

function renderNode(node: DomNode, ctx: RenderContext): string {
  if (isText(node)) {
    return ctx.inPre ? node.data : collapseWhitespace(node.data);
  }

  if (!isElement(node)) {
    return renderChildren(node, ctx);
  }

  const tag = node.name.toLowerCase();

  if (SKIP_TAGS.has(tag)) {
    return "";
  }

  switch (tag) {
    case "br":
      return "  \n";
    case "hr":
      return "\n\n---\n\n";
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const level = Number.parseInt(tag.slice(1), 10);
      const text = renderInlineChildren(getChildren(node), ctx).trim();
      return block(`${"#".repeat(level)} ${text}`);
    }
    case "p": {
      const text = renderInlineChildren(getChildren(node), ctx).trim();
      return block(text);
    }
    case "strong":
    case "b": {
      const text = renderInlineChildren(getChildren(node), ctx).trim();
      return text ? `**${text}**` : "";
    }
    case "em":
    case "i": {
      const text = renderInlineChildren(getChildren(node), ctx).trim();
      return text ? `*${text}*` : "";
    }
    case "code": {
      const text = renderInlineChildren(getChildren(node), { ...ctx, inPre: true }).trim();
      if (!text) {
        return "";
      }
      return ctx.inPre ? text : `\`${text}\``;
    }
    case "pre":
      return renderPre(node);
    case "a": {
      const href = node.attribs.href;
      const text = renderInlineChildren(getChildren(node), ctx).trim();

      if (!href) {
        return text;
      }

      const resolvedHref = resolveHref(href, ctx.baseUrl);
      const label = text || resolvedHref;
      return `[${label}](${resolvedHref})`;
    }
    case "img": {
      const src = node.attribs.src;
      const alt = (node.attribs.alt || "image").trim();

      if (!src) {
        return alt;
      }

      const resolvedSrc = resolveHref(src, ctx.baseUrl);
      return `![${alt}](${resolvedSrc})`;
    }
    case "ul":
      return renderList(node, false, ctx);
    case "ol":
      return renderList(node, true, ctx);
    case "blockquote":
      return renderBlockquote(node, ctx);
    case "table":
      return renderTable(node, ctx);
    default: {
      const content = renderChildren(node, ctx);
      if (BLOCK_TAGS.has(tag)) {
        return block(content);
      }
      return content;
    }
  }
}

function findFirstByTag(node: DomNode, tagName: string): Element | null {
  if (isElement(node) && node.name.toLowerCase() === tagName) {
    return node;
  }

  for (const child of getChildren(node)) {
    const found = findFirstByTag(child, tagName);
    if (found) {
      return found;
    }
  }

  return null;
}

function findBestRoot(document: Document): DomNode {
  const main = findFirstByTag(document, "main");
  if (main) {
    return main;
  }

  const article = findFirstByTag(document, "article");
  if (article) {
    return article;
  }

  const body = findFirstByTag(document, "body");
  if (body) {
    return body;
  }

  return document;
}

function getDocumentTitle(document: Document): string | null {
  const titleElement = findFirstByTag(document, "title");
  if (!titleElement) {
    return null;
  }

  const title = getTextContent(titleElement).trim();
  return title || null;
}

export function estimateTokenCount(markdown: string): number {
  const compact = markdown.trim();
  if (!compact) {
    return 0;
  }

  return Math.ceil(compact.length / 4);
}

export function convertHtmlToMarkdown(html: string, baseUrl?: string): string {
  const document = parseDocument(html, { decodeEntities: true });
  const root = findBestRoot(document);
  const content = renderChildren(root, {
    baseUrl,
    inPre: false,
    listDepth: 0,
  });

  let markdown = normalizeMarkdown(content);

  const title = getDocumentTitle(document);
  if (title && !markdown.startsWith("# ")) {
    markdown = normalizeMarkdown(`# ${title}\n\n${markdown}`);
  }

  return markdown;
}
