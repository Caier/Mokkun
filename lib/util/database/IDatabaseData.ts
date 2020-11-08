export interface IDatabase {
    System: {
        [prop: string]: any
    }
    Data: {
        [prop: string]: any
    }
    get(path: string): any
    save(path: string, data: any): void
    [prop: string]: any
}