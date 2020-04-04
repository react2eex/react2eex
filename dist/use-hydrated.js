"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
function useHydrated(staticProps, callback) {
    var _a = react_1.useState(false), hydrated = _a[0], setHydrated = _a[1];
    var _b = react_1.useState(staticProps), props = _b[0], setProps = _b[1];
    react_1.useEffect(function () {
        if (staticProps.hydrateProps) {
            Promise.resolve(callback ? callback(staticProps.hydrateProps, staticProps) : staticProps.hydrateProps).then(function (hydratedProps) {
                setProps(Object.assign({}, props, hydratedProps));
                setHydrated(true);
            });
        }
    }, []);
    return { props: props, hydrated: hydrated };
}
exports.useHydrated = useHydrated;
