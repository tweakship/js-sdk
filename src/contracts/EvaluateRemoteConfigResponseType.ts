import { RemoteConfigValueTypeNames } from './RemoteConfigValueTypeNames';

export type EvaluateRemoteConfigResponseType = {
    data: {
        results: {
            name: string;
            value: string;
            valueType: RemoteConfigValueTypeNames;
        }[];
    };
};
