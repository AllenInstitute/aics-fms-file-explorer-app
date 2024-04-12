import { configureStore, mergeState } from "@aics/redux-utils";
import axios, { AxiosInstance } from "axios";
import { combineReducers, AnyAction, Middleware } from "redux";
import { createLogicMiddleware } from "redux-logic";

import { PersistedConfig, PersistedConfigKeys } from "../services/PersistentConfigService";

import interaction, { InteractionStateBranch } from "./interaction";
import metadata, { MetadataStateBranch } from "./metadata";
import selection, { SelectionStateBranch } from "./selection";
import Annotation from "../entity/Annotation";

export { interaction, metadata, selection };

// -- STATE
export interface State {
    interaction: InteractionStateBranch;
    metadata: MetadataStateBranch;
    selection: SelectionStateBranch;
}

export const initialState: State = Object.freeze({
    interaction: interaction.initialState,
    metadata: metadata.initialState,
    selection: selection.initialState,
});

// -- REDUCER
export const reducer = combineReducers({
    interaction: interaction.reducer,
    metadata: metadata.reducer,
    selection: selection.reducer,
});

// --- MIDDLEWARE --
export interface ReduxLogicDeps {
    action: AnyAction;
    baseApiUrl: string;
    httpClient: AxiosInstance;
    getState: () => State;
    ctx?: any;
}

export const reduxLogicDependencies: Partial<ReduxLogicDeps> = {
    httpClient: axios,
};

export const reduxLogics = [...metadata.logics, ...selection.logics, ...interaction.logics];

const logicMiddleware = createLogicMiddleware(reduxLogics);
logicMiddleware.addDeps(reduxLogicDependencies);

export const middleware = [logicMiddleware];

interface CreateStoreOptions {
    middleware?: Middleware[];
    persistedConfig?: PersistedConfig;
}
export function createReduxStore(options: CreateStoreOptions = {}) {
    const { persistedConfig } = options;
    const preloadedState: State = mergeState(initialState, {
        interaction: {
            csvColumns: persistedConfig?.[PersistedConfigKeys.CsvColumns],
            hasUsedApplicationBefore:
                persistedConfig?.[PersistedConfigKeys.HasUsedApplicationBefore],
            lastUsedCollection: persistedConfig?.[PersistedConfigKeys.LastUsedCollection],
            userSelectedApplications:
                persistedConfig?.[PersistedConfigKeys.UserSelectedApplications],
        },
        selection: {
            displayAnnotations:
                persistedConfig &&
                persistedConfig[PersistedConfigKeys.DisplayAnnotations]?.map(
                    (annotation) => new Annotation(annotation)
                ),
            recentHierarchyAnnotations:
                persistedConfig &&
                persistedConfig[PersistedConfigKeys.RecentHierarchyAnnotations]?.map(
                    (annotation) => new Annotation(annotation)
                ),
        },
    });

    return configureStore<State>({
        middleware: [...(options.middleware || []), ...(middleware || [])],
        preloadedState,
        reducer,
    });
}
