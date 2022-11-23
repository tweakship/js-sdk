import { Result } from '@vladbasin/ts-result';
import { ClientImplementation, GetRemoteConfigResultType, RemoteConfigValueTypeNames } from '../src';
import { ClientConfig, createResponse } from './fixtures';

describe('Client Remote Config tests', () => {
    test('fails if not configured', async () => {
        return expect(
            new ClientImplementation(jest.fn().mockReturnValueOnce(createResponse([]))).getRemoteConfigAsync(
                'r1',
                'client'
            )
        ).rejects.toEqual(expect.any(Error));
    });

    test('uses default Remote Config value for sync call, if not loaded from server before', async () => {
        const result = new ClientImplementation(jest.fn().mockReturnValueOnce(createResponse([])))
            .configure(ClientConfig)
            .getRemoteConfig('r1', 'client');

        expect(result).toEqual<GetRemoteConfigResultType<string>>({
            name: 'r1',
            value: 'client',
            loadedFrom: 'default',
        });
    });

    test('passes context', async () => {
        const senderFunc = jest.fn().mockReturnValueOnce(createResponse([]));
        const client = new ClientImplementation(senderFunc);

        const context = { value1: ['v1'], value2: 1, value3: false };

        return client
            .configure(ClientConfig)
            .setContext(context)
            .getRemoteConfigAsync('r1', 'client')
            .then(() =>
                expect(senderFunc.mock.calls[0][1]).toEqual({
                    context: {
                        value1: ['v1'],
                        value2: [1],
                        value3: [false],
                    },
                    names: ['r1'],
                })
            );
    });

    test('converts dates in context to ISO string', async () => {
        const senderFunc = jest.fn().mockReturnValueOnce(createResponse([]));
        const client = new ClientImplementation(senderFunc);

        const date = new Date(Date.UTC(2020, 10, 8, 23, 10, 20));

        const context = { value1: [date], value2: date };

        return client
            .configure(ClientConfig)
            .setContext(context)
            .getRemoteConfigAsync('r1', 'client')
            .then(() =>
                expect(senderFunc.mock.calls[0][1]).toEqual({
                    context: {
                        value1: ['2020-11-08T23:10:20.000Z'],
                        value2: ['2020-11-08T23:10:20.000Z'],
                    },
                    names: ['r1'],
                })
            );
    });

    test('uses cached Remote Config value for sync call, if loaded from server before', async () => {
        const client = new ClientImplementation(
            jest
                .fn()
                .mockReturnValueOnce(
                    createResponse([
                        { name: 'r1', status: 'success', value: 'server', valueType: RemoteConfigValueTypeNames.text },
                    ])
                )
        );

        return client
            .configure(ClientConfig)
            .getRemoteConfigAsync('r1', 'client')
            .then(() => client.getRemoteConfig('r1', 'client'))
            .then((result) =>
                expect(result).toEqual<GetRemoteConfigResultType<string>>({
                    name: 'r1',
                    value: 'server',
                    loadedFrom: 'memoryCache',
                })
            );
    });

    test('uses default Remote Config value, if nothing loaded', async () => {
        return new ClientImplementation(jest.fn().mockReturnValueOnce(createResponse([])))
            .configure(ClientConfig)
            .getRemoteConfigAsync('r1', 'client')
            .then((result) =>
                expect(result).toEqual<GetRemoteConfigResultType<string>>({
                    name: 'r1',
                    value: 'client',
                    loadedFrom: 'default',
                    error: 'ConfigNotFound',
                })
            );
    });

    test('uses default Remote Config value, if failed to load all configs', async () => {
        return new ClientImplementation(jest.fn().mockReturnValueOnce(Result.Fail('Failed to load')))
            .configure(ClientConfig)
            .getRemoteConfigAsync('r1', 'client')
            .then((result) =>
                expect(result).toEqual<GetRemoteConfigResultType<string>>({
                    name: 'r1',
                    value: 'client',
                    loadedFrom: 'default',
                    error: 'Failed to load',
                })
            );
    });

    test('uses default Remote Config value, if failed to load some configs', async () => {
        return new ClientImplementation(
            jest.fn().mockReturnValueOnce(
                createResponse([
                    { name: 'r1', status: 'success', value: 'server', valueType: RemoteConfigValueTypeNames.text },
                    { name: 'r2', status: 'fail', error: 'ServerError' },
                ])
            )
        )
            .configure(ClientConfig)
            .getMultipleRemoteConfigsAsync([
                { name: 'r1', default: 'client' },
                { name: 'r2', default: 1 },
            ])
            .then((result) =>
                expect(result).toEqual<GetRemoteConfigResultType<unknown>[]>([
                    {
                        name: 'r1',
                        value: 'server',
                        loadedFrom: 'server',
                    },
                    {
                        name: 'r2',
                        value: 1,
                        loadedFrom: 'default',
                        error: 'ServerError',
                    },
                ])
            );
    });

    test('loads server value for Remote Config', async () => {
        return new ClientImplementation(
            jest
                .fn()
                .mockReturnValueOnce(
                    createResponse([
                        { name: 'r1', status: 'success', value: 'server', valueType: RemoteConfigValueTypeNames.text },
                    ])
                )
        )
            .configure(ClientConfig)
            .getRemoteConfigAsync('r1', 'clientValue')
            .then((result) =>
                expect(result).toEqual<GetRemoteConfigResultType<string>>({
                    name: 'r1',
                    value: 'server',
                    loadedFrom: 'server',
                })
            );
    });

    test('uses cached value for Remote Config, if failed to load next time', async () => {
        const client = new ClientImplementation(
            jest
                .fn()
                .mockReturnValueOnce(
                    createResponse([
                        { name: 'r1', status: 'success', value: 'server', valueType: RemoteConfigValueTypeNames.text },
                    ])
                )
                .mockReturnValueOnce(createResponse([]))
        );

        return client
            .configure(ClientConfig)
            .getRemoteConfigAsync('r1', 'clientValue')
            .then(() => client.getRemoteConfigAsync('r1', 'clientValue'))
            .then((result) =>
                expect(result).toEqual<GetRemoteConfigResultType<string>>({
                    name: 'r1',
                    value: 'server',
                    loadedFrom: 'memoryCache',
                    error: 'ConfigNotFound',
                })
            );
    });

    test('loads multiple Remote Configs, reusing previous calls', async () => {
        const client = new ClientImplementation(
            jest
                .fn()
                .mockReturnValueOnce(
                    createResponse([
                        { name: 'r1', status: 'success', value: 'server', valueType: RemoteConfigValueTypeNames.text },
                        { name: 'r2', status: 'success', value: '2', valueType: RemoteConfigValueTypeNames.number },
                    ])
                )
                .mockReturnValueOnce(
                    createResponse([
                        { name: 'r3', status: 'success', value: 'true', valueType: RemoteConfigValueTypeNames.boolean },
                    ])
                )
        );

        return client
            .configure(ClientConfig)
            .getMultipleRemoteConfigsAsync([
                { name: 'r1', default: 'client' },
                { name: 'r2', default: 1 },
            ])
            .then(() =>
                client.getMultipleRemoteConfigsAsync([
                    { name: 'r1', default: 'client' },
                    { name: 'r2', default: 1 },
                    { name: 'r3', default: false },
                ])
            )
            .then((results) =>
                expect(results).toEqual<GetRemoteConfigResultType<unknown>[]>([
                    {
                        name: 'r1',
                        value: 'server',
                        loadedFrom: 'memoryCache',
                        error: 'ConfigNotFound',
                    },
                    {
                        name: 'r2',
                        value: 2,
                        loadedFrom: 'memoryCache',
                        error: 'ConfigNotFound',
                    },
                    {
                        name: 'r3',
                        value: true,
                        loadedFrom: 'server',
                    },
                ])
            );
    });

    test('parses returned value', async () => {
        const client = new ClientImplementation(
            jest.fn().mockReturnValueOnce(
                createResponse([
                    { name: 'number', status: 'success', value: '1', valueType: RemoteConfigValueTypeNames.number },
                    { name: 'text', status: 'success', value: 'textValue', valueType: RemoteConfigValueTypeNames.text },
                    {
                        name: 'date',
                        status: 'success',
                        value: '2020-01-01T00:00:00+10:00',
                        valueType: RemoteConfigValueTypeNames.date,
                    },
                    {
                        name: 'dateTime',
                        status: 'success',
                        value: '2020-01-01T10:20:30+10:00',
                        valueType: RemoteConfigValueTypeNames.dateTime,
                    },
                    {
                        name: 'json',
                        status: 'success',
                        value: '{"prop":10}',
                        valueType: RemoteConfigValueTypeNames.json,
                    },
                    {
                        name: 'boolean',
                        status: 'success',
                        value: 'true',
                        valueType: RemoteConfigValueTypeNames.boolean,
                    },
                    { name: 'unknown', status: 'success', value: 'unknownValue', valueType: 'unknown' as any },
                ])
            )
        );

        return client
            .configure({ ...ClientConfig, host: 'host/' })
            .getMultipleRemoteConfigsAsync([
                { name: 'number', default: 0 },
                { name: 'text', default: 'defaultText' },
                { name: 'date', default: new Date() },
                { name: 'dateTime', default: new Date() },
                { name: 'json', default: { prop: 0 } },
                { name: 'boolean', default: false },
                { name: 'unknown', default: 'unknownDefault' },
            ])
            .then((results) =>
                expect(results).toEqual<GetRemoteConfigResultType<unknown>[]>([
                    {
                        name: 'number',
                        value: 1,
                        loadedFrom: 'server',
                    },
                    {
                        name: 'text',
                        value: 'textValue',
                        loadedFrom: 'server',
                    },
                    {
                        name: 'date',
                        value: new Date(Date.UTC(2019, 11, 31, 14, 0, 0)),
                        loadedFrom: 'server',
                    },
                    {
                        name: 'dateTime',
                        value: new Date(Date.UTC(2020, 0, 1, 0, 20, 30)),
                        loadedFrom: 'server',
                    },
                    {
                        name: 'json',
                        value: { prop: 10 },
                        loadedFrom: 'server',
                    },
                    {
                        name: 'boolean',
                        value: true,
                        loadedFrom: 'server',
                    },
                    {
                        name: 'unknown',
                        value: 'unknownValue',
                        loadedFrom: 'server',
                    },
                ])
            );
    });
});
