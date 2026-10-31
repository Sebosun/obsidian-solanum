import js from "@eslint/js";
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";
import { basename, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const componentFiles = {
  rules: {
    "absolute-imports": {
      meta: {
        type: "suggestion",
        fixable: "code",
        schema: [],
        messages: { alias: "Use {{alias}} for project imports." },
      },
      create(context) {
        function check(source) {
          if (typeof source?.value !== "string" || !source.value.startsWith(".")) return;
          const absolute = resolve(dirname(context.filename), source.value);
          let alias;
          for (const [folder, prefix] of [
            ["src", "@/"],
            ["assets", "@assets/"],
          ]) {
            const path = relative(resolve(projectRoot, folder), absolute);
            if (!path.startsWith("..") && !path.startsWith(sep))
              alias = prefix + path.split(sep).join("/");
          }
          if (alias)
            context.report({
              node: source,
              messageId: "alias",
              data: { alias },
              fix: (fixer) => fixer.replaceText(source, JSON.stringify(alias)),
            });
        }
        return {
          "ImportDeclaration[source], ExportNamedDeclaration[source], ExportAllDeclaration[source]"(
            node,
          ) {
            check(node.source);
          },
          CallExpression(node) {
            if (
              node.callee.type === "MemberExpression" &&
              node.callee.object.name === "vi" &&
              ["mock", "doMock", "unmock"].includes(node.callee.property.name)
            )
              check(node.arguments[0]);
          },
        };
      },
    },
    "one-component-per-file": {
      meta: {
        type: "suggestion",
        schema: [],
        messages: {
          single: "Use one React component per file.",
          name: "Component {{name}} must live in {{name}}.tsx.",
          named: "Declare a named Props interface instead of an inline object type.",
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
            for (const node of components) {
              if (node.name !== basename(context.filename, ".tsx"))
                context.report({ node, messageId: "name", data: { name: node.name } });
              const parameters = node.parent.params ?? node.parent.init?.params ?? [];
              for (const parameter of parameters) {
                if (parameter.typeAnnotation?.typeAnnotation.type === "TSTypeLiteral") {
                  context.report({ node: parameter, messageId: "named" });
                }
              }
            }
          },
        };
      },
    },
  },
};

export default tseslint.config(
  {
    ignores: ["node_modules/**", "main.js", "styles.css", "assets/**", ".agents/**", ".claude/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    plugins: { architecture: componentFiles },
    rules: { "architecture/absolute-imports": "error" },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": hooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
    },
  },
  {
    files: ["src/components/**/*.tsx"],
    plugins: { architecture: componentFiles },
    rules: { "architecture/one-component-per-file": "error" },
  },
  prettier,
);
