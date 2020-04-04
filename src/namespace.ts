import { ComponentType } from "react"

export namespace React2EEX {
  export interface Props<HydrateProps={}> {
    hydrateProps?: HydrateProps | undefined
  }

  export interface TemplateOptions {
    hydrate?: boolean
    id?: string
  }

  export const DefaultTemplateOptions: TemplateOptions = {
    hydrate: true
  }

  export type Template<P={}> = ComponentType<P> & {
    staticProps(): P | Promise<P>
    options?(): TemplateOptions | Promise<TemplateOptions>
  }
}
