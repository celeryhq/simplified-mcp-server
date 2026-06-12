import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { OpenAPIToolDescriptor, ParamLocation } from '../src/tools/openapi-tool-factory.js';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

export function toSnakeCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/** Resolve a single local `$ref` (`#/components/...`) against the spec. */
function resolveRef(spec: any, ref: string): any {
  const path = ref.replace(/^#\//, '').split('/');
  let node = spec;
  for (const key of path) node = node?.[key];
  if (node === undefined) throw new Error(`Unresolvable $ref: ${ref}`);
  return node;
}

/** Recursively inline every `$ref` inside a schema/parameter node. */
function deepResolve(spec: any, node: any, seen = new Set<string>()): any {
  if (Array.isArray(node)) return node.map((n) => deepResolve(spec, n, seen));
  if (node && typeof node === 'object') {
    if (typeof node.$ref === 'string') {
      if (seen.has(node.$ref)) return {}; // cycle guard
      seen.add(node.$ref);
      return deepResolve(spec, resolveRef(spec, node.$ref), seen);
    }
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(node)) out[k] = deepResolve(spec, v, seen);
    return out;
  }
  return node;
}

function addProperty(
  descriptor: OpenAPIToolDescriptor,
  propName: string,
  location: ParamLocation,
  schema: any,
  description: string | undefined,
  required: boolean
): void {
  if (descriptor.paramLocations[propName]) {
    throw new Error(
      `Parameter name collision in "${descriptor.name}": "${propName}" appears more than once`
    );
  }
  descriptor.paramLocations[propName] = location;
  const prop: Record<string, any> = { ...schema };
  if (description && !prop.description) prop.description = description;
  descriptor.inputSchema.properties[propName] = prop;
  if (required && !descriptor.inputSchema.required!.includes(propName)) {
    descriptor.inputSchema.required!.push(propName);
  }
}

/** Build tool descriptors for every operation in one spec. */
export function specToDescriptors(spec: any, groupKey: string): OpenAPIToolDescriptor[] {
  const descriptors: OpenAPIToolDescriptor[] = [];
  const paths = spec.paths ?? {};

  for (const [path, pathItem] of Object.entries<any>(paths)) {
    const sharedParams: any[] = pathItem.parameters ?? [];
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op || !op.operationId) continue;

      const descriptor: OpenAPIToolDescriptor = {
        name: toSnakeCase(op.operationId),
        description: op.summary || op.description || op.operationId,
        category: groupKey,
        method: method.toUpperCase() as OpenAPIToolDescriptor['method'],
        path,
        paramLocations: {},
        headerNames: {},
        inputSchema: { type: 'object', properties: {}, required: [] },
      };

      // Parameters (path-level shared + operation-level), $refs resolved.
      const rawParams = [...sharedParams, ...(op.parameters ?? [])];
      for (const raw of rawParams) {
        const param = deepResolve(spec, raw);
        const location = param.in as ParamLocation;
        if (location !== 'path' && location !== 'query' && location !== 'header') continue;
        addProperty(descriptor, param.name, location, param.schema ?? { type: 'string' }, param.description, Boolean(param.required));
        if (location === 'header') descriptor.headerNames![param.name] = param.name;
      }

      // Request body — flatten its top-level properties as body params.
      const bodySchemaRef = op.requestBody?.content?.['application/json']?.schema;
      if (bodySchemaRef) {
        const bodySchema = deepResolve(spec, bodySchemaRef);
        const required: string[] = bodySchema.required ?? [];
        for (const [propName, propSchema] of Object.entries<any>(bodySchema.properties ?? {})) {
          addProperty(descriptor, propName, 'body', propSchema, propSchema.description, required.includes(propName));
        }
      }

      if (descriptor.inputSchema.required!.length === 0) delete descriptor.inputSchema.required;
      if (Object.keys(descriptor.headerNames!).length === 0) delete descriptor.headerNames;
      descriptors.push(descriptor);
    }
  }
  return descriptors;
}

export function renderGroupFile(groupKey: string, descriptors: OpenAPIToolDescriptor[], sourceFile: string): string {
  return [
    `// AUTO-GENERATED from ${sourceFile}. Do not edit by hand.`,
    `// Regenerate with: npm run generate:tools`,
    `import type { OpenAPIToolDescriptor } from '../openapi-tool-factory.js';`,
    ``,
    `export const ${groupKey}: OpenAPIToolDescriptor[] = ${JSON.stringify(descriptors, null, 2)};`,
    ``,
  ].join('\n');
}

export function renderIndexFile(groupKeys: string[]): string {
  const imports = groupKeys.map((g) => `import { ${g} } from './${g}.js';`).join('\n');
  const entries = groupKeys.map((g) => `  ${g},`).join('\n');
  return [
    `// AUTO-GENERATED. Do not edit by hand. Regenerate with: npm run generate:tools`,
    `import type { OpenAPIToolDescriptor } from '../openapi-tool-factory.js';`,
    imports,
    ``,
    `export const generatedToolGroups: Record<string, OpenAPIToolDescriptor[]> = {`,
    entries,
    `};`,
    ``,
  ].join('\n');
}

export function main(): void {
  const specsPath =
    process.env.SIMPLIFIED_APIKIT_SPECS_PATH ||
    '/Users/jacek/Projects/python_libs/simplified-apikit/smp/apikit/specs';

  if (!existsSync(specsPath)) {
    console.error(
      `Specs path not found: ${specsPath}\n` +
        `Check out the simplified-apikit repo or set SIMPLIFIED_APIKIT_SPECS_PATH.`
    );
    process.exit(1);
  }

  const outDir = join(process.cwd(), 'src', 'tools', 'generated');
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(specsPath).filter((f) => f.endsWith('_openapi.yaml')).sort();
  const seenNames = new Map<string, string>();
  const groupKeys: string[] = [];

  for (const file of files) {
    const groupKey = basename(file, '_openapi.yaml');
    const spec = parseYaml(readFileSync(join(specsPath, file), 'utf8'));
    const descriptors = specToDescriptors(spec, groupKey);

    for (const d of descriptors) {
      const prev = seenNames.get(d.name);
      if (prev) throw new Error(`Tool name collision: "${d.name}" in both ${prev} and ${groupKey}`);
      seenNames.set(d.name, groupKey);
    }

    writeFileSync(join(outDir, `${groupKey}.ts`), renderGroupFile(groupKey, descriptors, file));
    groupKeys.push(groupKey);
    console.error(`Generated ${descriptors.length} tools for ${groupKey}`);
  }

  writeFileSync(join(outDir, 'index.ts'), renderIndexFile(groupKeys));
  console.error(`Wrote index with ${groupKeys.length} groups (${seenNames.size} tools total)`);
}

// Run only when invoked directly via `tsx scripts/generate-tools.ts`, not when
// imported (e.g. by the unit tests). Entry detection uses `process.argv[1]`
// rather than `import.meta.url` so the module also loads under tooling such as
// ts-jest, whose CommonJS transform cannot parse a bare `import.meta` token.
const entryPoint = process.argv[1] ? basename(process.argv[1]) : '';
if (entryPoint === 'generate-tools.ts' || entryPoint === 'generate-tools.js') {
  main();
}
