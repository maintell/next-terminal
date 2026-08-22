import fileSystemApi from '@/api/filesystem-api';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import React, {createContext, useContext, useEffect, useRef, useState} from 'react';
import {UploadManager} from './upload-manager';
import {UploadTaskRecord} from './upload-types';

interface UploadManagerContextValue {
    manager: UploadManager;
    tasks: UploadTaskRecord[];
}

const UploadManagerContext = createContext<UploadManagerContextValue | null>(null);

function UploadProgressTracker({task}: {task: UploadTaskRecord}) {
    const context = useContext(UploadManagerContext);
    const progressQuery = useQuery({
        queryKey: ['filesystem-upload-task', task.fsId, task.id],
        queryFn: () => fileSystemApi.getUploadTask(task.fsId, task.id),
        enabled: task.status === 'transmitting' && task.serverInitialized,
        refetchInterval: 500,
        retry: 3,
    });

    useEffect(() => {
        if (context && progressQuery.data) {
            context.manager.applyRemoteTask(task.id, progressQuery.data);
        }
    }, [context?.manager, progressQuery.data, task.id]);

    useEffect(() => {
        if (context && progressQuery.isError) {
            context.manager.markRecoveredTaskInterrupted(task.id);
        }
    }, [context?.manager, progressQuery.isError, task.id]);

    return null;
}

export function UploadManagerProvider({children}: {children: React.ReactNode}) {
    const queryClient = useQueryClient();
    const managerRef = useRef<UploadManager | null>(null);
    if (!managerRef.current) {
        managerRef.current = new UploadManager();
    }
    const manager = managerRef.current;
    const [tasks, setTasks] = useState<UploadTaskRecord[]>([]);

    const createTaskMutation = useMutation({
        mutationFn: ({fsId, input}: {fsId: string; input: Parameters<typeof fileSystemApi.createUploadTask>[1]}) =>
            fileSystemApi.createUploadTask(fsId, input),
    });
    const cancelTaskMutation = useMutation({
        mutationFn: ({fsId, taskId}: {fsId: string; taskId: string}) =>
            fileSystemApi.cancelUploadTask(fsId, taskId),
    });
    const deleteTaskMutation = useMutation({
        mutationFn: ({fsId, taskId}: {fsId: string; taskId: string}) =>
            fileSystemApi.deleteUploadTask(fsId, taskId),
    });

    useEffect(() => manager.subscribe(setTasks), [manager]);

    useEffect(() => {
        manager.configure({
            createTask: (fsId, input) => createTaskMutation.mutateAsync({fsId, input}),
            cancelTask: (fsId, taskId) => cancelTaskMutation.mutateAsync({fsId, taskId}),
            deleteTask: (fsId, taskId) => deleteTaskMutation.mutateAsync({fsId, taskId}),
            uploadSucceeded: fsId => {
                void queryClient.invalidateQueries({queryKey: ['files', fsId]});
            },
        });
    }, [manager, queryClient, createTaskMutation.mutateAsync, cancelTaskMutation.mutateAsync, deleteTaskMutation.mutateAsync]);

    useEffect(() => {
        manager.syncAccount();
        const accountSyncTimer = window.setInterval(() => {
            if (manager.syncAccount()) {
                window.clearInterval(accountSyncTimer);
            }
        }, 1000);
        const cleanupTimer = window.setInterval(() => manager.cleanupExpired(), 60_000);
        return () => {
            window.clearInterval(accountSyncTimer);
            window.clearInterval(cleanupTimer);
        };
    }, [manager]);

    const value = {manager, tasks};
    return (
        <UploadManagerContext.Provider value={value}>
            {children}
            {tasks
                .filter(task => task.status === 'transmitting' && task.serverInitialized)
                .map(task => <UploadProgressTracker key={task.id} task={task}/>)}
        </UploadManagerContext.Provider>
    );
}

export function useUploadManager() {
    const context = useContext(UploadManagerContext);
    if (!context) {
        throw new Error('useUploadManager must be used within UploadManagerProvider');
    }
    return context;
}
