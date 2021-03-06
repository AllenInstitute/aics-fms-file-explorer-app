import * as os from "os";
import * as path from "path";

import Store, { Options } from "electron-store";

import {
    PersistentConfigService,
    PersistedConfig,
    PersistedConfigKeys,
    UserSelectedApplication,
} from "../../../core/services";
import { find } from "lodash";

const OPTIONS: Options<Record<string, unknown>> = {
    // Defines a validation schema for data inserted into the persistent storage
    // if a breaking change is made see migration patterns in elecron-store docs
    schema: {
        [PersistedConfigKeys.AllenMountPoint]: {
            type: "string",
        },
        [PersistedConfigKeys.CsvColumns]: {
            type: "array",
            items: {
                type: "string",
            },
        },
        // ImageJExecutable is Deprecated
        [PersistedConfigKeys.ImageJExecutable]: {
            type: "string",
        },
        [PersistedConfigKeys.UserSelectedApplications]: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    defaultFileKinds: {
                        type: "array",
                        items: {
                            type: "string",
                        },
                    },
                    filePath: {
                        type: "string",
                    },
                },
            },
        },
    },
    migrations: {
        // Migrate deprecated ImageJExecutable to new UserSelectedApplication key
        ">4.3.0": (store) => {
            if (store.has(PersistedConfigKeys.ImageJExecutable)) {
                const fijiExePath = store.get(PersistedConfigKeys.ImageJExecutable) as string;
                const userSelectedApplications = store.get(
                    PersistedConfigKeys.UserSelectedApplications,
                    []
                ) as UserSelectedApplication[];
                const fijiConfig = find(
                    userSelectedApplications,
                    (config) => config.filePath === fijiExePath
                );
                if (!fijiConfig) {
                    store.set(PersistedConfigKeys.UserSelectedApplications, [
                        ...userSelectedApplications,
                        { filePath: fijiExePath, defaultFileKinds: [] },
                    ]);
                }

                // Once migrated, remove the deprecated path
                store.delete(PersistedConfigKeys.ImageJExecutable);
            }
        },
    },
};

interface PersistentConfigServiceElectronOptions {
    clearExistingData?: boolean;
}

export default class PersistentConfigServiceElectron implements PersistentConfigService {
    private store: Store;

    private static getDefault(key: PersistedConfigKeys) {
        if (key === PersistedConfigKeys.AllenMountPoint) {
            return os.platform() === "win32" ? "\\\\allen" : path.normalize("/allen");
        }
        return undefined;
    }

    public constructor(options: PersistentConfigServiceElectronOptions = {}) {
        this.store = new Store(OPTIONS);
        if (options.clearExistingData) {
            this.store.clear();
        }
    }

    public get(key: PersistedConfigKeys): any {
        return this.store.get(key, PersistentConfigServiceElectron.getDefault(key));
    }

    public getAll(): PersistedConfig {
        return Object.values(PersistedConfigKeys).reduce(
            (config: PersistedConfig, key) => ({
                ...config,
                [key as string]: this.get(key),
            }),
            {}
        );
    }

    public persist(config: PersistedConfig): void;
    public persist(key: PersistedConfigKeys, value: any): void;
    public persist(arg: PersistedConfigKeys | PersistedConfig, value?: any) {
        if (typeof arg === "object") {
            Object.entries(arg as PersistedConfig).forEach(([key, value]) => {
                this.persist(key as PersistedConfigKeys, value);
            });
        } else if (value === undefined || value === null) {
            this.store.delete(arg);
        } else {
            this.store.set(arg, value);
        }
    }
}
