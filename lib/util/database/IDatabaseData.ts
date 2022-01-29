export interface IDatabase {
    get(path: string): any
    save(path: string, data: any): void
    [prop: string]: any
}