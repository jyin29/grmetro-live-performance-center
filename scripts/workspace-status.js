const [workspace, command] = process.argv.slice(2);

if (!workspace || !command) {
  console.error("Usage: node scripts/workspace-status.js <workspace> <command>");
  process.exitCode = 1;
} else if (command === "start" || command === "dev") {
  console.error(
    `${workspace} has been scaffolded, but its runtime is not implemented yet. ` +
      "Continue with the applicable phase in docs/TASKS.md."
  );
  process.exitCode = 1;
} else {
  console.log(`${workspace}: no ${command} work is required in the foundation phase.`);
}
