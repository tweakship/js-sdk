export type GetRemoteConfigResultType<T> = {
    name: string;
    value: T;
    loadedFrom: 'memoryCache' | 'server' | 'default';
    error?: Error;
};
