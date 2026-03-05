import { useState, useCallback } from 'react';
import * as fs from 'fs';
import * as path from 'path';

export interface FundingRequest {
    requester: string;
    requesterName: string;
    provider: string;
    providerName: string;
    amount: number;
    token: 'SOL' | 'USDC';
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    timestamp: string;
}

const GOV_PATH = path.join(process.cwd(), 'governance.json');

function readGovernance(): FundingRequest[] {
    if (!fs.existsSync(GOV_PATH)) return [];
    try {
        return JSON.parse(fs.readFileSync(GOV_PATH, 'utf8'));
    } catch {
        return [];
    }
}

function writeGovernance(data: FundingRequest[]) {
    fs.writeFileSync(GOV_PATH, JSON.stringify(data, null, 2));
}

export function useGovernance() {
    const [requests, setRequests] = useState<FundingRequest[]>(readGovernance);

    const refresh = useCallback(() => {
        setRequests(readGovernance());
    }, []);

    const approve = useCallback((index: number) => {
        const data = readGovernance();
        if (data[index]) {
            data[index]!.status = 'APPROVED';
            writeGovernance(data);
            setRequests([...data]);
        }
    }, []);

    const reject = useCallback((index: number) => {
        const data = readGovernance();
        if (data[index]) {
            data[index]!.status = 'REJECTED';
            writeGovernance(data);
            setRequests([...data]);
        }
    }, []);

    const addRequest = useCallback((req: Omit<FundingRequest, 'status' | 'timestamp'>) => {
        const data = readGovernance();
        data.push({
            ...req,
            status: 'PENDING',
            timestamp: new Date().toISOString(),
        });
        writeGovernance(data);
        setRequests([...data]);
    }, []);

    const pending = requests.filter(r => r.status === 'PENDING');

    return { requests, pending, refresh, approve, reject, addRequest };
}
