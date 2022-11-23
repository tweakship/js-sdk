import { ClientImplementation, GetRemoteConfigResultType, RemoteConfigValueTypeNames } from '../src';
import { ClientConfig, createResponse } from './fixtures';

describe('Client Feature Toggle tests', () => {
    test('fails if not configured', async () => {
        return expect(
            new ClientImplementation(jest.fn().mockReturnValueOnce(createResponse([]))).getFeatureToggleAsync(
                'r1',
                false
            )
        ).rejects.toEqual(expect.any(Error));
    });

    test('uses default Feature Toggle value for sync call, if not loaded from server before', async () => {
        const result = new ClientImplementation(jest.fn().mockReturnValueOnce(createResponse([])))
            .configure(ClientConfig)
            .getFeatureToggle('r1', false);

        expect(result).toEqual<GetRemoteConfigResultType<boolean>>({
            name: 'r1',
            value: false,
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
            .getFeatureToggleAsync('r1', false)
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

    test('uses cached Feature Toggle value for sync call, if loaded from server before', async () => {
        const client = new ClientImplementation(
            jest
                .fn()
                .mockReturnValueOnce(
                    createResponse([
                        { name: 'r1', status: 'success', value: 'true', valueType: RemoteConfigValueTypeNames.boolean },
                    ])
                )
        );

        return client
            .configure(ClientConfig)
            .getFeatureToggleAsync('r1', false)
            .then(() => client.getFeatureToggle('r1', false))
            .then((result) =>
                expect(result).toEqual<GetRemoteConfigResultType<boolean>>({
                    name: 'r1',
                    value: true,
                    loadedFrom: 'memoryCache',
                })
            );
    });

    test('uses default Feature Toggle value, if failed to load', async () => {
        return new ClientImplementation(jest.fn().mockReturnValueOnce(createResponse([])))
            .configure(ClientConfig)
            .getFeatureToggleAsync('r1', false)
            .then((result) =>
                expect(result).toEqual<GetRemoteConfigResultType<boolean>>({
                    name: 'r1',
                    value: false,
                    loadedFrom: 'default',
                    error: 'ConfigNotFound',
                })
            );
    });

    test('loads server value for Feature Toggle', async () => {
        return new ClientImplementation(
            jest
                .fn()
                .mockReturnValueOnce(
                    createResponse([
                        { name: 'r1', status: 'success', value: 'true', valueType: RemoteConfigValueTypeNames.boolean },
                    ])
                )
        )
            .configure(ClientConfig)
            .getFeatureToggleAsync('r1', false)
            .then((result) =>
                expect(result).toEqual<GetRemoteConfigResultType<boolean>>({
                    name: 'r1',
                    value: true,
                    loadedFrom: 'server',
                })
            );
    });

    test('uses cached value for Feature Toggle, if failed to load next time', async () => {
        const client = new ClientImplementation(
            jest
                .fn()
                .mockReturnValueOnce(
                    createResponse([
                        { name: 'r1', status: 'success', value: 'true', valueType: RemoteConfigValueTypeNames.boolean },
                    ])
                )
                .mockReturnValueOnce(createResponse([]))
        );

        return client
            .configure(ClientConfig)
            .getFeatureToggleAsync('r1', false)
            .then(() => client.getFeatureToggleAsync('r1', false))
            .then((result) =>
                expect(result).toEqual<GetRemoteConfigResultType<boolean>>({
                    name: 'r1',
                    value: true,
                    loadedFrom: 'memoryCache',
                    error: 'ConfigNotFound',
                })
            );
    });

    test('loads multiple Feature Toggles, reusing previous calls', async () => {
        const client = new ClientImplementation(
            jest
                .fn()
                .mockReturnValueOnce(
                    createResponse([
                        { name: 'r1', status: 'success', value: 'true', valueType: RemoteConfigValueTypeNames.boolean },
                        { name: 'r2', status: 'success', value: 'true', valueType: RemoteConfigValueTypeNames.boolean },
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
            .getMultipleFeatureTogglesAsync([
                { name: 'r1', default: false },
                { name: 'r2', default: false },
            ])
            .then(() =>
                client.getMultipleFeatureTogglesAsync([
                    { name: 'r1', default: false },
                    { name: 'r2', default: false },
                    { name: 'r3', default: false },
                ])
            )
            .then((results) =>
                expect(results).toEqual<GetRemoteConfigResultType<boolean>[]>([
                    {
                        name: 'r1',
                        value: true,
                        loadedFrom: 'memoryCache',
                        error: 'ConfigNotFound',
                    },
                    {
                        name: 'r2',
                        value: true,
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
});
