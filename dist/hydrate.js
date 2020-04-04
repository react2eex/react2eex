"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = __importDefault(require("react"));
var react_dom_1 = __importDefault(require("react-dom"));
var server_1 = __importDefault(require("react-dom/server"));
exports.React2EEXTemplateParamsVar = "__react2eexTemplateParams";
exports.React2EEXRenderFnVar = "__react2EEXRender";
// this is defined here again and not imported from namespace.ts as this file is
// copied into the Phoenix project as the basis of the generated entry file
// and so any relative path imports would be invalid
var React2EEX;
(function (React2EEX) {
    React2EEX.DefaultTemplateOptions = {
        hydrate: true
    };
})(React2EEX || (React2EEX = {}));
// NOTE: the next line must match `replaceMarker` in webpack-plugin.ts
var templateMap = {};
var getTemplate = function (path) {
    return new Promise(function (resolve, reject) {
        var template = templateMap[path];
        if (template) {
            resolve(template);
        }
        else {
            reject(new Error("unable to find " + path + " in template map"));
        }
    });
};
var getScript = function (options) {
    var className = options.className, path = options.path, staticProps = options.staticProps;
    var scriptObject = { className: className, path: path, staticProps: staticProps, hydrateProps: {} };
    var stringifiedScriptObject = JSON.stringify(scriptObject, null, 2)
        .replace("\"hydrateProps\": {}", "\"hydrateProps\": <%= {:safe, Jason.encode!(if assigns[:hydrate], do: assigns[:hydrate], else: %{})} %>");
    return "\n<script type=\"text/javascript\">\nwindow." + exports.React2EEXTemplateParamsVar + " = (window." + exports.React2EEXTemplateParamsVar + " || []);\nwindow." + exports.React2EEXTemplateParamsVar + ".push(" + stringifiedScriptObject + ")\n</script>";
};
// re-hydrate on load
var templateParamsArray = global[exports.React2EEXTemplateParamsVar];
if (templateParamsArray) {
    var renderedClassName_1 = {};
    templateParamsArray.forEach(function (templateParams) {
        var className = templateParams.className, path = templateParams.path, staticProps = templateParams.staticProps, hydrateProps = templateParams.hydrateProps;
        if (!renderedClassName_1[className]) {
            renderedClassName_1[className] = true;
            getTemplate(path)
                .then(function (template) {
                staticProps.hydrateProps = hydrateProps;
                var elements = document.getElementsByClassName(className);
                for (var i = 0; i < elements.length; i++) {
                    react_dom_1.default.hydrate(react_1.default.createElement(template, staticProps), elements[i]);
                }
            })
                .catch(function (err) {
                // tslint:disable-next-line: no-console
                console.error("react2eex hydration failed: " + err.toString());
            });
        }
    });
}
// create global render function to use in static render
var react2EEXRender = function (_a) {
    var className = _a.className, path = _a.path, hydrate = _a.hydrate;
    return new Promise(function (resolve, reject) {
        getTemplate(path)
            .then(function (template) {
            return Promise.resolve(template.options ? template.options() : React2EEX.DefaultTemplateOptions)
                .then(function (options) {
                return Promise.resolve(template.staticProps ? template.staticProps() : {})
                    .then(function (staticProps) {
                    // webpack hydrate option and template hydrate option must both be true (their defaults)
                    hydrate = hydrate && options.hydrate;
                    var wrapper = react_1.default.createElement("div", { className: className }, react_1.default.createElement(template, staticProps));
                    var html = hydrate
                        ? server_1.default.renderToString(wrapper)
                        : server_1.default.renderToStaticMarkup(wrapper);
                    var script = hydrate ? getScript({ className: className, path: path, staticProps: staticProps }) : "";
                    resolve("" + html + script);
                });
            });
        })
            .catch(reject);
    });
};
global[exports.React2EEXRenderFnVar] = react2EEXRender;
