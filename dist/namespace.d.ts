import { ComponentType } from "react";
export declare namespace React2EEX {
    interface Props<HydrateProps = {}> {
        hydrateProps?: HydrateProps | undefined;
    }
    interface TemplateOptions {
        hydrate?: boolean;
        id?: string;
    }
    const DefaultTemplateOptions: TemplateOptions;
    type Template<P = {}> = ComponentType<P> & {
        staticProps(): P | Promise<P>;
        options?(): TemplateOptions | Promise<TemplateOptions>;
    };
}
