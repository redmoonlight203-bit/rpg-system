import os

# Nombre del archivo de salida
OUTPUT_FILE = "codigo_completo_app.txt"

# Carpetas masivas o binarias que debemos ignorar
IGNORE_DIRS = {
    'node_modules',
    '.next',
    '.git',
    'out',
    'build',
    'dist',
    '.vscode',
    '.idea',
    '__pycache__'
}

# Archivos pesados o innecesarios
IGNORE_FILES = {
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    '.DS_Store',
    OUTPUT_FILE,
    'exportar_codigo.py'
}

# Extensiones de código que queremos incluir
ALLOWED_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.sql', '.md', '.py', '.html', '.env.example'
}

def exportar_proyecto(root_dir='.'):
    total_archivos = 0
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out_file:
        out_file.write("======================================================================\n")
        out_file.write("          CÓDIGO COMPLETO DEL PROYECTO - RPG SYSTEM (YUGEN)          \n")
        out_file.write("======================================================================\n\n")

        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Omitir carpetas ignoradas
            dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]

            for filename in filenames:
                if filename in IGNORE_FILES:
                    continue

                _, ext = os.path.splitext(filename)
                if ext.lower() not in ALLOWED_EXTENSIONS:
                    continue

                filepath = os.path.join(dirpath, filename)
                rel_path = os.path.relpath(filepath, root_dir)

                out_file.write(f"\n{'='*80}\n")
                out_file.write(f"RUTA: {rel_path}\n")
                out_file.write(f"{'='*80}\n\n")

                try:
                    with open(filepath, 'r', encoding='utf-8', errors='replace') as in_file:
                        out_file.write(in_file.read())
                        out_file.write("\n")
                    total_archivos += 1
                except Exception as e:
                    out_file.write(f"[ERROR AL LEER ARCHIVO: {e}]\n")

    print(f"✅ Proceso terminado. Se exportaron {total_archivos} archivos en '{OUTPUT_FILE}'.")

if __name__ == "__main__":
    exportar_proyecto()