import { Project, SyntaxKind } from "ts-morph";
import { writeFileSync, mkdirSync } from "fs";

const project = new Project({
  tsConfigFilePath: "./tsconfig.json",
});

const functionCalls = new Map(); // Map<callerFunction, Set<calledFunctions>>
const functionDefinitions = new Map(); // Map<functionName, filePath>

// Create output directory
const outputDir = "codemap-output";
mkdirSync(outputDir, { recursive: true });

// Add source files
project.addSourceFilesAtPaths("src/**/*.{ts,vue,jsx,js}");

const sourceFiles = project.getSourceFiles();

console.log(`Analyzing ${sourceFiles.length} files...`);

sourceFiles.forEach((sourceFile) => {
  const filePath = sourceFile.getFilePath().replace(/\\/g, "/");

  // Get all function declarations
  sourceFile.getFunctions().forEach((func) => {
    const funcName = func.getName();
    if (funcName) {
      functionDefinitions.set(funcName, filePath);

      // Find function calls within this function
      const callExpressions = func.getDescendantsOfKind(
        SyntaxKind.CallExpression
      );
      const calls = new Set();

      callExpressions.forEach((call) => {
        const expr = call.getExpression();
        let calledName = null;

        if (expr.getKind() === SyntaxKind.Identifier) {
          calledName = expr.getText();
        } else if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
          calledName = expr.getText();
        }

        if (calledName) {
          calls.add(calledName);
        }
      });

      if (calls.size > 0) {
        functionCalls.set(funcName, calls);
      }
    }
  });

  // Get arrow functions assigned to variables/constants
  sourceFile.getVariableDeclarations().forEach((varDecl) => {
    const initializer = varDecl.getInitializer();
    if (
      initializer &&
      (initializer.getKind() === SyntaxKind.ArrowFunction ||
        initializer.getKind() === SyntaxKind.FunctionExpression)
    ) {
      const funcName = varDecl.getName();
      functionDefinitions.set(funcName, filePath);

      const callExpressions = initializer.getDescendantsOfKind(
        SyntaxKind.CallExpression
      );
      const calls = new Set();

      callExpressions.forEach((call) => {
        const expr = call.getExpression();
        let calledName = null;

        if (expr.getKind() === SyntaxKind.Identifier) {
          calledName = expr.getText();
        } else if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
          calledName = expr.getText();
        }

        if (calledName) {
          calls.add(calledName);
        }
      });

      if (calls.size > 0) {
        functionCalls.set(funcName, calls);
      }
    }
  });

  // Get methods from classes
  sourceFile.getClasses().forEach((cls) => {
    const className = cls.getName();
    cls.getMethods().forEach((method) => {
      const methodName = method.getName();
      const fullName = `${className}.${methodName}`;
      functionDefinitions.set(fullName, filePath);

      const callExpressions = method.getDescendantsOfKind(
        SyntaxKind.CallExpression
      );
      const calls = new Set();

      callExpressions.forEach((call) => {
        const expr = call.getExpression();
        let calledName = null;

        if (expr.getKind() === SyntaxKind.Identifier) {
          calledName = expr.getText();
        } else if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
          calledName = expr.getText();
        }

        if (calledName) {
          calls.add(calledName);
        }
      });

      if (calls.size > 0) {
        functionCalls.set(fullName, calls);
      }
    });
  });
});

console.log(`Found ${functionDefinitions.size} functions`);
console.log(`Found ${functionCalls.size} functions with calls`);

// Generate DOT format for Graphviz
let dot = "digraph FunctionCalls {\n";
dot += "  rankdir=LR;\n";
dot += "  node [shape=box, style=rounded];\n\n";

// Add nodes with file info
functionDefinitions.forEach((filePath, funcName) => {
  const shortPath = filePath.split("/src/")[1] || filePath;
  const label = `${funcName}\\n(${shortPath})`;
  dot += `  "${funcName}" [label="${label}"];\n`;
});

dot += "\n";

// Add edges (function calls)
functionCalls.forEach((calledFuncs, callerFunc) => {
  calledFuncs.forEach((calledFunc) => {
    // Only include edges where the called function is defined in our codebase
    if (functionDefinitions.has(calledFunc)) {
      dot += `  "${callerFunc}" -> "${calledFunc}";\n`;
    }
  });
});

dot += "}\n";

// Save DOT file
writeFileSync(`${outputDir}/function-calls.dot`, dot);
console.log(`\nGenerated ${outputDir}/function-calls.dot`);
console.log(
  `To generate SVG, run: dot -Tsvg ${outputDir}/function-calls.dot -o ${outputDir}/function-calls.svg`
);
console.log(
  `To generate PNG, run: dot -Tpng ${outputDir}/function-calls.dot -o ${outputDir}/function-calls.png`
);

// Generate summary report
let report = "# Function Call Analysis\n\n";
report += `Total functions found: ${functionDefinitions.size}\n`;
report += `Functions with outgoing calls: ${functionCalls.size}\n\n`;

report += "## Top 10 Functions by Outgoing Calls\n\n";
const sorted = Array.from(functionCalls.entries())
  .sort((a, b) => b[1].size - a[1].size)
  .slice(0, 10);

sorted.forEach(([func, calls]) => {
  report += `- **${func}**: ${calls.size} calls\n`;
});

report += "\n## Functions Called Most Frequently\n\n";
const callCount = new Map();
functionCalls.forEach((calledFuncs) => {
  calledFuncs.forEach((func) => {
    callCount.set(func, (callCount.get(func) || 0) + 1);
  });
});

const mostCalled = Array.from(callCount.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

mostCalled.forEach(([func, count]) => {
  report += `- **${func}**: called ${count} times\n`;
});

writeFileSync(`${outputDir}/function-analysis-report.md`, report);
console.log(`Generated ${outputDir}/function-analysis-report.md`);
