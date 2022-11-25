import { Result } from '@vladbasin/ts-result';
import { Maybe } from '@vladbasin/ts-types';
import {
    ClientConfigurationType,
    EvaluateRemoteConfigResponseType,
    EvaluationContextType,
    GetRemoteConfigInfoType,
    GetRemoteConfigResultType,
    HttpRequestExecutorType,
    RemoteConfigClientError,
} from './contracts';
import { parseValue, sendHttpRequestAsync } from './functions';
import { toMap } from './extensions';
import { ensureEndsWith } from './extensions/ensureEndsWith';

/**
 * Client which provides and caches Remote Configuraiton and Feature Toggles
 */
export class ClientImplementation {
    public constructor(private _httpRequestExecutor: HttpRequestExecutorType) {
        this._httpRequestExecutor = _httpRequestExecutor;
    }

    /**
     * Allows you to set the context for current user.
     * This context will be used by Tweakship backend to provide config variations by evaluating rules you have configured in Tweakship Console.
     * You can specify any attribute you want in the context.
     * @param config Server configuration
     * @returns Reference to the same Client instance
     */
    public configure(config: ClientConfigurationType) {
        this._config = config;

        return this;
    }

    /**
     * Set current user\system context used for evaluation
     * @param context Key-value pairs (attribute name and its' value) that will be used by Server to evaluate Remote Config
     * @returns Reference to the same Client instance
     */
    public setContext(context: EvaluationContextType) {
        this._context = Object.entries(context).reduce((accum, item) => {
            const key = item[0];
            const rawValues = Array.isArray(item[1]) ? item[1] : [item[1]];
            const values = rawValues.map((t) => (t instanceof Date ? t.toISOString() : t));

            return { ...accum, [key]: values };
        }, {});
        this._cache.clear();

        return this;
    }

    /**
     * Synchronous call to get Remote Config value WITHOUT loading the latest value from the server.
     * The value is taken from memory cache or default if cache is empty.
     * Useful, when you preload all configs at app start and then use their values untill the app is restarted.
     * @param name The name of Remote Config to provide
     * @param defaultValue Default value to use, when memory cache is empty
     * @returns Information about Remote Config, including its value, name, source of the value, and error if any occured
     */
    public getRemoteConfig<T>(name: string, defaultValue: T): GetRemoteConfigResultType<T> {
        return {
            ...this.getFromDefaultOrCache<T>({ name, default: defaultValue }),
        };
    }

    /**
     * Synchronous call to get Feature Toggle value WITHOUT loading the latest value from the server.
     * The value is taken from memory cache or default if cache is empty.
     * Useful, when you preload all configs at app start and then use their values untill the app is restarted.
     * @param name The name of Feature toggle to provide
     * @param defaultValue Default value to use, when memory cache is empty
     * @returns Information about Feature toggle, including its value, name, source of the value, and error if any occured
     */
    public getFeatureToggle(name: string, defaultValue: boolean): GetRemoteConfigResultType<boolean> {
        return {
            ...this.getFromDefaultOrCache<boolean>({ name, default: defaultValue }),
        };
    }

    /**
     * Loads Remote Config from the Server. If loading fails, returns the value from memory cache or default value, and error information.
     * @param name The name of Remote Config
     * @param defaultValue Default value to use, when both Server and memory cache don't have the value
     * @returns Information about Remote Config, including its value, name, source of the value, and error if any occured
     */
    public getRemoteConfigAsync<T>(name: string, defaultValue: T): Promise<GetRemoteConfigResultType<T>> {
        return this.getAsync<T>([{ name, default: defaultValue }])
            .onSuccess((results) => results[0])
            .asPromise();
    }

    /**
     * Loads Feature Toggle from the Server. If loading fails, returns the value from memory cache or default value, and error information.
     * @param name The name of Feature toggle
     * @param defaultValue Default value to use, when both Server and memory cache don't have the value
     * @returns Information about Feature Toggle, including its value, name, source of the value, and error if any occured
     */
    public getFeatureToggleAsync(name: string, defaultValue: boolean): Promise<GetRemoteConfigResultType<boolean>> {
        return this.getRemoteConfigAsync<boolean>(name, defaultValue);
    }

    /**
     * Loads multiple Remote Configs from Server. If loading fails, for each Remote Config returns the value from memory cache or default value, and error information.
     * @param configs Remote Configs to load with default value information
     * @returns Information about each requested Remote Config, including its value, name, source of the value, and error if any occured
     */
    public getMultipleRemoteConfigsAsync(
        configs: GetRemoteConfigInfoType<unknown>[]
    ): Promise<GetRemoteConfigResultType<unknown>[]> {
        return this.getAsync<unknown>(configs).asPromise();
    }

    /**
     * Loads multiple Feature Toggles from Server. If loading fails, for each Feature Toggle returns the value from memory cache or default value, and error information.
     * @param featureToggles Feature Toggles to load with default value information
     * @returns Information about each requested Feature Toggle, including its value, name, source of the value, and error if any occured
     */
    public getMultipleFeatureTogglesAsync(
        featureToggles: GetRemoteConfigInfoType<boolean>[]
    ): Promise<GetRemoteConfigResultType<boolean>[]> {
        return this.getAsync<boolean>(featureToggles).asPromise();
    }

    private getAsync<T>(remoteConfigs: GetRemoteConfigInfoType<T>[]): Result<GetRemoteConfigResultType<T>[]> {
        return Result.Ok(this._config)
            .ensureUnwrapWithError(
                (config) => config,
                new RemoteConfigClientError("Couldn't load config because Client is not configured")
            )
            .onSuccess((clientConfig) =>
                this._httpRequestExecutor<EvaluateRemoteConfigResponseType>(
                    `${ensureEndsWith(clientConfig.host, '/')}api/client/projects/${
                        clientConfig.projectId
                    }/remoteConfigs/evaluate`,
                    {
                        context: this._context,
                        names: remoteConfigs.map((t) => t.name),
                    }
                )
                    .onSuccess((response) => {
                        const responseResultsMap = toMap(response.data.results, (t) => t.name);

                        const results = remoteConfigs.map<GetRemoteConfigResultType<T>>((remoteConfig) => {
                            const loadedConfig = responseResultsMap.get(remoteConfig.name);

                            if (!loadedConfig || loadedConfig.status !== 'success') {
                                return {
                                    ...this.getFromDefaultOrCache({
                                        name: remoteConfig.name,
                                        default: remoteConfig.default,
                                    }),
                                    error: loadedConfig?.error || 'ConfigNotFound',
                                };
                            }

                            return {
                                name: remoteConfig.name,
                                value: parseValue<T>(loadedConfig.value, loadedConfig.valueType),
                                loadedFrom: 'server',
                            };
                        });

                        results.forEach((result) => this._cache.set(result.name, result.value));

                        return results;
                    })
                    .onFailureCompensate((error) =>
                        Result.Ok<GetRemoteConfigResultType<T>[]>(
                            remoteConfigs.map((t) => ({ error, ...this.getFromDefaultOrCache(t) }))
                        )
                    )
            );
    }

    private getFromDefaultOrCache<T>(
        remoteConfig: GetRemoteConfigInfoType<T>
    ): Pick<GetRemoteConfigResultType<T>, 'value' | 'loadedFrom' | 'name'> {
        const cached = this._cache.get(remoteConfig.name) as Maybe<T>;
        return cached === null || cached === undefined
            ? { name: remoteConfig.name, value: remoteConfig.default, loadedFrom: 'default' }
            : { name: remoteConfig.name, value: cached, loadedFrom: 'memoryCache' };
    }

    private _config: Maybe<ClientConfigurationType>;

    private _cache: Map<string, unknown> = new Map();

    private _context: Record<string, unknown[]> = {};
}

export const Client = new ClientImplementation(sendHttpRequestAsync);
