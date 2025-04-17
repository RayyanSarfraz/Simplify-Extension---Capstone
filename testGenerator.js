const { spawn } = require('child_process');

async function generateTests(code) {
  return new Promise((resolve, reject) => {
    const prompt = `Write JavaScript unit tests for the following code:\n\n${code}`;
    console.log("🧠 Sending to Ollama:\n", prompt);

    const ollama = spawn('ollama', ['run', 'deepseek-coder']);

    let output = '';
    let errorOutput = '';

    // Capture output from Ollama
    ollama.stdout.on('data', (data) => {
      const text = data.toString();
      console.log("📥 Ollama stream:", text.trim());
      output += text; // Append data to the output buffer
    });

    // Capture stderr
    ollama.stderr.on('data', (data) => {
      const err = data.toString().replace(/\u001b\[\?2026l/g, '').trim();
      console.warn("⚠️ Ollama stderr:", err);
      errorOutput += err;
    });

    // Handle errors
    ollama.on('error', (err) => {
      console.error("🚨 Failed to start Ollama process:", err);
      reject(new Error("Ollama process failed to start."));
    });

    // When Ollama finishes
    ollama.on('close', (code) => {
      if (code !== 0) {
        console.error(`🚨 Ollama exited with code ${code}`);
        return reject(new Error(errorOutput || "Ollama failed to generate tests."));
      }

      const finalOutput = output.trim();
      if (!finalOutput) {
        return reject(new Error("No output received from Ollama."));
      }

      console.log("✅ Final Output:\n", finalOutput);
      resolve(finalOutput);
    });

    // Wait for a short delay before writing to stdin
    setTimeout(() => {
      ollama.stdin.write(prompt);
      ollama.stdin.end(); // Signal end of input
    }, 1000); // Adjust delay as needed
  });
}

module.exports = { generateTests };
