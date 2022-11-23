import { EvaluateRemoteConfigErrorType } from './EvaluateRemoteConfigErrorType';

export type GetRemoteConfigResultType<T> = {
    name: string;
    value: T;
    loadedFrom: 'memoryCache' | 'server' | 'default';
    error?: EvaluateRemoteConfigErrorType;
};
