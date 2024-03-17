# vite-plugin-import-glob-default

> description: import eager in build, import lazy in dev

## Usage

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
