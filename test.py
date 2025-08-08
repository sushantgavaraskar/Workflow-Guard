import os

def dump_project_to_txt(root_dir, output_file):
    """
    Dumps the full file structure and content of all files in the project,
    excluding only specific heavy/unnecessary folders and specific files.
    """
    # Folders to completely ignore (e.g., large or non-code)
    skip_dirs = {
        "node_modules", ".git", "__pycache__", "venv",
        ".idea", ".vscode", "dist", "build", ".mypy_cache"
    }

    # Specific filenames to ignore (e.g., lockfiles or OS files)
    skip_files = {
        "package-lock.json", "yarn.lock", ".DS_Store"
    }

    with open(output_file, "w", encoding="utf-8") as f:
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Exclude unwanted directories during traversal
            dirnames[:] = [d for d in dirnames if d not in skip_dirs]

            level = dirpath.replace(root_dir, "").count(os.sep)
            indent = "│   " * level
            f.write(f"{indent}├─ {os.path.basename(dirpath)}/\n")

            sub_indent = "│   " * (level + 1)
            for filename in filenames:
                if filename in skip_files:
                    continue

                full_path = os.path.join(dirpath, filename)
                f.write(f"{sub_indent}├─ {filename}\n")

                try:
                    with open(full_path, "r", encoding="utf-8") as code_file:
                        code = code_file.read()
                        f.write(f"\n{sub_indent}# --- Begin: {filename} ---\n")
                        f.write(code + "\n")
                        f.write(f"{sub_indent}# --- End: {filename} ---\n\n")
                except Exception as e:
                    f.write(f"{sub_indent}[Could not read {filename}: {e}]\n")

# Example usage
dump_project_to_txt(".", "project_dump.txt")
