import assert from 'node:assert/strict';
import {
  parseFeraFunction,
  executeFeraFunction,
  RUNTIME_LIMITS,
  FeraRuntimeError,
  tokenize
} from '../worker/sandbox/feraRuntime.js';

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    console.error(`  ❌ ${name}:`, err.message);
  }
}

console.log('\n--- 2. Testing Fera Functions Sandbox & Security Layer ---');

await test('Tokenizer blocks dangerous execution primitives (eval, Function, fetch)', () => {
  const forbiddenKeywords = [
    'eval',
    'Function',
    'AsyncFunction',
    'GeneratorFunction',
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'Worker',
    'import',
    'require',
    'process',
    'env',
    'DB',
    'globalThis',
    'window',
    'document',
    'setTimeout',
    'setInterval',
    'setImmediate'
  ];

  for (const kw of forbiddenKeywords) {
    assert.throws(
      () => tokenize(`let bad = ${kw};`),
      (err) => {
        assert.equal(err.code, 'SECURITY_VIOLATION');
        assert.ok(err.message.includes(kw));
        return true;
      },
      `Expected ${kw} to be blocked by tokenizer`
    );
  }
});

await test('Tokenizer and Runtime block prototype pollution / constructor traversal', async () => {
  // Direct identifier access
  assert.throws(
    () => tokenize('let p = obj.__proto__;'),
    (err) => err.code === 'SECURITY_VIOLATION'
  );
  assert.throws(
    () => tokenize('let c = obj.constructor;'),
    (err) => err.code === 'SECURITY_VIOLATION'
  );
  assert.throws(
    () => tokenize('let proto = fn.prototype;'),
    (err) => err.code === 'SECURITY_VIOLATION'
  );

  // Computed property access attempts
  await assert.rejects(
    async () => {
      await executeFeraFunction({
        source: `
          let key = "__proto__";
          let obj = {};
          let leaked = obj[key];
          return leaked;
        `,
        capabilities: ['*']
      });
    },
    (err) => {
      assert.equal(err.code, 'SECURITY_VIOLATION');
      assert.ok(err.message.includes('__proto__'));
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await executeFeraFunction({
        source: `
          let key = "constructor";
          let obj = {};
          let leaked = obj[key];
          return leaked;
        `,
        capabilities: ['*']
      });
    },
    (err) => {
      assert.equal(err.code, 'SECURITY_VIOLATION');
      assert.ok(err.message.includes('constructor'));
      return true;
    }
  );
});

await test('Enforces maximum input payload size (64 KB)', () => {
  const giantInput = 'let x = 1;\n'.repeat(6000); // > 65536 bytes
  assert.ok(giantInput.length > RUNTIME_LIMITS.MAX_INPUT_BYTES);

  assert.throws(
    () => parseFeraFunction(giantInput),
    (err) => {
      assert.equal(err.code, 'INPUT_TOO_LARGE');
      return true;
    }
  );
});

await test('Enforces instruction limit (5000 steps) on infinite loops', async () => {
  const infiniteLoop = `
    let i = 0;
    while (i < 100000) {
      i = i + 1;
    }
    return i;
  `;

  await assert.rejects(
    async () => {
      await executeFeraFunction({
        source: infiniteLoop,
        capabilities: ['*']
      });
    },
    (err) => {
      assert.equal(err.code, 'INSTRUCTION_LIMIT_EXCEEDED');
      return true;
    }
  );
});

await test('Enforces maximum output payload size (64 KB)', async () => {
  const outputBloat = `
    let str = "abcdefghij";
    let i = 0;
    while (i < 13) {
      str = str + str;
      i = i + 1;
    }
    return str;
  `;

  await assert.rejects(
    async () => {
      await executeFeraFunction({
        source: outputBloat,
        capabilities: ['*']
      });
    },
    (err) => {
      assert.equal(err.code, 'OUTPUT_TOO_LARGE');
      return true;
    }
  );
});

await test('Safe standard computation executes cleanly without host pollution', async () => {
  const code = `
    let a = 10;
    let b = 25;
    let sum = a + b;
    let rounded = Math.round(sum * 1.05);
    let arr = [1, 2, 3];
    return { sum: sum, rounded: rounded, count: arr.length };
  `;

  const result = await executeFeraFunction({
    source: code,
    capabilities: ['*']
  });

  assert.deepEqual(result, {
    sum: 35,
    rounded: 37,
    count: 3
  });
});

await test('Sandbox environment does not expose host process or global objects', async () => {
  // Verify that neither process, globalThis, nor require are available in the scope
  const code = `
    let hasProcess = (typeof process !== 'undefined');
    return hasProcess;
  `;

  // Tokenizer rejects `process` keyword
  assert.throws(
    () => parseFeraFunction(code),
    (err) => {
      assert.equal(err.code, 'SECURITY_VIOLATION');
      return true;
    }
  );
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
