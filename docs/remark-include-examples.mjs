import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import remarkParse from "remark-parse";
import { unified } from "unified";

const EXAMPLES_DIR = new URL("../examples/", import.meta.url).pathname;

function generateExampleNodes() {
	const dirs = readdirSync(EXAMPLES_DIR)
		.filter((e) => statSync(join(EXAMPLES_DIR, e)).isDirectory())
		.sort();

	const nodes = [];

	for (const dir of dirs) {
		const dirPath = join(EXAMPLES_DIR, dir);

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

export function remarkIncludeExamples() {
	return (tree) => {
		const idx = tree.children.findIndex((n) => n.type === "html" && n.value.includes("include-examples"));
		if (idx !== -1) {
			tree.children.splice(idx, 1, ...generateExampleNodes());
		}
	};
}
