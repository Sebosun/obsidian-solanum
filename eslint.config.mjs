import js from "@eslint/js";
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";
import { basename } from "node:path";

const componentFiles = {
  rules: {
    "one-component-per-file": {
      meta: {
        type: "suggestion",
        schema: [],
        messages: {
          single: "Use one React component per file.",
          name: "Component {{name}} must live in {{name}}.tsx.",
        },
      },
      create(context) {
        return {
          Program(program) {
            const components = program.body.flatMap((statement) => {
              const node =
                statement.type === "ExportNamedDeclaration" ||
                statement.type === "ExportDefaultDeclaration"
                  ? statement.declaration
                  : statement;
              if (!node) return [];
              if (
                ["FunctionDeclaration", "ClassDeclaration"].includes(node.type) &&
                node.id &&
                /^[A-Z]/.test(node.id.name)
              )
                return [node.id];
              if (node.type === "VariableDeclaration")
                return node.declarations
                  .filter(
                    (d) =>
                      d.id.type === "Identifier" &&
                      /^[A-Z]/.test(d.id.name) &&
                      ["ArrowFunctionExpression", "FunctionExpression"].includes(d.init?.type),
                  )
                  .map((d) => d.id);
              return [];
            });
            if (components.length > 1) context.report({ node: components[1], messageId: "single" });
            for (const node of components)
              if (node.name !== basename(context.filename, ".tsx"))
                context.report({ node, messageId: "name", data: { name: node.name } });
          },
        };
      },
    },
  },
};

export default tseslint.config(
  { ignores: ["node_modules/**", "main.js", "styles.css", "assets/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": hooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["src/components/**/*.tsx"],
    plugins: { architecture: componentFiles },
    rules: { "architecture/one-component-per-file": "error" },
  },
  prettier,
);
