# vite-plugin-import-glob-default

> provide a way to config module usage

## Usage

### Setting case

```typescript
import Plugin from 'vite-plugin-import-glob-default';

Plugin({
  eagerMode: 'all' | 'none' | 'build',
});
// build => eager = true when in build mode, eager = false when in dev mode
// all => eager = true always
// none => eager = false always

import.meta.globalDefault('./module.ts', { always: 'dynamic' | 'eager' });

// always: 'dynamic' => always use dynamic import
// always: 'eager' => always use eager import
```

### Principle

```typescript
import.meta.globDefault('a file path', config);

// => transform to

function __vite_get_path_dynamic_default(modules) {
  const [[key, value]] = Object.entries(modules);
  return modules[key];
}

// config default { import: 'default', eager: config.command === 'build' }
__vite_get_path_dynamic_default(import.meta.glob('a file path', config));
```

## Try it now

## LICENSE

[MIT](./LICENSE) License © 2022 [zwkang](https://github.com/zwkang)
