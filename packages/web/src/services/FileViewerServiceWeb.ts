import { FileViewerService } from "../../../core/services";

export default class FileViewerServiceWeb implements FileViewerService {
    public async open(): Promise<void> {
        throw new Error("FileViewerServiceWeb::open is not yet implemented");
    }
}
