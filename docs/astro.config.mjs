import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import { remarkIncludeExamples } from "./remark-include-examples.mjs";

export default defineConfig({
	markdown: {
		remarkPlugins: [remarkIncludeExamples],
	},
	integrations: [
		starlight({
			title: "envictus",
			sidebar: [
				{ slug: "installation" },
				{ slug: "quick-start" },
				{
					label: "CLI Usage",
					items: [
						{ slug: "cli-usage" },
						{ slug: "cli-usage/config-path" },
						{ slug: "cli-usage/setting-mode" },
					],
				},
				{
					label: "Configuration",
					items: [
						{ slug: "configuration" },
						{ slug: "configuration/schema" },
						{ slug: "configuration/discriminator" },
						{ slug: "configuration/env-files" },
					],
				},
				{ slug: "resolution-order" },
				{ slug: "examples" },
				{ slug: "printenv" },
				{ slug: "debugging" },
				{ slug: "supported-libraries" },
				{ slug: "license" },
			],
		}),
	],
});
