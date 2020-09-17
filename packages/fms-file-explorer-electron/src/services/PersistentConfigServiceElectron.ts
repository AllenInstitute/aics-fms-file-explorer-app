import { isNil } from "lodash";
import * as path from "path";

import { dialog, ipcMain, ipcRenderer } from "electron";

// GM 9/15/20: This symbol is in fact exported from @aics/fms-file-explorer-core, but inexplicably,
// using `import` machinery causes tests to hang. All attempts to debug this have been unsuccesful so far.
const {
    PersistentConfigCancellationToken,
    SavedDataKey,
} = require("@aics/fms-file-explorer-core/nodejs/services/PersistentConfigService");

export default class PersistentConfigServiceElectron implements PersistentConfigService {
    public static SET_ALLEN_MOUNT_POINT = "get-allen-mount-point";
    public static SELECT_ALLEN_MOUNT_POINT = "select-allen-mount-point";

    public constructor() {
        ipcRenderer.on(PersistentConfigServiceElectron.SET_ALLEN_MOUNT_POINT, () => {
            this.setAllenMountPoint();
        });
    }

    public static registerIpcHandlers() {
        ipcMain.handle(PersistentConfigServiceElectron.SELECT_ALLEN_MOUNT_POINT, () => {
            return dialog.showOpenDialog({
                title: "Select allen drive mount point",
                defaultPath: path.resolve("/"),
                buttonLabel: "Select",
                // filters: [{ name: "CSV files", extensions: ["csv"] }],
                properties: ["openDirectory"],
            });
        });
    }

    public get(key: SavedDataKey): any {
        const item = localStorage.getItem(key);
        return isNil(item) ? undefined : JSON.parse(item);
    }

    public set(key: SavedDataKey, value: any): void {
        localStorage.setItem(key, JSON.stringify(value));
    }

    public async setAllenMountPoint(): Promise<string> {
        const result = await ipcRenderer.invoke(
            PersistentConfigServiceElectron.SELECT_ALLEN_MOUNT_POINT
        );
        if (result.canceled || !result.filePaths.length) {
            return Promise.resolve(PersistentConfigCancellationToken);
        }
        if (result.filePaths.length !== 1) {
            return Promise.reject(`Found unexpected number of paths: ${result.filePaths}`);
        }
        const allenPath = result.filePaths[0];
        this.set(SavedDataKey.AllenMountPoint, allenPath);
        return Promise.resolve(allenPath);
    }
}
