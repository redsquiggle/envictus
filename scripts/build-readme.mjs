import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import remarkToc from "remark-toc";
import { unified } from "unified";

const CONTENT_DIR = new URL("../content/", import.meta.url).pathname;
const EXAMPLES_DIR = new URL("../examples/", import.meta.url).pathname;
const OUTPUT_FILE = new URL("../README.md", import.meta.url).pathname;
const GENERATED_COMMENT = "<!-- This file is generated from content/. Do not edit directly. -->\n\n";

/**
 * Recursively collect markdown AST children from content/ directory.
 * At each level: process index.md first, then numerically-sorted entries.
 */
function collectNodes(dir) {
	const entries = readdirSync(dir);

	const indexFile = entries.find((e) => e === "index.md");
	const rest = entries.filter((e) => e !== "index.md").sort();

	const nodes = [];

	if (indexFile) {
		nodes.push(...parseFile(join(dir, indexFile)));
	}

	for (const entry of rest) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			nodes.push(...collectNodes(fullPath));
		} else if (entry.endsWith(".md")) {
			nodes.push(...parseFile(fullPath));
		}
	}

	return nodes;
}

function parseFile(filePath) {
	const content = readFileSync(filePath, "utf-8");
	const tree = unified().use(remarkParse).parse(content);
	return tree.children;
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

const children = collectNodes(CONTENT_DIR);

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
