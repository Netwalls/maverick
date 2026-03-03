import * as readline from 'readline';
import { exec } from 'child_process';
import { TerminalUtils } from './terminalUtils.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[36mMaverick Control> \x1b[0m'
});

async function welcome() {
    TerminalUtils.printMaverickLogo();
    TerminalUtils.printHeader('COMMAND CENTER SHELL');
    TerminalUtils.printInfo('Available Commands:');
    console.log(' - history <NAME|BANK>  : View action history');
    console.log(' - command <NAME> <ACT> : Dispatch signal (TRADE, BET, WITHDRAW)');
    console.log(' - invite <NAME>        : Onboard a new Maverick');
    console.log(' - help                 : Show this menu');
    console.log(' - exit                 : Close shell');
    console.log('--------------------------------------------------');
    rl.prompt();
}

rl.on('line', (line) => {
    const input = line.trim();
    if (!input) {
        rl.prompt();
        return;
    }
    const parts = input.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    if (!cmd) {
        rl.prompt();
        return;
    }

    switch (cmd.toLowerCase()) {
        case 'help':
            welcome();
            break;
        case 'history':
            run(`npm run history -- ${args.join(' ')}`);
            break;
        case 'command':
            run(`npm run command -- ${args.join(' ')}`);
            break;
        case 'invite':
            run(`npm run invite -- ${args.join(' ')}`);
            break;
        case 'exit':
            process.exit(0);
            break;
        case '':
            rl.prompt();
            break;
        default:
            TerminalUtils.printError(`Unknown command: ${cmd}`);
            rl.prompt();
            break;
    }
});

function run(command: string) {
    TerminalUtils.printStep('Shell', `Running: ${command}`);
    exec(command, (error, stdout, stderr) => {
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        rl.prompt();
    });
}

welcome();
