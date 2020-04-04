import React, { ComponentType } from "react"
import ReactDOM from "react-dom"
import ReactDOMServer from "react-dom/server"

// NOTE: this is added so the Phoenix project doesn't need to add the dom library to typescript
declare const document: {
  getElementsByClassName: (className: string) => HTMLElement[]
}

export const React2EEXTemplateParamsVar = "__react2eexTemplateParams"
export const React2EEXRenderFnVar = "__react2EEXRender"

// this is defined here again and not imported from namespace.ts as this file is
// copied into the Phoenix project as the basis of the generated entry file
// and so any relative path imports would be invalid
namespace React2EEX {
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

export interface React2EEXRenderOptions {
  path: string
  className: string
  hydrate?: boolean
}

export type React2EEXRenderFn = (options: React2EEXRenderOptions) => Promise<string>

interface React2EEXTemplateParams {
  path: string
  className: string
  staticProps: React2EEX.Props<{}>
  hydrateProps: object
}

interface TemplateMap {
  [key: string]: React2EEX.Template<React2EEX.Props<{}> & any> | undefined
}

// NOTE: the next line must match `replaceMarker` in webpack-plugin.ts
const templateMap: TemplateMap = {}

const getTemplate = (path: string) => {
  return new Promise<React2EEX.Template>((resolve, reject) => {
    const template = templateMap[path]
    if (template) {
      resolve(template)
    } else {
      reject(new Error(`unable to find ${path} in template map`))
    }
  })
}

const getScript = (options: {className: string, path: string, staticProps: any}) => {
  const {className, path, staticProps} = options
  const scriptObject: React2EEXTemplateParams = {className, path, staticProps, hydrateProps: {}}
  const stringifiedScriptObject = JSON.stringify(scriptObject, null, 2)
    .replace(
      `"hydrateProps": {}`,
      `"hydrateProps": <%= {:safe, Jason.encode!(if assigns[:hydrate], do: assigns[:hydrate], else: %{})} %>`
    )

  return `
<script type="text/javascript">
window.${React2EEXTemplateParamsVar} = (window.${React2EEXTemplateParamsVar} || []);
window.${React2EEXTemplateParamsVar}.push(${stringifiedScriptObject})
</script>`
}

// re-hydrate on load
const templateParamsArray: React2EEXTemplateParams[] = (global as any)[React2EEXTemplateParamsVar]
if (templateParamsArray) {
  const renderedClassName: {[key: string]: boolean} = {}
  templateParamsArray.forEach(templateParams => {
    const {className, path, staticProps, hydrateProps} = templateParams
    if (!renderedClassName[className]) {
      renderedClassName[className] = true
      getTemplate(path)
        .then((template) => {
          staticProps.hydrateProps = hydrateProps
          const elements = document.getElementsByClassName(className)
          for (let i = 0; i < elements.length; i++) {
            ReactDOM.hydrate(React.createElement(template, staticProps as React.Attributes), elements[i])
          }
        })
        .catch((err) => {
          // tslint:disable-next-line: no-console
          console.error(`react2eex hydration failed: ${err.toString()}`)
        })
    }
  })
}

// create global render function to use in static render
const react2EEXRender: React2EEXRenderFn = ({className, path, hydrate}) => {
  return new Promise<string>((resolve, reject) => {
    getTemplate(path)
      .then((template) => {
        return Promise.resolve(template.options ? template.options() : React2EEX.DefaultTemplateOptions)
          .then((options) => {
            return Promise.resolve(template.staticProps ? template.staticProps() : {})
              .then((staticProps) => {
                // webpack hydrate option and template hydrate option must both be true (their defaults)
                hydrate = hydrate && options.hydrate
                const wrapper = <div className={className}>{React.createElement(template, staticProps)}</div>
                const html = hydrate
                  ? ReactDOMServer.renderToString(wrapper)
                  : ReactDOMServer.renderToStaticMarkup(wrapper)
                const script = hydrate ? getScript({className, path, staticProps}) : ""
                resolve(`${html}${script}`)
              })
          })
      })
      .catch(reject)
  })
}

(global as any)[React2EEXRenderFnVar] = react2EEXRender