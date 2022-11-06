export const ensureEndsWith = (target: string, suffix: string) => {
    return target.endsWith(suffix) ? target : target + suffix;
};
