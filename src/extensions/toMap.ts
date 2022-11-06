export const toMap = <T>(array: T[], keySelector: (arg: T) => string): Map<string, T> => {
    const result = new Map<string, T>();

    array.forEach((item) => result.set(keySelector(item), item));

    return result;
};
