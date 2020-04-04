import { React2EEX } from "./namespace";
export declare function useHydrated<StaticProps = {}, HydrateProps = {}>(staticProps: StaticProps & React2EEX.Props<HydrateProps>, callback?: (hydrateProps: HydrateProps, staticProps: StaticProps) => Partial<StaticProps> | Promise<Partial<StaticProps>>): {
    props: StaticProps & React2EEX.Props<HydrateProps>;
    hydrated: boolean;
};
