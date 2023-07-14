import * as vscode from "vscode";
import { ExtensionPackage } from "./extensionPackage";
import { AppConstants, flattenUrl, getExtensionSource } from "./utils";

export class ExtensionDetailsPanel {
	public static currentPanel: ExtensionDetailsPanel | undefined;

	public static readonly viewType = AppConstants.extensionDetails;

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(item: ExtensionPackage, extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		// If we already have a panel, show it.
		if (ExtensionDetailsPanel.currentPanel) {
			ExtensionDetailsPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			ExtensionDetailsPanel.viewType,
			item.displayName,
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media"), vscode.Uri.joinPath(extensionUri, "out")]
			}
		);

		ExtensionDetailsPanel.currentPanel = new ExtensionDetailsPanel(panel, extensionUri);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		ExtensionDetailsPanel.currentPanel = new ExtensionDetailsPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);


		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			(message) => {
				console.log(message)
				switch (message.command) {
					case AppConstants.messageInstall:
						vscode.commands.executeCommand(AppConstants.commandInstall, message.id, message.location, message.sourceType, message.version, message.target);
						return;
					case AppConstants.messageUninstall:
						vscode.commands.executeCommand(AppConstants.commandWorkbenchUninstall, message.id);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public dispose() {
		ExtensionDetailsPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	public update(item: ExtensionPackage) {
		const webview = this._panel.webview;
		this._panel.title = item.displayName;
		this._panel.webview.html = this._getHtmlForWebview(webview, item);
	}

	private _getHtmlForWebview(webview: vscode.Webview, item: ExtensionPackage) {
	//console.log(item.identifier);
	
	let itemExt = vscode.extensions.getExtension(item.identifier);
	//console.log(itemExt);
	const isInstalled = itemExt !== undefined;

	const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "markdown-it.min.js"));
	const webviewScript = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "out", "webview.js"));

	const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css"));
	const styleGithub = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "gh.css"));
	const styleMain = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "main.css"));
	const defaultIcon = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "default_icon_128.png"));

	const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "codicon.css"));

	const nonce = getNonce();
	let imageUri = defaultIcon.toString();

	const baseUrl = flattenUrl(getExtensionSource());

	if (item.source.length < 1) {	
		imageUri = `${baseUrl}/${item.mainExtension.iconPath}`;
	}

	if (item.base64Icon && item.base64Icon.length > 0){
		imageUri = item.base64Icon;
	}
	
	// Define button text and id based on whether the extension is already installed
	const buttonText = isInstalled ? "Uninstall" : "Install";
	const buttonId = isInstalled ? "uninstallButton" : "installButton";

		

		return /*html*/ `
    <!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleVSCodeUri}" rel="stylesheet">
    <link href="${styleGithub}" rel="stylesheet">
	<link href="${styleMain}" rel="stylesheet">
	<link href="${codiconsUri}" rel="stylesheet" />

    <title>${item.displayName}</title>
  </head>
  <body>
		<div class="header">
			<div class="icon-container">
					<img class="icon" src="${imageUri}" alt="missing-image" />
			</div>
			<div class="details">
				<div class="title">
					<span class="name" title="Extension name" role="heading" tabindex="0">
						${item.displayName} ${(item.mainExtension.extension.target === "any" ? "" : `(${item.mainExtension.extension.target})`)}
					</span>
					<vscode-tag class='versionTag'>${item.version}</vscode-tag>
					${((item.mainExtension.extension.isPreRelease !== undefined && item.mainExtension.extension.isPreRelease === true) ? "<vscode-tag class='preReleaseTag'>Pre-release</vscode-tag>" : "")}
					${(item.mainExtension.isPreview ? "<vscode-tag class='previewTag'>Preview</vscode-tag>" : "")}
				</div>
				<div class="subtitle" id="packageId" data-repo-source="${item.source}">
					${item.identifier}
				</div>
				<div class="description">
					${item.description}
				</div>
				<div class="actions">
					<vscode-button appearance="primary" id="${buttonId}" data-extension-target="${(item.mainExtension.extension.target === undefined) ? "any":item.mainExtension.extension.target}" data-extension-version="${item.version}" data-extension-sourcetype="${item.sourceType}" data-package-location="${item.mainExtension.extension.location}" data-extension="${item.identifier}">
						${buttonText}
						<span slot="start" class="codicon codicon-desktop-download"></span>
					</vscode-button>
				</div>
			</div>
		</div>
		<vscode-panels>
			<vscode-panel-tab id="tab-1">DETAILS</vscode-panel-tab>
			<vscode-panel-view id="view-1">
				<div class="body" id="markdownDiv" data-markdown-relativepath="${baseUrl}${item.mainExtension.readmePath}" data-markdown-path="${item.readmeContent}"></div>
			</vscode-panel-view>
		</vscode-panels>
    <script nonce="${nonce}" src="${scriptUri}"></script>
    <script nonce="${nonce}" src="${webviewScript}" type="module"></script>
  </body>
</html>
`;
	}
}

function getNonce() {
	let text = "";
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
