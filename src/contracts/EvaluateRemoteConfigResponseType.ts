import { EvaluateRemoteConfigErrorType } from './EvaluateRemoteConfigErrorType';
import { RemoteConfigValueTypeNames } from './RemoteConfigValueTypeNames';

export type EvaluateRemoteConfigSuccessResultType = {
    status: 'success';
    valueType: RemoteConfigValueTypeNames;
    value: string;
};

export type EvaluateRemoteConfigErrorResultType = {
    status: 'fail';
    error: EvaluateRemoteConfigErrorType;
};

export type EvaluateRemoteConfigResultType = (
    | EvaluateRemoteConfigSuccessResultType
    | EvaluateRemoteConfigErrorResultType
) & {
    name: string;
};

export type EvaluateRemoteConfigResponseType = {
    data: {
        results: EvaluateRemoteConfigResultType[];
    };
};
