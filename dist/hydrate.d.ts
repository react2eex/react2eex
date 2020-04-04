export declare const React2EEXTemplateParamsVar = "__react2eexTemplateParams";
export declare const React2EEXRenderFnVar = "__react2EEXRender";
export interface React2EEXRenderOptions {
    path: string;
    className: string;
    hydrate?: boolean;
}
export declare type React2EEXRenderFn = (options: React2EEXRenderOptions) => Promise<string>;
