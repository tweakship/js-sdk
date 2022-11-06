import { RemoteConfigValueTypeNames } from '../contracts';

const parsers: Partial<Record<RemoteConfigValueTypeNames, (value: string) => unknown>> = {
    [RemoteConfigValueTypeNames.boolean]: (value) => value === 'true',
    [RemoteConfigValueTypeNames.date]: (value) => new Date(value),
    [RemoteConfigValueTypeNames.dateTime]: (value) => new Date(value),
    [RemoteConfigValueTypeNames.json]: (value) => JSON.parse(value),
    [RemoteConfigValueTypeNames.number]: (value) => Number(value),
    [RemoteConfigValueTypeNames.text]: (value) => value,
};

export const parseValue = <T>(value: string, valueType: RemoteConfigValueTypeNames) => {
    const parser = parsers[valueType];

    return (parser ? parser(value) : value) as T;
};
