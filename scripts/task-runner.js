#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TaskRunner {
  constructor() {
    this.rootDir = process.cwd();
    this.tasksDir = this.rootDir;
  }

  // Get all task files
  getTaskFiles() {
    const files = fs.readdirSync(this.rootDir);
    return files.filter((file) => file.match(/^TASK_\d+_.*\.md$/));
  }

  // Parse task number from filename
  getTaskNumber(filename) {
    const match = filename.match(/^TASK_(\d+)_/);
    return match ? parseInt(match[1]) : null;
  }

  // Get task type (SPECIFICATION, PROGRESS, COMPLETION_SUMMARY)
  getTaskType(filename) {
    if (filename.includes('SPECIFICATION')) return 'SPECIFICATION';
    if (filename.includes('PROGRESS')) return 'PROGRESS';
    if (filename.includes('COMPLETION_SUMMARY')) return 'COMPLETION_SUMMARY';
    return 'UNKNOWN';
  }

  // List all available tasks
  listTasks() {
    const taskFiles = this.getTaskFiles();
    const tasks = {};

    taskFiles.forEach((file) => {
      const taskNum = this.getTaskNumber(file);
      const taskType = this.getTaskType(file);

      if (!tasks[taskNum]) {
        tasks[taskNum] = {};
      }
      tasks[taskNum][taskType] = file;
    });

    console.log('\n📋 Available Tasks:\n');
    Object.keys(tasks)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((taskNum) => {
        const task = tasks[taskNum];
        console.log(`Task ${taskNum}:`);

        if (task.SPECIFICATION) {
          const title = this.getTaskTitle(task.SPECIFICATION);
          console.log(`  📝 Specification: ${title}`);
        }

        if (task.PROGRESS) {
          const progress = this.getTaskProgress(task.PROGRESS);
          console.log(`  📊 Progress: ${progress}%`);
        }

        if (task.COMPLETION_SUMMARY) {
          console.log(`  ✅ Status: Completed`);
        } else {
          console.log(`  🔄 Status: In Progress`);
        }

        console.log(`  🚀 Start: npm run task:start ${taskNum}`);
        console.log(`  📈 Progress: npm run task:progress ${taskNum}`);
        console.log(`  📋 Summary: npm run task:summary ${taskNum}`);
        console.log('');
      });
  }

  // Get task title from specification file
  getTaskTitle(specFile) {
    try {
      const content = fs.readFileSync(
        path.join(this.rootDir, specFile),
        'utf8'
      );
      const match = content.match(/^# Task \d+: (.+)$/m);
      return match ? match[1] : 'Unknown Task';
    } catch (error) {
      return 'Unknown Task';
    }
  }

  // Get task progress from progress file
  getTaskProgress(progressFile) {
    try {
      const content = fs.readFileSync(
        path.join(this.rootDir, progressFile),
        'utf8'
      );
      const match = content.match(/## 📊 Overall Progress: (\d+)%/);
      return match ? match[1] : '0';
    } catch (error) {
      return '0';
    }
  }

  // Start a specific task
  startTask(taskNumber) {
    const taskFiles = this.getTaskFiles();
    const specFile = taskFiles.find(
      (f) =>
        this.getTaskNumber(f) === parseInt(taskNumber) &&
        this.getTaskType(f) === 'SPECIFICATION'
    );

    const progressFile = taskFiles.find(
      (f) =>
        this.getTaskNumber(f) === parseInt(taskNumber) &&
        this.getTaskType(f) === 'PROGRESS'
    );

    if (!specFile) {
      console.error(`❌ Task ${taskNumber} specification not found!`);
      process.exit(1);
    }

    console.log(`🚀 Starting Task ${taskNumber}...\n`);

    // Display task overview
    this.displayTaskOverview(specFile);

    // Create or update progress file
    if (!progressFile) {
      this.createProgressFile(taskNumber);
    }

    // Open relevant files in editor (if available)
    this.openTaskFiles(taskNumber);

    console.log(`\n✅ Task ${taskNumber} environment ready!`);
    console.log(`📝 Edit: ${specFile}`);
    console.log(`📊 Track: TASK_${taskNumber}_PROGRESS.md`);
    console.log(`🔄 Update progress: npm run task:progress ${taskNumber}`);
  }

  // Display task overview
  displayTaskOverview(specFile) {
    try {
      const content = fs.readFileSync(
        path.join(this.rootDir, specFile),
        'utf8'
      );

      // Extract title
      const titleMatch = content.match(/^# (.+)$/m);
      if (titleMatch) {
        console.log(`📋 ${titleMatch[1]}\n`);
      }

      // Extract objectives
      const objectivesMatch = content.match(
        /### Primary Goals\n([\s\S]*?)(?=###|##|$)/
      );
      if (objectivesMatch) {
        console.log('🎯 Primary Goals:');
        const goals = objectivesMatch[1].match(/- \[ \] (.+)/g);
        if (goals) {
          goals.forEach((goal) => {
            console.log(`  • ${goal.replace('- [ ] ', '')}`);
          });
        }
        console.log('');
      }
    } catch (error) {
      console.log('Could not read task specification');
    }
  }

  // Create progress file for a task
  createProgressFile(taskNumber) {
    const progressFile = `TASK_${taskNumber}_PROGRESS.md`;
    const progressContent = `# Task ${taskNumber} Progress Tracker

## 📊 Overall Progress: 0%

### ✅ Completed
- [ ] Task specification reviewed
- [ ] Development environment set up
- [ ] Initial planning complete

### 🔄 In Progress
- [ ] [Current work item]

### ⏳ Pending
- [ ] [Next work items]

## 📝 Daily Log

### ${new Date().toISOString().split('T')[0]} - Day 1
- **Work Done**: Started Task ${taskNumber}
- **Challenges**: [Any challenges encountered]
- **Next Steps**: [What to do next]
- **Time Spent**: [Hours worked]

## 🐛 Issues & Blockers

### Active Issues
- [ ] Issue 1: [Description and status]

### Resolved Issues
- [x] ~~Example resolved issue~~

## 🔗 Related Resources

- **Specification**: TASK_${taskNumber}_SPECIFICATION.md
- **Related PRs**: [Links to pull requests]
- **Documentation**: [Links to relevant docs]
- **References**: [External resources used]

## 🚀 Quick Commands

\`\`\`bash
# Update progress
npm run task:progress ${taskNumber}

# View task summary
npm run task:summary ${taskNumber}

# List all tasks
npm run task:list

# Run tests
npm test

# Build project
npm run build
\`\`\`
`;

    fs.writeFileSync(path.join(this.rootDir, progressFile), progressContent);
    console.log(`📊 Created progress tracker: ${progressFile}`);
  }

  // Open task files (if editor is available)
  openTaskFiles(taskNumber) {
    const taskFiles = this.getTaskFiles().filter(
      (f) => this.getTaskNumber(f) === parseInt(taskNumber)
    );

    // Try to open in VS Code if available
    try {
      taskFiles.forEach((file) => {
        try {
          execSync(`code "${file}"`, { stdio: 'ignore' });
        } catch (error) {
          // Ignore if code command not available
        }
      });
    } catch (error) {
      // Editor not available, that's fine
    }
  }

  // Show task progress
  showProgress(taskNumber) {
    const progressFile = `TASK_${taskNumber}_PROGRESS.md`;

    if (!fs.existsSync(path.join(this.rootDir, progressFile))) {
      console.error(`❌ Progress file for Task ${taskNumber} not found!`);
      process.exit(1);
    }

    try {
      const content = fs.readFileSync(
        path.join(this.rootDir, progressFile),
        'utf8'
      );
      console.log(content);
    } catch (error) {
      console.error(`❌ Could not read progress file: ${error.message}`);
    }
  }

  // Show task summary
  showSummary(taskNumber) {
    const summaryFile = `TASK_${taskNumber}_COMPLETION_SUMMARY.md`;

    if (!fs.existsSync(path.join(this.rootDir, summaryFile))) {
      console.log(`📋 Task ${taskNumber} is not yet completed.`);
      console.log(`📊 Check progress: npm run task:progress ${taskNumber}`);
      return;
    }

    try {
      const content = fs.readFileSync(
        path.join(this.rootDir, summaryFile),
        'utf8'
      );
      console.log(content);
    } catch (error) {
      console.error(`❌ Could not read summary file: ${error.message}`);
    }
  }
}

// CLI Interface
const args = process.argv.slice(2);
const command = args[0];
const taskNumber = args[1];

const runner = new TaskRunner();

switch (command) {
  case 'list':
    runner.listTasks();
    break;

  case 'start':
    if (!taskNumber) {
      console.error(
        '❌ Please specify a task number: npm run task:start <number>'
      );
      process.exit(1);
    }
    runner.startTask(taskNumber);
    break;

  case 'progress':
    if (!taskNumber) {
      console.error(
        '❌ Please specify a task number: npm run task:progress <number>'
      );
      process.exit(1);
    }
    runner.showProgress(taskNumber);
    break;

  case 'summary':
    if (!taskNumber) {
      console.error(
        '❌ Please specify a task number: npm run task:summary <number>'
      );
      process.exit(1);
    }
    runner.showSummary(taskNumber);
    break;

  default:
    console.log(`
🚀 Task Runner - Kairos Church Management System

Usage:
  npm run task:list              List all available tasks
  npm run task:start <number>    Start working on a specific task
  npm run task:progress <number> Show progress for a task
  npm run task:summary <number>  Show completion summary for a task

Examples:
  npm run task:list              # Show all tasks
  npm run task:start 17          # Start Task 17
  npm run task:progress 17       # Show Task 17 progress
  npm run task:summary 16        # Show Task 16 completion summary
`);
}
