import * as fs from 'fs';
import * as path from 'path';
import { TerminalUtils } from './terminalUtils';

interface Signal {
    agentName: string;
    action: string;
    target?: string;
    timestamp: string;
}

function sendSignal(name: string, action: string, target?: string) {
    if (!name || !action) {
        TerminalUtils.printError('Usage: npm run command -- <NAME> <ACTION> [TARGET]');
        TerminalUtils.printAdvice('Example: npm run command -- Ben trade');
        process.exit(1);
    }

    const signalsPath = path.join(process.cwd(), 'signals.json');
    let signals: Signal[] = [];

    if (fs.existsSync(signalsPath)) {
        try {
            signals = JSON.parse(fs.readFileSync(signalsPath, 'utf8'));
        } catch (e) {
            signals = [];
        }
    }

    // Filter out old signals for this agent
    signals = signals.filter(s => s.agentName.toLowerCase() !== name.toLowerCase());

    const signal: Signal = {
        agentName: name,
        action: action.toUpperCase(),
        timestamp: new Date().toISOString()
    };

    if (target) {
        signal.target = target;
    }

    signals.push(signal);

    fs.writeFileSync(signalsPath, JSON.stringify(signals, null, 2));

    TerminalUtils.printHeader('Signal Sent');
    TerminalUtils.printSuccess(`Signal '${action.toUpperCase()}' dispatched to Maverick '${name}'.`);
    TerminalUtils.printAdvice('The agent will pick up this command in its next cycle.');
    TerminalUtils.printFooter();
}

const args = process.argv.slice(2);
sendSignal(args[0] || '', args[1] || '', args[2]);
