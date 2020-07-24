import fs from "fs-extra";
import _path from "path";
import random from "random";
import glob from "glob";

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
        const scanDirectory = (dir: string): string | undefined =>
        {
            const directories = this.getAllowedDirectories(dir);

            const getFile = (): string | undefined =>
            {
                for (const directory of directories)
                {
                    const result = glob.sync(_path.join(directory, "*.randomdb"));

                    for (const entry of result)
                    {
                        const fileContent = <Document>fs.readJSONSync(entry);

                        if (fileContent.metadata.path === this.path)
                            return entry;
                    }
                }
            }

            const filePath = getFile();

            if (filePath) return filePath;

            directories.forEach(directory => scanDirectory(directory));
        }

        const result = scanDirectory(_path.parse(__dirname).root);

        if (result) return fs.readJSONSync(result);
    }

    public set(data: DocumentData): void
    {
        const depth = random.int(0, MAX_DEPTH);

        let lastPath = _path.parse(__dirname).root;

        for (let i = 0; i < depth; i++)
        {
            const result = fs.readdirSync(lastPath, { withFileTypes: true });

            const directories = result.filter(entry => entry.isDirectory());

            if (directories.length > 0)
            {
                const directory = directories[random.int(0, directories.length - 1)];

                try
                {
                    fs.accessSync(_path.join(lastPath, directory.name), fs.constants.W_OK | fs.constants.R_OK);

                    lastPath = _path.join(lastPath, directory.name);
                }
                catch (err) {}
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
