import fs from "fs-extra";
import _path from "path";
import random from "random";
import glob from "glob";
import os from "os";

export interface Document
{
    location: string,
    metadata: DocumentMetadata,
    data: DocumentData,
}

export interface DocumentMetadata
{
    path: string,
}

export interface DocumentData
{
    [key: string]: any,
}

const MAX_DEPTH = 1;

export const document = (path: string): Query => new Query(path);

class Query
{
    constructor(private path: string) {}

    private getAllowedDirectories = (dir: string): string[] =>
    {
        const result = fs.readdirSync(dir, { withFileTypes: true });

        const directories = result
            .filter(entry => entry.isDirectory())
            .filter(entry =>
            {
                let allowed = true;

                try
                {
                    fs.readdirSync(_path.join(dir, entry.name));
                }
                catch (err)
                {
                    allowed = false;
                }

                return allowed;
            })
            .map(entry => _path.join(dir, entry.name));

        return directories;
    }

    public get(): Document | undefined
    {
        const scanDirectory = (dir: string, currentDepth: number): string | undefined =>
        {
            if (currentDepth > MAX_DEPTH) return;

            const directories = this.getAllowedDirectories(dir);

            const getFile = (): string | undefined =>
            {
                for (const directory of directories)
                {
                    const result = glob.sync(_path.join(directory, "*.randomdb"));

                    for (const entry of result)
                    {
                        let fileContent: Document | undefined;

                        try
                        {
                            fileContent = fs.readJSONSync(entry);
                        }
                        catch (err)
                        {}

                        if (fileContent?.metadata.path === this.path)
                            return entry;
                    }
                }
            }

            const filePath = getFile();

            if (filePath) return filePath;

            directories.forEach(directory => scanDirectory(directory, currentDepth++));
        }

        const result = scanDirectory(os.homedir(), 0);

        if (result) return fs.readJSONSync(result);
    }

    public set(data: DocumentData): void
    {
        const depth = random.int(0, MAX_DEPTH);

        let lastPath = os.homedir();

        for (let i = 0; i < depth; i++)
        {
            const directories = this.getAllowedDirectories(lastPath);

            if (directories.length > 0)
            {
                const directory = directories[random.int(0, directories.length - 1)];

                _path.join(lastPath, directory);
            }
        }

        const document: Document = {
            location: _path.join(lastPath, `${Date.now()}.randomdb`),
            metadata: {
                path: this.path,
            },
            data,
        };

        fs.writeJSONSync(document.location, document);
    }

    public delete(): void
    {
        const document = this.get();

        if (document) fs.unlinkSync(document.location);
    }
}
