import axios from 'axios';
import { sendHttpRequestAsync } from '../src/functions/sendHttpRequestAsync';

jest.mock('axios');
const axiosMock = axios as jest.Mocked<typeof axios>;

describe('sendHttpRequestAsync tests', () => {
    test('fails if axios fails', async () => {
        axiosMock.post.mockRejectedValue(new Error('Failed'));

        return expect(sendHttpRequestAsync('host', {}).asPromise()).rejects.toThrow(
            'Cannot fetch remote config because server error: Failed'
        );
    });

    test('fails if not 200', async () => {
        axiosMock.post.mockResolvedValue({ status: 400 });

        return expect(sendHttpRequestAsync('host', {}).asPromise()).rejects.toThrow(
            'Cannot fetch remote config because server error: Unexpected status code'
        );
    });

    test('returns data', async () => {
        axiosMock.post.mockResolvedValue({ status: 200, data: { value1: '123' } });

        return expect(sendHttpRequestAsync('host', {}).asPromise()).resolves.toEqual({ value1: '123' });
    });
});
