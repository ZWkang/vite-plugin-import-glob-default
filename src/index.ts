import type { Plugin, ResolvedConfig } from 'vite';
import _debug from 'debug';
import { parseExpressionAt } from 'acorn';
import { findNodeAt } from 'acorn-walk';
import MagicString from 'magic-string';
import type { CallExpression, SequenceExpression, MemberExpression } from 'estree';

// const logger = createLogger()
const debug = _debug('vite-plugin-import-glob-default');

interface Options {
  // [key: string]: any;
  eagerMode?: 'all' | 'none' | 'build';
  [key: string]: any;
}

function pick<T extends Record<string, unknown>, Keys extends keyof T>(obj: T, keys: Keys[]) {
  return (Object.keys(obj) as Keys[]).reduce((prev, next) => {
    if (!keys.includes(next)) {
      return prev;
    }

    prev[next] = obj[next];
    return prev;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  }, {} as Pick<T, Keys>);
}

export const appendCodeName = '__vite_get_path_dynamic_default';
const appendCode = `\
function __vite_get_path_dynamic_default(modules) {
  const [[key, value]] = Object.entries(modules);
  return modules[key];
}\n`;

export function evalValue<T = any>(rawValue: string): T {
  // eslint-disable-next-line no-new-func
  const fn = new Function(`
    var console, exports, global, module, process, require
    return (\n${rawValue}\n)
  `);
  return fn();
}

const importGlobDefault = /\bimport\.meta\.globDefault(?:<\w+>)?\s*\(/g;

const knownOptions = {
  as: ['string'],
  eager: ['boolean'],
  import: ['string'],
  exhaustive: ['boolean'],
  query: ['object', 'string'],
} as const;

const importGlobKeys = Object.keys(knownOptions) as (keyof typeof knownOptions)[];

const windowsSlashRE = /\\/g;
export function slash(p: string): string {
  return p.replace(windowsSlashRE, '/');
}

function VitePlugin(options: Options = {}): Plugin {
  const { allEager = 'build' } = options;

  let config: undefined | ResolvedConfig;
  return {
    name: `vite-plugin-import-glob-default`,

    enforce: 'pre',
    configResolved(resolvedConfig) {
      // store the resolved config
      config = resolvedConfig;
    },
    transform(code: string, id: string) {
      // eslint-disable-next-line no-param-reassign
      id = slash(id);
      if (/node_modules/g.test(id)) return;
      if (!code.includes('import.meta.globDefault')) return;

      debug(`transform id: ${id}`);

      const matches = Array.from(code.matchAll(importGlobDefault));
      const s = new MagicString(code);
      let lastTokenPos: number | undefined;
      let ast: CallExpression | SequenceExpression | MemberExpression;

      matches.forEach((match, idx) => {
        const start = match.index!;

        // copy from https://github.com/vitejs/vite/blob/de60f1e3d1eb03167362cf8ce0c6c4071430f812/packages/vite/src/node/plugins/importMetaGlob.ts#L242
        try {
          ast = parseExpressionAt(code, match.index!, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            ranges: true,
            onToken: (token) => {
              lastTokenPos = token.end;
            },
          }) as any;
        } catch (e) {
          const _e = e as any;
          if (_e?.message?.startsWith('Unterminated string constant')) return undefined!;
          if (lastTokenPos === null || lastTokenPos === undefined || lastTokenPos <= start) throw _e;

          // tailing comma in object or array will make the parser think it's a comma operation
          // we try to parse again removing the comma
          try {
            const statement = code.slice(start, lastTokenPos).replace(/[,\s]*$/, '');
            ast = parseExpressionAt(
              ' '.repeat(start) + statement, // to keep the ast position
              start,
              {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ranges: true,
              },
            ) as any;
          } catch {
            this.error(_e);
          }
        }

        const found = findNodeAt(ast as any, match.index, undefined, 'CallExpression');
        const node = found?.node as undefined | CallExpression;
        if (!node) return;

        const arg1 = node.arguments[0] as any;
        const arg2 = node.arguments[1] as any;

        const end = node!.range![1];

        const eager = allEager === 'build' ? config?.command === 'build' : allEager === 'all' ? true : false;

        let options: Record<string, any> = {
          import: 'default',

          // build mode default is eager true
          eager: eager,
        };

        if (arg2 && arg2.type === 'ObjectExpression') {
          const optionsStr = code.slice(arg2.range![0], arg2.range![1]);
          const obj = evalValue(optionsStr);
          options = {
            ...pick(options, importGlobKeys),
            ...obj,
          };
        }
        s.overwrite(
          match.index!,
          end,
          `${appendCodeName}(import.meta.glob(${JSON.stringify(arg1.value)},${JSON.stringify(options)}))`,
        );
      });
      s.prepend(appendCode);

      return {
        code: s.toString(),
        map:
          config!.command === 'build' && config!.build.sourcemap
            ? s.generateMap({ hires: 'boundary', source: id })
            : null,
      };
    },
  };
}

export default VitePlugin;
