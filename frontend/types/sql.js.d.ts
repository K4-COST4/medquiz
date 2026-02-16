// Type declarations for sql.js
declare module 'sql.js' {
    export interface Database {
        run(sql: string, params?: any[]): void;
        exec(sql: string): any[];
        export(): Uint8Array;
        close(): void;
    }

    export interface SqlJsStatic {
        Database: new () => Database;
    }

    export interface SqlJsConfig {
        locateFile?: (file: string) => string;
    }

    export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}
