import { JSON5TryParse } from "@devicescript/interop"
import * as vscode from "vscode"

export async function checkFileExists(
    folderOrFile: vscode.Uri,
    filePath?: string
): Promise<boolean> {
    try {
        const file = filePath ? vscode.Uri.joinPath(folderOrFile, filePath) : folderOrFile
        await vscode.workspace.fs.stat(file)
        return true
    } catch (error) {
        return false
    }
}

export async function writeFile(
    folder: vscode.Uri,
    fileName: string,
    fileContent: string,
    options?: { open?: boolean }
): Promise<vscode.Uri> {
    const file = vscode.Uri.joinPath(folder, fileName)
    await vscode.workspace.fs.writeFile(
        file,
        new TextEncoder().encode(fileContent)
    )
    if (options?.open) await openFileEditor(folder, fileName)
    return file
}

export async function openFileEditor(folder: vscode.Uri, fileName: string) {
    const file = vscode.Uri.joinPath(folder, fileName)
    const document = await vscode.workspace.openTextDocument(file)
    await vscode.window.showTextDocument(document)
}

export async function readFileText(
    folderOrFile: vscode.Uri,
    filePath?: string
): Promise<string> {
    if (!(await checkFileExists(folderOrFile, filePath))) return undefined

    const file = filePath
        ? vscode.Uri.joinPath(folderOrFile, filePath)
        : folderOrFile
    const buffer = await vscode.workspace.fs.readFile(file)
    return new TextDecoder().decode(buffer)
}

export async function readFileJSON<T>(
    folder: vscode.Uri,
    filePath?: string
): Promise<T> {
    const src = await readFileText(folder, filePath)
    try {
        return JSON5TryParse(src)
    } catch (e) {
        return undefined
    }
}
