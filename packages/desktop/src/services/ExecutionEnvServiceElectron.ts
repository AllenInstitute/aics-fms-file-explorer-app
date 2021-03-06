import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { dialog, ipcMain, ipcRenderer } from "electron";

import {
    ExecutionEnvService,
    ExecutableEnvCancellationToken,
    SystemDefaultAppLocation,
} from "../../../core/services";
import NotificationServiceElectron from "./NotificationServiceElectron";
import { GlobalVariableChannels } from "../util/constants";

// These are paths known (and unlikely to change) inside the allen drive that any given user should
// have access to
export const KNOWN_FOLDERS_IN_ALLEN_DRIVE = ["programs", "aics"].map((f) => path.normalize(f));

export enum Platform {
    Mac = "darwin",
    Windows = "win32",
}

export default class ExecutionEnvServiceElectron implements ExecutionEnvService {
    public static SHOW_OPEN_DIALOG = "show-open-dialog";
    public static PROMPT_ALLEN_MOUNT_POINT = "prompt-allen-mount-point";
    private notificationService: NotificationServiceElectron;

    public static registerIpcHandlers() {
        // Handle opening a native file browser dialog
        ipcMain.handle(
            ExecutionEnvServiceElectron.SHOW_OPEN_DIALOG,
            (_, dialogOptions: Electron.OpenDialogOptions) => {
                return dialog.showOpenDialog({
                    defaultPath: path.resolve("/"),
                    buttonLabel: "Select",
                    ...dialogOptions,
                });
            }
        );

        // Relay the selected Allen mount point to a listener in the renderer process
        ipcMain.on(GlobalVariableChannels.AllenMountPoint, (event, allenPath) => {
            event.reply(GlobalVariableChannels.AllenMountPoint, allenPath);
        });
    }

    private static getDefaultOpenDialogOptions(
        platform: NodeJS.Platform
    ): Partial<Electron.OpenDialogOptions> {
        // MacOS
        if (platform === Platform.Mac) {
            return {
                defaultPath: path.normalize("/Applications/"),
                filters: [{ name: "Executable", extensions: ["app"] }],
            };
        }
        // Windows
        if (platform === Platform.Windows) {
            return {
                defaultPath: os.homedir(),
                filters: [{ name: "Executable", extensions: ["exe"] }],
            };
        }
        return {
            defaultPath: os.homedir(),
            filters: [{ name: "Executable", extensions: ["*"] }],
        };
    }

    public constructor(notificationService: NotificationServiceElectron) {
        this.notificationService = notificationService;
        ipcRenderer.removeAllListeners(ExecutionEnvServiceElectron.PROMPT_ALLEN_MOUNT_POINT);
        ipcRenderer.on(ExecutionEnvServiceElectron.PROMPT_ALLEN_MOUNT_POINT, async () => {
            const allenPath = await this.promptForAllenMountPoint();
            if (allenPath !== ExecutableEnvCancellationToken) {
                // Pass the selected Allen mount point on to the global variables
                ipcRenderer.send(GlobalVariableChannels.AllenMountPoint, allenPath);
            }
        });
    }

    public formatPathForOs(posixPath: string, prefix?: string): string {
        // Assumption: file paths are persisted as POSIX paths. Split accordingly...
        const originalPosixPathSplit = posixPath.split(path.posix.sep);
        const parts = prefix ? [prefix, ...originalPosixPathSplit] : originalPosixPathSplit;

        // ...then rejoin using whatever path.sep is at runtime
        return path.join(...parts);
    }

    public getFilename(filePath: string): string {
        return path.basename(filePath, path.extname(filePath));
    }

    public getOS(): string {
        return os.type();
    }

    public async promptForAllenMountPoint(displayMessageBeforePrompt?: boolean): Promise<string> {
        if (displayMessageBeforePrompt) {
            const result = await this.notificationService.showMessage(
                "Allen Drive Mount Point",
                "It appears that your Allen Drive isn't where we thought it would be. " +
                    "Select your Allen Drive Mount Point location now?"
            );
            if (!result) {
                return ExecutableEnvCancellationToken;
            }
        }
        // Continuously try to set a valid allen drive mount point unless the user cancels
        while (true) {
            const allenPath = await this.selectPath({
                properties: ["openDirectory"],
                title: "Select Allen drive mount point",
            });

            if (allenPath === ExecutableEnvCancellationToken) {
                return ExecutableEnvCancellationToken;
            }

            const isValidAllenPath = await this.isValidAllenMountPoint(allenPath);
            if (isValidAllenPath) {
                return allenPath;
            }

            await this.notificationService.showError(
                "Allen Drive Mount Point Selection",
                `Whoops! ${allenPath} is not verifiably the root of the Allen drive on your computer. Select the parent folder to the "/aics" and "/programs" folders. For example, "/allen," "/Users/johnd/allen," etc.`
            );
        }
    }

    public async promptForExecutable(
        promptTitle: string,
        reasonForPrompt?: string
    ): Promise<string> {
        if (reasonForPrompt) {
            const result = await this.notificationService.showMessage(promptTitle, reasonForPrompt);
            if (!result) {
                return ExecutableEnvCancellationToken;
            }
        }

        // Continuously try to set a valid executable location until the user cancels
        while (true) {
            const platform = os.platform();

            const executablePath = await this.selectPath({
                ...ExecutionEnvServiceElectron.getDefaultOpenDialogOptions(platform),
                properties: ["openFile"],
                title: promptTitle,
            });

            if (executablePath === ExecutableEnvCancellationToken) {
                return ExecutableEnvCancellationToken;
            }

            const isValidExecutable = await this.isValidExecutable(executablePath);
            if (isValidExecutable) {
                return executablePath;
            } else {
                // Alert user to error with executable location
                await this.notificationService.showError(
                    promptTitle,
                    `Whoops! ${executablePath} is not verifiably an executable on your computer. Select the same application you would use to open the app.`
                );
            }
        }
    }

    public async isValidAllenMountPoint(allenPath: string): Promise<boolean> {
        try {
            const expectedPaths = KNOWN_FOLDERS_IN_ALLEN_DRIVE.map((f) => path.join(allenPath, f));
            await Promise.all(
                expectedPaths.map((path) => fs.promises.access(path, fs.constants.R_OK))
            );
            return true;
        } catch (_) {
            return false;
        }
    }

    public async isValidExecutable(executablePath: string): Promise<boolean> {
        if (executablePath === SystemDefaultAppLocation) {
            return true;
        }
        try {
            // On macOS, applications are bundled as packages. `executablePath` is expected to be a package.
            if (os.platform() === Platform.Mac) {
                if (executablePath.endsWith(".app")) {
                    const pathStat = await fs.promises.stat(executablePath);
                    if (pathStat.isDirectory()) {
                        return true;
                    }
                }
                return false;
            }
            await fs.promises.access(executablePath, fs.constants.X_OK);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Prompts user using native file browser for a file path
    private async selectPath(dialogOptions: Electron.OpenDialogOptions): Promise<string> {
        const result = await ipcRenderer.invoke(
            ExecutionEnvServiceElectron.SHOW_OPEN_DIALOG,
            dialogOptions
        );
        if (result.canceled || !result.filePaths.length) {
            return ExecutableEnvCancellationToken;
        }
        return result.filePaths[0];
    }
}
