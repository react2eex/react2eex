interface PluginOptions {
    from: string;
    to: string;
    hydrate?: boolean;
    entry?: string;
    concurrency?: number;
    fromPattern?: string[];
}
export declare namespace React2EEX {
    class React2EEXWebpackPlugin {
        private options;
        constructor(options: PluginOptions);
        apply(compiler: any): void;
    }
}
export {};
