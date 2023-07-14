import * as vscode from "vscode";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";

import { ExtensionPackage } from "./extensionPackage";

/**
 * Downloads an extension package from the specified source and saves it to the download directory.
 * @param item The extension package to download.
 * @param ctx The extension context.
 * @returns A promise that resolves to true if the download is successful, or false if there's an error.
 */
export async function installExtension(id: string, location: string, sourceType: string, version:string, target: string, ctx: vscode.ExtensionContext): Promise<boolean> {
	console.log(`Installing ${id}`);
	
	let downloadUrlFlattened = location;
	
	if (sourceType === "API") {
		location = `${getExtensionSource()}download/${id}/${version}/${target}`;
	}

	downloadUrlFlattened = flattenUrl(location);

	const downloadDirectory = getDownloadDirectory(ctx).fsPath;
	if (!fs.existsSync(downloadDirectory)) {
		fs.mkdirSync(downloadDirectory, { recursive: true });
	}

	let extensionPath = path.join(downloadDirectory, path.basename(downloadUrlFlattened));
	if (sourceType === "API") {
		// download the VSIX from remote source first and reset downloadUrl
		const response = await axios.get(downloadUrlFlattened, { responseType: "stream" });

		if (response.status === 404) { // not found
			vscode.window.showErrorMessage(`Extension not found at: ${location}`);
		}
		const fileName = getDownloadFilename(response.headers["content-disposition"]);
		if (!fileName) {
			return false;
		}

		extensionPath = path.join(downloadDirectory, fileName);

		const writer = fs.createWriteStream(extensionPath);
		response.data.pipe(writer);

		await new Promise<void>((resolve, reject) => {
			writer.on("finish", resolve);
			writer.on("error", reject);
		});
	}
	if (sourceType === "Directory") {
		fs.copyFileSync(downloadUrlFlattened, extensionPath);
	}

	console.log(`Download complete: ${extensionPath}`);

	try {
		await vscode.commands.executeCommand(AppConstants.commandWorkbenchInstall, vscode.Uri.file(extensionPath));
		console.log(`Installed ${id}`);
		fs.rmSync(extensionPath);
		await vscode.window.showInformationMessage(`Installed ${id}`);
		return true;
	} catch (error) {
		console.error(error);
		await vscode.window.showErrorMessage(`Failed to install ${id} with error ${error}`);
		return false;
	}
}

/**
 * Gets the download directory for the extension.
 * @param ctx The extension context.
 * @returns A URI representing the download directory.
 */
function getDownloadDirectory(ctx: vscode.ExtensionContext): vscode.Uri {
	return vscode.Uri.joinPath(ctx.globalStorageUri, "temp");
}

/**
 * Gets the source URL for private extensions.
 * @returns The source URL for private extensions.
 */
export function getExtensionSource(): string {
	let url = vscode.workspace.getConfiguration("").get<string[]>(AppConstants.configSource);

	return url ? url[0] : "";
}

export function getDirectoryExtensionSource(): string[] {
	let dirPath = vscode.workspace.getConfiguration("").get<string[]>(AppConstants.directoryConfigSource);
	return dirPath ? dirPath : [];
}

/**
 * Gets whether to include prerelease versions of private extensions.
 * @returns True if prerelease versions should be included, false otherwise.
 */
export function getPrerelease(): boolean {
	return vscode.workspace.getConfiguration("").get<boolean>(AppConstants.configPrerelease) ?? false;
}

/**
 * Replaces any trailing slashes in the given URL with a single slash.
 * @param {string} url - The URL to flatten.
 * @returns {string} The flattened URL.
 */
export function flattenUrl(url: string) {
	return url.replace(/\/+$/, "/");
}

/**
 * Extracts the file name from the given header string.
 * @param {string} headerString - The header string to extract the file name from.
 * @returns {string | null} The extracted file name, or null if the file name could not be extracted.
 */
function getDownloadFilename(headerString: string): string | null {
	const match = headerString.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
	if (match) {
		const fileName = match[1].replace(/['"]/g, "");
		return decodeURIComponent(fileName);
	}
	return null;
}

export class AppConstants {
	static commandRefresh: string = "mympclient.refreshApiSource";
	static commandRefreshDir: string = "mympclient.refreshDirSource";
	static commandSelect: string = "mympclient.select";
	static commandAddSource: string = "mympclient.addSource";
	static commandAddDirSource: string = "mympclient.addDirSource";
	static commandPrerelease: string = "mympclient.prerelease";
	static commandInstall: string = "mympclient.install";
	static commandWorkbenchInstall: string = "workbench.extensions.installExtension";
	static commandWorkbenchUninstall: string = "workbench.extensions.uninstallExtension";
	static commandAuth: string = "mympclient.getAuth";
	static extensionDetails: string = "mympclient-extension-details";
	static commandRevealInOs: string = "mympclient.revealInOS";
	static commandGoToSettingsApi: string = "mympclient.goToSettingsApi";
	static commandGoToSettingsDir: string = "mympclient.goToSettingsDir";
	
	static configSource: string = "myMarketplace.ApiSource";
	static directoryConfigSource: string = "myMarketplace.DirectorySource";
	static configPrerelease: string = "myMarketplace.Prerelease";

	static treeViewId: string = "mympclient-api-extensions";
	static directoryTreeViewId: string = "mympclient-dir-extensions";

	static messageInstall: string = "install";
	static messageUninstall: string = "uninstall";
	static token: string = "";
}
