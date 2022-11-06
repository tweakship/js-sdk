import { Result } from '@vladbasin/ts-result';
import { EvaluateRemoteConfigResponseType } from '../../src';

export const createResponse = (results: EvaluateRemoteConfigResponseType['data']['results']) =>
    Result.Ok<EvaluateRemoteConfigResponseType>({ data: { results } });
