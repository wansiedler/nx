package dev.nx.gradle.native

import java.io.File
import java.io.File.separator

/**
 * This function is the same logic as the nx's packages/nx/src/utils/workspace-root.ts
 */
fun workspaceRootInner(
        dir: String,
        candidateRoot: String
): String {
    if (System.getenv("NX_WORKSPACE_ROOT_PATH") != null) {
        return System.getenv("NX_WORKSPACE_ROOT_PATH")
    }
    val dirPath = File(dir)

    if (dirPath.getParent() == candidateRoot) {
        return candidateRoot
    }

    if (arrayOf("nx.json", "nx", "nx.bat").any { fileExists(dirPath, it) }) {
        return dir
    } else if (fileExists(dirPath, "node_modules${separator}nx${separator}package.json")) {
        return workspaceRootInner(dirPath.getParent().toString(), dir)
    } else {
        return workspaceRootInner(dirPath.getParent().toString(), candidateRoot)
    }
}


fun fileExists(currentFilePath: File, fileToCheck: String): Boolean {
    try {
        currentFilePath.toPath().resolve(fileToCheck)
    } catch (ex: Exception) {
        return false
    }
    return true
}
