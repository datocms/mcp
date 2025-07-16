import ky from 'ky';
import * as ts from 'typescript';

export async function extractTypeDependenciesFromUrl(url: string, startingTypeNames: string[]): Promise<string> {
  // Fetch the file content
  const content = await ky(url).text();

  const fileName = 'types.ts';
  const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);

  const dependencies = new Set<string>();
  const visited = new Set<string>();
  const typeDeclarations = new Map<string, ts.Node>();

  // First pass: collect all type declarations
  function collectTypeDeclarations(node: ts.Node) {
    if (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      const name = node.name.text; // Use .text instead of getText() for identifiers
      typeDeclarations.set(name, node);
    }
    ts.forEachChild(node, collectTypeDeclarations);
  }

  collectTypeDeclarations(sourceFile);

  // Second pass: find dependencies
  function findDependencies(typeName: string) {
    if (visited.has(typeName)) return;
    visited.add(typeName);

    const declaration = typeDeclarations.get(typeName);
    if (!declaration) return;

    dependencies.add(typeName);

    function visitTypeReferences(node: ts.Node) {
      if (ts.isTypeReferenceNode(node)) {
        let referencedTypeName: string;

        if (ts.isIdentifier(node.typeName)) {
          referencedTypeName = node.typeName.text;
        } else if (ts.isQualifiedName(node.typeName)) {
          // Handle qualified names like Namespace.Type
          referencedTypeName = node.typeName.right.text;
        } else {
          return;
        }

        if (typeDeclarations.has(referencedTypeName)) {
          findDependencies(referencedTypeName);
        }
      }

      ts.forEachChild(node, visitTypeReferences);
    }

    visitTypeReferences(declaration);
  }

  // Start the dependency search for all starting types
  startingTypeNames.forEach(typeName => {
    findDependencies(typeName);
  });

  // Generate output
  const result: string[] = [];
  dependencies.forEach(typeName => {
    const declaration = typeDeclarations.get(typeName);
    if (declaration) {
      result.push(declaration.getFullText(sourceFile));
    }
  });

  return result.join('\n');
}