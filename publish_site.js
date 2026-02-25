module.exports = async function (params) {
    const fs = require('fs');
    const path = require('path');
    const { app, quickAddApi } = params;

    // =========================================================================
    // ⚙️ CONFIGURAZIONE UTENTE
    // =========================================================================
    const CONFIG = {
        ASTRO_CONTENT_PATH: "/home/v/valerioditommaso/src/content",
        INTERNAL_VAULT_FOLDER: "Website", 
        CATEGORIES: {
            "Blog Post": {
                astroSubDir: "blog",
                vaultSubDir: "Posts",
                type: "bundle",
                linkPrefix: "./multimedia/"
            },
            "Corso": {
                astroSubDir: "courses",
                vaultSubDir: "Courses",
                type: "nested",
                linkPrefix: "../multimedia/"
            }
        }
    };

    // =========================================================================
    // 🛠️ FUNZIONE CORE: PUBBLICAZIONE
    // =========================================================================
    // Aggiunto isMoc per ridenominare forzatamente il file
    async function publishSingleFile(fileObj, categoryConfig, subFolderInput, isMoc = false) {
        const vaultBasePath = app.vault.adapter.getBasePath();
        const fileNameNoExt = fileObj.basename;
        const fileContent = await app.vault.read(fileObj);

        const destinations = [
            { root: CONFIG.ASTRO_CONTENT_PATH, subDir: categoryConfig.astroSubDir }
        ];

        // Regex e logica Immagini
        const imgRegex = /!\[\[(.*?)(?:\|.*?)?\]\]/g;
        let imagesToCopy = [];
        let match;
        while ((match = imgRegex.exec(fileContent)) !== null) {
            imagesToCopy.push(match[1]);
        }
        imagesToCopy = [...new Set(imagesToCopy)];

        for (const dest of destinations) {
            let targetFolderPath, targetFilePath, multimediaFolderPath;

            if (categoryConfig.type === "bundle") {
                targetFolderPath = path.join(dest.root, dest.subDir, fileNameNoExt);
                targetFilePath = path.join(targetFolderPath, "index.md");
                multimediaFolderPath = path.join(targetFolderPath, "multimedia");
            } else {
                targetFolderPath = path.join(dest.root, dest.subDir, subFolderInput);
                const lessonsFolder = path.join(targetFolderPath, "lessons");
                
                // --- MODIFICA MOC ---
                if (isMoc) {
                    targetFilePath = path.join(lessonsFolder, "mok.md");
                } else {
                    targetFilePath = path.join(lessonsFolder, `${fileNameNoExt}.md`);
                }
                
                multimediaFolderPath = path.join(targetFolderPath, "multimedia");
                
                if (!fs.existsSync(lessonsFolder)) fs.mkdirSync(lessonsFolder, { recursive: true });
            }

            if (!fs.existsSync(targetFolderPath)) fs.mkdirSync(targetFolderPath, { recursive: true });
            if (imagesToCopy.length > 0 && !fs.existsSync(multimediaFolderPath)) {
                fs.mkdirSync(multimediaFolderPath, { recursive: true });
            }

            for (const imgName of imagesToCopy) {
                const imgFile = app.metadataCache.getFirstLinkpathDest(imgName, fileObj.path);
                if (imgFile) {
                    const sourcePath = path.join(vaultBasePath, imgFile.path);
                    const destPath = path.join(multimediaFolderPath, imgFile.name);
                    fs.copyFileSync(sourcePath, destPath);
                }
            }

            let newContent = fileContent;
            const today = new Date().toISOString().split('T')[0];
            if (newContent.includes("updatedDate:")) {
                newContent = newContent.replace(/updatedDate: .*/, `updatedDate: ${today}`);
            }

            newContent = newContent.replace(imgRegex, (fullMatch, imgName) => {
                const cleanName = path.basename(imgName); 
                const webPath = `${categoryConfig.linkPrefix}${cleanName}`;
                return `![${cleanName}](${encodeURI(webPath)})`;
            });

            fs.writeFileSync(targetFilePath, newContent, 'utf8');
        }
        console.log(`✅ Processato: ${fileNameNoExt} -> ${isMoc ? "mok.md" : (categoryConfig.type === "bundle" ? "index.md" : fileNameNoExt + ".md")}`);
    }

    // =========================================================================
    // 🚀 INTERFACCIA UTENTE
    // =========================================================================

    const activeFile = app.workspace.getActiveFile();
    if (!activeFile || activeFile.extension !== "md") {
        new Notice("❌ Apri un file Markdown per iniziare.");
        return;
    }

    // 1. Scelta Categoria
    const categoryName = await quickAddApi.suggester(Object.keys(CONFIG.CATEGORIES), Object.keys(CONFIG.CATEGORIES));
    if (!categoryName) return;
    const categoryConfig = CONFIG.CATEGORIES[categoryName];

    let subFolder = "";
    let filesToPublish = [activeFile]; 
    let selectedMoc = null;

    // 2. Gestione Corso Avanzata
    if (categoryConfig.type === "nested") {
        const coursesPath = path.join(CONFIG.ASTRO_CONTENT_PATH, categoryConfig.astroSubDir);
        let existingCourses = [];
        if (fs.existsSync(coursesPath)) {
            existingCourses = fs.readdirSync(coursesPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
        }
        subFolder = await quickAddApi.suggester((item) => item, existingCourses);
        if (!subFolder) subFolder = await quickAddApi.inputPrompt("Nome del nuovo Corso:");
        if (!subFolder) return;

        const mode = await quickAddApi.suggester(
            ["Solo il file corrente", "Selezione multipla (dalla stessa cartella)"],
            ["single", "multi"]
        );
        if (!mode) return;

        if (mode === "multi") {
            const parentFolder = activeFile.parent;
            let allSiblingFiles = parentFolder.children.filter(f => f.extension === "md");
            
            let selectedFiles = [activeFile]; 
            
            let selecting = true;
            while (selecting) {
                const availableFiles = allSiblingFiles.filter(f => !selectedFiles.includes(f));
                
                const OPT_PUBLISH = `🚀 PUBBLICA (${selectedFiles.length} file)`;
                const OPT_ADD_ALL = `📚 AGGIUNGI TUTTI (${availableFiles.length} rimanenti)`;
                const OPT_REMOVE_MENU = `🗑️ RIMUOVI / RIVEDI SELEZIONE (${selectedFiles.length} selezionati)`;
                
                let options = [OPT_PUBLISH];
                if (availableFiles.length > 0) options.push(OPT_ADD_ALL);
                if (selectedFiles.length > 0) options.push(OPT_REMOVE_MENU);
                
                options.push("--- File Disponibili ---");
                options = [...options, ...availableFiles.map(f => f.basename)];

                const choice = await quickAddApi.suggester(options, options);

                if (!choice) return; 

                if (choice === OPT_PUBLISH) {
                    selecting = false; 
                
                } else if (choice === OPT_ADD_ALL) {
                    selectedFiles = [...selectedFiles, ...availableFiles];
                    selecting = false; 
                
                } else if (choice === OPT_REMOVE_MENU) {
                    let removing = true;
                    let toRemove = []; 

                    while (removing) {
                        const currentSelectionPool = selectedFiles.filter(f => !toRemove.includes(f));
                        
                        const OPT_CONFIRM_REMOVE = `✅ CONFERMA RIMOZIONE (${toRemove.length} file)`;
                        const OPT_REMOVE_ALL_CURRENT = `🔥 RIMUOVI TUTTI I SELEZIONATI`;
                        const OPT_BACK = `🔙 INDIETRO (Annulla rimozioni)`;

                        let remOptions = [OPT_CONFIRM_REMOVE, OPT_REMOVE_ALL_CURRENT, OPT_BACK, "--- Clicca per marcare da rimuovere ---"];
                        remOptions = [...remOptions, ...currentSelectionPool.map(f => `❌ ${f.basename}`)];

                        const remChoice = await quickAddApi.suggester(remOptions, remOptions);

                        if (!remChoice || remChoice === OPT_BACK) {
                            removing = false;
                        } else if (remChoice === OPT_CONFIRM_REMOVE) {
                            selectedFiles = selectedFiles.filter(f => !toRemove.includes(f));
                            removing = false; 
                        } else if (remChoice === OPT_REMOVE_ALL_CURRENT) {
                            toRemove = [...selectedFiles];
                        } else if (remChoice.startsWith("❌ ")) {
                            const cleanName = remChoice.replace("❌ ", "");
                            const fileToMark = currentSelectionPool.find(f => f.basename === cleanName);
                            if (fileToMark) {
                                toRemove.push(fileToMark);
                            }
                        }
                    }
                } else if (choice === "--- File Disponibili ---") {
                    // Ignora
                } else {
                    const fileChosen = availableFiles.find(f => f.basename === choice);
                    if (fileChosen) selectedFiles.push(fileChosen);
                }
            }
            
            if (selectedFiles.length === 0) {
                new Notice("⚠️ Nessun file selezionato.");
                return;
            }
            filesToPublish = selectedFiles;
        }

        // --- GESTIONE MOC SORELLA ---
        const currentFolder = activeFile.parent;
        const grandParentFolder = currentFolder ? currentFolder.parent : null;

        if (grandParentFolder) {
            // Costruiamo il path per la cartella MOC. Se grandParent è root ("/"), il path è solo "MOC"
            const mocFolderPath = grandParentFolder.path === "/" ? "MOCs" : `${grandParentFolder.path}/MOCs`;
            const mocFolder = app.vault.getAbstractFileByPath(mocFolderPath);

            if (mocFolder && mocFolder.children) {
                const mocFiles = mocFolder.children.filter(f => f.extension === "md");
                
                if (mocFiles.length > 0) {
                    const displayItems = mocFiles.map(f => f.basename);
                    selectedMoc = await quickAddApi.suggester(displayItems, mocFiles);
                    
                    // Se l'utente preme Esc, annulla TUTTO
                    if (!selectedMoc) {
                        new Notice("❌ Operazione annullata.");
                        return; // Esce e non pubblica niente
                    }
                }
            }
        }
    }

    // =========================================================================
    // 💾 ESECUZIONE BATCH
    // =========================================================================
    new Notice(`⏳ Pubblicazione di ${filesToPublish.length + (selectedMoc ? 1 : 0)} file...`);
    
    try {
        for (const file of filesToPublish) {
            await publishSingleFile(file, categoryConfig, subFolder, false);
        }

        // Pubblica il MOC se è stato selezionato (isMoc = true per rinominarlo)
        if (selectedMoc) {
            await publishSingleFile(selectedMoc, categoryConfig, subFolder, true);
        }

        new Notice(`✅ Completato!`);
    } catch (error) {
        console.error(error);
        new Notice("❌ Errore. Controlla la console.");
    }
};