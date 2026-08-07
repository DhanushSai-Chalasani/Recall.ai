import nextPlugin from "@next/eslint-plugin-next";

const eslintConfig = [
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    ignores: [".next/", "node_modules/", "dist/"],
  },
];

export default eslintConfig;
