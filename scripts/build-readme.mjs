import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import remarkToc from "remark-toc";
import { unified } from "unified";

const CONTENT_DIR = new URL("../content/", import.meta.url).pathname;
const EXAMPLES_DIR = new URL("../examples/", import.meta.url).pathname;
const OUTPUT_FILE = new URL("../README.md", import.meta.url).pathname;
const GENERATED_COMMENT = "<!-- This file is generated from content/. Do not edit directly. -->\n\n";

/**
 * Parse a markdown file with frontmatter support.
 * Extracts `title` from YAML frontmatter, removes the yaml node,
 * and prepends a generated heading at the given depth.
 */
function parseFile(filePath, headingDepth) {
	const content = readFileSync(filePath, "utf-8");
	const tree = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).parse(content);

	let title = null;
	const children = tree.children.filter((node) => {
		if (node.type === "yaml") {
			const match = node.value.match(/^title:\s*(.+)$/m);
			if (match) {
				title = match[1].trim();
			}
			return false;
		}
		return true;
	});

	if (title) {
		children.unshift({
			type: "heading",
			depth: headingDepth,
			children: [{ type: "text", value: title }],
		});
	}

	return children;
}

/**
 * Recursively collect markdown AST children from content/ directory.
 * At each level: process index.md first, then numerically-sorted entries.
 * Index files get headings at `depth`, non-index files at `depth + 1`,
 * subdirectories recurse with `depth + 1`.
 */
function collectNodes(dir, depth) {
	const entries = readdirSync(dir);

	const indexFile = entries.find((e) => e === "index.md");
	const rest = entries.filter((e) => e !== "index.md").sort();

	const nodes = [];

	if (indexFile) {
		nodes.push(...parseFile(join(dir, indexFile), depth));
	}

	for (const entry of rest) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			nodes.push(...collectNodes(fullPath, depth + 1));
		} else if (entry.endsWith(".md")) {
			nodes.push(...parseFile(fullPath, depth + 1));
		}
	}

	return nodes;
}

/**
 * Generate AST nodes from examples/ directory.
 * Each example gets: h3 title (from README), description paragraph, and config code block(s).
 */
function generateExampleNodes() {
	const dirs = readdirSync(EXAMPLES_DIR)
		.filter((e) => statSync(join(EXAMPLES_DIR, e)).isDirectory())
		.sort();

	const nodes = [];

	for (const dir of dirs) {
		const dirPath = join(EXAMPLES_DIR, dir);

		// Parse README.md for title and description
		const readmePath = join(dirPath, "README.md");
		const readmeContent = readFileSync(readmePath, "utf-8");
		const readmeTree = unified().use(remarkParse).parse(readmeContent);

		// Extract h1 title, shift to h3, strip trailing " Example"
		const titleNode = readmeTree.children.find((n) => n.type === "heading" && n.depth === 1);
		if (titleNode) {
			const clone = structuredClone(titleNode);
			clone.depth = 3;
			for (const child of clone.children) {
				if (child.type === "text") {
					child.value = child.value.replace(/ Example$/, "");
				}
			}
			nodes.push(clone);
		}

		// Extract first paragraph as description
		const descNode = readmeTree.children.find((n) => n.type === "paragraph");
		if (descNode) {
			nodes.push(structuredClone(descNode));
		}

		// Find all config files
		const configFiles = readdirSync(dirPath)
			.filter((f) => f.endsWith(".config.ts"))
			.sort();

		for (const configFile of configFiles) {
			const configContent = readFileSync(join(dirPath, configFile), "utf-8");

			// Label each file when there are multiple
			if (configFiles.length > 1) {
				nodes.push({
					type: "paragraph",
					children: [{ type: "inlineCode", value: configFile }],
				});
			}

			nodes.push({
				type: "code",
				lang: "typescript",
				value: configContent.trimEnd(),
			});
		}
	}

	return nodes;
}

const children = collectNodes(CONTENT_DIR, 1);

// Inject "Table of Contents" heading before the first h2
const firstH2Idx = children.findIndex((n) => n.type === "heading" && n.depth === 2);
if (firstH2Idx !== -1) {
	children.splice(firstH2Idx, 0, {
		type: "heading",
		depth: 2,
		children: [{ type: "text", value: "Table of Contents" }],
	});
}

// Replace <!-- include-examples --> with generated content
const exampleNodes = generateExampleNodes();
const directiveIdx = children.findIndex((n) => n.type === "html" && n.value.includes("include-examples"));
if (directiveIdx !== -1) {
	children.splice(directiveIdx, 1, ...exampleNodes);
}

const tree = { type: "root", children };
const processor = unified().use(remarkToc, { tight: true }).use(remarkStringify, {
	bullet: "-",
	emphasis: "*",
	strong: "*",
	listItemIndent: "one",
	rule: "-",
	fences: true,
});
const transformed = processor.runSync(tree);
const output = processor.stringify(transformed);

writeFileSync(OUTPUT_FILE, GENERATED_COMMENT + output);

console.log("README.md generated from content/");
