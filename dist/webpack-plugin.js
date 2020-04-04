"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var schema_utils_1 = __importDefault(require("schema-utils"));
var globby_1 = __importDefault(require("globby"));
var p_limit_1 = __importDefault(require("p-limit"));
var path = __importStar(require("path"));
var fs = __importStar(require("fs"));
var util = __importStar(require("util"));
var hydrate_1 = require("./hydrate");
// tslint:disable-next-line: no-var-requires
var SingleEntryDependency = require("webpack/lib/dependencies/SingleEntryDependency");
var readFilePromise = util.promisify(fs.readFile);
var writeFilePromise = util.promisify(fs.writeFile);
var DefaultPluginOptions = {
    from: "",
    to: "",
    hydrate: true,
    entry: "react2eex",
    concurrency: 100,
    fromPattern: ["**/*.eex.ts", "**/*.eex.tsx", "**/*.eex.js", "**/*.eex.jsx"]
};
var PluginOptionsSchema = {
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
};
var PluginName = "React2EEXPlugin";
var React2EEX;
(function (React2EEX) {
    var React2EEXWebpackPlugin = /** @class */ (function () {
        function React2EEXWebpackPlugin(options) {
            schema_utils_1.default(PluginOptionsSchema, options, {
                name: PluginName
            });
            this.options = Object.assign({}, DefaultPluginOptions, options);
        }
        React2EEXWebpackPlugin.prototype.apply = function (compiler) {
            var _this = this;
            var _a;
            var context = compiler.options.context || "";
            var outputPath = ((_a = compiler.options.output) === null || _a === void 0 ? void 0 : _a.path) || path.join(process.cwd(), "dist");
            var hydratePath = path.resolve(__dirname, "../src/hydrate.tsx");
            var replaceMarker = "const templateMap: TemplateMap = {}";
            var toBase = path.resolve(context, this.options.to);
            var fromBase = path.resolve(context, this.options.from);
            var entryPath = path.resolve(fromBase, ".react2eex.tsx");
            var entry = this.options.entry;
            var sourceTemplates = [];
            // ensure SingleEntryDependency is setup
            compiler.hooks.compilation.tap(PluginName, function (compilation, _a) {
                var normalModuleFactory = _a.normalModuleFactory;
                compilation.dependencyFactories.set(SingleEntryDependency, normalModuleFactory);
            });
            // create entry file source using hydrate.tsx and merging in imports of all the templates found
            compiler.hooks.make.tapPromise(PluginName, function (compilation) {
                return new Promise(function (resolve, reject) {
                    return Promise.all([
                        globby_1.default(_this.options.fromPattern, { cwd: fromBase, followSymbolicLinks: true }),
                        readFilePromise(hydratePath)
                    ])
                        .then(function (_a) {
                        var _templatePaths = _a[0], hydrateSourceBuffer = _a[1];
                        sourceTemplates = _templatePaths.map(function (templatePath, index) {
                            // convert path to forward slashes and remove last extension
                            templatePath = templatePath.replace(/\\/g, '/').replace(/\.[^.]+$/, "");
                            var className = "react2eex_" + templatePath.replace(/\//g, "__").replace(/\./g, "_");
                            return {
                                className: className,
                                path: templatePath
                            };
                        });
                        var imports = [];
                        var mapEntries = [];
                        sourceTemplates.forEach(function (sourceTemplate, index) {
                            imports.push("import t" + index + " from \"./" + sourceTemplate.path + "\"");
                            mapEntries.push("  \"" + sourceTemplate.path + "\": t" + index + ",");
                        });
                        var replacementCode = imports.join("\n") + "\n\nconst templateMap: TemplateMap = {\n" + mapEntries.join("\n") + "\n}";
                        var updatedSource = hydrateSourceBuffer
                            .toString()
                            .replace(/^\/\/ NOTE:.*$/g, "")
                            .replace(replaceMarker, replacementCode);
                        return writeFilePromise(entryPath, updatedSource);
                    })
                        .then(function () {
                        var dep = new SingleEntryDependency(entryPath);
                        dep.loc = { name: entry };
                        compilation.addEntry(context, dep, entry, function (err) {
                            if (err) {
                                reject(err);
                            }
                            else {
                                resolve();
                            }
                        });
                    })
                        .catch(reject);
                });
            });
            // evaluate the generated entry file and create static templates
            compiler.hooks.emit.tapPromise(PluginName, function (compilation) {
                // remove generated code from file dependencies, otherwise we get an infinite loop
                compilation.fileDependencies.delete(entryPath);
                // copied from webpack's Compiler.js#emitAssets
                var source = compilation.assets[entry + ".js"];
                if (!source) {
                    compilation.errors.push(new Error("Unable to find " + entry + ".js in compilation assets!"));
                    return;
                }
                var content;
                if (typeof source.buffer === "function") {
                    content = source.buffer();
                }
                else {
                    var bufferOrString = source.source();
                    if (Buffer.isBuffer(bufferOrString)) {
                        content = bufferOrString;
                    }
                    else {
                        content = Buffer.from(bufferOrString, "utf8");
                    }
                }
                content = content.toString();
                // eval module, adds React2EEXRenderFnVar function to global namespace as a side effect
                // tslint:disable-next-line: no-eval
                eval(content);
                var react2EEXRender = global[hydrate_1.React2EEXRenderFnVar];
                // limit concurrent promises
                var limit = p_limit_1.default(_this.options.concurrency);
                var templatePromises = sourceTemplates.map(function (sourceTemplate) {
                    return limit(function () {
                        return new Promise(function (resolve) {
                            var options = {
                                path: sourceTemplate.path,
                                className: sourceTemplate.className,
                                hydrate: _this.options.hydrate
                            };
                            return react2EEXRender(options)
                                .then(function (html) {
                                var toPath = path.join(toBase, sourceTemplate.path);
                                var assetPath = path.relative(outputPath, toPath).replace(/\\/g, "/");
                                compilation.assets[assetPath] = {
                                    size: function () { return html.length; },
                                    source: function () { return html; }
                                };
                            })
                                .catch(function (err) { return compilation.errors.push(err); })
                                .finally(function () { return resolve(); });
                        });
                    });
                });
                return Promise.all(templatePromises).then(function () {
                    // remove the global renderer evaled in
                    delete global.__react2EEXRender;
                });
            });
        };
        return React2EEXWebpackPlugin;
    }());
    React2EEX.React2EEXWebpackPlugin = React2EEXWebpackPlugin;
})(React2EEX = exports.React2EEX || (exports.React2EEX = {}));
module.exports = React2EEX.React2EEXWebpackPlugin;
