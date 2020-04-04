import validateOptions from "schema-utils"
import { JSONSchema7 } from "schema-utils/declarations/validate"
import globby from "globby"
import pLimit from "p-limit"
import * as path from "path"
import * as fs from "fs"
import * as util from "util"
import { React2EEXRenderOptions, React2EEXRenderFn, React2EEXRenderFnVar } from "./hydrate"

// tslint:disable-next-line: no-var-requires
const SingleEntryDependency = require("webpack/lib/dependencies/SingleEntryDependency")

const readFilePromise = util.promisify(fs.readFile)
const writeFilePromise = util.promisify(fs.writeFile)

interface PluginOptions {
  from: string
  to: string
  hydrate?: boolean
  entry?: string
  concurrency?: number
  fromPattern?: string[]
}

const DefaultPluginOptions: Required<PluginOptions> = {
  from: "",
  to: "",
  hydrate: true,
  entry: "react2eex",
  concurrency: 100,
  fromPattern: [`**/*.eex.ts`, `**/*.eex.tsx`, `**/*.eex.js`, `**/*.eex.jsx`]
}

const PluginOptionsSchema: JSONSchema7 = {
  type: "object",
  properties: {
    from: {
      type: "string",
      minLength: 1
    },
    to: {
      type: "string",
      minLength: 1
    },
    hydrate: {
      type: "boolean",
      default: true
    },
    entry: {
      type: "string",
      default: "react2eex",
      minLength: 1
    },
    concurrency: {
      type: "number",
      default: 100,
      minimum: 1
    },
    fromPattern: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },
  required: ["from", "to"]
}

interface SourceTemplate {
  path: string
  className: string
}

const PluginName = "React2EEXPlugin"

export namespace React2EEX {

  export class React2EEXWebpackPlugin  {
    private options: Required<PluginOptions>

    constructor(options: PluginOptions) {
      validateOptions(PluginOptionsSchema, options, {
        name: PluginName
      })
      this.options = Object.assign({}, DefaultPluginOptions, options)
    }

    apply(compiler: any) {
      const context = compiler.options.context || ""
      const outputPath = compiler.options.output?.path || path.join(process.cwd(), "dist")
      const hydratePath = path.resolve(__dirname, "../src/hydrate.tsx")
      const replaceMarker = "const templateMap: TemplateMap = {}"
      const toBase = path.resolve(context, this.options.to)
      const fromBase = path.resolve(context, this.options.from)
      const entryPath = path.resolve(fromBase, `.react2eex.tsx`)
      const entry = this.options.entry
      let sourceTemplates: SourceTemplate[] = []

      // ensure SingleEntryDependency is setup
      compiler.hooks.compilation.tap(PluginName, (compilation: any, { normalModuleFactory }: any) => {
        compilation.dependencyFactories.set(
          SingleEntryDependency,
          normalModuleFactory
        )
      })

      // create entry file source using hydrate.tsx and merging in imports of all the templates found
      compiler.hooks.make.tapPromise(PluginName, (compilation: any) => {
        return new Promise((resolve, reject) => {
          return Promise.all([
            globby(this.options.fromPattern, {cwd: fromBase, followSymbolicLinks: true}),
            readFilePromise(hydratePath)
          ])
          .then(([_templatePaths, hydrateSourceBuffer]) => {
            sourceTemplates = _templatePaths.map((templatePath, index) => {
              // convert path to forward slashes and remove last extension
              templatePath = templatePath.replace(/\\/g, '/').replace(/\.[^.]+$/, "")
              const className = `react2eex_${templatePath.replace(/\//g, "__").replace(/\./g, "_")}`
              return {
                className,
                path: templatePath
              }
            })
            const imports: string[] = []
            const mapEntries: string[] = []
            sourceTemplates.forEach((sourceTemplate, index) => {
              imports.push(`import t${index} from "./${sourceTemplate.path}"`)
              mapEntries.push(`  "${sourceTemplate.path}": t${index},`)
            })
            const replacementCode = `${imports.join("\n")}\n\nconst templateMap: TemplateMap = {\n${mapEntries.join("\n")}\n}`
            const updatedSource = hydrateSourceBuffer
              .toString()
              .replace(/^\/\/ NOTE:.*$/g, "")
              .replace(replaceMarker, replacementCode)
            return writeFilePromise(entryPath, updatedSource)
          })
          .then(() => {
            const dep = new SingleEntryDependency(entryPath)
            dep.loc = { name: entry }
            compilation.addEntry(context, dep, entry, (err: any) => {
              if (err) {
                reject(err)
              } else {
                resolve()
              }
            })
          })
          .catch(reject)
        })
      })

      // evaluate the generated entry file and create static templates
      compiler.hooks.emit.tapPromise(PluginName, (compilation: any) => {
        // remove generated code from file dependencies, otherwise we get an infinite loop
        compilation.fileDependencies.delete(entryPath)

        // copied from webpack's Compiler.js#emitAssets
        const source = compilation.assets[`${entry}.js`]
        if (!source) {
          compilation.errors.push(new Error(`Unable to find ${entry}.js in compilation assets!`))
          return
        }
        let content
        if (typeof source.buffer === "function") {
          content = source.buffer()
        } else {
          const bufferOrString = source.source()
          if (Buffer.isBuffer(bufferOrString)) {
            content = bufferOrString
          } else {
            content = Buffer.from(bufferOrString, "utf8")
          }
        }
        content = content.toString()

        // eval module, adds React2EEXRenderFnVar function to global namespace as a side effect
        // tslint:disable-next-line: no-eval
        eval(content)
        const react2EEXRender: React2EEXRenderFn = (global as any)[React2EEXRenderFnVar]

        // limit concurrent promises
        const limit = pLimit(this.options.concurrency)
        const templatePromises = sourceTemplates.map((sourceTemplate) => {
          return limit(() => {
            return new Promise((resolve) => {
              const options: React2EEXRenderOptions = {
                path: sourceTemplate.path,
                className: sourceTemplate.className,
                hydrate: this.options.hydrate
              }
              return react2EEXRender(options)
                .then((html) => {
                  const toPath = path.join(toBase, sourceTemplate.path)
                  const assetPath = path.relative(outputPath, toPath).replace(/\\/g, "/")
                  compilation.assets[assetPath] = {
                    size() { return html.length },
                    source() { return html }
                  }
                })
                .catch((err: any) => compilation.errors.push(err))
                .finally(() => resolve())
            })
          })
        })

        return Promise.all(templatePromises).then(() => {
          // remove the global renderer evaled in
          delete (global as any).__react2EEXRender
        })
      })
    }
  }
}

module.exports = React2EEX.React2EEXWebpackPlugin
