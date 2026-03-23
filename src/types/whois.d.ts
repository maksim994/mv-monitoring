declare module 'whois' {
  export function lookup(
    domain: string,
    callback: (err: any, data: string) => void
  ): void;
  export function lookup(
    domain: string,
    options: any,
    callback: (err: any, data: string) => void
  ): void;
}
