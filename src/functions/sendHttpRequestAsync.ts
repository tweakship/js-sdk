import { Result } from '@vladbasin/ts-result';
import axios from 'axios';
import { RemoteConfigClientError } from '../contracts';

export const sendHttpRequestAsync = <T>(url: string, body: unknown) => {
    return Result.FromPromise(axios.post<T>(url, body))
        .onFailureCompensateWithError((error) =>
            Result.FailWithError(
                new RemoteConfigClientError(`Cannot fetch remote config because server error: ${error.message}`)
            )
        )
        .ensureWithError(
            (t) => t.status === 200,
            new RemoteConfigClientError(`Cannot fetch remote config because server error: Unexpected status code`)
        )
        .onSuccess((t) => t.data);
};
