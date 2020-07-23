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

    public get(): Document | undefined
    {
        const documentPath = glob.sync("*.randomdb").find(path =>
        {
            const document = <Document>fs.readJSONSync(path);

            return document.metadata.path === this.path;
        });

        if (!documentPath) return;

        return fs.readJSONSync(documentPath);
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
                    fs.readdirSync(_path.join(lastPath, directory.name));

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
        // TODO
    }
}
