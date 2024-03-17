import type { Plugin, ResolvedConfig } from 'vite';
import { createLogger } from 'vite'
import { parseExpressionAt } from 'acorn'
import { findNodeAt } from 'acorn-walk'
import MagicString from 'magic-string'
import type {
  CallExpression,
} from 'estree'

const logger = createLogger()

interface Options {
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
  }, {} as Pick<T, Keys>)
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
  `)
  return fn()
}

const importGlobDefault = /\bimport\.meta\.globDefault(?:<\w+>)?\s*\(/g

const knownOptions = {
  as: ['string'],
  eager: ['boolean'],
  import: ['string'],
  exhaustive: ['boolean'],
  query: ['object', 'string'],
} as const

const importGlobKeys = (Object.keys(knownOptions)) as (keyof typeof knownOptions)[]

const windowsSlashRE = /\\/g
export function slash(p: string): string {
  return p.replace(windowsSlashRE, '/')
}

function VitePlugin(options: Options = {}): Plugin {
  let config: undefined | ResolvedConfig;
  return {
    name: `vite-plugin-import-glob-default`,

    enforce: 'pre',
    configResolved(resolvedConfig) {
      // store the resolved config
      config = resolvedConfig
    },
    transform(code: string, id: string) {
      // eslint-disable-next-line no-param-reassign
      id = slash(id);
      if (/node_modules/g.test(id)) return;
      logger.info(`transform id: ${id}`,)
      if (!code.includes('import.meta.globDefault')) return;

      const matches = Array.from(code.matchAll(importGlobDefault))
      const s = new MagicString(code);

      matches.forEach(match => {
        const ast = parseExpressionAt(code,
          match.index!, {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ranges: true,
        })

        const found = findNodeAt(ast, match.index, undefined, 'CallExpression');
        const node = found?.node as undefined | CallExpression;
        if (!node) return;

        const arg1 = node.arguments[0] as any
        const arg2 = node.arguments[1] as any

        const end = node!.range![1];

        let options: Record<string, any> = {
          import: 'default',

          // build mode default is eager true
          eager: config?.command === 'build',
        }

        if (arg2 && arg2.type === 'ObjectExpression') {
          const optionsStr = code.slice(arg2.range![0], arg2.range![1])
          const obj = evalValue(optionsStr);
          options = {
            ...pick(options, importGlobKeys),
            ...obj
          }
        }
        s.overwrite(match.index!, end, `${appendCodeName}(import.meta.glob(${JSON.stringify(arg1.value)},${JSON.stringify(options)}))`)
      })
      s.prepend(appendCode);

      return {
        code: s.toString(),
        map:
          config!.command === 'build' && config!.build.sourcemap
            ? s.generateMap({ hires: 'boundary', source: id })
            : null,
      }
    },
  };
}

export default VitePlugin;
