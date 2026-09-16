// FeraSetu Pro — Sandboxed Declarative Fera Functions Runtime
// =============================================================================
// STRICT SECURITY BOUNDARIES:
// - NO eval()
// - NO new Function()
// - NO arbitrary JavaScript execution
// - NO fetch() or outbound network access
// - NO filesystem, process, or environment access
// - NO raw D1 / database driver exposure
// - Execution limit: 5000 instructions max
// - Execution deadline: 1500 ms max
// - Input payload: 64 KB max
// - Output payload: 64 KB max
// - Maximum call depth: 16
// - Maximum nesting depth: 32
// =============================================================================

export const RUNTIME_LIMITS = {
  MAX_INSTRUCTIONS: 5000,
  EXECUTION_TIMEOUT_MS: 1500,
  MAX_INPUT_BYTES: 65536,
  MAX_OUTPUT_BYTES: 65536,
  MAX_CALL_DEPTH: 16,
  MAX_NESTING_DEPTH: 32,
};

export const OPERATION_CAPABILITIES = {
  'products.list': 'products.read',
  'products.get': 'products.read',
  'orders.get': 'orders.read',
  'orders.list': 'orders.read',
  'orders.create': 'orders.create',
  'customers.get': 'customers.read',
  'customers.update': 'customers.update',
  'customers.createInquiry': 'customers.inquiry.create',
  'auth.currentUser': 'auth.read',
  'auth.isAuthenticated': 'auth.read',
  'auth.requireAuth': 'auth.required',
  'pages.get': 'pages.read',
  'pages.list': 'pages.read',
  'routes.list': 'routes.read',
  'routes.match': 'routes.read',
  'email.send': 'email.send',
  'storage.get': 'storage.read',
  'storage.set': 'storage.write',
  'storage.delete': 'storage.write',
  'analytics.track': 'analytics.write',
};

const FORBIDDEN_IDENTIFIERS = new Set([
  'globalThis',
  'window',
  'document',
  'process',
  'env',
  'DB',
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
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'constructor',
  '__proto__',
  'prototype',
  'Proxy',
  'Reflect',
]);

export class FeraRuntimeError extends Error {
  constructor(message, code = "RUNTIME_ERROR", details = {}) {
    super(message);
    this.name = "FeraRuntimeError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Tokenizer for Fera Function syntax.
 */
export function tokenize(source) {
  if (typeof source !== 'string') {
    throw new FeraRuntimeError("Source code must be a string", "INVALID_SOURCE");
  }
  if (source.length > RUNTIME_LIMITS.MAX_INPUT_BYTES) {
    throw new FeraRuntimeError(`Source code exceeds size limit (${RUNTIME_LIMITS.MAX_INPUT_BYTES} bytes)`, "INPUT_TOO_LARGE");
  }

  const tokens = [];
  let i = 0;
  const len = source.length;

  while (i < len) {
    const c = source[i];

    // Whitespace
    if (/\s/.test(c)) {
      i++;
      continue;
    }

    // Single-line comment
    if (c === '/' && source[i + 1] === '/') {
      i += 2;
      while (i < len && source[i] !== '\n') i++;
      continue;
    }

    // Multi-line comment
    if (c === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < len && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(c)) {
      let numStr = "";
      while (i < len && /[0-9.]/.test(source[i])) {
        numStr += source[i];
        i++;
      }
      tokens.push({ type: 'Number', value: Number(numStr) });
      continue;
    }

    // Strings ('...' or "..." or `...`)
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      i++;
      let str = "";
      while (i < len && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < len) {
          str += source[i + 1];
          i += 2;
        } else {
          str += source[i];
          i++;
        }
      }
      if (i >= len) throw new FeraRuntimeError("Unterminated string literal", "SYNTAX_ERROR");
      i++; // Skip closing quote
      tokens.push({ type: 'String', value: str });
      continue;
    }

    // Identifiers & Keywords
    if (/[a-zA-Z_$]/.test(c)) {
      let ident = "";
      while (i < len && /[a-zA-Z0-9_$]/.test(source[i])) {
        ident += source[i];
        i++;
      }
      if (FORBIDDEN_IDENTIFIERS.has(ident)) {
        throw new FeraRuntimeError(`Forbidden identifier or access denied: ${ident}`, "SECURITY_VIOLATION");
      }
      if (ident === 'true') tokens.push({ type: 'Boolean', value: true });
      else if (ident === 'false') tokens.push({ type: 'Boolean', value: false });
      else if (ident === 'null') tokens.push({ type: 'Null', value: null });
      else if (ident === 'undefined') tokens.push({ type: 'Undefined', value: undefined });
      else tokens.push({ type: 'Identifier', value: ident });
      continue;
    }

    // Multi-char operators
    const twoChar = source.slice(i, i + 2);
    const threeChar = source.slice(i, i + 3);

    if (threeChar === '===' || threeChar === '!==') {
      tokens.push({ type: 'Operator', value: threeChar });
      i += 3;
      continue;
    }
    if (twoChar === '==' || twoChar === '!=' || twoChar === '<=' || twoChar === '>=' ||
        twoChar === '&&' || twoChar === '||' || twoChar === '??' || twoChar === '=>') {
      tokens.push({ type: 'Operator', value: twoChar });
      i += 2;
      continue;
    }

    // Single-char symbols & operators
    if ('{}()[].,;:+*-/%!<>?='.includes(c)) {
      tokens.push({ type: 'Punctuation', value: c });
      i++;
      continue;
    }

    throw new FeraRuntimeError(`Unexpected character in source: '${c}'`, "SYNTAX_ERROR");
  }

  return tokens;
}

/**
 * Parses tokens into a safe AST.
 */
export function parseFeraFunction(source) {
  const tokens = tokenize(source);
  let pos = 0;

  function peek() {
    return tokens[pos];
  }

  function consume(type, value) {
    const tok = tokens[pos];
    if (!tok) {
      throw new FeraRuntimeError(`Unexpected end of input, expected ${type || ''} ${value || ''}`, "SYNTAX_ERROR");
    }
    if (type && tok.type !== type) {
      throw new FeraRuntimeError(`Expected token type ${type}, got ${tok.type}`, "SYNTAX_ERROR");
    }
    if (value && tok.value !== value) {
      throw new FeraRuntimeError(`Expected token '${value}', got '${tok.value}'`, "SYNTAX_ERROR");
    }
    pos++;
    return tok;
  }

  function parsePrimary() {
    const tok = peek();
    if (!tok) throw new FeraRuntimeError("Unexpected end of expression", "SYNTAX_ERROR");

    if (tok.type === 'Number' || tok.type === 'String' || tok.type === 'Boolean' || tok.type === 'Null' || tok.type === 'Undefined') {
      pos++;
      return { type: 'Literal', value: tok.value };
    }

    if (tok.type === 'Identifier') {
      pos++;
      return { type: 'Identifier', name: tok.value };
    }

    // Parenthesized expression
    if (tok.type === 'Punctuation' && tok.value === '(') {
      consume('Punctuation', '(');
      const expr = parseExpression();
      consume('Punctuation', ')');
      return expr;
    }

    // Array literal [a, b, c]
    if (tok.type === 'Punctuation' && tok.value === '[') {
      consume('Punctuation', '[');
      const elements = [];
      while (pos < tokens.length && (peek().type !== 'Punctuation' || peek().value !== ']')) {
        elements.push(parseExpression());
        if (peek() && peek().type === 'Punctuation' && peek().value === ',') {
          consume('Punctuation', ',');
        } else {
          break;
        }
      }
      consume('Punctuation', ']');
      return { type: 'ArrayExpression', elements };
    }

    // Object literal { a: 1, "b": 2 }
    if (tok.type === 'Punctuation' && tok.value === '{') {
      consume('Punctuation', '{');
      const properties = [];
      while (pos < tokens.length && (peek().type !== 'Punctuation' || peek().value !== '}')) {
        let keyTok = peek();
        let key = "";
        if (keyTok.type === 'Identifier' || keyTok.type === 'String') {
          pos++;
          key = keyTok.value;
        } else {
          throw new FeraRuntimeError("Expected property name in object literal", "SYNTAX_ERROR");
        }

        if (FORBIDDEN_IDENTIFIERS.has(key)) {
          throw new FeraRuntimeError(`Forbidden property key: ${key}`, "SECURITY_VIOLATION");
        }

        // Shorthand or colon
        let val;
        if (peek() && peek().type === 'Punctuation' && peek().value === ':') {
          consume('Punctuation', ':');
          val = parseExpression();
        } else {
          val = { type: 'Identifier', name: key };
        }

        properties.push({ key, value: val });

        if (peek() && peek().type === 'Punctuation' && peek().value === ',') {
          consume('Punctuation', ',');
        } else {
          break;
        }
      }
      consume('Punctuation', '}');
      return { type: 'ObjectExpression', properties };
    }

    throw new FeraRuntimeError(`Unexpected token '${tok.value}'`, "SYNTAX_ERROR");
  }

  function parseMemberOrCall() {
    let expr = parsePrimary();

    while (pos < tokens.length) {
      const tok = peek();
      if (!tok || tok.type !== 'Punctuation') break;

      // Member access: .prop
      if (tok.value === '.') {
        consume('Punctuation', '.');
        const propTok = consume('Identifier');
        if (FORBIDDEN_IDENTIFIERS.has(propTok.value)) {
          throw new FeraRuntimeError(`Forbidden property access: ${propTok.value}`, "SECURITY_VIOLATION");
        }
        expr = { type: 'MemberExpression', object: expr, property: propTok.value, computed: false };
        continue;
      }

      // Computed member: [expr]
      if (tok.value === '[') {
        consume('Punctuation', '[');
        const propExpr = parseExpression();
        consume('Punctuation', ']');
        expr = { type: 'MemberExpression', object: expr, property: propExpr, computed: true };
        continue;
      }

      // Call: (arg1, arg2)
      if (tok.value === '(') {
        consume('Punctuation', '(');
        const args = [];
        while (pos < tokens.length && (peek().type !== 'Punctuation' || peek().value !== ')')) {
          args.push(parseExpression());
          if (peek() && peek().type === 'Punctuation' && peek().value === ',') {
            consume('Punctuation', ',');
          } else {
            break;
          }
        }
        consume('Punctuation', ')');
        expr = { type: 'CallExpression', callee: expr, arguments: args };
        continue;
      }

      break;
    }

    return expr;
  }

  function parseUnary() {
    const tok = peek();
    if (tok && ((tok.type === 'Punctuation' && (tok.value === '!' || tok.value === '-' || tok.value === '+')) ||
                (tok.type === 'Identifier' && tok.value === 'typeof'))) {
      pos++;
      const argument = parseUnary();
      return { type: 'UnaryExpression', operator: tok.value, argument };
    }
    return parseMemberOrCall();
  }

  function parseBinary(minPrec = 0) {
    const PRECEDENCE = {
      '||': 1, '??': 1,
      '&&': 2,
      '===': 3, '!==': 3, '==': 3, '!=': 3,
      '<': 4, '<=': 4, '>': 4, '>=': 4,
      '+': 5, '-': 5,
      '*': 6, '/': 6, '%': 6,
    };

    let left = parseUnary();

    while (pos < tokens.length) {
      const tok = peek();
      if (!tok || (tok.type !== 'Operator' && tok.type !== 'Punctuation')) break;

      const op = tok.value;
      const prec = PRECEDENCE[op];
      if (prec === undefined || prec < minPrec) break;

      pos++;
      const right = parseBinary(prec + 1);
      left = { type: 'BinaryExpression', operator: op, left, right };
    }

    return left;
  }

  function parseExpression() {
    // Ternary condition ? a : b
    const expr = parseBinary(0);
    const tok = peek();
    if (tok && tok.type === 'Punctuation' && tok.value === '?') {
      consume('Punctuation', '?');
      const consequent = parseExpression();
      consume('Punctuation', ':');
      const alternate = parseExpression();
      return { type: 'ConditionalExpression', test: expr, consequent, alternate };
    }
    if (tok && tok.type === 'Punctuation' && tok.value === '=') {
      consume('Punctuation', '=');
      const right = parseExpression();
      return { type: 'AssignmentExpression', left: expr, right };
    }
    return expr;
  }

  function parseStatement() {
    const tok = peek();
    if (!tok) return null;

    // Return statement
    if (tok.type === 'Identifier' && tok.value === 'return') {
      consume('Identifier', 'return');
      let argument = null;
      if (peek() && (peek().type !== 'Punctuation' || peek().value !== ';') &&
          (peek().type !== 'Punctuation' || peek().value !== '}')) {
        argument = parseExpression();
      }
      if (peek() && peek().type === 'Punctuation' && peek().value === ';') {
        consume('Punctuation', ';');
      }
      return { type: 'ReturnStatement', argument };
    }

    // Variable declaration: let x = ...; const y = ...;
    if (tok.type === 'Identifier' && (tok.value === 'let' || tok.value === 'const' || tok.value === 'var')) {
      const kind = tok.value;
      pos++;
      const idTok = consume('Identifier');
      if (FORBIDDEN_IDENTIFIERS.has(idTok.value)) {
        throw new FeraRuntimeError(`Forbidden variable name: ${idTok.value}`, "SECURITY_VIOLATION");
      }
      let init = null;
      if (peek() && peek().type === 'Punctuation' && peek().value === '=') {
        consume('Punctuation', '=');
        init = parseExpression();
      }
      if (peek() && peek().type === 'Punctuation' && peek().value === ';') {
        consume('Punctuation', ';');
      }
      return { type: 'VariableDeclaration', kind, name: idTok.value, init };
    }

    // If statement
    if (tok.type === 'Identifier' && tok.value === 'if') {
      consume('Identifier', 'if');
      consume('Punctuation', '(');
      const test = parseExpression();
      consume('Punctuation', ')');
      const consequent = parseStatement();
      let alternate = null;
      if (peek() && peek().type === 'Identifier' && peek().value === 'else') {
        consume('Identifier', 'else');
        alternate = parseStatement();
      }
      return { type: 'IfStatement', test, consequent, alternate };
    }

    // While statement
    if (tok.type === 'Identifier' && tok.value === 'while') {
      consume('Identifier', 'while');
      consume('Punctuation', '(');
      const test = parseExpression();
      consume('Punctuation', ')');
      const body = parseStatement();
      return { type: 'WhileStatement', test, body };
    }

    // Block statement { ... }
    if (tok.type === 'Punctuation' && tok.value === '{') {
      consume('Punctuation', '{');
      const body = [];
      while (pos < tokens.length && (peek().type !== 'Punctuation' || peek().value !== '}')) {
        const stmt = parseStatement();
        if (stmt) body.push(stmt);
      }
      consume('Punctuation', '}');
      return { type: 'BlockStatement', body };
    }

    // Expression statement
    const expr = parseExpression();
    if (peek() && peek().type === 'Punctuation' && peek().value === ';') {
      consume('Punctuation', ';');
    }
    return { type: 'ExpressionStatement', expression: expr };
  }

  // Check for outer function declaration
  let functionName = "anonymous";
  const params = [];
  let bodyNodes = [];

  const first = peek();
  if (first && first.type === 'Identifier' && first.value === 'function') {
    consume('Identifier', 'function');
    if (peek() && peek().type === 'Identifier') {
      functionName = consume('Identifier').value;
    }
    consume('Punctuation', '(');
    while (pos < tokens.length && (peek().type !== 'Punctuation' || peek().value !== ')')) {
      const pTok = consume('Identifier');
      params.push(pTok.value);
      if (peek() && peek().type === 'Punctuation' && peek().value === ',') {
        consume('Punctuation', ',');
      } else {
        break;
      }
    }
    consume('Punctuation', ')');
    const block = parseStatement();
    bodyNodes = block && block.body ? block.body : [block];
  } else {
    // Body of statements
    while (pos < tokens.length) {
      const stmt = parseStatement();
      if (stmt) bodyNodes.push(stmt);
    }
  }

  return {
    type: 'FeraFunction',
    name: functionName,
    params,
    body: bodyNodes,
  };
}

/**
 * Extracts all ferasetu.* or service.* API operations invoked in the AST.
 */
export function extractOperationsFromAST(ast) {
  const operations = new Set();

  function walk(node) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'CallExpression') {
      const callee = node.callee;
      if (callee && callee.type === 'MemberExpression') {
        // pattern: ferasetu.products.list(...) or products.list(...)
        const innerObj = callee.object;
        const method = callee.property;

        if (innerObj.type === 'Identifier') {
          // products.list
          operations.add(`${innerObj.name}.${method}`);
        } else if (innerObj.type === 'MemberExpression' && innerObj.object.type === 'Identifier' && innerObj.object.name === 'ferasetu') {
          // ferasetu.products.list
          operations.add(`${innerObj.property}.${method}`);
        }
      }
    }

    for (const key of Object.keys(node)) {
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) walk(item);
      } else if (child && typeof child === 'object') {
        walk(child);
      }
    }
  }

  walk(ast);
  return Array.from(operations);
}

/**
 * Extracts required capability strings from AST based on invoked operations.
 */
export function extractRequiredCapabilities(ast) {
  const operations = extractOperationsFromAST(ast);
  const caps = new Set();
  for (const op of operations) {
    if (OPERATION_CAPABILITIES[op]) {
      caps.add(OPERATION_CAPABILITIES[op]);
    }
  }
  return Array.from(caps);
}

/**
 * Safely executes a parsed Fera Function AST inside the controlled environment.
 *
 * @param {Object} ast - Parsed AST
 * @param {Object} args - Arguments object passed to function
 * @param {Object} sdk - Authorized ferasetu.* SDK object bound to tenant
 * @param {Array<string>} declaredCapabilities - Capabilities permitted for this function
 * @returns {Promise<any>} Execution result
 */
export async function executeFeraAST(ast, args = {}, sdk = {}, declaredCapabilities = []) {
  const startTime = Date.now();
  let instructionCount = 0;
  const capabilitySet = new Set(declaredCapabilities || []);

  const scope = {
    args,
    input: args,
    ferasetu: sdk,
    products: sdk.products,
    orders: sdk.orders,
    customers: sdk.customers,
    auth: sdk.auth,
    pages: sdk.pages,
    routes: sdk.routes,
    email: sdk.email,
    storage: sdk.storage,
    analytics: sdk.analytics,
    Math: {
      min: Math.min, max: Math.max, round: Math.round,
      floor: Math.floor, ceil: Math.ceil, abs: Math.abs,
    },
    JSON: {
      stringify: (v) => JSON.stringify(v),
      parse: (v) => JSON.parse(v),
    },
    Array: { isArray: Array.isArray },
    Object: {
      keys: (o) => (o && typeof o === 'object' ? Object.keys(o) : []),
      values: (o) => (o && typeof o === 'object' ? Object.values(o) : []),
      entries: (o) => (o && typeof o === 'object' ? Object.entries(o) : []),
    },
    String,
    Number,
    Boolean,
    Date: { now: () => Date.now() },
  };

  // Map parameter names to args
  if (ast.params && ast.params.length > 0) {
    if (Array.isArray(args)) {
      ast.params.forEach((paramName, idx) => {
        scope[paramName] = args[idx];
      });
    } else {
      ast.params.forEach((paramName) => {
        scope[paramName] = args[paramName] !== undefined ? args[paramName] : args;
      });
    }
  }

  function tick(depth = 0) {
    instructionCount++;
    if (instructionCount > RUNTIME_LIMITS.MAX_INSTRUCTIONS) {
      throw new FeraRuntimeError(
        `Instruction limit exceeded (max ${RUNTIME_LIMITS.MAX_INSTRUCTIONS})`,
        "INSTRUCTION_LIMIT_EXCEEDED"
      );
    }
    if (Date.now() - startTime > RUNTIME_LIMITS.EXECUTION_TIMEOUT_MS) {
      throw new FeraRuntimeError(
        `Execution timeout exceeded (${RUNTIME_LIMITS.EXECUTION_TIMEOUT_MS}ms)`,
        "TIMEOUT_EXCEEDED"
      );
    }
    if (depth > RUNTIME_LIMITS.MAX_NESTING_DEPTH) {
      throw new FeraRuntimeError("Maximum nesting depth exceeded", "CALL_DEPTH_EXCEEDED");
    }
  }

  async function evaluate(node, currentScope, depth = 0) {
    tick(depth);
    if (!node) return undefined;

    switch (node.type) {
      case 'Literal':
        return node.value;

      case 'Identifier':
        if (FORBIDDEN_IDENTIFIERS.has(node.name)) {
          throw new FeraRuntimeError(`Access to forbidden identifier: ${node.name}`, "SECURITY_VIOLATION");
        }
        if (node.name in currentScope) {
          return currentScope[node.name];
        }
        return undefined;

      case 'ArrayExpression': {
        const arr = [];
        for (const el of node.elements) {
          arr.push(await evaluate(el, currentScope, depth + 1));
        }
        return arr;
      }

      case 'ObjectExpression': {
        const obj = {};
        for (const prop of node.properties) {
          if (FORBIDDEN_IDENTIFIERS.has(prop.key)) {
            throw new FeraRuntimeError(`Forbidden property name: ${prop.key}`, "SECURITY_VIOLATION");
          }
          obj[prop.key] = await evaluate(prop.value, currentScope, depth + 1);
        }
        return obj;
      }

      case 'UnaryExpression': {
        const arg = await evaluate(node.argument, currentScope, depth + 1);
        if (node.operator === '!') return !arg;
        if (node.operator === '-') return -arg;
        if (node.operator === '+') return +arg;
        if (node.operator === 'typeof') return typeof arg;
        throw new FeraRuntimeError(`Unsupported unary operator: ${node.operator}`, "UNSUPPORTED_OPERATOR");
      }

      case 'BinaryExpression': {
        const l = await evaluate(node.left, currentScope, depth + 1);
        const r = await evaluate(node.right, currentScope, depth + 1);
        switch (node.operator) {
          case '+': return l + r;
          case '-': return l - r;
          case '*': return l * r;
          case '/': return r === 0 ? 0 : l / r;
          case '%': return l % r;
          case '===': return l === r;
          case '!==': return l !== r;
          case '==': return l == r;
          case '!=': return l != r;
          case '<': return l < r;
          case '<=': return l <= r;
          case '>': return l > r;
          case '>=': return l >= r;
          case '&&': return l && r;
          case '||': return l || r;
          case '??': return l !== null && l !== undefined ? l : r;
          default:
            throw new FeraRuntimeError(`Unsupported binary operator: ${node.operator}`, "UNSUPPORTED_OPERATOR");
        }
      }

      case 'ConditionalExpression': {
        const test = await evaluate(node.test, currentScope, depth + 1);
        return test
          ? await evaluate(node.consequent, currentScope, depth + 1)
          : await evaluate(node.alternate, currentScope, depth + 1);
      }

      case 'AssignmentExpression': {
        const val = await evaluate(node.right, currentScope, depth + 1);
        if (node.left.type === 'Identifier') {
          if (FORBIDDEN_IDENTIFIERS.has(node.left.name)) {
            throw new FeraRuntimeError(`Cannot assign to forbidden identifier: ${node.left.name}`, "SECURITY_VIOLATION");
          }
          currentScope[node.left.name] = val;
          return val;
        } else if (node.left.type === 'MemberExpression') {
          const target = await evaluate(node.left.object, currentScope, depth + 1);
          let prop = node.left.property;
          if (node.left.computed) {
            prop = await evaluate(node.left.property, currentScope, depth + 1);
          }
          if (typeof prop === 'string' && FORBIDDEN_IDENTIFIERS.has(prop)) {
            throw new FeraRuntimeError(`Forbidden property assignment: ${prop}`, "SECURITY_VIOLATION");
          }
          if (target && typeof target === 'object') {
            target[prop] = val;
          }
          return val;
        }
        throw new FeraRuntimeError("Invalid assignment target", "SYNTAX_ERROR");
      }

      case 'MemberExpression': {
        const target = await evaluate(node.object, currentScope, depth + 1);
        if (target === null || target === undefined) {
          return undefined;
        }

        let prop = node.property;
        if (node.computed) {
          prop = await evaluate(node.property, currentScope, depth + 1);
        }

        if (typeof prop === 'string' && FORBIDDEN_IDENTIFIERS.has(prop)) {
          throw new FeraRuntimeError(`Forbidden property access: ${prop}`, "SECURITY_VIOLATION");
        }

        const val = target[prop];
        // If it's a bound SDK or safe function, bind target
        if (typeof val === 'function') {
          return val.bind(target);
        }
        return val;
      }

      case 'CallExpression': {
        let fn = null;
        let operationKey = null;

        if (node.callee.type === 'MemberExpression') {
          const innerObj = node.callee.object;
          const propName = node.callee.property;

          if (innerObj.type === 'Identifier') {
            operationKey = `${innerObj.name}.${propName}`;
          } else if (innerObj.type === 'MemberExpression' && innerObj.object.type === 'Identifier' && innerObj.object.name === 'ferasetu') {
            operationKey = `${innerObj.property}.${propName}`;
          }

          // Capability verification
          if (operationKey && OPERATION_CAPABILITIES[operationKey]) {
            const requiredCap = OPERATION_CAPABILITIES[operationKey];
            if (!capabilitySet.has(requiredCap) && !capabilitySet.has('*')) {
              throw new FeraRuntimeError(
                `Operation '${operationKey}' requires capability '${requiredCap}' which was not declared for this function.`,
                "MISSING_CAPABILITY",
                { operation: operationKey, requiredCapability: requiredCap }
              );
            }
          }

          fn = await evaluate(node.callee, currentScope, depth + 1);
        } else {
          fn = await evaluate(node.callee, currentScope, depth + 1);
        }

        if (typeof fn !== 'function') {
          throw new FeraRuntimeError("Attempted to call a non-function", "INVALID_CALL");
        }

        const evaluatedArgs = [];
        for (const argNode of node.arguments) {
          evaluatedArgs.push(await evaluate(argNode, currentScope, depth + 1));
        }

        // Call the authorized function
        const callResult = await fn(...evaluatedArgs);
        return callResult;
      }

      case 'VariableDeclaration': {
        const val = node.init ? await evaluate(node.init, currentScope, depth + 1) : undefined;
        currentScope[node.name] = val;
        return undefined;
      }

      case 'ExpressionStatement': {
        return await evaluate(node.expression, currentScope, depth + 1);
      }

      case 'IfStatement': {
        const test = await evaluate(node.test, currentScope, depth + 1);
        if (test) {
          return await evaluate(node.consequent, currentScope, depth + 1);
        } else if (node.alternate) {
          return await evaluate(node.alternate, currentScope, depth + 1);
        }
        return undefined;
      }

      case 'WhileStatement': {
        while (await evaluate(node.test, currentScope, depth + 1)) {
          tick(depth);
          const res = await evaluate(node.body, currentScope, depth + 1);
          if (res && typeof res === 'object' && res.__isReturn) {
            return res;
          }
        }
        return undefined;
      }

      case 'BlockStatement': {
        for (const stmt of node.body) {
          const res = await evaluate(stmt, currentScope, depth + 1);
          if (res && typeof res === 'object' && res.__isReturn) {
            return res;
          }
        }
        return undefined;
      }

      case 'ReturnStatement': {
        const val = node.argument ? await evaluate(node.argument, currentScope, depth + 1) : null;
        return { __isReturn: true, value: val };
      }

      default:
        throw new FeraRuntimeError(`Unsupported AST node type: ${node.type}`, "UNSUPPORTED_NODE");
    }
  }

  // Execute function body statements
  let finalResult = null;
  for (const stmt of ast.body) {
    const res = await evaluate(stmt, scope, 0);
    if (res && typeof res === 'object' && res.__isReturn) {
      finalResult = res.value;
      break;
    }
    finalResult = res;
  }

  // Check output payload size
  const serialized = JSON.stringify(finalResult);
  if (serialized && serialized.length > RUNTIME_LIMITS.MAX_OUTPUT_BYTES) {
    throw new FeraRuntimeError(
      `Function output exceeded payload limit (${RUNTIME_LIMITS.MAX_OUTPUT_BYTES} bytes)`,
      "OUTPUT_TOO_LARGE"
    );
  }

  return finalResult;
}

/**
 * End-to-end execution of a Fera Function from source code or parsed definition.
 */
export async function executeFeraFunction({
  source,
  ast = null,
  args = {},
  sdk = {},
  capabilities = [],
}) {
  const parsedAst = ast || parseFeraFunction(source);
  return await executeFeraAST(parsedAst, args, sdk, capabilities);
}
