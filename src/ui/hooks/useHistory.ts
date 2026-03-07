import { useState, useCallback } from 'react';
import type { HistoryProvider, AgentAction } from '../../utils/historyProvider';

export function useHistory(historyProvider: HistoryProvider) {
    const [entries, setEntries] = useState<AgentAction[]>([]);
    const [filter, setFilter] = useState<string>('');

    const refresh = useCallback(() => {
        const all = historyProvider.getHistory();
        if (filter) {
            const f = filter.toLowerCase();
            setEntries(all.filter(e =>
                e.action.toLowerCase().includes(f) ||
                e.agentAddress.toLowerCase().includes(f) ||
                e.description.toLowerCase().includes(f)
            ));
        } else {
            setEntries(all);
        }
    }, [historyProvider, filter]);

    return { entries, filter, setFilter, refresh };
}
