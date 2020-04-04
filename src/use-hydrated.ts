import { useEffect, useState } from "react"
import { React2EEX } from "./namespace"

export function useHydrated<StaticProps={}, HydrateProps={}>(staticProps: StaticProps & React2EEX.Props<HydrateProps>, callback?: (hydrateProps: HydrateProps, staticProps: StaticProps) => Partial<StaticProps> | Promise<Partial<StaticProps>> ) {
  const [hydrated, setHydrated] = useState(false)
  const [props, setProps] = useState(staticProps)
  useEffect(() => {
    if (staticProps.hydrateProps) {
      Promise.resolve(callback ? callback(staticProps.hydrateProps, staticProps) : staticProps.hydrateProps).then((hydratedProps) => {
        setProps(Object.assign({}, props, hydratedProps))
        setHydrated(true)
      })
    }
  }, [])
  return {props, hydrated}
}