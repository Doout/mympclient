"use strict";
const vscode = acquireVsCodeApi();

import { provideVSCodeDesignSystem, vsCodeButton, vsCodeTag, vsCodePanelTab, vsCodePanelView, vsCodePanels } from "@vscode/webview-ui-toolkit";
import { moveSyntheticComments } from "typescript";
provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTag(), vsCodePanelTab(), vsCodePanelView(), vsCodePanels());

window.addEventListener("load", main);
function main() {
	let repoSourceType = "";
	const installButton = document.getElementById("installButton");
	if  (installButton){
		installButton.addEventListener("click", installButtonClick);
		installButton.addEventListener('click', function() { 
			installButton.innerText = "Installing...";
			
			const extensionId = installButton.getAttribute("data-extension");
			const checkInterval = setInterval(function() {
			  const isInstalled = vscode.extensions.getExtension(extensionId) !== undefined;
		
			  if (isInstalled) {
				installButton.innerText = "Uninstall";
				clearInterval(checkInterval);
			  }
			}, 100);
		  });
		repoSourceType = installButton.getAttribute("data-extension-sourcetype");
	}

	const uninstallButton = document.getElementById("uninstallButton");
	if (uninstallButton){
		uninstallButton.addEventListener("click", unInstallButtonClick);
		repoSourceType = uninstallButton.getAttribute("data-extension-sourcetype");
	}


	const markdownDiv = document.getElementById("markdownDiv");
	const markdownPath = markdownDiv.getAttribute("data-markdown-path");
	const markdownPathUri = markdownDiv.getAttribute("data-markdown-relativepath");

	const nameElement = document.getElementById("packageId");
	
	const repoSource = nameElement.getAttribute("data-repo-source");
	console.log(nameElement);
	console.log(repoSourceType);
	console.log(repoSource);

	// if directory path, extract it from the attribute
	if (repoSourceType !== null && repoSourceType === "Directory") {
		var md = window.markdownit();
		md.options.html = true;
		var result = md.render(markdownPath);
		markdownDiv.innerHTML = result;
	}
	else { // API Resource
		fetch(markdownPathUri)
			.then(response => response.text())
			.then(data => {
				var md = window.markdownit();
				md.options.html = true;
				var result = md.render(data.toString());
				markdownDiv.innerHTML = result; 
			});
	}
}

/**
 * @param {MouseEvent} event
 */
function installButtonClick(event) {
	const id = event.target.getAttribute("data-extension");
	const location = event.target.getAttribute("data-package-location");
	const sourceType = event.target.getAttribute("data-extension-sourcetype");
	const version = event.target.getAttribute("data-extension-version");
	const target = event.target.getAttribute("data-extension-target");
	vscode.postMessage({
		command: 'install',
		id: id,
		location: location,
		sourceType: sourceType,
		version: version,
		target: target
	});
	
}


/**
 * @param {MouseEvent} event
 */
function unInstallButtonClick(event) {
	const id = event.target.getAttribute("data-extension");
	const location = event.target.getAttribute("data-package-location");
	const sourceType = event.target.getAttribute("data-extension-sourcetype");
	const version = event.target.getAttribute("data-extension-version");
	const target = event.target.getAttribute("data-extension-target");
	vscode.postMessage({
		command: 'uninstall',
		id: id,
		location: location,
		sourceType: sourceType,
		version: version,
		target: target
	});
	
}
