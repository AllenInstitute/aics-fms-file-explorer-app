import { omit } from "lodash";

import FileService, { FmsFile, GetFilesRequest, SelectionAggregationResult } from "..";
import DatabaseService from "../../DatabaseService";
import DatabaseServiceNoop from "../../DatabaseService/DatabaseServiceNoop";
import FileSelection from "../../../entity/FileSelection";
import FileSet from "../../../entity/FileSet";
import { TOP_LEVEL_FILE_ANNOTATION_NAMES } from "../../../constants";

interface Config {
    databaseService: DatabaseService;
}

/**
 * Service responsible for fetching file related metadata directly from a database.
 */
export default class DatabaseFileService implements FileService {
    private readonly databaseService: DatabaseService;

    private static convertDatabaseRowToFmsFile(
        row: { [key: string]: string },
        rowNumber: number
    ): FmsFile {
        if (!("file_path" in row)) {
            throw new Error('"file_path" is a required column for data sources');
        }
        return {
            file_id: row["file_id"] || `${rowNumber}`,
            file_name:
                row["file_name"] ||
                row["file_path"].split("\\").pop()?.split("/").pop() ||
                row["file_path"],
            file_path: row["file_path"],
            file_size: "file_size" in row ? parseInt(row["file_size"], 10) : undefined,
            uploaded: row["uploaded"], // TODO: WRITE TICKET explain what format this (and other dates) should be in user guide & for file_size
            thumbnail: row["thumbnail"], // TODO: INCLUDE IN TICKET explain what this should look like to users and what does
            annotations: Object.entries(omit(row, TOP_LEVEL_FILE_ANNOTATION_NAMES)).map(
                ([name, values]: any) => ({
                    name,
                    // TODO: INCLUDE IN TICKET Smarter types?
                    values: `${values}`.split(",").map((value: string) => value.trim()),
                })
            ),
        };
    }

    constructor(config: Config = { databaseService: new DatabaseServiceNoop() }) {
        this.databaseService = config.databaseService;
    }

    public async getCountOfMatchingFiles(fileSet: FileSet): Promise<number> {
        const select_key = "num_files";
        const sql = `\
            SELECT COUNT(*) AS ${select_key}     \
            FROM ${this.databaseService.table}          \
            ${fileSet.toQuerySQL({ ignoreSort: true })}
        `;
        const rows = await this.databaseService.query(sql);
        return parseInt(rows[0][select_key], 10);
    }

    public async getAggregateInformation(
        fileSelection: FileSelection
    ): Promise<SelectionAggregationResult> {
        const allFiles = await fileSelection.fetchAllDetails();
        const count = fileSelection.count();
        if (allFiles.length && allFiles[0].file_size === undefined) {
            return { count };
        }
        const size = allFiles.reduce((acc, file) => acc + (file.file_size || 0), 0);
        return { count, size };
    }

    /**
     * Get list of file documents that match a given filter, potentially according to a particular sort order,
     * and potentially starting from a particular file_id and limited to a set number of files.
     */
    public async getFiles(request: GetFilesRequest): Promise<FmsFile[]> {
        const sql = `                               \
            SELECT *                                \
            FROM ${this.databaseService.table}             \
            ${request.fileSet.toQuerySQL()}         \
            OFFSET ${request.from * request.limit}  \
            LIMIT ${request.limit}
        `;
        const rows = await this.databaseService.query(sql);
        return rows.map((row, index) =>
            DatabaseFileService.convertDatabaseRowToFmsFile(
                row,
                index + request.from * request.limit
            )
        ) as FmsFile[];
    }
}
