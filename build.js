const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("\n=============================================");
console.log("      Building All Tools from tools.json");
console.log("=============================================\n");

if (!fs.existsSync('tools.json')) {
    console.error("ERROR: tools.json not found!");
    process.exit(1);
}

const tools = JSON.parse(fs.readFileSync('tools.json', 'utf8'));
const buildDir = '.build';
let successCount = 0;
let failureCount = 0;
const failedTools = [];

// Clean and create .build directory
if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
}
fs.mkdirSync(buildDir);

tools.forEach(tool => {
    const toolId = tool.id;
    const toolName = tool.name;

    console.log("---------------------------------------------");
    console.log(`Building: ${toolName} (${toolId})`);

    const toolPath = path.resolve(toolId);

    if (!fs.existsSync(toolPath)) {
        console.log("  WARNING: Directory not found, skipping...");
        failureCount++;
        failedTools.push(toolName);
        return;
    }

    try {
        process.chdir(toolPath);

        if (!fs.existsSync('package.json')) {
            console.log("  No package.json found, skipping build...");
            successCount++;
            process.chdir('..'); // Go back up
            return;
        }

        console.log("  Installing dependencies...");
        let installCmd = 'npm install --silent';
        if (toolId === 'code-vision') {
            console.log("  (Using --legacy-peer-deps)");
            installCmd += ' --legacy-peer-deps';
        }

        // Redirecting stdio to ignore npm output noise unless it fails? 
        // For now let's just run it. Using stdio: 'inherit' would show output. 
        // The user wanted simple output.
        execSync(installCmd, { stdio: 'ignore' });

        console.log("  Building...");
        execSync('npm run build', { stdio: 'inherit' });

        console.log("  \x1b[32m✓ Build successful!\x1b[0m");

        // Copy artifacts
        const distPath = path.join(toolPath, 'dist');
        if (fs.existsSync(distPath)) {
            const destDir = path.join(__dirname, buildDir, toolId);
            fs.mkdirSync(destDir, { recursive: true });

            // Recursive copy
            fs.cpSync(distPath, destDir, { recursive: true });
            console.log(`  \x1b[32m✓ Artifacts copied to .build/${toolId}\x1b[0m`);
            successCount++;
        } else {
            console.log("  \x1b[33mWARNING: dist folder not found!\x1b[0m");
        }

    } catch (error) {
        console.error(`  \x1b[31m✗ Build failed: ${error.message}\x1b[0m`);
        failureCount++;
        failedTools.push(toolName);
    } finally {
        // Always return to root
        process.chdir(__dirname);
    }
    console.log("");
});

console.log("=============================================");
console.log("      Build Summary");
console.log(`Total: ${tools.length} | Success: ${successCount} | Failed: ${failureCount}`);

if (failedTools.length > 0) {
    console.log(`\x1b[31mFailed Tools: ${failedTools.join(', ')}\x1b[0m`);
    process.exit(1);
}
console.log("=============================================");
