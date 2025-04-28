const { spawn } = require('child_process');

function extractCodeOnly(text) {
  const blocks = [];
  const re = /```(?:javascript)?\s*([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(text))) {
    blocks.push(m[1].trim());
  }
  return blocks.length ? blocks.join('\n\n') : text.trim();
}

async function generateTests(code) {
  const fnName = (code.match(/function\s+(\w+)/) || [])[1] || 'func';
  
  const prompt = `
You are an expert software engineer.

You will be given a JavaScript function. 
ONLY return clean **raw Jest** unit test code — no markdown, no extra text, no commentary.

📌 Rules:
- Import the function like: const { ${fnName} } = require('../testFile');
- Only generate the **test cases**.
- Include error tests if function throws (e.g., division by zero, missing params).
- Include edge cases: zero, negatives, large numbers, unexpected types if possible.
- Always use 'describe' and 'test' or 'it' structure.
- Format using 2-space indentation, clean style.

📚 Examples:

---

Function:
function add(a, b) {
  return a + b;
}

Generated:
const { add } = require('../testFile');

describe('add function', () => {
  test('adds positive numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('adds negative numbers', () => {
    expect(add(-2, -3)).toBe(-5);
  });

  test('adds zero', () => {
    expect(add(0, 5)).toBe(5);
  });
});

---

Function:
function divide(a, b) {
  if (b === 0) {
    throw new Error('Cannot divide by zero');
  }
  return a / b;
}

Generated:
const { divide } = require('../testFile');

describe('divide function', () => {
  test('divides two positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  test('throws error on division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Cannot divide by zero');
  });

  test('handles negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5);
    expect(divide(10, -2)).toBe(-5);
  });
});

---

Function:
function greet(name) {
  if (!name) throw new Error('Name required');
  return \`Hello, \${name}!\`;
}

Generated:
const { greet } = require('../testFile');

describe('greet function', () => {
  test('greets a valid name', () => {
    expect(greet('Alice')).toBe('Hello, Alice!');
  });

  test('throws error if name is missing', () => {
    expect(() => greet()).toThrow('Name required');
  });

  test('greets an empty string', () => {
    expect(greet('')).toBe('Hello, !');
  });
});

---

Now here is the real code to generate tests for:

${code}
  `.trim();

  return new Promise((resolve, reject) => {
    const proc = spawn('ollama', ['run', 'deepseek-coder:6.7b']);
    let out = '', err = '';

    proc.stdout.on('data', c => { out += c; console.log('📥 DeepSeek:', c.toString().trim()); });
    proc.stderr.on('data', c => { err += c; });
    proc.on('error', e => reject(e));
    proc.on('close', code => code === 0 ? resolve(extractCodeOnly(out)) : reject(new Error(err)));

    setTimeout(() => { proc.stdin.write(prompt); proc.stdin.end(); }, 200);
  });
}

module.exports = { generateTests };
