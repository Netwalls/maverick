import * as fs from 'fs';
import * as path from 'path';

export interface AgentAction {
    timestamp: string;
    agentAddress: string;
    action: string;
    description: string;
    signature?: string;
    reasoning?: string;
}

export class HistoryProvider {
    private historyPath: string;

    constructor(basePath: string) {
        this.historyPath = path.join(basePath, 'history.json');
        if (!fs.existsSync(this.historyPath)) {
            fs.writeFileSync(this.historyPath, JSON.stringify([], null, 2));
        }
    }

    public async recordAction(action: AgentAction): Promise<void> {
        const history = JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
        history.push(action);
        fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2));
        console.log(`[History] Action recorded: ${action.action}`);
    }

    public getHistory(): AgentAction[] {
        return JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
    }
}
