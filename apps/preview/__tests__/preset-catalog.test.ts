import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";
import published from "./fixtures/published-presets.json";

const filename = new URL("../src/features/presets/presetsConfig.ts", import.meta.url);
const source = ts.createSourceFile(
  filename.pathname,
  readFileSync(filename, "utf8"),
  ts.ScriptTarget.Latest,
  true,
);

function literal(node: ts.Expression | undefined): string | number | string[] {
  if (node && ts.isStringLiteral(node)) return node.text;
  if (node && ts.isNumericLiteral(node)) return Number(node.text);
  if (node && ts.isPropertyAccessExpression(node)) return node.getText(source).split(".").slice(1);
  if (node && ts.isArrayLiteralExpression(node))
    return node.elements.map((element) => {
      if (!ts.isStringLiteral(element)) throw new Error("Expected a string catalog tag");
      return element.text;
    });
  throw new Error("Expected literal preset metadata");
}

function readCatalog(name: string) {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(source) !== name) continue;
      if (!declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer))
        throw new Error(`Expected ${name} catalog array`);
      return declaration.initializer.elements.map((element) => {
        if (!ts.isObjectLiteralExpression(element)) throw new Error("Expected a preset object");
        const fields = new Map<string, ts.Expression>();
        for (const property of element.properties) {
          if (!ts.isPropertyAssignment(property)) throw new Error("Expected a preset field");
          fields.set(property.name.getText(source), property.initializer);
        }
        return Object.fromEntries(
          published.provenance.metadataFields.map((field) => [field, literal(fields.get(field))]),
        );
      });
    }
  }
  throw new Error(`Missing ${name} catalog`);
}

for (const [name, expected] of Object.entries(published.catalogs)) {
  test(`${name} retains the published names, descriptions, tags, timings and SDK adapters`, () => {
    const metadata = readCatalog(name);
    expect(metadata).toHaveLength(expected.count);
    expect(createHash("sha256").update(JSON.stringify(metadata)).digest("hex")).toBe(
      expected.sha256,
    );
  });
}
