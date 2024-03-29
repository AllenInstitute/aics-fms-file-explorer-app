/**
 * Keys for the data saved by this service
 */
export enum PersistedConfigKeys {
    AllenMountPoint = "ALLEN_MOUNT_POINT",
    CsvColumns = "CSV_COLUMNS",
    ImageJExecutable = "IMAGE_J_EXECUTABLE", // Deprecated
    HasUsedApplicationBefore = "HAS_USED_APPLICATION_BEFORE",
    UserSelectedApplications = "USER_SELECTED_APPLICATIONS",
}

export interface UserSelectedApplication {
    defaultFileKinds: string[];
    filePath: string;
}

export interface PersistedConfig {
    [PersistedConfigKeys.CsvColumns]?: string[];
    [PersistedConfigKeys.ImageJExecutable]?: string; // Deprecated
    [PersistedConfigKeys.HasUsedApplicationBefore]?: boolean;
    [PersistedConfigKeys.UserSelectedApplications]?: UserSelectedApplication[];
}

/**
 * Interface that defines a platform-dependent service for persistent configuration data.
 */
export default interface PersistentConfigService {
    /**
     * Retrieve the config value for the given key. Returns undefined if not present.
     */
    get(key: PersistedConfigKeys): any;

    /**
     * Retrieve the config value for all possible keys.
     */
    getAll(): PersistedConfig;

    /**
     * Save the config value at the given key. Overwrites any existing data for the key.
     */
    persist(config: PersistedConfig): void;
    persist(key: PersistedConfigKeys, value: any): void;
}
