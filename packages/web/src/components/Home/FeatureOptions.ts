import AddDataSource from "./assets/Datasets/AddDataSource.png";
import GroupedDataSources from "./assets/Datasets/GroupedDataSources.png";
import LoadSource from "./assets/Datasets/LoadSource.png";
import NewDataSourceColumns from "./assets/Datasets/NewDataSourceColumns.png";
import SaveMetadataAs from "./assets/Datasets/SaveMetadataAs.png";
import FilterColumn from "./assets/FindingData/FilterColumn.png";
import FilterValue from "./assets/FindingData/FilterValue.png";
import Group from "./assets/FindingData/Group.png";
import Sort from "./assets/FindingData/Sort.png";
import Thumbnail from "./assets/OmeZarr/Thumbnail.png";
import Zarr from "./assets/OmeZarr/Zarr.png";
import CodeSnippet from "./assets/Share/CodeSnippet.png";
import Download from "./assets/Share/Download.png";
import URL from "./assets/Share/URL.png";
import ContextMenu from "./assets/Viewers/ContextMenu.png";
import WebViewer from "./assets/Viewers/WebViewer.png";

interface Slide {
    caption: string; // Caption above image
    imgSrc: string; // Image src
}

interface Feature {
    id: number;
    text: string; // Left menu
    slides: Slide[]; // Right carousel
}

export default [
    {
        id: 1,
        text: "Find target files quickly",
        slides: [
            {
                imgSrc: Group,
                caption: `Unlike traditional file systems, BioFile Finder allows you to dynamically generate your folder structure based on the metadata of your files. In this screenshot, the files are organized by (Grouped by) the "Gene" and "Structure" columns found in the selected data source.`,
            },
            {
                imgSrc: FilterColumn,
                caption: "To filter, first select a column name...",
            },
            {
                imgSrc: FilterValue,
                caption: `...then select the desired values.`,
            },
            {
                imgSrc: Sort,
                caption: `Sort by clicking on the column header or the "Sort" button.`,
            },
        ],
    },
    {
        id: 2,
        text: "Create or combine data sources",
        slides: [
            {
                imgSrc: LoadSource,
                caption:
                    "Data can be loaded from a CSV, Parquet, or JSON file. The data source must include a column that contains the file path to the data. The data source can be loaded from a URL or uploaded from your computer.",
            },
            {
                imgSrc: AddDataSource,
                caption: "Additional data sources can be added the same way as the first.",
            },
            {
                imgSrc: GroupedDataSources,
                caption:
                    'After you have added data, you can filter, group, and sort it. This screenshot shows an example of grouping by an automatically generated column, "Data source," which represents the source of each file.',
            },
            {
                imgSrc: SaveMetadataAs,
                caption:
                    'New data sources can be generated from any number of existing data sources (filtered or whole). Right-click your file selection, select "Save metadata as", and choose your preferred file format.',
            },
            {
                imgSrc: NewDataSourceColumns,
                caption:
                    "You will be prompted for the columns you would like to include in the resulting new data source.",
            },
        ],
    },
    {
        id: 3,
        text: "Directly open images in a web-based viewer",
        slides: [
            {
                imgSrc: ContextMenu,
                caption:
                    "Right-click your file selection to open a context menu of external applications that can open the files. This example highlights the '3D Web Viewer,' a free open source visualization tool also developed by AICS.",
            },
            {
                imgSrc: WebViewer,
                caption:
                    "This is that same file we were looking at in the context menu, now opened in the 3D Web Viewer instantly from BioFile Finder.",
            },
        ],
    },
    {
        id: 4,
        text: "Share via URL, code snippet, or download",
        slides: [
            {
                imgSrc: URL,
                caption:
                    "Your exact file selection (filters, groups, sorts, open folders) can be shared via URL. Anyone with the URL can see the same view as you, as long as the data source is accessible to them. Local files, for example, must be re-selected by the user.",
            },
            {
                imgSrc: CodeSnippet,
                caption:
                    "A code snippet can be generated that recreates your exact view (filters, groups, sorts) programmatically. This allows you to export or share your view to a Jupyter notebook.",
            },
            {
                imgSrc: Download,
                caption:
                    "You can also download files directly from BioFile Finder. Select the file(s) you want to download, right-click to open the context menu, and select 'Download.'",
            },
        ],
    },
    {
        id: 5,
        text: "View OME.Zarr or pre-generated thumbnail previews of files instantly",
        slides: [
            {
                imgSrc: Zarr,
                caption:
                    "OME.Zarr files are a format for storing multi-dimensional arrays in a chunked, compressed, and efficient manner. BioFile Finder can read these files and preview them as thumbnails automatically.",
            },
            {
                imgSrc: Thumbnail,
                caption:
                    'For other file formats, BioFile Finder can render pre-generated thumbnails for quick previewing. To do so, in your CSV, Parquet, or JSON file, include a column that contains the file path to the thumbnail image named "Thumbnail"',
            },
        ],
    },
] as Feature[];
