export function debounce<TArgs extends unknown[]>(cb: (...args: TArgs) => void, wait = 20) {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: TArgs) => {
        clearTimeout(timer);
        timer = setTimeout(() => cb(...args), wait);
    };
}
